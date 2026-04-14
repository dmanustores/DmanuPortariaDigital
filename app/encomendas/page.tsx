'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search,
  CheckCircle,
  XCircle,
  Truck,
  Clock,
  X,
  Save,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { lookupUnitId, getCurrentOperatorId, capitalize } from '@/lib/utils';

interface Package {
  id: string;
  unidadeDesc?: string;
  transportadora: string;
  numero?: string;
  volumes: number;
  status: string;
  motivoRecusa?: string;
  RetiradoPor?: string;
  horaRecebimento: string;
  horaRetirada?: string;
  observacoes?: string;
}

export default function EncomendasPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRetireModal, setShowRetireModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('TODOS');
  const [retiradoPor, setRetiradoPor] = useState('');
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [residents, setResidents] = useState<any[]>([]);
  const [blocoSearch, setBlocoSearch] = useState('');
  const [apartamentoSearch, setApartamentoSearch] = useState('');
  const [showUnidadeDropdown, setShowUnidadeDropdown] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    transportadora: '',
    numero: '',
    volumes: 1,
    observacoes: ''
  });

  const fetchResidents = async () => {
    const { data } = await supabase
      .from('residents')
      .select('id, nome, bloco, apto')
      .order('nome');
    if (data) setResidents(data);
  };

  const fetchPackages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('packages')
      .select('*')
      .order('recebida_em', { ascending: false })
      .limit(100);
    
    if (data) setPackages(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPackages();
    fetchResidents();
    getCurrentOperatorId(supabase).then(setOperatorId);
  }, []);

  // Filtragem de unidades para o dropdown
  const unidadesDisponiveis = residents.filter(r => r.bloco && r.apto);
  const filteredUnidades = unidadesDisponiveis.filter(r => {
    const blocoStr = String(r.bloco).trim().padStart(2, '0');
    const numeroStr = String(r.apto).trim();
    const searchBloco = blocoSearch.trim().padStart(2, '0');
    const searchApt = apartamentoSearch.trim();

    if (!searchBloco && !searchApt) return true;
    if (searchBloco && !searchApt) return blocoStr.includes(searchBloco);
    if (searchApt && !searchBloco) return numeroStr.includes(searchApt);
    return blocoStr.includes(searchBloco) && numeroStr.includes(searchApt);
  }).slice(0, 10);

  const handleSelectUnidade = (resident: any) => {
    setSelectedUnidade(resident);
    setBlocoSearch(resident.bloco || '');
    setApartamentoSearch(resident.apto || '');
    setShowUnidadeDropdown(false);
  };

  const handleSubmit = async () => {
    if (!selectedUnidade || !formData.transportadora) {
      alert('Por favor, selecione a unidade e a transportadora.');
      return;
    }

    try {
      const unidadeDesc = `Bloco ${selectedUnidade.bloco}, Apt ${selectedUnidade.apto}`;
      
      const { error } = await supabase.from('packages').insert({
        unidade_id: selectedUnidade.id,
        unidade_desc: unidadeDesc,
        transportadora: formData.transportadora,
        numero: formData.numero || null,
        volumes: formData.volumes,
        observacoes: formData.observacoes || null,
        operador_recebimento_id: operatorId,
        status: 'AGUARDANDO',
        recebida_em: new Date().toISOString()
      });

      if (error) throw error;
      
      alert('✅ Encomenda registrada com sucesso!');
      setShowModal(false);
      resetForm();
      fetchPackages();
    } catch (err: any) {
      console.error('❌ Erro ao salvar encomenda:', err);
      alert('Erro ao salvar encomenda: ' + (err.message || 'Verifique sua conexão'));
    }
  };

  const resetForm = () => {
    setFormData({
      transportadora: '',
      numero: '',
      volumes: 1,
      observacoes: ''
    });
    setBlocoSearch('');
    setApartamentoSearch('');
    setSelectedUnidade(null);
  };

  const handleRetire = async () => {
    if (!selectedPackage) return;
    
    await supabase.from('packages').update({
      status: 'RETIRADA',
      RetiradoPor: retiradoPor,
      horaRetirada: new Date().toISOString(),
      operadorRetirada: operatorId
    }).eq('id', selectedPackage.id);
    
    setShowRetireModal(false);
    setSelectedPackage(null);
    setRetiradoPor('');
    fetchPackages();
  };

  const handleReject = async (id: string, motivo: string) => {
    await supabase.from('packages').update({
      status: 'RECUSADA',
      motivoRecusa: motivo
    }).eq('id', id);
    fetchPackages();
  };

  const pending = packages.filter(p => p.status === 'AGUARDANDO').length;

  const filtered = packages.filter(p => {
    const matchSearch = !search || 
      (p.unidadeDesc?.toLowerCase().includes(search.toLowerCase())) ||
      (p.transportadora.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'TODOS' || p.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Encomendas</h2>
          <p className="text-slate-500 mt-1 text-sm">Controle de entregas</p>
        </motion.div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-100 dark:bg-amber-900/30 px-4 py-2 rounded-lg">
            <span className="text-amber-700 dark:text-amber-400 font-bold text-sm">{pending} pendentes</span>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            Nova Encomenda
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por unidade ou transportadora..."
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
          <option value="AGUARDANDO">Aguardando</option>
          <option value="RETIRADA">Retiradas</option>
          <option value="RECUSADA">Recusadas</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Unidade</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Transportadora</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Volumes</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Recebimento</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="text-right p-4 text-xs font-bold text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhuma encomenda</td></tr>
              ) : filtered.map((pkg) => (
                <tr key={pkg.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-4">
                    <span className="font-semibold text-sm">{pkg.unidadeDesc || '-'}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Truck size={16} className="text-slate-400" />
                      <span className="text-sm">{pkg.transportadora}</span>
                      {pkg.numero && <span className="text-xs text-slate-400">#{pkg.numero}</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm">{pkg.volumes}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-slate-500">
                      {pkg.recebida_em ? new Date(pkg.recebida_em).toLocaleString('pt-BR', { 
                        day: '2-digit', hour: '2-digit', minute: '2-digit' 
                      }) : '-'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                      pkg.status === 'AGUARDANDO' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      pkg.status === 'RETIRADA' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {pkg.status === 'AGUARDANDO' ? 'Aguardando' :
                       pkg.status === 'RETIRADA' ? 'Retirada' : 'Recusada'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {pkg.status === 'AGUARDANDO' && (
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedPackage(pkg);
                            setShowRetireModal(true);
                          }}
                          className="text-xs font-bold text-green-600 hover:underline"
                        >
                          Registrar Retirada
                        </button>
                        <button 
                          onClick={() => handleReject(pkg.id, 'Recusada pelo porteiro')}
                          className="text-xs font-bold text-red-600 hover:underline"
                        >
                          Recusar
                        </button>
                      </div>
                    )}
                    {pkg.status === 'RETIRADA' && pkg.RetiradoPor && (
                      <span className="text-xs text-slate-400">Retirado por: {pkg.RetiradoPor}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova Encomenda */}
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
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold">Nova Encomenda</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="relative">
                  <label className="block text-sm font-bold mb-2">Unidade Destinatária *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">BLOCO</span>
                      <input 
                        type="text"
                        value={blocoSearch}
                        onChange={(e) => { 
                          setBlocoSearch(e.target.value); 
                          setShowUnidadeDropdown(true);
                          setSelectedUnidade(null);
                        }}
                        onFocus={() => setShowUnidadeDropdown(true)}
                        placeholder="00"
                        className="w-full pl-14 pr-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">APTO</span>
                      <input 
                        type="text"
                        value={apartamentoSearch}
                        onChange={(e) => { 
                          setApartamentoSearch(e.target.value); 
                          setShowUnidadeDropdown(true);
                          setSelectedUnidade(null);
                        }}
                        onFocus={() => setShowUnidadeDropdown(true)}
                        placeholder="000"
                        className="w-full pl-14 pr-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                      />
                    </div>
                  </div>

                  {showUnidadeDropdown && filteredUnidades.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[60] max-h-60 overflow-y-auto">
                      {filteredUnidades.map((r: any) => (
                        <button
                          key={r.id}
                          onClick={() => handleSelectUnidade(r)}
                          className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                          <div>
                            <p className="font-black text-slate-900 dark:text-white">Bloco {r.bloco} - Apt {r.apto}</p>
                            <p className="text-xs text-slate-500 uppercase">{r.nome}</p>
                          </div>
                          <Plus size={16} className="text-primary" />
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedUnidade && (
                    <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
                          {selectedUnidade.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">Bloco {selectedUnidade.bloco} - Apt {selectedUnidade.apto}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{selectedUnidade.nome}</p>
                        </div>
                      </div>
                      <button onClick={resetForm} className="p-1 hover:bg-primary/10 rounded-lg text-primary">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Transportadora *</label>
                  <select 
                    value={formData.transportadora}
                    onChange={(e) => setFormData({...formData, transportadora: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="">Selecione...</option>
                    <option value="Correios">Correios</option>
                    <option value=" Jadlog"> Jadlog</option>
                    <option value="Azul Cargo">Azul Cargo</option>
                    <option value="FedEx">FedEx</option>
                    <option value="UPS">UPS</option>
                    <option value="DHL">DHL</option>
                    <option value="iFood">iFood</option>
                    <option value="Amazon">Amazon</option>
                    <option value="Magazine Luiza">Magazine Luiza</option>
                    <option value="Shopee">Shopee</option>
                    <option value="Mercado Livre">Mercado Livre</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Número/Rastreio</label>
                  <input 
                    type="text"
                    value={formData.numero}
                    onChange={(e) => setFormData({...formData, numero: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    placeholder="Código de rastreamento"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Volumes</label>
                  <input 
                    type="number"
                    min="1"
                    value={formData.volumes}
                    onChange={(e) => setFormData({...formData, volumes: parseInt(e.target.value) || 1})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Observações</label>
                  <textarea 
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg h-20 resize-none"
                    placeholder="Observações..."
                  />
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
                  disabled={!formData.unidadeDesc || !formData.transportadora}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Registrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Retirada */}
      <AnimatePresence>
        {showRetireModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowRetireModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold">Registrar Retirada</h3>
                <button onClick={() => setShowRetireModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-500">
                  Encomenda para: <strong className="text-slate-900 dark:text-white">{selectedPackage?.unidadeDesc}</strong>
                </p>
                
                <div>
                  <label className="block text-sm font-bold mb-2">Quem retirou?</label>
                  <input 
                    type="text"
                    value={retiradoPor}
                    onChange={(e) => setRetiradoPor(e.target.value)}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    placeholder="Nome de quem retirou"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                <button 
                  onClick={() => setShowRetireModal(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleRetire}
                  disabled={!retiradoPor}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}