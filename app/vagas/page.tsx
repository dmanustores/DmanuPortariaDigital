'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'motion/react';
import { 
  Building2, KeySquare, Car, FileText, CheckCircle2,
  AlertCircle, Search, Edit, X, User
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { formatPlate } from '@/lib/utils';
import { AnimatePresence } from 'motion/react';

interface Vaga {
  id: string;
  codigo: string;
  status: 'LIVRE' | 'OCUPADA' | 'ALUGADA';
  tipo: string;
  unidade_id: string;
  unidade: {
    bloco: string;
    numero: string;
  };
  veiculo_id?: string;
  veiculo?: {
    placa: string;
    modelo: string;
  };
  alugada_para_morador_id?: string;
  alugado_para?: {
    nome: string;
    bloco: string;
    apto: string;
    vehicles?: Array<{
      placa: string;
      modelo: string;
    }>;
  };
}

export default function VagasPage() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBlock, setFilterBlock] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Modal logic
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVaga, setSelectedVaga] = useState<Vaga | null>(null);
  const [allResidents, setAllResidents] = useState<any[]>([]);
  const [formData, setFormData] = useState({
     status: 'LIVRE',
     locadorId: ''
  });

  const [blocoTitularSearch, setBlocoTitularSearch] = useState('');
  const [aptoTitularSearch, setAptoTitularSearch] = useState('');

  const fetchVagas = async () => {
    setLoading(true);
    // Join logic will be replaced with actual RPC or nested Select depending on constraints
    // Here we use a fake dataset for UI initially, waiting for the migration to be complete.
    
    const { data, error } = await supabase
      .from('vagas')
      .select(`
        id, codigo, status, tipo,
        unidade_id,
        unidades:units!vagas_unidade_id_fkey(bloco, numero),
        veiculo_id,
        veiculos:vehicles!vagas_veiculo_id_fkey(placa, modelo),
        alugada_para_morador_id,
        alugado_para:residents!vagas_alugada_para_morador_id_fkey(
          nome, bloco, apto, 
          vehicles:vehicles(placa, modelo)
        )
      `);

    if (error) {
      console.warn('Vagas fetch error, assuming migration is pending:', error);
      setVagas([]);
    } else if (data) {
      setVagas(data.map((v: any) => ({
        id: v.id,
        codigo: v.codigo,
        status: v.status,
        tipo: v.tipo,
        unidade_id: v.unidade_id,
        unidade: v.unidades || { bloco: 'N/A', numero: 'N/A' },
        veiculo: v.veiculos,
        alugada_para_morador_id: v.alugada_para_morador_id,
        alugado_para: v.alugado_para
      })));
    }
    setLoading(false);
  };

  const fetchResidents = async () => {
    const { data } = await supabase.from('residents').select('id, nome, bloco, apto').order('nome');
    if (data) setAllResidents(data);
  };

  useEffect(() => {
    fetchVagas();
    fetchResidents();

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEditModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const totalVagas = vagas.length;
  const livres = vagas.filter(v => v.status === 'LIVRE').length;
  const ocupadas = vagas.filter(v => v.status === 'OCUPADA').length;
  const alugadas = vagas.filter(v => v.status === 'ALUGADA').length;

  const filtered = vagas.filter(v => {
    if (statusFilter && v.status !== statusFilter) return false;
    if (filterBlock && v.unidade.bloco !== filterBlock) return false;
    if (search) {
      const q = search.toLowerCase();
      return v.codigo.toLowerCase().includes(q) ||
             v.veiculo?.placa.toLowerCase().includes(q);
    }
    return true;
  });

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (a.unidade.bloco !== b.unidade.bloco) return a.unidade.bloco.localeCompare(b.unidade.bloco);
    return a.codigo.localeCompare(b.codigo);
  });

  const handleEditVaga = (vaga: Vaga) => {
     setSelectedVaga(vaga);
     setFormData({
       status: vaga.status,
       locadorId: vaga.alugada_para_morador_id || ''
     });
     setBlocoTitularSearch(''); // Reset search
     setAptoTitularSearch('');
     setShowEditModal(true);
  };

  const handleSaveModal = async () => {
     if (!selectedVaga) return;
     let updatePayload: any = { status: formData.status };
     
     if (formData.status === 'LIVRE') {
         updatePayload.alugada_para_morador_id = null;
         updatePayload.veiculo_id = null;
     } else if (formData.status === 'ALUGADA') {
         if (!formData.locadorId) {
             alert('ATENÇÃO: Selecione o morador destino do empréstimo/locação.');
             return;
         }
         updatePayload.alugada_para_morador_id = formData.locadorId;
         updatePayload.veiculo_id = null;
     } else if (formData.status === 'OCUPADA') {
         updatePayload.alugada_para_morador_id = null;
     }
     
     const { error } = await supabase.from('vagas').update(updatePayload).eq('id', selectedVaga.id);
     if (error) {
         console.error(error);
         alert('Erro ao salvar no banco. Veja console.');
         return;
     }
     
     setShowEditModal(false);
     fetchVagas();
  };

  const filteredResidents = allResidents.filter(r => 
    (!blocoTitularSearch || (r.bloco && r.bloco.toLowerCase().includes(blocoTitularSearch.toLowerCase()))) &&
    (!aptoTitularSearch || (r.apto && r.apto.toLowerCase().includes(aptoTitularSearch.toLowerCase())))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
              <span className="p-2.5 bg-blue-500 rounded-xl text-white shadow-lg shadow-blue-500/20">
                <KeySquare size={24} />
              </span>
              Gestão de Vagas
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">
              Controle de locação, ocupação e mapeamento de garagem
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={fetchVagas} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors uppercase">
              Atualizar
            </button>
          </div>
        </div>

        {/* Stats */}
        {/* Panel Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
           {/* Total */}
           <div 
             onClick={() => setStatusFilter(null)}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === null ? 'bg-slate-900 border-slate-900 text-white scale-[1.02]' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === null ? 'text-slate-400' : 'text-slate-400'}`}>Total Geral</p>
             <p className={`text-2xl font-black ${statusFilter === null ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{loading ? '-' : totalVagas}</p>
           </div>
           
           {/* Livre */}
           <div 
             onClick={() => setStatusFilter(statusFilter === 'LIVRE' ? null : 'LIVRE')}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === 'LIVRE' ? 'bg-emerald-500 border-emerald-500 scale-[1.02]' : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30 hover:border-emerald-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'LIVRE' ? 'text-emerald-100' : 'text-emerald-600'}`}>Livre</p>
             <p className={`text-2xl font-black ${statusFilter === 'LIVRE' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>{loading ? '-' : livres}</p>
           </div>
           
           {/* Ocupada */}
           <div 
             onClick={() => setStatusFilter(statusFilter === 'OCUPADA' ? null : 'OCUPADA')}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === 'OCUPADA' ? 'bg-amber-500 border-amber-500 scale-[1.02]' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30 hover:border-amber-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'OCUPADA' ? 'text-amber-100' : 'text-amber-600'}`}>Ocupada</p>
             <p className={`text-2xl font-black ${statusFilter === 'OCUPADA' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`}>{loading ? '-' : ocupadas}</p>
           </div>
           
           {/* Alugada */}
           <div 
             onClick={() => setStatusFilter(statusFilter === 'ALUGADA' ? null : 'ALUGADA')}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === 'ALUGADA' ? 'bg-purple-500 border-purple-500 scale-[1.02]' : 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/30 hover:border-purple-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'ALUGADA' ? 'text-purple-100' : 'text-purple-600'}`}>Alugada / Emprestada</p>
             <p className={`text-2xl font-black ${statusFilter === 'ALUGADA' ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`}>{loading ? '-' : alugadas}</p>
           </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl self-stretch md:self-auto overflow-x-auto">
             <button 
               onClick={() => { setStatusFilter(null); }} 
               className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap flex items-center gap-2 ${statusFilter === null ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
               Mapa Completo
             </button>
           </div>

           <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                 type="text"
                 placeholder="Buscar por placa, modelo ou vaga..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/20"
              />
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 font-bold">
                <tr>
                  <th className="px-6 py-4">Código (Vaga)</th>
                  <th className="px-6 py-4">Unidade Dona</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Veículo Ocupante</th>
                  <th className="px-6 py-4">Ocupante (Destino)</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                   <tr><td colSpan={6} className="text-center py-8 text-slate-500">Carregando mapa de vagas...</td></tr>
                ) : sortedFiltered.length === 0 ? (
                   <tr><td colSpan={6} className="text-center py-8 text-slate-500">Nenhuma vaga localizada. Execute a Migration no banco de dados.</td></tr>
                ) : sortedFiltered.map((vaga, index, array) => {
                  const isNewBlock = index === 0 || array[index - 1].unidade.bloco !== vaga.unidade.bloco;
                  return (
                    <React.Fragment key={vaga.id}>
                      {isNewBlock && (
                        <tr className="bg-slate-100 dark:bg-slate-800/80">
                          <td colSpan={6} className="px-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wider border-y border-slate-200 dark:border-slate-700/50">
                            <div className="flex items-center gap-2">
                              <Building2 size={14} className="text-primary" />
                              <span className="text-primary">Bloco {vaga.unidade.bloco}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-3 font-black text-slate-900 dark:text-white">{vaga.codigo}</td>
                        <td className="px-6 py-3">
                          {allResidents.some(r => r.bloco === vaga.unidade.bloco && r.apto === vaga.unidade.numero) ? (
                             <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900/5 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider shadow-sm">
                               APT {vaga.unidade.numero}
                             </span>
                          ) : (
                             <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider">
                               APT {vaga.unidade.numero}
                             </span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            vaga.status === 'LIVRE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' :
                            vaga.status === 'OCUPADA' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                            'bg-purple-100 text-purple-700 dark:bg-purple-900/30'
                          }`}>
                            {vaga.status === 'LIVRE' && <CheckCircle2 size={12} />}
                            {vaga.status === 'OCUPADA' && <Car size={12} />}
                            {vaga.status === 'ALUGADA' && <Building2 size={12} />}
                            {vaga.status}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          {vaga.veiculo ? (
                            <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                              <span className="uppercase text-xs">{formatPlate(vaga.veiculo.placa)}</span>
                              <span className="text-slate-400 font-normal text-xs">— {vaga.veiculo.modelo}</span>
                            </div>
                          ) : vaga.status === 'ALUGADA' ? (
                            <div className="flex items-center gap-2 text-purple-400 dark:text-purple-500/70">
                              <span className="text-xs italic tracking-wide">Desvinculado (S/ Placa)</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 italic">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          {vaga.alugado_para ? (
                             <div className="flex flex-col gap-1">
                               <span className="inline-block px-2 py-0.5 max-w-fit bg-slate-900/5 dark:bg-slate-800 rounded-md text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap uppercase tracking-wider">
                                 BLOCO {String(vaga.alugado_para.bloco).padStart(2, '0')}, APT {vaga.alugado_para.apto}
                               </span>
                               <span className="text-xs font-bold text-slate-900 dark:text-white block uppercase tracking-tight">{vaga.alugado_para.nome}</span>
                             </div>
                          ) : vaga.status === 'OCUPADA' ? (
                            <span className="text-slate-400 text-xs italic">Proprietário Principal</span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 italic">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button 
                            onClick={() => handleEditVaga(vaga)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                           <Edit size={16} />
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <AnimatePresence>
        {showEditModal && selectedVaga && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <KeySquare className="text-primary size-5" />
                    Gerenciar Acesso da Vaga
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-1 uppercase">
                     Vaga {selectedVaga.codigo} — Dona: Bloco {selectedVaga.unidade.bloco}, Apt {selectedVaga.unidade.numero}
                  </p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 border border-amber-200 dark:border-amber-800/30 rounded-xl flex gap-3 text-amber-700 dark:text-amber-500 text-xs">
                   <AlertCircle size={32} className="shrink-0 opacity-50" />
                   <p className="leading-relaxed">
                     Ao confirmar como <b>ALUGADA/EMPRESTADA</b>, o espaço não constará mais para moradores da <b>Unidade Dona</b>. O destino eleito poderá vincular seus próprios carros livremente a ela.
                   </p>
                 </div>

                 {selectedVaga.veiculo && formData.status !== 'OCUPADA' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-50 dark:bg-red-900/10 p-4 border border-red-200 dark:border-red-800/30 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-xs shadow-inner">
                       <AlertCircle size={20} className="mt-0.5 shrink-0" />
                       <div className="flex flex-col">
                         <b className="uppercase tracking-widest text-[10px] mb-1">Risco de Desvinculação</b>
                         <p className="leading-relaxed">
                           O veículo <b>{selectedVaga.veiculo.modelo} ({formatPlate(selectedVaga.veiculo.placa)})</b> está atualmente mapeado nesta vaga. Salvar esta alteração fará com que este carro seja removido dela devolvendo-o ao sistema sem localização atribuída.
                         </p>
                       </div>
                    </motion.div>
                 )}

                 <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Estado Operacional</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="LIVRE">LIVRE</option>
                      <option value="OCUPADA">OCUPADA (Uso Nativo)</option>
                      <option value="ALUGADA">ALUGADA / EMPRESTADA</option>
                    </select>
                  </div>

                  {formData.status === 'ALUGADA' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <label className="block text-sm font-bold mb-2 text-purple-600">Morador Locatário (Destino)</label>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Bloco</label>
                            <input 
                                type="text" 
                                placeholder={allResidents.length > 0 ? `Ex: ${allResidents[Math.floor(allResidents.length / 2)].bloco || '02'}` : "Ex: 02"}
                                value={blocoTitularSearch}
                                onChange={(e) => setBlocoTitularSearch(e.target.value)}
                                className="w-full text-xs px-3 py-2 border border-purple-200 dark:border-purple-800/30 rounded-lg bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 font-bold"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Unidade / Apto</label>
                            <input 
                                type="text" 
                                placeholder={allResidents.length > 0 ? `Ex: ${allResidents[Math.floor(allResidents.length / 2)].apto || '302'}` : "Ex: 302"}
                                value={aptoTitularSearch}
                                onChange={(e) => setAptoTitularSearch(e.target.value)}
                                className="w-full text-xs px-3 py-2 border border-purple-200 dark:border-purple-800/30 rounded-lg bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 font-bold"
                            />
                          </div>
                        </div>
                        <select
                          value={formData.locadorId}
                          onChange={(e) => setFormData({...formData, locadorId: e.target.value})}
                          className="w-full p-3 border border-purple-200 dark:border-purple-800/30 rounded-xl bg-purple-50 dark:bg-purple-900/10 text-sm text-purple-900 dark:text-purple-300 font-bold focus:ring-2 focus:ring-purple-500/20 outline-none"
                        >
                          <option value="">Selecione o titular...</option>
                          {Object.entries(
                            filteredResidents.reduce((acc: Record<string, any[]>, r: any) => {
                              const b = r.bloco || 'Sem Bloco';
                              if (!acc[b]) acc[b] = [];
                              acc[b].push(r);
                              return acc;
                            }, {})
                          ).sort(([a], [b]) => a.localeCompare(b)).map(([bloco, res]) => (
                            <optgroup key={bloco} label={`Bloco ${bloco}`}>
                               {(res as any[]).sort((a: any, b: any) => (a.apto || '').localeCompare(b.apto || '')).map((r: any) => (
                                 <option key={r.id} value={r.id}>
                                   Ap {r.apto} — {r.nome?.split(' ')[0]} {r.nome?.split(' ').pop()}
                                 </option>
                               ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveModal}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </DashboardLayout>
  );
}
