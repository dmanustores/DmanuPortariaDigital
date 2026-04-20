'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Car, 
  Plus, 
  Search,
  LogIn,
  LogOut,
  X,
  Save,
  Key,
  Clock,
  AlertTriangle,
  User,
  FileText,
  Building,
  CheckCircle2,
  History,
  AlertCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  Download,
  ShieldCheck,
  Ban,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { getCurrentOperatorId, capitalize, formatPlate, formatCPF, formatRG } from '@/lib/utils';
import { vehiclesService, VehicleAccessLog } from '@/lib/vehicles-service';

interface Vehicle {
  id: string;
  placa: string;
  modelo: string;
  cor: string;
  unidadeDesc?: string;
  unidadeId?: string;
  tipo: string;
  nomeProprietario?: string;
  telefone?: string;
  moradorId?: string;
  status: string;
  created_at: string;
  lastAccess?: VehicleAccessLog; // Novo: vínculo com o último acesso
}

// Tipo enriquecido com os JOINs do Supabase usados no histórico
interface VehicleAccessLogEnriched extends VehicleAccessLog {
  veiculo?: {
    placa: string;
    modelo: string;
    tipo: string;
    unidadedesc: string;
    nomeproprietario: string;
    cor?: string;
  };
  operador_entrada?: { nome: string };
  operador_saida?: { nome: string };
}

interface Resident {
  id: string;
  nome: string;
  bloco?: string;
  apto?: string;
  celular?: string;
  foto?: string;
  tipo?: string; // PROPRIETARIO | LOCATARIO
}

