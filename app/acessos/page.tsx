'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search,
  UserCheck,
  LogOut,
  Clock,
  Building2,
  Truck,
  Package,
  Car,
  X,
  Save,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { lookupUnitId, getCurrentOperatorId } from '@/lib/utils';

interface Access {
  id: string;
  tipo: string;
  nome: string;
  documento?: string;
  unidadeDesc?: string;
  liberadoPor?: string;
  empresa?: string;
  veiculoPlaca?: string;
  horaEntrada: string;
  horaSaida?: string;
  status: string;
}

const personTypes = [
  { value: 'VISITANTE', label: 'Visitante', icon: Users },
  { value: 'PRESTADOR', label: 'Prestador', icon: Truck },
  { value: 'ENTREGADOR', label: 'Entregador', icon: Package },
  { value: 'MORADOR', label: 'Morador', icon: UserCheck },
];

export default function AcessosPage() {
  const [accesses, setAccesses] = useState<Access[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('TODOS');
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tipo: 'VISITANTE',
    nome: '',
    documento: '',
    unidadeDesc: '',
    liberadoPor: '',
    empresa: '',
    veiculoPlaca: '',
    veiculoModelo: '',
    veiculoCor: '',
  });

  useEffect(() => {
    fetchAccesses();
    getCurrentOperatorId(supabase).then(setOperatorId);

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const fetchAccesses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('accesses')
      .select('*')
      .order('horaEntrada', { ascending: false })
      .limit(100);
    
    if (data) setAccesses(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    try {
      const unitId = await lookupUnitId(supabase, formData.unidadeDesc);

      await supabase.from('accesses').insert({
        tipo: formData.tipo,
        nome: formData.nome,
        documento: formData.documento || null,
        unidadeId: unitId,
        unidadeDesc: formData.unidadeDesc || null,
        liberadoPor: formData.liberadoPor || null,
        empresa: formData.empresa || null,
        veiculoPlaca: formData.veiculoPlaca || null,
        veiculoModelo: formData.veiculoModelo || null,
        veiculoCor: formData.veiculoCor || null,
        operadorId: operatorId,
        status: 'DENTRO'
      });
      
      setShowModal(false);
      setFormData({
        tipo: 'VISITANTE',
        nome: '',
        documento: '',
        unidadeDesc: '',
        liberadoPor: '',
        empresa: '',
        veiculoPlaca: '',
        veiculoModelo: '',
        veiculoCor: '',
      });
      fetchAccesses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExit = async (id: string) => {
    await supabase.from('accesses').update({
      horaSaida: new Date().toISOString(),
      status: 'SAIU'
    }).eq('id', id);
    fetchAccesses();
  };

  const filtered = accesses.filter(a => {
    const matchSearch = !search || a.nome.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'TODOS' || 
      (filter === 'DENTRO' && a.status === 'DENTRO') ||
      (filter === 'SAIU' && a.status === 'SAIU');
    return matchSearch && matchFilter;
  });

  const inside = accesses.filter(a => a.status === 'DENTRO').length;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Acessos</h2>
          <p className="text-slate-500 mt-1 text-sm">Registro de entradas e saídas</p>
        </motion.div>

        <div className="flex items-center gap-3">
          <div className="bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-lg">
            <span className="text-green-700 dark:text-green-400 font-bold text-sm">{inside} dentro</span>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            Nova Entrada
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
        >
          <option value="TODOS">Todos</option>
          <option value="DENTRO">Dentro</option>
          <option value="SAIU">Saíram</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Pessoa</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Unidade</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Entrada</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="text-right p-4 text-xs font-bold text-slate-500 uppercase">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum registro</td></tr>
              ) : filtered.map((access) => (
                <tr key={access.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-full flex items-center justify-center ${
                        access.tipo === 'MORADOR' ? 'bg-blue-100 text-blue-600' :
                        access.tipo === 'ENTREGADOR' ? 'bg-orange-100 text-orange-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        <UserCheck size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{access.nome}</p>
                        {access.documento && <p className="text-xs text-slate-400">Doc: {access.documento}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm">{access.tipo}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm">{access.unidadeDesc || '-'}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-slate-500">
                      {new Date(access.horaEntrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                      access.status === 'DENTRO' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {access.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {access.status === 'DENTRO' && (
                      <button 
                        onClick={() => handleExit(access.id)}
                        className="text-xs font-bold text-red-600 hover:underline"
                      >
                        Registrar Saída
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900">
                <h3 className="text-xl font-bold">Nova Entrada</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Tipo de Pessoa</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {personTypes.map(type => (
                      <button
                        key={type.value}
                        onClick={() => setFormData({...formData, tipo: type.value})}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          formData.tipo === type.value
                            ? 'border-primary bg-primary/10'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <type.icon size={20} className="mx-auto mb-1" />
                        <span className="text-xs font-bold">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Nome *</label>
                  <input 
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    placeholder="Nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Documento (RG/CPF)</label>
                  <input 
                    type="text"
                    value={formData.documento}
                    onChange={(e) => setFormData({...formData, documento: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    placeholder="Número do documento"
                  />
                </div>

                {formData.tipo !== 'ENTREGADOR' && (
                  <>
                    <div>
                      <label className="block text-sm font-bold mb-2">Unidade</label>
                      <input 
                        type="text"
                        value={formData.unidadeDesc}
                        onChange={(e) => setFormData({...formData, unidadeDesc: e.target.value})}
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                        placeholder="Bloco/Apto"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2">Liberado por (Morador)</label>
                      <input 
                        type="text"
                        value={formData.liberadoPor}
                        onChange={(e) => setFormData({...formData, liberadoPor: e.target.value})}
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                        placeholder="Nome do morador que autorizou"
                      />
                    </div>
                  </>
                )}

                {formData.tipo === 'PRESTADOR' && (
                  <div>
                    <label className="block text-sm font-bold mb-2">Empresa</label>
                    <input 
                      type="text"
                      value={formData.empresa}
                      onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                      placeholder="Nome da empresa"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold mb-2">Veículo</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input 
                      type="text"
                      value={formData.veiculoPlaca}
                      onChange={(e) => setFormData({...formData, veiculoPlaca: e.target.value})}
                      className="col-span-1 p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                      placeholder="Placa"
                    />
                    <input 
                      type="text"
                      value={formData.veiculoModelo}
                      onChange={(e) => setFormData({...formData, veiculoModelo: e.target.value})}
                      className="col-span-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                      placeholder="Modelo"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={!formData.nome}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Registrar Entrada
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}