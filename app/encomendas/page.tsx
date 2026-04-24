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
  Ban,
  RotateCcw,
  History as HistoryLog,
  Calendar,
  Building,
  Check,
  Eye,
  CheckCircle2,
  Trash2,
  Archive,
  Settings,
  Pencil,
  PlusCircle,
  Info,
  LogIn,
  LogOut,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';
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
  residente?: { nome: string; celular: string; bloco: string; apto: string; tem_whatsapp?: boolean };
}

export default function EncomendasPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRetireModal, setShowRetireModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ATIVAS' | 'HISTORICO'>('ATIVAS');
  const [filter, setFilter] = useState('TODOS');
  const [statusFilter, setStatusFilter] = useState<'AGUARDANDO' | 'TODOS' | 'RETIRADA' | 'RECUSADA' | 'WHATSAPP'>('TODOS');
  const [dateFilter, setDateFilter] = useState<'HOJE' | 'TODOS'>('TODOS');
  const [retiradoPor, setRetiradoPor] = useState('');
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [residents, setResidents] = useState<any[]>([]);
  const [blocoSearch, setBlocoSearch] = useState('');
  const [apartamentoSearch, setApartamentoSearch] = useState('');
  const [showUnidadeDropdown, setShowUnidadeDropdown] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState<any | null>(null);
  const [randomPlaceholder, setRandomPlaceholder] = useState({ bloco: '08', apto: '302' });
  
  // Carrier Management States
  const [showSettings, setShowSettings] = useState(false);
  const [carriers, setCarriers] = useState<string[]>([]);
  const [newCarrier, setNewCarrier] = useState('');
  const [editingCarrierIdx, setEditingCarrierIdx] = useState<number | null>(null);
  const [editCarrierValue, setEditCarrierValue] = useState('');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    type: 'danger' | 'info' | 'success';
    confirmText?: string;
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {}, type: 'info' });

  const openConfirm = (title: string, description: string, onConfirm: () => void, type: 'danger' | 'info' | 'success' = 'info', confirmText?: string) => {
    setConfirmModal({ isOpen: true, title, description, onConfirm, type, confirmText });
  };

  useEffect(() => {
    if (showModal && residents.length > 0) {
      const validResidents = residents.filter(r => r.bloco && r.apto);
      if (validResidents.length > 0) {
        const randomRes = validResidents[Math.floor(Math.random() * validResidents.length)];
        setRandomPlaceholder({
          bloco: randomRes.bloco,
          apto: randomRes.apto
        });
      }
    }
  }, [showModal, residents]);

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
        residente:residents(nome, celular, bloco, apto),
        operador_recebe:operators!operador_recebimento_id(nome),
        operador_retira:operators!operador_retirada_id(nome),
        operador_recusa:operators!operador_recusa_id(nome)
      `)
      .order('recebida_em', { ascending: false })
      .limit(100);
    
    if (data) setPackages(data);
    setLoading(false);
  };

  const fetchCarriers = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'carriers')
      .single();
    
    if (data?.value) {
      setCarriers(data.value);
    } else {
      const defaults = ['CORREIOS', 'SEDEX', 'LOGGI', 'JADLOG', 'MERCADO LIVRE', 'AMAZON', 'FEDEX', 'DHL'];
      setCarriers(defaults);
    }
  };

  const handleSaveCarriers = async (updatedCarriers: string[]) => {
    setCarriers(updatedCarriers);
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key: 'carriers', value: updatedCarriers, updated_at: new Date().toISOString() });
    if (error) alert('Erro ao salvar transportadoras: ' + error.message);
  };

  useEffect(() => {
    fetchPackages();
    fetchResidents();
    fetchCarriers();
    getCurrentOperatorId(supabase).then(async (id) => {
      setOperatorId(id);
      if (id) {
        const { data: op } = await supabase.from('operators').select('role').eq('id', id).single();
        if (op) setUserRole(op.role || '');
      }
    });

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowRetireModal(false);
        setShowRejectModal(false);
        setShowDetailsModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
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
        openConfirm(
          'Aviso de Encomenda',
          '✅ Encomenda registrada! Deseja abrir o WhatsApp para avisar o morador agora?',
          () => {
            const now = new Date();
            const hour = now.getHours();
            const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
            const obsSuffix = formData.observacoes ? `\n\n*Observações:* ${formData.observacoes}` : '';
            const message = `${greeting} ${selectedUnidade.nome.split(' ')[0]}, uma nova encomenda da *${formData.transportadora}* chegou para você na Portaria!${obsSuffix}`;
            const whatsappUrl = `https://api.whatsapp.com/send?phone=${selectedUnidade.celular.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
            supabase.from('packages').update({ whatsapp_enviado: true }).eq('id', data.id).then(() => fetchPackages());
          },
          'success',
          'Enviar Agora'
        );
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

  const openDetails = (pkg: Package) => {
    setSelectedPackage(pkg);
    setShowDetailsModal(true);
  };

  const handleDeletePackage = async (pkg: Package) => {
    if (!pkg.id || userRole !== 'Owner') return;
    openConfirm(
      'Excluir Encomenda',
      '⚠️ ATENÇÃO: Deseja excluir permanentemente esta encomenda? Esta ação NÃO pode ser desfeita.',
      async () => {
        try {
          const { error } = await supabase.from('packages').delete().eq('id', pkg.id);
          if (error) throw error;
          fetchPackages();
        } catch (err: any) {
          alert('Erro ao excluir: ' + err.message);
        }
      },
      'danger',
      'Excluir Agora'
    );
  };

  const handleRevert = async (pkg: Package) => {
    openConfirm(
      'Reativar Encomenda',
      'Deseja reativar esta encomenda e movê-la de volta para "Aguardando"? Essa ação anulará a retirada ou recusa.',
      async () => {
        try {
          const { error } = await supabase.from('packages').update({
            status: 'AGUARDANDO',
            retirado_por: null,
            hora_retirada: null,
            operador_retirada_id: null,
            motivo_recusa: null,
            hora_recusa: null,
            operador_recusa_id: null
          }).eq('id', pkg.id);
          if (error) throw error;
          fetchPackages();
        } catch (err: any) {
          alert('Erro ao reativar: ' + err.message);
        }
      },
      'info',
      'Reativar Agora'
    );
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


  const isToday = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getDate() === now.getDate() && 
           d.getMonth() === now.getMonth() && 
           d.getFullYear() === now.getFullYear();
  };

  const pending = packages.filter(p => p.status === 'AGUARDANDO').length;
  const recebidasHoje = packages.filter(p => isToday(p.recebida_em)).length;
  const retiradasHoje = packages.filter(p => isToday(p.hora_retirada)).length;
  const avisosEnviados = packages.filter(p => p.whatsapp_enviado).length;

  const filtered = packages.filter(p => {
    const matchSearch = !search || 
      (p.unidade_desc?.toLowerCase().includes(search.toLowerCase())) ||
      (p.transportadora.toLowerCase().includes(search.toLowerCase()));
    
    if (!matchSearch) return false;

    if (activeTab === 'ATIVAS') {
        return p.status === 'AGUARDANDO';
    } else {
        // HISTORICO
        const matchBase = p.status !== 'AGUARDANDO';
        if (statusFilter === 'WHATSAPP') return p.whatsapp_enviado === true && matchBase;
        if (dateFilter === 'HOJE') {
            const dateMatch = statusFilter === 'RETIRADA' ? isToday(p.hora_retirada) : isToday(p.recebida_em);
            return dateMatch && matchBase;
        }
        if (statusFilter !== 'TODOS' && p.status !== statusFilter) return false;
        return matchBase;
    }
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
              <span className="p-2.5 bg-blue-500 rounded-xl text-white shadow-lg shadow-blue-500/20">
                <Package size={24} />
              </span>
              Encomendas
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">
              Controle de entregas e fluxo de correspondências
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={fetchPackages} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors uppercase">
              Atualizar
            </button>
            {(userRole === 'Owner' || userRole === 'Admin') && (
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-800"
                title="Configurações"
              >
                <Settings size={20} />
              </button>
            )}
            <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-black flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all">
              <Plus size={18} /> Nova Encomenda
            </button>
          </div>
        </div>

        {/* Panel Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
           {/* Pendentes */}
           <div 
             onClick={() => { setFilter('AGUARDANDO'); setStatusFilter('AGUARDANDO'); setDateFilter('TODOS'); }}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${filter === 'AGUARDANDO' ? 'bg-amber-500 border-amber-500 text-white scale-[1.02]' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30 hover:border-amber-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${filter === 'AGUARDANDO' ? 'text-amber-100' : 'text-amber-600'}`}>Aguardando</p>
             <p className={`text-2xl font-black ${filter === 'AGUARDANDO' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`}>{loading ? '-' : pending}</p>
           </div>
           
           {/* Recebidas Hoje */}
           <div 
             onClick={() => { setFilter('TODOS'); setStatusFilter('TODOS'); setDateFilter('HOJE'); }}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${filter === 'TODOS' && statusFilter === 'TODOS' && dateFilter === 'HOJE' ? 'bg-blue-600 border-blue-600 scale-[1.02]' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30 hover:border-blue-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${filter === 'TODOS' && statusFilter === 'TODOS' && dateFilter === 'HOJE' ? 'text-blue-100' : 'text-blue-600'}`}>Chegaram Hoje</p>
             <p className={`text-2xl font-black ${filter === 'TODOS' && statusFilter === 'TODOS' && dateFilter === 'HOJE' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>{loading ? '-' : recebidasHoje}</p>
           </div>
           
           {/* Retiradas Hoje */}
           <div 
             onClick={() => { setFilter('TODOS'); setStatusFilter('RETIRADA'); setDateFilter('HOJE'); }}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === 'RETIRADA' && dateFilter === 'HOJE' ? 'bg-emerald-500 border-emerald-500 scale-[1.02]' : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30 hover:border-emerald-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'RETIRADA' && dateFilter === 'HOJE' ? 'text-emerald-100' : 'text-emerald-600'}`}>Retiradas Hoje</p>
             <p className={`text-2xl font-black ${statusFilter === 'RETIRADA' && dateFilter === 'HOJE' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>{loading ? '-' : retiradasHoje}</p>
           </div>
           
           {/* Avisos */}
           <div 
             onClick={() => { setFilter('TODOS'); setStatusFilter('WHATSAPP'); setDateFilter('TODOS'); }}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === 'WHATSAPP' ? 'bg-indigo-600 border-indigo-600 text-white scale-[1.02]' : 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/30 hover:border-indigo-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'WHATSAPP' ? 'text-indigo-100' : 'text-indigo-600'}`}>Avisos via WhatsApp</p>
             <p className={`text-2xl font-black ${statusFilter === 'WHATSAPP' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`}>{loading ? '-' : avisosEnviados}</p>
           </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl self-stretch md:self-auto overflow-x-auto">
             <button 
               onClick={() => { setActiveTab('ATIVAS'); setFilter('AGUARDANDO'); setStatusFilter('AGUARDANDO'); setDateFilter('TODOS'); }} 
               className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'ATIVAS' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
               Aguardando Retirada
             </button>
             <button 
               onClick={() => { setActiveTab('HISTORICO'); setFilter('TODOS'); setStatusFilter('TODOS'); setDateFilter('TODOS'); }} 
               className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'HISTORICO' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
               <HistoryLog size={14} /> Histórico Completo
             </button>
           </div>

           <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                 type="text"
                 placeholder="Buscar por morador ou transportadora..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/20"
              />
           </div>
        </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] sm:min-w-0">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="text-left p-3 sm:p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Morador / Unidade</th>
                <th className="text-left p-3 sm:p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Transportadora</th>
                <th className="text-center p-3 sm:p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Volume</th>
                <th className="text-left p-3 sm:p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Data / Horário</th>
                <th className="text-left p-3 sm:p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                {activeTab !== 'HISTORICO' ? (
                   <th className="text-center p-3 sm:p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Ação Portaria</th>
                 ) : (
                   <th className="text-left p-3 sm:p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Responsável</th>
                 )}
                 <th className="text-right p-3 sm:p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">ADMIN</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhuma encomenda</td></tr>
              ) : filtered.map((pkg) => (
                <tr key={pkg.id} className="border-t border-slate-100 dark:border-slate-800">
                  
                  {/* 1) MORADOR / UNIDADE */}
                  <td className="p-4">
                    <div className="flex gap-3 items-center">
                      <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Package size={20} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="inline-block px-2 py-0.5 max-w-fit bg-slate-900/5 dark:bg-slate-800 rounded-md text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap uppercase tracking-wider">
                          {pkg.residente?.bloco ? `BLOCO ${String(pkg.residente.bloco).padStart(2, '0')}, APT ${pkg.residente.apto}` : (pkg.unidade_desc || '-')}
                        </span>
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                          {pkg.residente?.nome || 'Desconhecido'}
                          {pkg.residente?.tem_whatsapp && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 ml-2 align-middle" title="Possui WhatsApp" />
                          )}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* 2) TRANSPORTADORA */}
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                         <TruckIcon size={14} className="text-slate-500" />
                       </div>
                       <div className="flex flex-col">
                         <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">{pkg.transportadora}</span>
                         {pkg.numero && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{pkg.numero}</span>}
                       </div>
                    </div>
                  </td>

                  {/* 3) VOLUME */}
                  <td className="p-4 text-center">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md">{pkg.volumes}</span>
                  </td>

                  {/* 4) DATA / HORÁRIO */}
                  <td className="p-4">
                     <div className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-500">
                        <div className="flex items-center gap-1.5" title="Data de Recebimento">
                           <Calendar size={12} className="text-blue-500" />
                           <span className="uppercase tracking-widest">
                             {pkg.recebida_em ? `${new Date(pkg.recebida_em).toLocaleDateString('pt-BR')} · ${new Date(pkg.recebida_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '-'}
                           </span>
                        </div>
                        {activeTab === 'HISTORICO' && (pkg.hora_retirada || pkg.hora_recusa) && (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500" title={pkg.hora_retirada ? 'Data de Retirada' : 'Data de Recusa'}>
                             {pkg.hora_retirada ? <CheckCircle2 size={12} /> : <Ban size={12} className="text-red-500" />}
                             <span className={`uppercase tracking-widest ${pkg.hora_recusa ? 'text-red-500' : ''}`}>
                               {pkg.hora_retirada
                                 ? `${new Date(pkg.hora_retirada).toLocaleDateString('pt-BR')} · ${new Date(pkg.hora_retirada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                                 : pkg.hora_recusa
                                   ? `${new Date(pkg.hora_recusa).toLocaleDateString('pt-BR')} · ${new Date(pkg.hora_recusa).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                                   : ''}
                             </span>
                          </div>
                        )}
                     </div>
                  </td>

                  {/* 5) STATUS */}
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                        pkg.status === 'AGUARDANDO' ? 'bg-amber-50 dark:bg-amber-600/10 text-amber-700 dark:text-amber-500 border-amber-200 dark:border-amber-500/20' :
                        pkg.status === 'RETIRADA' ? 'bg-emerald-50 dark:bg-emerald-600/10 text-emerald-700 dark:text-emerald-500 border-emerald-200 dark:border-emerald-500/20' :
                        'bg-red-50 dark:bg-red-600/10 text-red-700 dark:text-red-500 border-red-200 dark:border-red-500/20'
                      }`}>
                        {pkg.status === 'AGUARDANDO' ? 'Aguardando' :
                         pkg.status === 'RETIRADA' ? 'Retirada' : 'Recusada'}
                      </span>
                      
                      {pkg.status === 'RETIRADA' && pkg.hora_retirada && (
                        <span className="text-[9px] font-bold text-emerald-600/70 border border-emerald-600/20 bg-emerald-50 dark:bg-emerald-900/10 px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm flex items-center gap-1">
                           <CheckCircle2 size={10} />
                           {new Date(pkg.hora_retirada).toLocaleDateString('pt-BR')} {new Date(pkg.hora_retirada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {pkg.status === 'RECUSADA' && pkg.hora_recusa && (
                        <span className="text-[9px] font-bold text-red-600/70 border border-red-600/20 bg-red-50 dark:bg-red-900/10 px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm flex items-center gap-1">
                           <Ban size={10} />
                           {new Date(pkg.hora_recusa).toLocaleDateString('pt-BR')} {new Date(pkg.hora_recusa).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 6) Ação Portaria ou RESPONSÁVEL */}
                  <td className="p-4">
                      {activeTab !== 'HISTORICO' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => { setSelectedPackage(pkg); setShowRetireModal(true); }}
                            className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-sm flex items-center gap-2 uppercase tracking-widest"
                          >
                            <CheckCircle2 size={16} /> Entregar
                          </button>
                          <button 
                            onClick={() => { setSelectedPackage(pkg); setShowRejectModal(true); }}
                            className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center gap-2 uppercase tracking-widest"
                            title="Recusar"
                          >
                            <Ban size={16} /> Recusar
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                             <div className="size-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-black">
                                {pkg.operador_retira?.nome?.charAt(0) || pkg.operador_recebe?.nome?.charAt(0) || 'S'}
                             </div>
                             {pkg.status === 'RETIRADA' ? (pkg.operador_retira?.nome || 'Operador') : (pkg.operador_recusa?.nome || 'Operador')}
                          </span>
                        </div>
                      )}
                   </td>

                  {/* 7) ADMIN (LUPA + REVERTER/ARQUIVAR + EXCLUIR OWNER) */}
                  <td className="p-4">
                     <div className="flex items-center justify-end gap-2">
                       {/* 1) LUPA (Sempre Primeiro) */}
                       <button 
                         onClick={() => openDetails(pkg)}
                         className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                         title="Ver Detalhes"
                       >
                         <Search size={16} />
                       </button>
                       
                       {/* 2) REVERTER / ARQUIVAR */}
                       {pkg.status !== 'AGUARDANDO' && (
                         <button 
                           onClick={() => handleRevert(pkg)}
                           className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                           title="Reverter para Aguardando"
                         >
                           <RotateCcw size={16} />
                         </button>
                       )}

                       {/* 3) EXCLUIR - Apenas Owner */}
                       {userRole === 'Owner' && (
                         <button 
                           onClick={() => handleDeletePackage(pkg)}
                           className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                           title="Excluir Registro (Owner)"
                         >
                           <Trash2 size={16} />
                         </button>
                       )}
                     </div>
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
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 relative">
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <Building size={16} />
                    UNIDADE DE DESTINO
                  </h4>
                  <div className="space-y-4">
                    {/* Campos Bloco e Apartamento */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="block text-sm font-bold mb-2 text-primary">Bloco (Número) *</label>
                        <input 
                          type="text"
                          inputMode="numeric"
                          value={blocoSearch}
                          onChange={(e) => {
                            setBlocoSearch(e.target.value);
                            setShowUnidadeDropdown(true);
                            setSelectedUnidade(null);
                          }}
                          onFocus={() => setShowUnidadeDropdown(true)}
                          className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white"
                          placeholder={randomPlaceholder.bloco}
                        />
                      </div>
                      <div className="relative">
                        <label className="block text-sm font-bold mb-2 text-primary">Apartamento (Número) *</label>
                        <input 
                          type="text"
                          inputMode="numeric"
                          value={apartamentoSearch}
                          onChange={(e) => {
                            setApartamentoSearch(e.target.value);
                            setShowUnidadeDropdown(true);
                            setSelectedUnidade(null);
                          }}
                          onFocus={() => setShowUnidadeDropdown(true)}
                          className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white"
                          placeholder={randomPlaceholder.apto}
                        />
                      </div>
                    </div>

                    {/* Dropdown de Resultados */}
                    {showUnidadeDropdown && filteredUnidades.length > 0 && (
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2">
                          {!blocoSearch && !apartamentoSearch && (
                             <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 rounded mb-1">
                               📋 SUGESTÕES DISPONÍVEIS:
                             </div>
                          )}
                          {filteredUnidades.map((r: any) => (
                            <button
                              key={r.id}
                              onClick={() => handleSelectUnidade(r)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 rounded transition-colors"
                            >
                              <p className="font-semibold text-sm text-slate-900 dark:text-white">
                                Bloco {r.bloco}, Apt {r.apto}
                              </p>
                              <p className="text-xs text-slate-500 uppercase font-bold mt-0.5">👤 {r.nome}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mensagem quando não há resultados */}
                    {showUnidadeDropdown && (blocoSearch || apartamentoSearch) && filteredUnidades.length === 0 && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 text-center">
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 font-semibold mb-2">
                          ❌ Nenhuma unidade encontrada
                        </p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-500">
                          Bloco {blocoSearch || '?'} Apt {apartamentoSearch || '?'} - Verifique se está cadastrado
                        </p>
                      </div>
                    )}

                    {/* SELEÇÃO */}
                    {selectedUnidade && (
                      <div className="mt-2 p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-between border-b-2 border-b-blue-600/50">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-1">Unidade Selecionada:</span>
                          <span className="font-bold text-slate-900 dark:text-white uppercase">Bloco {selectedUnidade.bloco}, Apt {selectedUnidade.apto}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setSelectedUnidade(null)}
                          className="p-1.5 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-primary">Transportadora *</label>
                  <select 
                    value={formData.transportadora}
                    onChange={(e) => setFormData({...formData, transportadora: e.target.value})}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold uppercase"
                  >
                    <option value="">Selecione...</option>
                    {carriers.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
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

      {/* Modal Detalhes EXTREME */}
      <AnimatePresence>
        {showDetailsModal && selectedPackage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
            onClick={() => setShowDetailsModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
                 <div>
                    <h2 className="text-xl lg:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                      <HistoryLog size={20} className="text-blue-500" />
                      Detalhes da Movimentação - Encomendas
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="inline-block px-2 py-0.5 bg-slate-900/5 dark:bg-slate-800 rounded-md text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap uppercase tracking-wider">
                         Bloco {selectedPackage.residente?.bloco || '00'}, Apt {selectedPackage.residente?.apto || '000'}
                       </span>
                       <span className="size-1 rounded-full bg-slate-400" />
                       <span className={`text-[10px] font-black uppercase tracking-widest ${
                         selectedPackage.status === 'AGUARDANDO' ? 'text-amber-500' : 
                         selectedPackage.status === 'RETIRADA' ? 'text-rose-500' : 
                         'text-red-500'
                       }`}>
                         • {selectedPackage.status}
                       </span>
                    </div>
                 </div>
                 <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                   <X size={20} className="text-slate-400" />
                 </button>
               </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900/50">
                <div className="space-y-4 relative">
                  <div className="absolute top-4 bottom-4 left-[21px] w-[2px] bg-slate-200 dark:bg-slate-700"></div>

                  {/* 1) Recebimento Portaria (Verde) */}
                  <div className="relative flex items-start gap-4">
                    <div className="p-2 rounded-full ring-4 ring-emerald-50 dark:ring-emerald-900/10 relative z-10 bg-emerald-100 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-800/50">
                        <LogIn size={16} />
                    </div>
                    <div className="flex-1 p-4 rounded-2xl bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/20 shadow-sm transition-all">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">1) Recebimento Portaria</span>
                              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                {selectedPackage.operador_recebe?.nome?.split(' ')[0] || 'SISTEMA'}
                              </span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                             <Clock size={10} /> {new Date(selectedPackage.recebida_em).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        {selectedPackage.observacoes && (
                           <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-300 italic">
                             "{selectedPackage.observacoes}"
                           </div>
                        )}
                    </div>
                  </div>
                  
                  {/* 2) Dados da Encomenda (Azul) */}
                  <div className="relative flex items-start gap-4">
                    <div className="p-2 rounded-full ring-4 ring-blue-50 dark:ring-blue-900/10 relative z-10 bg-blue-100 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800/50">
                        <Info size={16} />
                    </div>
                    <div className="flex-1 p-4 rounded-2xl bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/20 shadow-sm transition-all">
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">2) Dados da Encomenda</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Transportadora</span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">{selectedPackage.transportadora}</span>
                           </div>
                           <div>
                              <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Volumes</span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{selectedPackage.volumes}</span>
                           </div>
                           <div className="col-span-2">
                              <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Identificação / Objeto</span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{selectedPackage.numero || 'NÃO INFORMADO'}</span>
                           </div>
                        </div>
                    </div>
                  </div>

                  {(selectedPackage.whatsapp_enviado || selectedPackage.whatsapp_lido) && (
                    <div className="relative flex items-start gap-4">
                      <div className="p-2 rounded-full ring-4 ring-slate-50 dark:ring-slate-900 relative z-10 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 text-indigo-500">
                          <MessageSquare size={16} />
                      </div>
                      <div className="flex-1 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Aviso via WhatsApp</span>
                            {selectedPackage.whatsapp_lido ? (
                               <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary">
                                  <Eye size={10} /> LIDA
                               </span>
                            ) : (
                               <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-green-500">
                                  <Check size={10} /> ENVIADA
                               </span>
                            )}
                          </div>
                      </div>
                    </div>
                  )}
                  {/* 3) Finalização: Retirada (Verde) */}
                  {selectedPackage.status === 'RETIRADA' && (
                    <div className="relative flex items-start gap-4">
                      <div className="p-2 rounded-full ring-4 ring-rose-50 dark:ring-rose-900/10 relative z-10 bg-rose-100 border-rose-200 text-rose-600 dark:bg-rose-900/30 dark:border-rose-800/50">
                          <CheckCircle2 size={16} />
                      </div>
                      <div className="flex-1 p-4 rounded-2xl bg-rose-50/30 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/20 shadow-sm transition-all">
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400">3) Finalização: Retirada</span>
                                <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                  {selectedPackage.operador_retira?.nome?.split(' ')[0] || 'SISTEMA'}
                                </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                               <Clock size={10} /> {selectedPackage.hora_retirada ? new Date(selectedPackage.hora_retirada).toLocaleString('pt-BR') : ''}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                             Quem retirou: <span className="text-slate-900 dark:text-white uppercase font-black">{selectedPackage.retirado_por || 'NÃO INFORMADO'}</span>
                          </div>
                          {selectedPackage.observacoes && (
                             <div className="mt-2 text-xs text-rose-700 dark:text-rose-300 italic">
                               "{selectedPackage.observacoes}"
                             </div>
                          )}
                      </div>
                    </div>
                  )}

                  {selectedPackage.status === 'RECUSADA' && (
                    <div className="relative flex items-start gap-4">
                      <div className="p-2 rounded-full ring-4 ring-red-50 dark:ring-red-900/10 relative z-10 bg-red-100 border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-800/50">
                          <Ban size={16} />
                      </div>
                      <div className="flex-1 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800/20 shadow-sm transition-all">
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">3) Finalização: Recusada</span>
                                <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-[9px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                                  {selectedPackage.operador_recusa?.nome?.split(' ')[0] || 'SISTEMA'}
                                </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                               <Clock size={10} /> {selectedPackage.hora_recusa ? new Date(selectedPackage.hora_recusa).toLocaleString('pt-BR') : ''}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                             Motivo: <span className="text-red-600 dark:text-red-400 font-black italic">{selectedPackage.motivo_recusa}</span>
                          </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={16} /> Voltar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Transportadoras</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gerenciamento de Entregas</p>
                  </div>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {/* Adicionar Nova */}
                <div className="flex gap-3 mb-8">
                  <div className="flex-1 relative">
                    <PlusCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 opacity-50" size={18} />
                    <input 
                      type="text"
                      value={newCarrier}
                      onChange={(e) => setNewCarrier(e.target.value.toUpperCase())}
                      placeholder="NOME DA TRANSPORTADORA..."
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest focus:border-blue-500 outline-none transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCarrier.trim()) {
                          handleSaveCarriers([...carriers, newCarrier.trim()].sort());
                          setNewCarrier('');
                        }
                      }}
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if (newCarrier.trim()) {
                        handleSaveCarriers([...carriers, newCarrier.trim()].sort());
                        setNewCarrier('');
                      }
                    }}
                    className="px-6 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Lista de Transportadoras */}
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {carriers.map((carrier, idx) => (
                    <div key={idx} className="group flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-blue-200 dark:hover:border-blue-900/50 transition-all shadow-sm">
                      {editingCarrierIdx === idx ? (
                        <input 
                          autoFocus
                          value={editCarrierValue}
                          onChange={(e) => setEditCarrierValue(e.target.value.toUpperCase())}
                          onBlur={() => {
                            if (editCarrierValue.trim()) {
                              const updated = [...carriers];
                              updated[idx] = editCarrierValue.trim();
                              handleSaveCarriers(updated.sort());
                            }
                            setEditingCarrierIdx(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editCarrierValue.trim()) {
                                const updated = [...carriers];
                                updated[idx] = editCarrierValue.trim();
                                handleSaveCarriers(updated.sort());
                              }
                              setEditingCarrierIdx(null);
                            }
                            if (e.key === 'Escape') setEditingCarrierIdx(null);
                          }}
                          className="flex-1 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-xs font-black uppercase tracking-widest outline-none border border-blue-200"
                        />
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-500 transition-all">
                            <Truck size={14} />
                          </div>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">{carrier}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => {
                            setEditingCarrierIdx(idx);
                            setEditCarrierValue(carrier);
                          }}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-500 rounded-lg transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                        {(userRole === 'Owner' || userRole === 'Admin') && (
                          <button 
                            onClick={() => {
                              openConfirm(
                                'Remover Transportadora',
                                `Deseja remover "${carrier}" da lista de transportadoras cadastradas?`,
                                () => {
                                  const updated = carriers.filter((_, i) => i !== idx);
                                  handleSaveCarriers(updated);
                                },
                                'danger',
                                'Remover'
                              );
                            }}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      <ActionConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
      />
    </DashboardLayout>
  );
}