export default function VeiculosPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // Por padrão, todos os filtros vêm marcados
  const [activeFilters, setActiveFilters] = useState<string[]>(['PROPRIETARIO', 'LOCATARIO', 'VISITANTE', 'PRESTADOR']);
  const [moradorSearch, setMoradorSearch] = useState('');
  const [showMoradorDropdown, setShowMoradorDropdown] = useState(false);
  const [selectedMorador, setSelectedMorador] = useState<Resident | null>(null);
  const moradorRef = useRef<HTMLDivElement>(null);
  const unidadeRef = useRef<HTMLDivElement>(null);
  const [blocoSearch, setBlocoSearch] = useState('');
  const [apartamentoSearch, setApartamentoSearch] = useState('');
  const [showUnidadeDropdown, setShowUnidadeDropdown] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState<Resident | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    documento: '',
    tipoDocumento: 'CPF',
    placa: '',
    modelo: '',
    cor: '',
    unidadeDesc: '',
    tipo: 'VISITANTE',
    nomeProprietario: '',
    telefone: '',
    moradorId: ''
  });

  // --- NOVOS ESTADOS ---
  const [activeTab, setActiveTab] = useState<'ATIVOS' | 'HISTORICO'>('ATIVOS');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DENTRO' | 'PENDENCIAS' | 'HISTORICO'>('ALL');
  const [settings, setSettings] = useState({ tempo_alerta_permanencia: 480, tipo_padrao_novo_veiculo: 'VISITANTE' });
  const [accessHistory, setAccessHistory] = useState<VehicleAccessLogEnriched[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [selectedAccessId, setSelectedAccessId] = useState<string | null>(null);
  const [exitNotes, setExitNotes] = useState('');
  const [showSaidasHoje, setShowSaidasHoje] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moradorRef.current && !moradorRef.current.contains(event.target as Node)) {
        setShowMoradorDropdown(false);
      }
      if (unidadeRef.current && !unidadeRef.current.contains(event.target as Node)) {
        setShowUnidadeDropdown(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowSettings(false);
        setShowExitModal(false);
        setShowSaidasHoje(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const fetchResidents = async () => {
    const { data, error } = await supabase
      .from('residents')
      .select('id, nome, bloco, apto, celular, tipo')
      .order('nome');
    if (error) {
      console.error('❌ Erro ao buscar moradores:', error);
    }
    if (data) {
      console.log('✅ Moradores carregados:', data.length, 'total');
      setResidents(data);
    } else {
      console.log('⚠️ Nenhum morador retornado do banco');
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await vehiclesService.getSettings(supabase);
      setSettings(data);
    } catch (err) {
      console.warn('Erro ao carregar settings:', err);
    }
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('registros_acesso')
      .select(`
        *,
        veiculo:vehicles_registry(placa, modelo, tipo, unidadedesc, nomeproprietario, cor),
        operador_entrada:operators!operador_entrada_id(nome),
        operador_saida:operators!operador_saida_id(nome)
      `)
      .order('hora_entrada', { ascending: false })
      .limit(200);
    
    if (data) setAccessHistory(data);
  };

  const fetchVehicles = async () => {
    setLoading(true);
    // 1. Buscar veículos básicos
    const { data: vData } = await supabase
      .from('vehicles_registry')
      .select(`
        id,
        placa,
        modelo,
        cor,
        unidadeId:unidadeid,
        unidadeDesc:unidadedesc,
        tipo,
        nomeProprietario:nomeproprietario,
        telefone,
        moradorId:moradorid,
        status,
        created_at
      `)
      .order('created_at', { ascending: false });
    
    if (vData) {
      // 2. Buscar acessos ativos (DENTRO)
      const { data: aData } = await supabase
        .from('registros_acesso')
        .select('*')
        .eq('status', 'DENTRO');

      // 3. Mesclar dados
      const merged = vData.map((v: Vehicle) => {
        const last = aData?.find((a: VehicleAccessLog) => a.veiculo_id === v.id);
        return { ...v, lastAccess: last };
      });

      setVehicles(merged);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
    fetchResidents();
    fetchSettings();
    fetchHistory();
    getCurrentOperatorId(supabase).then(setOperatorId);
    
    // Identificar Role do Usuário
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.from('operators').select('role').eq('id', session.user.id).single();
        if (data) setUserRole(data.role);
      }
    };
    checkRole();

    // Timer de 60 segundos para atualização da permanência
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const filteredResidents = residents.filter(r => 
    r.nome.toLowerCase().includes(moradorSearch.toLowerCase())
  ).slice(0, 10);

  // Lista de unidades com bloco e apto preenchidos
  const unidadesDisponiveis = residents.filter(r => r.bloco && r.apto);
  
  useEffect(() => {
    console.log('📊 Debug Info:');
    console.log('- Total residents:', residents.length);
    console.log('- Residents com bloco/apto:', unidadesDisponiveis.length);
    if (residents.length > 0 && unidadesDisponiveis.length === 0) {
      console.warn('⚠️ ATENÇÃO: Moradores foram carregados mas NENHUM tem bloco/apto preenchido!');
      console.log('Sample resident sem bloco/apto:', residents[0]);
    }
  }, [residents]);

  const filteredUnidades = unidadesDisponiveis.filter(r => {
    // Converte para string e remove espaços
    const blocoStr = String(r.bloco).trim().padStart(2, '0');
    const numeroStr = String(r.apto).trim();
    const searchBloco = blocoSearch.trim().padStart(2, '0');
    const searchApartamento = apartamentoSearch.trim();

    // Se nenhum campo foi preenchido, mostra todas as unidades disponíveis
    if (!searchBloco && !searchApartamento) return true;

    // Filtra por bloco se preenchido
    if (searchBloco && !searchApartamento) {
      return blocoStr.includes(searchBloco);
    }

    // Filtra por apartamento se preenchido
    if (searchApartamento && !searchBloco) {
      return numeroStr.includes(searchApartamento);
    }

    // Filtra por ambos se preenchidos
    if (searchBloco && searchApartamento) {
      return blocoStr.includes(searchBloco) && numeroStr.includes(searchApartamento);
    }

    return false;
  }).slice(0, 15);

  const handleSelectMorador = (resident: Resident) => {
    setSelectedMorador(resident);
    setMoradorSearch(resident.nome);
    // Auto-set tipo based on resident type (PROPRIETARIO or LOCATARIO)
    const tipoResidente = resident.tipo === 'PROPRIETARIO' ? 'PROPRIETARIO' : 'LOCATARIO';
    setFormData({
      ...formData,
      nomeProprietario: resident.nome,
      telefone: resident.celular || '',
      moradorId: resident.id,
      tipo: tipoResidente,
      unidadeDesc: resident.bloco && resident.apto 
        ? `Bloco ${resident.bloco}, Apt ${resident.apto}` 
        : ''
    });
    setShowMoradorDropdown(false);
  };

  const handleSelectUnidade = (resident: Resident) => {
    setSelectedUnidade(resident);
    const unidadeDesc = resident.bloco && resident.apto 
      ? `Bloco ${resident.bloco}, Apt ${resident.apto}` 
      : '';
    setBlocoSearch(resident.bloco || '');
    setApartamentoSearch(resident.apto || '');
    setFormData({
      ...formData,
      unidadeDesc,
      moradorId: resident.id,
      telefone: resident.celular || ''
    });
    setShowUnidadeDropdown(false);
  };

  const clearMoradorSelection = () => {
    setSelectedMorador(null);
    setMoradorSearch('');
    setFormData({
      ...formData,
      nomeProprietario: '',
      telefone: '',
      moradorId: '',
      unidadeDesc: ''
    });
  };

  const clearUnidadeSelection = () => {
    setSelectedUnidade(null);
    setBlocoSearch('');
    setApartamentoSearch('');
    setFormData({
      ...formData,
      unidadeDesc: '',
      moradorId: ''
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.nome.trim() || !formData.documento.trim() || !formData.placa.trim() || !formData.unidadeDesc.trim() || !formData.moradorId) {
        alert('Por favor, preencha todos os campos obrigatórios (*).');
        return;
      }

      const placaUpper = formData.placa.toUpperCase();
      
      // 1. Verificar se o veículo já existe no cadastro
      let vehicleId = '';
      const { data: existingVehicle } = await supabase
        .from('vehicles_registry')
        .select('id')
        .eq('placa', placaUpper)
        .maybeSingle();

      if (existingVehicle) {
        vehicleId = existingVehicle.id;
      } else {
        // Criar veículo se não existe
        let unitId: string | null = null;
        const blocoMatch = formData.unidadeDesc.match(/bloco\s*([0-9a-z]+)/i);
        const aptoMatch  = formData.unidadeDesc.match(/apt[o]?\s*([0-9a-z]+)/i);
        if (blocoMatch && aptoMatch) {
          const { data: unitData } = await supabase.from('units').select('id')
            .eq('bloco', blocoMatch[1].padStart(2, '0')).eq('numero', aptoMatch[1]).maybeSingle();
          unitId = unitData?.id ?? null;
        }

        const { data: newV, error: vError } = await supabase.from('vehicles_registry').insert({
          placa: placaUpper,
          modelo: formData.modelo || null,
          cor: formData.cor || null,
          unidadeid: unitId,
          unidadedesc: formData.unidadeDesc,
          tipo: formData.tipo,
          nomeproprietario: formData.nome,
          telefone: formData.telefone || null,
          moradorid: formData.moradorId
        }).select().single();
        if (vError) throw vError;
        vehicleId = newV.id;
      }

      // 2. Registrar o Acesso (DENTRO)
      if (formData.tipo !== 'PROPRIETARIO' && formData.tipo !== 'LOCATARIO') {
        if (!operatorId) { alert('Sessão expirada. Faça login novamente.'); return; }
        await vehiclesService.registrarAcesso(supabase, {
          veiculo_id: vehicleId,
          status: 'DENTRO',
          operador_id: operatorId,
          hora_entrada: new Date().toISOString()
        });
      }
      
      alert('Veículo e acesso registrados com sucesso!');
      setShowModal(false);
      resetForm();
      fetchVehicles();
    } catch (err: any) {
      console.error('❌ Erro:', err);
      alert('Erro: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleOpenExitModal = (accessId: string) => {
    setSelectedAccessId(accessId);
    setExitNotes('');
    setShowExitModal(true);
  };

  const handleConfirmExit = async () => {
    if (!selectedAccessId || !operatorId) return;
    try {
      await vehiclesService.registrarSaida(supabase, selectedAccessId, {
        operador_id: operatorId,
        observacoes: exitNotes
      });
      setShowExitModal(false);
      fetchVehicles();
      fetchHistory();
    } catch (err) {
      alert('Erro ao registrar saída.');
    }
  };

  const saveConfig = async (newMinutes: number) => {
    try {
      const newSettings = { ...settings, tempo_alerta_permanencia: newMinutes };
      await vehiclesService.updateSettings(supabase, newSettings);
      setSettings(newSettings);
      setShowSettings(false);
      alert('Configuração salva!');
    } catch (err) {
      alert('Erro ao salvar configuração.');
    }
  };

  const exportCSV = () => {
    if (accessHistory.length === 0) return;
    const headers = ["Placa", "Modelo", "Tipo", "Proprietario/Visitante", "Unidade", "Status", "Entrada", "Saida", "Permanencia (min)", "Porteiro Entrada"];
    const rows = accessHistory.map((h: VehicleAccessLogEnriched) => [
      h.veiculo?.placa,
      h.veiculo?.modelo,
      h.veiculo?.tipo,
      h.veiculo?.nomeproprietario,
      h.veiculo?.unidadedesc,
      h.status,
      h.hora_entrada ? new Date(h.hora_entrada).toLocaleString('pt-BR') : '-',
      h.hora_saida ? new Date(h.hora_saida).toLocaleString('pt-BR') : '-',
      h.permanencia_minutos || '-',
      h.operador_entrada?.nome
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historico_veiculos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      documento: '',
      tipoDocumento: 'CPF',
      placa: '',
      modelo: '',
      cor: '',
      unidadeDesc: '',
      tipo: 'VISITANTE',
      nomeProprietario: '',
      telefone: '',
      moradorId: ''
    });
    setMoradorSearch('');
    setSelectedMorador(null);
    setBlocoSearch('');
    setApartamentoSearch('');
    setSelectedUnidade(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      await supabase.from('vehicles_registry').delete().eq('id', id);
      fetchVehicles();
    }
  };



  // --- COMPONENTES AUXILIARES ---

  const StatusBadge = ({ vehicle }: { vehicle: Vehicle }) => {
    if (vehicle.tipo === 'PROPRIETARIO' || vehicle.tipo === 'LOCATARIO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-200 uppercase">
          🔵 MORADOR
        </span>
      );
    }
    
    if (!vehicle.lastAccess) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-50 text-slate-500 border border-slate-200 uppercase">
          ⚪ FORA
        </span>
      );
    }

    const { status } = vehicle.lastAccess;
    const styles = {
      DENTRO: 'bg-green-50 text-green-600 border-green-200',
      SAIU: 'bg-slate-50 text-slate-500 border-slate-200',
      NEGADO: 'bg-red-50 text-red-600 border-red-200'
    };
    const icons = { DENTRO: '🟢', SAIU: '⚪', NEGADO: '🔴' };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]} {status}
      </span>
    );
  };

  const DurationBadge = ({ horaEntrada }: { horaEntrada: string }) => {
    const start = new Date(horaEntrada).getTime();
    const now = currentTime.getTime();
    const diffMin = Math.floor((now - start) / (1000 * 60));
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    
    const isAlert = diffMin > settings.tempo_alerta_permanencia;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold ${isAlert ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
        {isAlert ? '⚠️' : '⏱️'} {h > 0 ? `${h}h ` : ''}{m}min
      </span>
    );
  };

  // --- FILTRAGEM ---

  const filtered = vehicles.filter(v => {
    const isMorador = v.tipo === 'PROPRIETARIO' || v.tipo === 'LOCATARIO';
    const matchSearch = !search || 
      v.placa.toLowerCase().includes(search.toLowerCase()) ||
      (v.modelo?.toLowerCase().includes(search.toLowerCase())) ||
      (v.nomeProprietario?.toLowerCase().includes(search.toLowerCase()));
    
    const matchFilter = activeFilters.length === 0 || activeFilters.includes(v.tipo);
    
    if (activeTab === 'ATIVOS') {
      const baseMatch = isMorador || v.lastAccess?.status === 'DENTRO';
      const statusMatch = statusFilter === 'DENTRO' ? (v.lastAccess?.status === 'DENTRO') : true;
      
      // Lógica de Pendências unificada nos cards
      if (statusFilter === 'PENDENCIAS') {
         if (isMorador || !v.lastAccess || v.lastAccess.status !== 'DENTRO') return false;
         const diffMin = (currentTime.getTime() - new Date(v.lastAccess.hora_entrada).getTime()) / (1000 * 60);
         return matchSearch && matchFilter && (diffMin > settings.tempo_alerta_permanencia);
      }
      
      return matchSearch && matchFilter && baseMatch && statusMatch;
    }

    return false;
  });

  const pendenciasCount = vehicles.filter(v => {
    if (!v.lastAccess || v.lastAccess.status !== 'DENTRO') return false;
    const diffMin = (currentTime.getTime() - new Date(v.lastAccess.hora_entrada).getTime()) / (1000 * 60);
    return diffMin > settings.tempo_alerta_permanencia;
  }).length;

  const noCondominioCount = vehicles.filter(v => v.lastAccess?.status === 'DENTRO').length;
  const entradasHojeCount = accessHistory.filter(h => h.hora_entrada?.split('T')[0] === new Date().toISOString().split('T')[0]).length;

  return (
    <DashboardLayout>
      {/* HEADER & DASHBOARD */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Veículos</h2>
            <p className="text-slate-500 mt-1 text-sm font-bold uppercase tracking-widest">Controle operacional de acesso vehicular</p>
          </motion.div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button 
              onClick={fetchVehicles} 
              className="flex-1 md:flex-none px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors uppercase"
            >
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
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowModal(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-blue-500/20 transition-all uppercase tracking-widest"
            >
              <Plus size={18} />
              Nova Entrada
            </motion.button>
          </div>
        </div>

        {/* Panel Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           {/* Total Registrados */}
           <div 
             onClick={() => { setActiveTab('ATIVOS'); setStatusFilter('ALL'); }}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all hover:border-slate-400 ${activeTab === 'ATIVOS' && statusFilter === 'ALL' ? 'bg-slate-900 border-slate-900 text-white scale-[1.02]' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeTab === 'ATIVOS' && statusFilter === 'ALL' ? 'text-slate-400' : 'text-slate-400'}`}>Total Registrados</p>
             <p className={`text-2xl font-black ${activeTab === 'ATIVOS' && statusFilter === 'ALL' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{loading ? '-' : vehicles.length}</p>
           </div>
           
           {/* No Condomínio */}
           <div 
             onClick={() => { setActiveTab('ATIVOS'); setStatusFilter('DENTRO'); }}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all hover:border-emerald-400 ${activeTab === 'ATIVOS' && statusFilter === 'DENTRO' ? 'bg-emerald-500 border-emerald-500 text-white scale-[1.02]' : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeTab === 'ATIVOS' && statusFilter === 'DENTRO' ? 'text-emerald-100' : 'text-emerald-600'}`}>Dentro Agora</p>
             <p className={`text-2xl font-black ${activeTab === 'ATIVOS' && statusFilter === 'DENTRO' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>{loading ? '-' : noCondominioCount}</p>
           </div>
           
           {/* Entradas Hoje */}
           <div 
             onClick={() => { setActiveTab('HISTORICO'); setStatusFilter('HISTORICO'); }}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all hover:border-blue-400 ${activeTab === 'HISTORICO' ? 'bg-blue-500 border-blue-500 text-white scale-[1.02]' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeTab === 'HISTORICO' ? 'text-blue-100' : 'text-blue-600'}`}>Entradas Hoje</p>
             <p className={`text-2xl font-black ${activeTab === 'HISTORICO' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>{loading ? '-' : entradasHojeCount}</p>
           </div>

           {/* Alertas */}
           <div 
             onClick={() => { setActiveTab('ATIVOS'); setStatusFilter('PENDENCIAS'); }}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all hover:border-red-400 ${activeTab === 'ATIVOS' && statusFilter === 'PENDENCIAS' ? 'bg-red-500 border-red-500 text-white scale-[1.02]' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeTab === 'ATIVOS' && statusFilter === 'PENDENCIAS' ? 'text-red-100' : (pendenciasCount > 0 ? 'text-red-500' : 'text-red-600')}`}>Alertas Permanência</p>
             <p className={`text-2xl font-black ${activeTab === 'ATIVOS' && statusFilter === 'PENDENCIAS' ? 'text-white' : 'text-red-600 dark:text-red-400'}`}>{loading ? '-' : pendenciasCount}</p>
           </div>
        </div>

        {/* ALERT BANNER */}
        {pendenciasCount > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-red-600 text-white p-2.5 sm:p-3 rounded-lg sm:rounded-xl flex items-center justify-between shadow-lg shadow-red-600/20 cursor-pointer"
            onClick={() => { setActiveTab('ATIVOS'); setStatusFilter('PENDENCIAS'); }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <AlertCircle size={18} className="animate-pulse flex-none" />
              <span className="font-black text-[10px] sm:text-xs uppercase tracking-tight">⚠️ {pendenciasCount} pendências de permanência</span>
            </div>
            <History size={16} className="opacity-70" />
          </motion.div>
        )}
      </div>

        {/* Tab & Search Control Row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full md:w-auto overflow-x-auto scrollbar-hide">
              <button 
                onClick={() => { setActiveTab('ATIVOS'); setStatusFilter('ALL'); }}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-[10px] transition-all uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'ATIVOS' && statusFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                No Momento
              </button>
              <button 
                onClick={() => { setActiveTab('HISTORICO'); setStatusFilter('HISTORICO'); }}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-[10px] transition-all uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'HISTORICO' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <History size={14} /> Histórico
              </button>
           </div>

           <div className="flex w-full md:w-auto items-center gap-2 px-2">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Buscar placa, modelo ou unidade..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs transition-all focus:ring-4 focus:ring-blue-500/10 outline-none"
                />
              </div>
              {activeTab === 'HISTORICO' && (
                <button 
                  onClick={exportCSV}
                  className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                  title="Exportar CSV"
                >
                  <Download size={18} />
                </button>
              )}
           </div>
        </div>

      {/* LIST CONTENT */}
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        
        {/* ── MOBILE CARD VIEW (visível apenas em telas pequenas) ── */}
        <div className="block sm:hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">Carregando...</div>
          ) : (activeTab === 'HISTORICO' ? accessHistory : filtered).length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhum registro encontrado</div>
          ) : (activeTab === 'HISTORICO' ? accessHistory : filtered).map((item) => {
            const isHistory = activeTab === 'HISTORICO';
            const v = isHistory ? (item as any).veiculo : (item as Vehicle);
            const a = isHistory ? (item as any) : (item as Vehicle).lastAccess;
            const isMorador = v?.tipo === 'PROPRIETARIO' || v?.tipo === 'LOCATARIO';

            return (
              <div key={item.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 p-4">
                {/* Row 1: Placa + Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-900 dark:bg-black px-2 py-1 rounded border border-slate-600">
                      <span className="text-white font-mono font-black text-sm tracking-wider">{formatPlate(v?.placa)}</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{v?.modelo || '-'}</p>
                      {(v as any)?.cor && <p className="text-[9px] text-slate-400">{(v as any).cor}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isHistory ? (
                      <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black ${
                        a.status === 'SAIU' ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'
                      }`}>{a.status}</span>
                    ) : (
                      <StatusBadge vehicle={item as Vehicle} />
                    )}
                    {!isMorador && a?.hora_entrada && a?.status === 'DENTRO' && (
                      <DurationBadge horaEntrada={a.hora_entrada} />
                    )}
                    {isHistory && a.permanencia_minutos && (
                      <span className="text-[10px] font-bold text-slate-400">
                        ⏱️ {Math.floor(a.permanencia_minutos / 60)}h {a.permanencia_minutos % 60}min
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: Condutor | Unidade */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Condutor</p>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 leading-tight">{v?.nomeproprietario || v?.nomeProprietario || '-'}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{v?.tipo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unidade</p>
                    <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-[11px] font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {v?.unidadedesc || v?.unidadeDesc || '-'}
                    </span>
                  </div>
                </div>

                {/* Row 3: Timestamps (histórico) ou Ações */}
                {isHistory ? (
                  <div className="flex items-start justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col gap-1 text-[10px] font-bold text-slate-500">
                      <span className="flex items-center gap-1"><LogIn size={10} className="text-emerald-500" /> {new Date(a.hora_entrada).toLocaleString('pt-BR')}</span>
                      <span className="flex items-center gap-1"><LogOut size={10} className="text-red-500" /> {a.hora_saida ? new Date(a.hora_saida).toLocaleString('pt-BR') : '---'}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-[10px] font-black uppercase text-slate-500">
                      <p className="flex items-center gap-1"><LogIn size={10} className="text-emerald-500" /> {a.operador_entrada?.nome?.split(' ')[0] || '---'}</p>
                      {a.hora_saida && <p className="flex items-center gap-1"><LogOut size={10} className="text-red-500" /> {a.operador_saida?.nome?.split(' ')[0] || (a.operador_entrada?.nome?.split(' ')[0] || '---')}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {!isMorador && a?.status === 'DENTRO' && (
                      <button 
                        onClick={() => handleOpenExitModal(a.id)}
                        className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-[10px] font-black border border-emerald-100 hover:bg-emerald-100 transition-all"
                      >
                        <CheckCircle2 size={12} /> Registrar Saída
                      </button>
                    )}
                    {!isMorador && (!a || a.status !== 'DENTRO') && (
                      <button 
                        onClick={() => {
                          setFormData({ ...formData, placa: v.placa, modelo: v.modelo, cor: (v as any).cor, tipo: v.tipo, nomeProprietario: v.nomeproprietario, unidadeDesc: v.unidadedesc, moradorId: (v as any).moradorid });
                          setShowModal(true);
                        }}
                        className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black border border-blue-100 hover:bg-blue-100 transition-all"
                      >
                        <LogIn size={12} /> Nova Entrada
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── DESKTOP TABLE VIEW (visível apenas em sm e acima) ── */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Placa / Veículo</th>
                <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Proprietário / Visitante</th>
                <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unidade</th>
                <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status / Permanência</th>
                {activeTab !== 'HISTORICO' && <th className="text-right p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações</th>}
                {activeTab === 'HISTORICO' && (
                  <>
                    <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Entrada / Saída</th>
                    <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Responsável</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando dados...</td></tr>
              ) : (activeTab === 'HISTORICO' ? accessHistory : filtered).length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum registro encontrado</td></tr>
              ) : (activeTab === 'HISTORICO' ? accessHistory : filtered).map((item) => {
                const isHistory = activeTab === 'HISTORICO';
                const v = isHistory ? (item as any).veiculo : (item as Vehicle);
                const a = isHistory ? (item as any) : (item as Vehicle).lastAccess;
                const isMorador = v?.tipo === 'PROPRIETARIO' || v?.tipo === 'LOCATARIO';

                return (
                  <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                          <Car size={18} className="text-slate-500" />
                        </div>
                        <div>
                          <p className="font-mono font-black text-sm tracking-tighter">{formatPlate(v?.placa)}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">{v?.modelo || '-'} • { (item as any).cor || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200">{v?.nomeproprietario || v?.nomeProprietario || '-'}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">{v?.tipo}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                        {v?.unidadedesc || v?.unidadeDesc || '-'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        {isHistory ? (
                          <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black ${
                            a.status === 'SAIU' ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'
                          }`}>
                            {a.status}
                          </span>
                        ) : (
                          <StatusBadge vehicle={item as Vehicle} />
                        )}
                        {!isMorador && a?.hora_entrada && a?.status === 'DENTRO' && (
                          <DurationBadge horaEntrada={a.hora_entrada} />
                        )}
                        {isHistory && a.permanencia_minutos && (
                          <span className="text-[10px] font-bold text-slate-400 underline decoration-slate-200">
                            ⏱️ {Math.floor(a.permanencia_minutos / 60)}h {a.permanencia_minutos % 60}min
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {!isHistory ? (
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          {!isMorador && a?.status === 'DENTRO' && (
                            <button 
                              onClick={() => handleOpenExitModal(a.id)}
                              className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-[10px] font-black border border-emerald-100 hover:bg-emerald-100 transition-all"
                            >
                              <CheckCircle2 size={12} /> Registrar Saída
                            </button>
                          )}
                          {!isMorador && (!a || a.status !== 'DENTRO') && (
                            <button 
                              onClick={() => {
                                setFormData({ ...formData, placa: v.placa, modelo: v.modelo, cor: (v as any).cor, tipo: v.tipo, nomeProprietario: v.nomeproprietario, unidadeDesc: v.unidadedesc, moradorId: (v as any).moradorid });
                                setShowModal(true);
                              }}
                              className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black border border-blue-100 hover:bg-blue-100 transition-all"
                            >
                              <LogIn size={12} /> Nova Entrada
                            </button>
                          )}
                          {isMorador && (
                            <button className="text-slate-400 hover:text-slate-600">
                              <User size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="p-4">
                           <div className="flex flex-col gap-1 text-xs font-bold text-slate-600 dark:text-slate-400">
                              <span className="flex items-center gap-1" title="Horário de Entrada"><LogIn size={12} className="text-emerald-500" /> {a.hora_entrada ? new Date(a.hora_entrada).toLocaleString('pt-BR') : '-'}</span>
                              <span className="flex items-center gap-1" title="Horário de Saída"><LogOut size={12} className="text-red-500" /> {a.hora_saida ? new Date(a.hora_saida).toLocaleString('pt-BR') : '-'}</span>
                           </div>
                        </td>
                        <td className="p-4">
                           <div className="flex flex-col gap-1 text-[10px] font-bold uppercase text-slate-500">
                              <p className="flex items-center gap-1" title="Quem registrou entrada"><LogIn size={10} className="text-emerald-500" /> {a.operador_entrada?.nome?.split(' ')[0] || '---'}</p>
                              {a.hora_saida && (
                                <p className="flex items-center gap-1" title="Quem registrou saída"><LogOut size={10} className="text-red-500" /> {a.operador_saida?.nome?.split(' ')[0] || (a.operador_entrada?.nome?.split(' ')[0] || '---')}</p>
                              )}
                           </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


      {/* FOOTER SECTION: SAIDAS DE HOJE */}
      {activeTab === 'ATIVOS' && (
        <div className="mt-8">
           <button 
            onClick={() => setShowSaidasHoje(!showSaidasHoje)}
            className="flex items-center gap-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-all mb-4"
           >
             {showSaidasHoje ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
             Saídas de Hoje ({accessHistory.filter(h => h.hora_saida?.split('T')[0] === new Date().toISOString().split('T')[0]).length})
           </button>
           
           <AnimatePresence>
             {showSaidasHoje && (
               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                 <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                    {/* Simplified list of today's exits */}
                    {accessHistory
                      .filter(h => h.hora_saida?.split('T')[0] === new Date().toISOString().split('T')[0])
                      .map(h => (
                        <div key={h.id} className="flex items-center justify-between p-3 border-b border-slate-200/50 last:border-0">
                           <div className="flex items-center gap-4">
                             <span className="font-mono font-black text-xs">{formatPlate(h.veiculo?.placa)}</span>
                             <span className="text-[10px] font-bold text-slate-500 uppercase">{h.veiculo?.nomeproprietario}</span>
                           </div>
                           <span className="text-[10px] font-black text-slate-400">SAIU ÀS {new Date(h.hora_saida!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))
                    }
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      )}

      {/* MODAL EXIT CONFIRMATION */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6">
              <h3 className="text-xl font-black mb-4">Registrar Saída</h3>
              <p className="text-sm text-slate-500 mb-6 font-bold">Confirma a saída deste veículo agora?</p>
              
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Observações (Opcional)</label>
                <textarea 
                  value={exitNotes}
                  onChange={(e) => setExitNotes(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Ex: Deixou chave na portaria..."
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowExitModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-sm">Cancelar</button>
                <button onClick={handleConfirmExit} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/20">Confirmar Saída</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL SETTINGS */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="text-primary" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Configurações de Acesso</h3>
              </div>
              
              <div className="mb-6">
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Tempo Limite de Permanência (Horas)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="number"
                    defaultValue={settings.tempo_alerta_permanencia / 60}
                    id="limitInput"
                    min={1}
                    max={72}
                    className="w-28 p-4 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-2xl font-black text-center text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                  />
                  <div>
                    <span className="text-lg font-bold text-slate-700 dark:text-slate-300">Horas</span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">por veículo visitante</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3 font-bold uppercase leading-relaxed bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-lg p-2">
                  ⚠️ Veículos que excederem este tempo entrarão em alerta e aba de pendências.
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    const val = (document.getElementById('limitInput') as HTMLInputElement).value;
                    saveConfig(parseInt(val) * 60);
                  }}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 flex justify-between items-center">
                <h3 className="text-xl font-bold">Novo Cadastro de Veículo</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* SEÇÃO 1: DADOS PESSOAIS */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <User size={16} />
                    DADOS PESSOAIS / CONDUTOR
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2 text-primary">Nome Completo *</label>
                      <input 
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                        placeholder="Ex: João da Silva"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-2 text-primary">Tipo *</label>
                        <select 
                          value={formData.tipoDocumento}
                          onChange={(e) => setFormData({...formData, tipoDocumento: e.target.value})}
                          className="w-full p-3 bg-white text-slate-900 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg"
                        >
                          <option value="CPF">CPF</option>
                          <option value="RG">RG</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-bold mb-2 text-primary">{formData.tipoDocumento} *</label>
                        <input 
                          type="text"
                          value={formData.documento}
                          onChange={(e) => {
                            const val = e.target.value;
                            const masked = formData.tipoDocumento === 'CPF' ? formatCPF(val) : formatRG(val);
                            setFormData({...formData, documento: masked});
                          }}
                          className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white"
                          placeholder={formData.tipoDocumento === 'CPF' ? '000.000.000-00' : '00.000.000-0'}
                          maxLength={formData.tipoDocumento === 'CPF' ? 14 : 12}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 2: DADOS DO VEÍCULO */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <Car size={16} />
                    DADOS DO VEÍCULO
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2 text-primary">Placa *</label>
                        <input 
                          type="text"
                          value={formData.placa}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setFormData({...formData, placa: formatPlate(val)});
                          }}
                          className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-lg text-slate-900 dark:text-white"
                          placeholder="AAA-0000"
                          maxLength={8}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-2">Modelo</label>
                        <input 
                          type="text"
                          value={formData.modelo}
                          onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                          className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                          placeholder="Ex: Honda Civic"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Cor</label>
                        <input 
                          type="text"
                          value={formData.cor}
                          onChange={(e) => setFormData({...formData, cor: e.target.value})}
                          className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                          placeholder="Ex: Prata"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2 text-primary">Tipo de Veículo *</label>
                      <select 
                        value={formData.tipo}
                        onChange={(e) => {
                          const newTipo = e.target.value;
                          setFormData({
                            ...formData, 
                            tipo: newTipo
                          });
                        }}
                        className="w-full p-3 bg-white text-slate-900 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg"
                      >
                        <option value="VISITANTE">Veículo de Visitante</option>
                        <option value="PROPRIETARIO">Veículo de Proprietário</option>
                        <option value="LOCATARIO">Veículo de Locatário</option>
                        <option value="PRESTADOR">Veículo de Prestador</option>
                        <option value="MUDANCA">Veículo de Mudança</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 3: UNIDADE DE DESTINO */}
                <div ref={unidadeRef} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 relative">
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
                          }}
                          onFocus={() => setShowUnidadeDropdown(true)}
                          className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                          placeholder="1, 2, A, B..."
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
                          }}
                          onFocus={() => setShowUnidadeDropdown(true)}
                          className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                          placeholder="101, 201, 302..."
                        />
                      </div>
                    </div>

                    {/* Dropdown de Resultados */}
                    {showUnidadeDropdown && filteredUnidades.length > 0 && (
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2">
                          {!blocoSearch && !apartamentoSearch && (
                            <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700">
                              📋 SUGESTÕES DISPONÍVEIS:
                            </div>
                          )}
                          {filteredUnidades.map((resident) => (
                            <button
                              key={resident.id}
                              onClick={() => handleSelectUnidade(resident)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 rounded transition-colors"
                            >
                              <p className="font-semibold text-sm">
                                Bloco {resident.bloco}, Apt {resident.apto}
                              </p>
                              <p className="text-xs text-slate-500">👤 {resident.nome}</p>
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
                        <p className="text-xs text-yellow-600 dark:text-yellow-500 mb-3">
                          Bloco {blocoSearch || '?'} Apt {apartamentoSearch || '?'} - Verifique se está cadastrado
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setBlocoSearch('');
                            setApartamentoSearch('');
                          }}
                          className="text-xs px-3 py-1.5 bg-yellow-200 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100 rounded hover:bg-yellow-300 transition-colors"
                        >
                          Ver Sugestões
                        </button>
                      </div>
                    )}

                    {/* Mensagem se nenhuma unidade está cadastrada no sistema */}
                    {showUnidadeDropdown && unidadesDisponiveis.length === 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-center">
                        <p className="text-sm text-red-700 dark:text-red-400 font-semibold">
                          ⚠️ Nenhuma unidade cadastrada no sistema
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                          Cadastre moradores com informações de Bloco e Apartamento em Moradores
                        </p>
                      </div>
                    )}

                    {/* Confirmação da Unidade Selecionada */}
                    {formData.unidadeDesc && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Unidade Selecionada:</p>
                          <p className="text-sm font-bold text-blue-900 dark:text-blue-100">{formData.unidadeDesc}</p>
                        </div>
                        <button 
                          onClick={clearUnidadeSelection}
                          className="text-blue-600 hover:text-red-600 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 flex gap-3">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={!formData.nome || !formData.documento || !formData.placa || !formData.moradorId}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Salvar Veículo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}