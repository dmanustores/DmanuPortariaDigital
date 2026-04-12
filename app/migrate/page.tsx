'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '@/lib/supabase';

export default function MigratePage() {
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => {
    setLog(prev => [...prev, msg]);
  };

  const [serviceKey, setServiceKey] = useState('');

  const handleMigrate = async () => {
    setLoading(true);
    addLog("Iniciando migração retroativa de Moradores -> Unidades e Veículos...");
    
    // Se o usuário injetar a Service Key, cria um supercliente. Senão usa a sessão atual.
    const runClient = serviceKey.trim() 
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey.trim()) 
      : defaultSupabase;

    try {
      const { data: residents, error: resError } = await runClient
        .from('residents')
        .select('*, vehicles(*)');

      if (resError) throw resError;

      addLog(`Encontrados ${residents?.length || 0} moradores. Aplicando sincronização...`);

      for (const resident of (residents || [])) {
        addLog(`--- Processando Morador: ${resident.nome} ---`);
        
        // Pega o número do apartamento (dependendo da variação da coluna no seu Postgres)
        const apto = resident.apto || resident.numero || '';

        if (resident.bloco && apto) {
          const { data: existingUnit } = await runClient
            .from('units')
            .select('id')
            .eq('bloco', resident.bloco)
            .eq('numero', apto)
            .maybeSingle();

          if (existingUnit) {
            await runClient.from('units').update({ status: 'OCUPADA' }).eq('id', existingUnit.id);
            addLog(` -> Unidade Existente (Bloco ${resident.bloco}, Apt ${apto}): Status OCUPADA`);
          } else {
            const { error: insertError } = await runClient.from('units').insert({
              bloco: resident.bloco,
              numero: apto,
              tipo: 'RESIDENCIAL',
              status: 'OCUPADA',
              vagasgaragem: 1
            });
            if(insertError) addLog(` -> ERRO CRIANDO UNIDADE: ${insertError.message}`);
            else addLog(` -> Unidade Inexistente: Criada com sucesso`);
          }
        }

        if (resident.vehicles && resident.vehicles.length > 0) {
          await runClient.from('vehicles_registry').delete().eq('moradorid', resident.id);

          const vehiclesToInsert = resident.vehicles.map((v: any) => ({
            placa: v.placa ? v.placa.toUpperCase() : '',
            modelo: v.modelo || null,
            cor: v.cor || null,
            unidadedesc: `Bloco ${resident.bloco}, Apt ${apto}`,
            tipo: 'MORADOR',
            nomeproprietario: resident.nome,
            telefone: resident.celular || resident.fone || null,
            moradorid: resident.id,
            status: 'ATIVO'
          }));

          const { error: vehError } = await runClient.from('vehicles_registry').insert(vehiclesToInsert);
          if (vehError) addLog(` -> Erro Veículos: ${vehError.message}`);
          else addLog(` -> ${vehiclesToInsert.length} veículos retroativos migrados pro Registro Global.`);
        }
      }
      addLog("✅ Migração Concluída com Sucesso!");
    } catch (err: any) {
      addLog(`🚨 ERRO FATAL: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Ferramenta de Migração Administrativa</h1>
      <p className="text-slate-600">Este utilitário aplica correções em massa usando a sua sessão atual temporariamente para ultrapassar o bloqueio de segurança (RLS) do banco de dados.</p>
      
      <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl">
        <label className="block text-sm font-bold text-orange-900 mb-2">Supabase Service Role Key (Opcional - Bypass absoluto de RLS)</label>
        <input 
          type="password"
          className="w-full p-2 border border-orange-300 rounded focus:ring-2 focus:ring-orange-500"
          placeholder="eyJh..."
          value={serviceKey}
          onChange={e => setServiceKey(e.target.value)}
        />
        <p className="text-xs text-orange-700 mt-2">Vá no seu painel do Supabase online → Project Settings → API e copie a <strong>service_role</strong> (secret) caso a sessão padrão aponte erro de segurança de linha (RLS) pros veículos.</p>
      </div>

      <button 
        onClick={handleMigrate} 
        disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Rodando Sincronização..." : "Rodar Script Retroativo"}
      </button>

      <div className="bg-slate-900 border border-slate-700 text-green-400 p-4 rounded-xl font-mono text-sm h-96 overflow-y-auto">
        {log.map((l, i) => (
          <div key={i} className="mb-1">{l}</div>
        ))}
        {!log.length && "Aguardando inicialização..."}
      </div>
    </div>
  );
}
