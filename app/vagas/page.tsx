'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'motion/react';
import { 
  Building2, KeySquare, Car, FileText, CheckCircle2,
  AlertCircle, Search, Edit, X
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
        alugado_para:residents!vagas_alugada_para_morador_id_fkey(nome, bloco, apto)
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

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <KeySquare className="text-primary size-8 sm:size-10" />
              Gestão de Vagas
            </h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">Controle de locação, ocupação e mapeamento de garagem.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => setStatusFilter(null)}
            className={`text-left bg-white dark:bg-slate-900 p-4 rounded-xl border transition-all ${statusFilter === null ? 'border-primary ring-2 ring-primary/20 shadow-md shadow-primary/10' : 'border-slate-200 dark:border-slate-800 hover:border-primary/50'}`}
          >
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Geral</p>
            <p className="text-2xl font-black mt-1">{loading ? '...' : totalVagas}</p>
          </button>
          
          <button 
            onClick={() => setStatusFilter('LIVRE')}
            className={`text-left bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border transition-all ${statusFilter === 'LIVRE' ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/10' : 'border-emerald-100 dark:border-emerald-800 hover:border-emerald-500/50'}`}
          >
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Livre</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{loading ? '...' : livres}</p>
          </button>

          <button 
            onClick={() => setStatusFilter('OCUPADA')}
            className={`text-left bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border transition-all ${statusFilter === 'OCUPADA' ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md shadow-amber-500/10' : 'border-amber-100 dark:border-amber-800 hover:border-amber-500/50'}`}
          >
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Ocupada</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{loading ? '...' : ocupadas}</p>
          </button>

          <button 
            onClick={() => setStatusFilter('ALUGADA')}
            className={`text-left bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border transition-all ${statusFilter === 'ALUGADA' ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-md shadow-purple-500/10' : 'border-purple-100 dark:border-purple-800 hover:border-purple-500/50'}`}
          >
            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">Alugada / Emprestada</p>
            <p className="text-2xl font-black text-purple-600 mt-1">{loading ? '...' : alugadas}</p>
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
              <input
                type="text"
                placeholder="Buscar por placa, modelo ou código (Ex: B08)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

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
                   <tr><td colSpan={5} className="text-center py-8 text-slate-500">Carregando mapa de vagas...</td></tr>
                ) : sortedFiltered.length === 0 ? (
                   <tr><td colSpan={5} className="text-center py-8 text-slate-500">Nenhuma vaga localizada. Execute a Migration no banco de dados.</td></tr>
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
                        <td className="px-6 py-3 text-slate-500">
                           Apt {vaga.unidade.numero}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
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
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 italic">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          {vaga.alugado_para ? (
                             <div className="flex flex-col">
                               <span className="font-bold text-slate-900 dark:text-white text-xs">{vaga.alugado_para.nome}</span>
                               <span className="text-[10px] text-slate-500">Bl {vaga.alugado_para.bloco}, Ap {vaga.alugado_para.apto}</span>
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
                 </div>

                 {selectedVaga.veiculo && formData.status !== 'OCUPADA' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-50 dark:bg-red-900/10 p-4 border border-red-200 dark:border-red-800/30 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-xs shadow-inner">
                       <AlertCircle size={20} className="mt-0.5 shrink-0" />
                       <div className="flex flex-col">
                         <b className="uppercase tracking-widest text-[10px] mb-1">Risco de Desvinculação</b>
                         <p className="leading-relaxed">
                           O veículo <b>{selectedVaga.veiculo.modelo} ({formatPlate(selectedVaga.veiculo.placa)})</b> está atualmente mapeado neste slot. Salvar esta alteração fará com que este carro seja <b>removido da vaga</b>, devolvendo-o ao sistema sem localização atribuída.
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
                      <select
                        value={formData.locadorId}
                        onChange={(e) => setFormData({...formData, locadorId: e.target.value})}
                        className="w-full p-3 border border-purple-200 dark:border-purple-800/30 rounded-xl bg-purple-50 dark:bg-purple-900/10 text-sm text-purple-900 dark:text-purple-300 font-bold focus:ring-2 focus:ring-purple-500/20 outline-none"
                      >
                        <option value="">Selecione o titular...</option>
                        {allResidents.map(r => (
                          <option key={r.id} value={r.id}>
                            Locatário: {r.nome} (Bl {r.bloco}, Ap {r.apto})
                          </option>
                        ))}
                      </select>
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
