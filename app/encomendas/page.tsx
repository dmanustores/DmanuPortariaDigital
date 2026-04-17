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
  AlertTriangle,
  Truck as TruckIcon,
  MessageSquare,
  Check,
  Eye,
  CheckCircle2,
  Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { lookupUnitId, getCurrentOperatorId, capitalize } from '@/lib/utils';
import { sendWhatsAppMessage } from '@/lib/whatsapp-service';

interface Package {
  id: string;
  unidade_desc?: string;
  transportadora: string;
  numero?: string;
  volumes: number;
  status: string;
  motivo_recusa?: string;
  retirado_por?: string;
  recebida_em: string;
  hora_retirada?: string;
  hora_recusa?: string;
  observacoes?: string;
  operador_recebe?: { nome: string };
  operador_retira?: { nome: string };
  operador_recusa?: { nome: string };
  whatsapp_enviado: boolean;
  whatsapp_lido: boolean;
  whatsapp_mensagem_id?: string;
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
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
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
      .select('id, nome, bloco, apto, celular, tem_whatsapp')
      .order('nome');
    if (data) setResidents(data);
  };

  const fetchPackages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('packages')
      .select(`
        *,
        operador_recebe:operators!operador_recebimento_id(nome),
        operador_retira:operators!operador_retirada_id(nome),
        operador_recusa:operators!operador_recusa_id(nome)
      `)
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
      
      const { data, error } = await supabase.from('packages').insert({
        unidade_id: selectedUnidade.id,
        unidade_desc: unidadeDesc,
        transportadora: formData.transportadora,
        numero: formData.numero || null,
        volumes: formData.volumes,
        observacoes: formData.observacoes || null,
        operador_recebimento_id: operatorId,
        status: 'AGUARDANDO',
        recebida_em: new Date().toISOString()
      }).select().single();

      if (error) throw error;

      // Sugerir envio de WhatsApp se o morador tiver
      if (selectedUnidade.tem_whatsapp && selectedUnidade.celular && data) {
        if (confirm('✅ Encomenda registrada! Deseja enviar o aviso via WhatsApp para o morador agora?')) {
          const now = new Date();
          const hour = now.getHours();
          const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
          const obsSuffix = formData.observacoes ? `\n\n*Observações:* ${formData.observacoes}` : '';
          
          const message = `${greeting} ${selectedUnidade.nome.split(' ')[0]}, uma nova encomenda da *${formData.transportadora}* chegou para você na Portaria!${obsSuffix}`;
          const whatsappUrl = `https://api.whatsapp.com/send?phone=${selectedUnidade.celular.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;
          
          // Abre em nova aba
          window.open(whatsappUrl, '_blank');
          
          // Marca como enviado no banco
          await supabase.from('packages').update({
            whatsapp_enviado: true
          }).eq('id', data.id);
        }
      } else {
        alert('✅ Encomenda registrada com sucesso!');
      }
      setShowModal(false);
      resetForm();
      fetchPackages();
    } catch (err: any) {
      console.error('❌ Erro completo ao salvar encomenda:', err);
      const errorMsg = err.message || err.error_description || 'Erro desconhecido';
      alert('Erro ao salvar encomenda: ' + errorMsg);
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
      retirado_por: retiradoPor,
      hora_retirada: new Date().toISOString(),
      operador_retirada_id: operatorId
    }).eq('id', selectedPackage.id);
    
    setShowRetireModal(false);
    setSelectedPackage(null);
    setRetiradoPor('');
    fetchPackages();
  };

  const handleReject = async () => {
    if (!selectedPackage || !motivoRecusa) return;

    try {
      const { error } = await supabase.from('packages').update({
        status: 'RECUSADA',
        motivo_recusa: motivoRecusa,
        hora_recusa: new Date().toISOString(),
        operador_recusa_id: operatorId
      }).eq('id', selectedPackage.id);

      if (error) throw error;

      setShowRejectModal(false);
      setSelectedPackage(null);
      setMotivoRecusa('');
      fetchPackages();
    } catch (err: any) {
      console.error('❌ Erro ao recusar encomenda:', err);
      alert('Erro ao recusar: ' + (err.message || 'Verifique sua conexão'));
    }
  };

  const toggleWhatsAppLido = async (pkg: Package) => {
    if (pkg.whatsapp_lido) return;

    const { error } = await supabase
      .from('packages')
      .update({ whatsapp_lido: true })
      .eq('id', pkg.id);
    
    if (!error) {
      fetchPackages();
    }
  };

  const handleManualWhatsApp = async (pkg: Package) => {
    // Busca o morador para pegar o telefone (se não estiver no pkg)
    const resident = residents.find(r => r.id === (pkg as any).unidade_id);
    if (!resident?.celular) {
      alert('Morador não possui celular cadastrado!');
      return;
    }

    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const obsSuffix = pkg.observacoes ? `\n\n*Observações:* ${pkg.observacoes}` : '';

    const message = `${greeting} ${resident.nome.split(' ')[0]}, uma nova encomenda da *${pkg.transportadora}* chegou para você na Portaria!${obsSuffix}`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${resident.celular.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    
    await supabase.from('packages').update({
      whatsapp_enviado: true
    }).eq('id', pkg.id);
    
    fetchPackages();
  };

  const pending = packages.filter(p => p.status === 'AGUARDANDO').length;

  const filtered = packages.filter(p => {
    const matchSearch = !search || 
      (p.unidade_desc?.toLowerCase().includes(search.toLowerCase())) ||
      (p.transportadora.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'TODOS' || p.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-4 sm:mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Encomendas</h2>
          <p className="text-slate-500 mt-0.5 sm:mt-1 text-xs sm:text-sm">Controle de entregas</p>
        </motion.div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="bg-amber-100 dark:bg-amber-900/30 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-amber-200 dark:border-amber-800">
            <span className="text-amber-700 dark:text-amber-400 font-black text-[10px] sm:text-xs uppercase tracking-tight">{pending} pendentes</span>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus size={16} />
            Nova Encomenda
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por unidade ou transportadora..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm shadow-sm"
          />
        </div>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 sm:py-3 bg-white text-slate-900 dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold outline-none shadow-sm"
        >
          <option value="TODOS">Todos Status</option>
          <option value="AGUARDANDO">Aguardando</option>
          <option value="RETIRADA">Retiradas</option>
          <option value="RECUSADA">Recusadas</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] sm:min-w-0">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="text-left p-3 sm:p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unidade</th>
                <th className="text-left p-3 sm:p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Transportadora</th>
                <th className="text-left p-3 sm:p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Volumes</th>
                <th className="text-center p-3 sm:p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Recebimento</th>
                <th className="text-left p-3 sm:p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="text-center p-3 sm:p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">WhatsApp</th>
                <th className="text-center p-3 sm:p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações</th>
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
                    <span className="font-semibold text-sm">{pkg.unidade_desc || '-'}</span>
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
                    <div className="flex flex-col items-center leading-tight">
                      <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                        {pkg.recebida_em ? new Date(pkg.recebida_em).toLocaleDateString('pt-BR') : '-'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {pkg.recebida_em ? new Date(pkg.recebida_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      {pkg.operador_recebe?.nome && (
                        <span className="text-[9px] uppercase font-bold text-primary mt-1">
                          RECEBIDO: {pkg.operador_recebe.nome.split(' ')[0]}
                        </span>
                      )}
                    </div>
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
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-1">
                      {pkg.whatsapp_enviado ? (
                        <button 
                          onClick={() => toggleWhatsAppLido(pkg)}
                          className={`flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-2 py-1.5 rounded-lg border border-green-100 dark:border-green-800 transition-all ${
                            pkg.whatsapp_lido ? 'cursor-default' : 'hover:scale-105 cursor-pointer'
                          }`}
                          title={pkg.whatsapp_lido ? "Mensagem confirmada como lida" : "Clique para marcar como lida"}
                        >
                          {pkg.whatsapp_lido ? (
                            <>
                              <Eye size={12} className="text-primary animate-pulse" />
                              <span className="text-[10px] font-black text-primary uppercase leading-none">Lida</span>
                            </>
                          ) : (
                            <>
                              <Check size={12} className="text-green-600" />
                              <span className="text-[10px] font-bold text-green-600 uppercase leading-none">Enviada</span>
                            </>
                          )}
                        </button>
                      ) : pkg.status === 'AGUARDANDO' ? (
                        <button 
                          onClick={() => handleManualWhatsApp(pkg)}
                          className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-primary/10 hover:border-primary/30 transition-all group"
                          title="Clique para enviar notificação via WhatsApp"
                        >
                          <MessageSquare size={12} className="text-slate-400 group-hover:text-primary" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase leading-none group-hover:text-primary">Notificar</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 opacity-30 grayscale cursor-not-allowed">
                          <MessageSquare size={12} className="text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">-</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {pkg.status === 'AGUARDANDO' && (
                      <div className="flex justify-center gap-1.5">
                        <button 
                          onClick={() => {
                            setSelectedPackage(pkg);
                            setShowRetireModal(true);
                          }}
                          title="Registrar Retirada"
                          className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors border border-emerald-100 dark:border-emerald-800/50"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedPackage(pkg);
                            setShowRejectModal(true);
                          }}
                          title="Recusar Encomenda"
                          className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-100 dark:border-red-800/50"
                        >
                          <Ban size={18} />
                        </button>
                      </div>
                    )}

                    {pkg.status === 'RETIRADA' && pkg.retirado_por && (
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-xs font-bold text-emerald-600 mb-1">
                          Retirado por: {pkg.retirado_por}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase font-medium">
                          {pkg.hora_retirada ? new Date(pkg.hora_retirada).toLocaleDateString('pt-BR') : ''} - {pkg.hora_retirada ? new Date(pkg.hora_retirada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        {pkg.operador_retira?.nome && (
                          <span className="text-[9px] uppercase font-black text-primary mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 w-full text-center">
                            PORTEIRO: {pkg.operador_retira.nome.toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}

                    {pkg.status === 'RECUSADA' && (
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[10px] uppercase font-black text-red-600 block mb-1">RECUSADA</span>
                        <span className="text-xs font-bold text-red-600 mb-1">
                          "{pkg.motivo_recusa}"
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase font-medium">
                          {pkg.hora_recusa ? `${new Date(pkg.hora_recusa).toLocaleDateString('pt-BR')} - ${new Date(pkg.hora_recusa).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '-'}
                        </span>
                        {pkg.operador_recusa?.nome && (
                          <span className="text-[9px] uppercase font-black text-primary mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 w-full text-center">
                            PORTEIRO: {pkg.operador_recusa.nome.toUpperCase()}
                          </span>
                        )}
                      </div>
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
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
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
                    disabled={!selectedUnidade || !formData.transportadora}
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
                  Encomenda para: <strong className="text-slate-900 dark:text-white">{selectedPackage?.unidade_desc}</strong>
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
      {/* Modal Recusa */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-red-600">Recusar Encomenda</h3>
                <button onClick={() => setShowRejectModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-500">
                  Unidade: <strong className="text-slate-900 dark:text-white">{selectedPackage?.unidade_desc}</strong>
                </p>
                
                <div>
                  <label className="block text-sm font-bold mb-2">Motivo da Recusa *</label>
                  <textarea 
                    value={motivoRecusa}
                    onChange={(e) => setMotivoRecusa(e.target.value)}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg h-32 resize-none"
                    placeholder="Ex: Destinatário não mora mais aqui, Embalagem avariada, etc..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                <button 
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleReject}
                  disabled={!motivoRecusa}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <AlertTriangle size={18} />
                  Confirmar Recusa
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}