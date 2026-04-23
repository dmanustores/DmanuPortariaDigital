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
  Calendar,
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
  ChevronLeft,
  Download,
  ShieldCheck,
  Ban,
  Trash2,
  Archive,
  RotateCcw,
  Truck,
  UserPlus,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';
import { getCurrentOperatorId, capitalize, formatPlate, formatCPF, formatRG } from '@/lib/utils';
import { vehiclesService, VehicleAccessLog } from '@/lib/vehicles-service';

interface Vehicle {
  id: string;
  placa: string;
  modelo: string;
  cor: string;
  unidadeDesc?: string;
  unidadedesc?: string; // Compatibilidade Supabase
  unidadeId?: string;
  tipo: string;
  nomeProprietario?: string;
  nomeproprietario?: string; // Compatibilidade Supabase
  telefone?: string;
  moradorId?: string;
  moradorid?: string; // Compatibilidade Supabase
  status: string;
  created_at: string;
  operador_id?: string;
  criado_por_nome?: string;
  observacoes?: string;
  operador?: { nome: string; role: string };
  lastAccess?: EnrichedVehicleAccessLog; 
}

interface EnrichedVehicleAccessLog extends VehicleAccessLog {
  operador_entrada_nome?: string;
  operador_saida_nome?: string;
  obs_saida?: string;
}

interface VehicleInteraction {
  id: string;
  vehicle_id: string;
  operador_id: string;
  tipo: string;
  mensagem?: string;
  created_at: string;
  operador?: { nome: string; role: string };
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
    moradorId: '',
    observacoes: ''
  });

  // --- NOVOS ESTADOS ---
  const [activeTab, setActiveTab] = useState<'ATIVOS' | 'HISTORICO'>('ATIVOS');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DENTRO' | 'PENDENCIAS' | 'MORADORES'>('ALL');
  const [settings, setSettings] = useState({ tempo_alerta_permanencia: 480, tipo_padrao_novo_veiculo: 'VISITANTE' });
  const [accessHistory, setAccessHistory] = useState<VehicleAccessLogEnriched[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [selectedAccessId, setSelectedAccessId] = useState<string | null>(null);
  const [exitNotes, setExitNotes] = useState('');
  const [showSaidasHoje, setShowSaidasHoje] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  
  // Estados de Auditoria e Arquivamento
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedAccess, setSelectedAccess] = useState<EnrichedVehicleAccessLog | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [reopenAccessId, setReopenAccessId] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<VehicleInteraction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [operatorMap, setOperatorMap] = useState<Record<string, { nome: string; role: string }>>({});
  const [randomPlaceholder, setRandomPlaceholder] = useState({ bloco: '08', apto: '302' });

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
          bloco: randomRes.bloco as string,
          apto: randomRes.apto as string
        });
      }
    }
  }, [showModal, residents]);

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
        setShowDetailsModal(false);
        setShowArchiveModal(false);
        setShowReopenModal(false);
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

  const fetchOperators = async () => {
    const { data } = await supabase.from('operators').select('id, nome, role');
    if (data) {
      const map: Record<string, { nome: string; role: string }> = {};
      data.forEach((op: any) => { 
        map[op.id] = { nome: op.nome, role: op.role }; 
      });
      setOperatorMap(map);
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
        veiculo:vehicles_registry(id, status, placa, modelo, tipo, unidadedesc, nomeproprietario, cor)
      `)
      .order('hora_entrada', { ascending: false })
      .limit(200);
    
    if (data) {
       // Histórico mostra apenas quem já SAIU ou se o veículo foi arquivado
       const historyOnly = data.filter((h: any) => h.status === 'SAIU' || h.veiculo?.status === 'ARQUIVADO');
       
       // Sincronizar nomes de operadores manualmente para evitar falhas de cache do PostgREST
       const enrichedHistory = historyOnly.map((h: any) => {
         const opEnt = operatorMap[h.operador_entrada_id];
         const opSai = operatorMap[h.operador_saida_id];
         
         return {
           ...h,
           operador_entrada: h.operador_entrada_id ? { 
             nome: opEnt?.role === 'Owner' ? 'System Master' : (opEnt?.nome || h.operador_entrada?.nome || 'SISTEMA') 
           } : null,
           operador_saida: h.operador_saida_id ? { 
             nome: opSai?.role === 'Owner' ? 'System Master' : (opSai?.nome || h.operador_saida?.nome || 'SISTEMA') 
           } : null
         };
       });

       setAccessHistory(enrichedHistory);
    }
  };

  const fetchInteractions = async (vehicleId: string) => {
    setLoadingInteractions(true);
    const { data } = await supabase
      .from('vehicle_interactions')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: true });
    
    if (data) {
      const enriched = data.map((i: any) => ({
        ...i,
        operador: i.operador_id ? { nome: operatorMap[i.operador_id] || 'SISTEMA' } : null
      }));
      setInteractions(enriched);
    }
    setLoadingInteractions(false);
  };

  const fetchVehicles = async () => {
    setLoading(true);
    // 1. Buscar veículos básicos
    const { data: vData, error: vError } = await supabase
      .from('vehicles_registry')
      .select('*')
      .order('created_at', { ascending: false });

    if (vError) {
      console.error('❌ Erro Supabase (fetchVehicles):', vError.message || 'Erro desconhecido', vError);
      setLoading(false);
      return;
    }
    
    if (vData) {
      // 2. Buscar acessos ativos (DENTRO)
      const { data: aData } = await supabase
        .from('registros_acesso')
        .select('*')
        .eq('status', 'DENTRO');

      // 3. Mesclar dados
      const merged = vData.map((raw: any) => {
        // Normalização de campos (CamelCase + lowercase fallback)
        const v: Vehicle = {
          ...raw,
          id: raw.id,
          placa: raw.placa,
          modelo: raw.modelo,
          cor: raw.cor,
          unidadeId: raw.unidadeid || raw.unidadeId,
          unidadeDesc: raw.unidadedesc || raw.unidadeDesc,
          tipo: raw.tipo,
          nomeProprietario: raw.nomeproprietario || raw.nomeProprietario,
          status: raw.status,
          moradorId: raw.moradorid || raw.moradorId,
          created_at: raw.created_at
        };
        const last = aData?.find((a: VehicleAccessLog) => a.veiculo_id === v.id);
        return { ...v, lastAccess: last };
      });

      setVehicles(merged);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOperators();
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
      moradorId: '',
      observacoes: ''
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

        // Log de Criação
        await supabase.from('vehicle_interactions').insert({
          vehicle_id: vehicleId,
          operador_id: operatorId,
          tipo: 'CRIACAO',
          mensagem: formData.observacoes || 'Registro inicial do veículo no sistema'
        });
      }

      // 2. Registrar o Acesso (DENTRO)
      if (formData.tipo !== 'PROPRIETARIO' && formData.tipo !== 'LOCATARIO') {
        if (!operatorId) { alert('Sessão expirada. Faça login novamente.'); return; }
        await vehiclesService.registrarAcesso(supabase, {
          veiculo_id: vehicleId,
          status: 'DENTRO',
          operador_id: operatorId,
          hora_entrada: new Date().toISOString(),
          observacoes: formData.observacoes
        });

        // Log de Entrada
        await supabase.from('vehicle_interactions').insert({
          vehicle_id: vehicleId,
          operador_id: operatorId,
          tipo: 'ENTRADA',
          mensagem: formData.observacoes || 'Entrada autorizada pelo porteiro'
        });
      }
      
      alert('Veículo e acesso registrados com sucesso!');
      setShowModal(false);
      resetForm();
      fetchVehicles();
    } catch (err: any) {
      const msg = err?.message || err?.details || err?.hint || JSON.stringify(err);
      const code = err?.code ? ` [code: ${err.code}]` : '';
      console.error('❌ Erro ao salvar veículo:', err);
      alert(`Erro ao salvar veículo${code}: ${msg || 'Erro desconhecido'}`);
    }
  };

  const handleArchive = async () => {
    if (!selectedVehicle || !archiveReason.trim()) return;
    try {
      const { error } = await supabase.from('vehicles_registry').update({
        status: 'ARQUIVADO'
      }).eq('id', selectedVehicle.id);

      if (error) throw error;

      await supabase.from('vehicle_interactions').insert({
        vehicle_id: selectedVehicle.id,
        operador_id: operatorId,
        tipo: 'ARQUIVAMENTO',
        mensagem: archiveReason.trim()
      });

      setShowArchiveModal(false);
      setArchiveReason('');
      setSelectedVehicle(null);
      fetchVehicles();
    } catch (err) {
      alert('Erro ao arquivar veículo.');
    }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) return;
    
    try {
      if (reopenAccessId) {
        // --- CASO 1: Reativar uma movimentação (Access Log) ---
        // 1. Voltar o status para 'DENTRO' e limpar a saída
        const { data: access, error: accError } = await supabase
          .from('registros_acesso')
          .update({
            status: 'DENTRO',
            hora_saida: null,
            operador_saida_id: null
          })
          .eq('id', reopenAccessId)
          .select('veiculo_id')
          .single();
        
        if (accError) throw accError;

        // 2. Registrar a interação de reativação
        await supabase.from('vehicle_interactions').insert({
          vehicle_id: access.veiculo_id,
          operador_id: operatorId,
          tipo: 'REABERTURA',
          mensagem: `Movimentação reativada: ${reopenReason.trim()}`
        });

        alert('Movimentação reativada com sucesso!');
      } else if (selectedVehicle) {
        // --- CASO 2: Reativar um cadastro arquivado (Vehicle) ---
        const { error } = await supabase.from('vehicles_registry').update({
          status: 'ATIVO'
        }).eq('id', selectedVehicle.id);

        if (error) throw error;

        await supabase.from('vehicle_interactions').insert({
          vehicle_id: selectedVehicle.id,
          operador_id: operatorId,
          tipo: 'REABERTURA',
          mensagem: `Cadastro reativado: ${reopenReason.trim()}`
        });

        alert('Cadastro de veículo reativado!');
      }

      setShowReopenModal(false);
      setReopenReason('');
      setReopenAccessId(null);
      setSelectedVehicle(null);
      fetchVehicles();
      fetchHistory();
    } catch (err) {
      console.error('Erro ao reabrir:', err);
      alert('Erro ao reprocessar reabertura.');
    }
  };

  const handleSairSemData = (accessId: string) => {
    handleOpenExitModal(accessId);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!vehicleId || userRole !== 'Owner') return;
    openConfirm(
      'Excluir Veículo',
      '⚠️ ATENÇÃO: Esta ação apagará o veículo e TODO o histórico de visitas permanentemente. Não pode ser desfeita!',
      async () => {
        try {
          const { error } = await supabase.from('vehicles_registry').delete().eq('id', vehicleId);
          if (error) throw error;
          fetchVehicles();
          fetchHistory();
        } catch (err: any) {
          alert('Erro ao remover registro: ' + (err.message || 'Erro desconhecido'));
        }
      },
      'danger',
      'Excluir Permanentemente'
    );
  };

  const openDetails = (v: Vehicle, access?: VehicleAccessLog) => {
    setSelectedVehicle(v);
    setSelectedAccess(access || v.lastAccess || null);
    setInteractions([]);
    fetchInteractions(v.id);
    setShowDetailsModal(true);
  };

  const openArchive = (v: Vehicle) => {
    setSelectedVehicle(v);
    setArchiveReason('');
    setShowArchiveModal(true);
  };

  const openReopen = (v: Vehicle, accessId?: string) => {
    setSelectedVehicle(v);
    setReopenAccessId(accessId || null);
    setReopenReason('');
    setShowReopenModal(true);
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

      // Log de Saída
      const { data: acc } = await supabase.from('registros_acesso').select('veiculo_id').eq('id', selectedAccessId).single();
      if (acc) {
        await supabase.from('vehicle_interactions').insert({
          vehicle_id: acc.veiculo_id,
          operador_id: operatorId,
          tipo: 'SAIDA',
          mensagem: exitNotes || 'Saída registrada pelo porteiro'
        });
      }

      setShowExitModal(false);
      fetchVehicles();
      fetchHistory();
    } catch (err) {
      alert('Erro ao registrar saída.');
    }
  };

  const handleReactivateAccess = async (accessId: string) => {
    try {
      // 1. Voltar o status para 'DENTRO' e limpar a saída
      const { data: access, error: accError } = await supabase
        .from('registros_acesso')
        .update({
          status: 'DENTRO',
          hora_saida: null,
          operador_saida_id: null
        })
        .eq('id', accessId)
        .select('veiculo_id')
        .single();
      
      if (accError) throw accError;

      // 2. Registrar a interação de reativação
      await supabase.from('vehicle_interactions').insert({
        vehicle_id: access.veiculo_id,
        operador_id: operatorId,
        tipo: 'REABERTURA',
        mensagem: 'Movimentação reativada pelo operador para correção.'
      });

      alert('Movimentação reativada com sucesso!');
      fetchVehicles();
      fetchHistory();
    } catch (err) {
      console.error('Erro ao reativar:', err);
      alert('Erro ao reativar movimentação.');
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
      moradorId: '',
      observacoes: ''
    });
    setMoradorSearch('');
    setSelectedMorador(null);
    setBlocoSearch('');
    setApartamentoSearch('');
    setSelectedUnidade(null);
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
    const isMorador = v.tipo?.toUpperCase() === 'PROPRIETARIO' || v.tipo?.toUpperCase() === 'LOCATARIO';
    const matchSearch = !search || 
      v.placa.toLowerCase().includes(search.toLowerCase()) ||
      ((v.modelo || '').toLowerCase().includes(search.toLowerCase())) ||
      ((v.nomeProprietario || v.nomeproprietario || '').toLowerCase().includes(search.toLowerCase())) ||
      ((v.unidadeDesc || v.unidadedesc || '').toLowerCase().includes(search.toLowerCase()));
    
    const matchFilter = activeFilters.length === 0 || activeFilters.includes(v.tipo?.toUpperCase());
    
    if (activeTab === 'ATIVOS') {
      // Na Lista Ativa, mostramos apenas quem está DENTRO ou o que estiver filtrado como pendência
      // Escondemos arquivados
      if (v.status === 'ARQUIVADO') return false;

      const isInside = v.lastAccess?.status === 'DENTRO';

      // Por padrão em ATIVOS, mostramos quem não está ARQUIVADO
      // Mas se houver filtros específicos de status (Dentro/Pendências), aplicamos.
      if (statusFilter === 'DENTRO') {
         return matchSearch && matchFilter && isInside;
      }

      if (statusFilter === 'MORADORES') {
         return matchSearch && matchFilter && isMorador;
      }

      if (statusFilter === 'PENDENCIAS') {
         if (isMorador || !isInside || !v.lastAccess) return false;
         const diffMin = (currentTime.getTime() - new Date(v.lastAccess.hora_entrada).getTime()) / (1000 * 60);
         return matchSearch && matchFilter && (diffMin > settings.tempo_alerta_permanencia);
      }

      // Por padrão em ATIVOS (filtro 'ALL'), mostramos:
      // 1. Todos os Moradores cadastrados (PROPRIETARIO/LOCATARIO)
      // 2. Visitantes/Prestadores que estão atualmente 'DENTRO'
      return matchSearch && matchFilter && (isMorador || isInside);
    }

    if (activeTab === 'HISTORICO') {
       // O histórico de Veículos continuará vindo do accessHistory separadamente por enquanto
       // para manter performance, mas retornamos false aqui para a lista de 'ATIVOS' não duplicar.
       return false;
    }

    return false;
  });

   const moradoresRegistradosCount = vehicles.filter(v => 
     (v.tipo?.toUpperCase() === 'PROPRIETARIO' || v.tipo?.toUpperCase() === 'LOCATARIO') && v.status !== 'ARQUIVADO'
   ).length;

   const visitantesNoCondominioCount = vehicles.filter(v => 
     v.tipo?.toUpperCase() !== 'PROPRIETARIO' && v.tipo?.toUpperCase() !== 'LOCATARIO' && v.lastAccess?.status === 'DENTRO'
   ).length;

   const totalGeralCount = moradoresRegistradosCount + visitantesNoCondominioCount;

   const pendenciasCount = vehicles.filter(v => {
     if (v.tipo === 'PROPRIETARIO' || v.tipo === 'LOCATARIO') return false;
     if (!v.lastAccess || v.lastAccess.status !== 'DENTRO') return false;
     const diffMin = (currentTime.getTime() - new Date(v.lastAccess.hora_entrada).getTime()) / (1000 * 60);
     return diffMin > settings.tempo_alerta_permanencia;
   }).length;

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
            {/* Total Ativos */}
            <div 
              onClick={() => { setActiveTab('ATIVOS'); setStatusFilter('ALL'); setSearch(''); }}
              className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all hover:border-slate-400 ${activeTab === 'ATIVOS' && statusFilter === 'ALL' ? 'bg-slate-900 border-slate-800 text-white scale-[1.02] shadow-lg shadow-slate-900/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
            >
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeTab === 'ATIVOS' && statusFilter === 'ALL' ? 'text-slate-400' : 'text-slate-400 font-bold uppercase tracking-widest'}`}>Total Ativos</p>
              <p className={`text-2xl font-black ${activeTab === 'ATIVOS' && statusFilter === 'ALL' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{loading ? '-' : totalGeralCount}</p>
            </div>

            {/* Moradores Registrados */}
            <div 
              onClick={() => { setActiveTab('ATIVOS'); setStatusFilter('MORADORES'); }}
              className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all hover:border-blue-400 ${activeTab === 'ATIVOS' && statusFilter === 'MORADORES' ? 'bg-blue-500 border-blue-500 text-white scale-[1.02] shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}`}
            >
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeTab === 'ATIVOS' && statusFilter === 'MORADORES' ? 'text-blue-100' : 'text-slate-400 font-bold uppercase tracking-widest'}`}>Moradores Registrados</p>
              <p className={`text-2xl font-black ${activeTab === 'ATIVOS' && statusFilter === 'MORADORES' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{loading ? '-' : moradoresRegistradosCount}</p>
            </div>
           
            {/* No Condomínio (Vistantes) */}
            <div 
              onClick={() => { setActiveTab('ATIVOS'); setStatusFilter('DENTRO'); }}
              className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all hover:border-emerald-400 ${activeTab === 'ATIVOS' && statusFilter === 'DENTRO' ? 'bg-emerald-500 border-emerald-500 text-white scale-[1.02] shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
            >
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeTab === 'ATIVOS' && statusFilter === 'DENTRO' ? 'text-emerald-100' : 'text-emerald-600 font-bold uppercase tracking-widest'}`}>No Condomínio (Visitas)</p>
              <p className={`text-2xl font-black ${activeTab === 'ATIVOS' && statusFilter === 'DENTRO' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>{loading ? '-' : visitantesNoCondominioCount}</p>
            </div>

           {/* Alertas */}
           <div 
             onClick={() => { setActiveTab('ATIVOS'); setStatusFilter('PENDENCIAS'); }}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all hover:border-red-400 ${activeTab === 'ATIVOS' && statusFilter === 'PENDENCIAS' ? 'bg-red-500 border-red-500 text-white scale-[1.02] shadow-lg shadow-red-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
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
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-[10px] transition-all uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'ATIVOS' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Lista Ativa
              </button>
              <button 
                onClick={() => { setActiveTab('HISTORICO'); setStatusFilter('ALL'); }}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-[10px] transition-all uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'HISTORICO' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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
            const isMorador = v?.tipo?.toUpperCase() === 'PROPRIETARIO' || v?.tipo?.toUpperCase() === 'LOCATARIO';
            const currentVehicleId = isHistory ? (item as any).veiculo_id : (item as Vehicle).id;

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
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 leading-tight">{v?.nomeProprietario || v?.nomeproprietario || '-'}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{v?.tipo?.toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unidade</p>
                    <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-[11px] font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {v?.unidadeDesc || v?.unidadedesc || '-'}
                    </span>
                  </div>
                </div>

                {/* Rastro de Auditoria (Mobile) */}
                {!isMorador && (
                  <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-start text-[10px] font-bold text-slate-500">
                         <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5"><Calendar size={12} className="text-emerald-500" /> {a?.hora_entrada ? new Date(a.hora_entrada).toLocaleDateString('pt-BR') : '-'}</span>
                            <span className="flex items-center gap-1.5"><Clock size={12} className="text-emerald-500 opacity-60" /> {a?.hora_entrada ? new Date(a.hora_entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                         </div>
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase tracking-tighter truncate max-w-[80px]">
                          {operatorMap[a?.operador_entrada_id || '']?.role === 'Owner' 
                            ? 'System Master' 
                            : (operatorMap[a?.operador_entrada_id || '']?.nome?.split(' ')[0] || a?.operador_entrada?.nome?.split(' ')[0] || 'SISTEMA')}
                        </span>
                     </div>
                     {a?.hora_saida && (
                        <div className="flex justify-between items-start text-[10px] font-bold text-emerald-600">
                           <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-1.5"><Calendar size={12} className="text-emerald-500 opacity-50" /> {new Date(a.hora_saida).toLocaleDateString('pt-BR')}</span>
                              <span className="flex items-center gap-1.5"><Clock size={12} className="text-emerald-500 opacity-30" /> {new Date(a.hora_saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                           </div>
                           <span className="bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded uppercase tracking-tighter truncate max-w-[80px]">
                             {operatorMap[a?.operador_saida_id || '']?.role === 'Owner' ? 'System Master' : (operatorMap[a?.operador_saida_id || '']?.nome?.split(' ')[0] || a?.operador_saida?.nome?.split(' ')[0] || operatorMap[a?.operador_entrada_id || '']?.nome?.split(' ')[0] || a?.operador_entrada?.nome?.split(' ')[0] || 'SISTEMA')}
                           </span>
                        </div>
                     )}
                  </div>
                )}

                {/* Ações (Mobile) */}
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {isHistory ? (
                      <>
                        <button 
                          onClick={() => openReopen(v, item.id)}
                          className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black border border-blue-200 dark:border-blue-700/50 hover:bg-blue-100 dark:hover:bg-blue-800 transition-all uppercase flex items-center gap-1.5"
                          title="Reativar Visita"
                        >
                          <RotateCcw size={12} />
                        </button>
                        <button 
                           onClick={() => openDetails(v, a)}
                           className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-black border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase flex items-center gap-1.5 flex-1 justify-center"
                        >
                           <Search size={12} /> Detalhes
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => openDetails(v, a)}
                          className="px-3 py-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-black border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase flex items-center gap-1.5 shadow-sm flex-1 justify-center"
                        >
                          <Search size={12} /> Detalhes
                        </button>
                        {!isMorador && a?.status === 'DENTRO' ? (
                          <button 
                            onClick={() => handleOpenExitModal(a.id)} 
                            className="flex-1 py-2 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-800/20 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                             <CheckCircle2 size={12} /> Saída
                          </button>
                        ) : !isMorador && (
                          <button onClick={() => {
                            setFormData({ ...formData, placa: v.placa, modelo: v.modelo, cor: (v as any).cor, tipo: v.tipo, nomeProprietario: (v.nomeproprietario || v.nomeProprietario), unidadeDesc: (v.unidadedesc || v.unidadeDesc), moradorId: (v as any).moradorid });
                            setShowModal(true);
                          }} className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Entrada</button>
                        )}
                    {v?.status === 'ARQUIVADO' ? (
                      <button 
                        onClick={() => openReopen(v)}
                        className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black border border-blue-200 dark:border-blue-700/50 hover:bg-blue-100 dark:hover:bg-blue-800 transition-all uppercase flex items-center justify-center gap-1.5"
                        title="Reativar Cadastro"
                      >
                        <RotateCcw size={14} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => openArchive(v)}
                        className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-amber-500 hover:bg-amber-50 border border-slate-200 dark:border-slate-700 rounded-lg transition-all uppercase flex items-center justify-center"
                        title="Arquivar Recorde"
                      >
                        <Archive size={14} />
                      </button>
                    )}
                  </>
                )}
                    {/* Botão de Excluir (Apenas Owner) */}
                    {userRole === 'Owner' && (
                      <button 
                        onClick={() => handleDeleteVehicle(currentVehicleId)}
                        className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-black border border-red-200 dark:border-red-700/50 hover:bg-red-100 dark:hover:bg-red-800 transition-all uppercase flex items-center gap-1.5"
                        title="Excluir Registro"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── DESKTOP TABLE VIEW (visível apenas em sm e acima) ── */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">VEÍCULO / TIPO</th>
                <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">MORADOR / UNIDADE</th>
                <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-l border-slate-100 dark:border-slate-800/50 pl-6">ENTRADA / SAÍDA</th>
                <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">STATUS / TEMPO</th>
                <th className="text-right p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {activeTab === 'HISTORICO' ? 'RESPONSÁVEIS' : 'AÇÃO PORTARIA'}
                </th>
                <th className="text-right p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">ADMIN</th>
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
                const isMorador = v?.tipo?.toUpperCase() === 'PROPRIETARIO' || v?.tipo?.toUpperCase() === 'LOCATARIO';
                const currentVehicleId = isHistory ? (item as any).veiculo_id : (item as Vehicle).id;

                return (
                  <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    {/* COL 1: VEICULO */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isHistory ? 'bg-slate-100 dark:bg-slate-800' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                          <Car size={18} className={isHistory ? 'text-slate-400' : 'text-blue-500'} />
                        </div>
                        <div>
                          <p className="font-mono font-black text-sm tracking-tighter text-slate-900 dark:text-white uppercase">{formatPlate(v?.placa)}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{v?.modelo || '-'} {v?.cor ? `• ${v.cor}` : ''}</p>
                          <div className="mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${
                              isMorador ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                              {v?.tipo?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* COL 2: MORADOR / UNIDADE */}
                    <td className="p-4">
                      <div>
                      <div className="flex flex-col gap-1">
                        <span className="inline-block px-2 py-0.5 max-w-fit bg-slate-900/5 dark:bg-slate-800 rounded-md text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap uppercase tracking-wider">
                          {v?.unidadeDesc || v?.unidadedesc || '-'}
                        </span>
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight block uppercase tracking-tight">
                          {v?.nomeproprietario || v?.nomeProprietario || '-'}
                        </p>
                      </div>
                      </div>
                    </td>

                    {/* COL 3: ENTRADA / SAIDA */}
                    <td className="p-4 border-l border-slate-100 dark:border-slate-800/50 pl-6">
                       {!isMorador ? (
                          <div className="flex flex-col gap-1.5 text-slate-500 dark:text-slate-400">
                             <div className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-500">
                                <div className="flex items-center gap-1.5">
                                   <Calendar size={12} className="text-blue-500" />
                                   <span className="uppercase tracking-widest">
                                     {a?.hora_entrada ? new Date(a.hora_entrada).toLocaleDateString('pt-BR') : '--/--/----'}
                                   </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                   <Clock size={12} className="text-amber-500" />
                                   <span className="uppercase tracking-widest">
                                     {a?.hora_entrada ? new Date(a.hora_entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                   </span>
                                </div>
                             </div>
                             {a?.hora_saida && (
                               <div className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-500 pt-1.5 border-t border-slate-100 dark:border-slate-800/50 mt-1.5">
                                   <div className="flex items-center gap-1.5">
                                      <Calendar size={12} className="text-blue-500" />
                                      <span className="uppercase tracking-widest">
                                        {new Date(a.hora_saida).toLocaleDateString('pt-BR')}
                                      </span>
                                   </div>
                                   <div className="flex items-center gap-1.5">
                                      <Clock size={12} className="text-amber-500" />
                                      <span className="uppercase tracking-widest">
                                        {new Date(a.hora_saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                   </div>
                                </div>
                             )}
                          </div>
                       ) : (
                         <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 opacity-60">
                           <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-700 text-[9px] font-black uppercase tracking-widest">
                             Acesso Fixo
                           </span>
                         </div>
                       )}
                    </td>

                    {/* COL 4: STATUS */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                         {v?.status === 'ARQUIVADO' ? (
                           <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-[9px] font-black uppercase tracking-widest border border-red-200">
                             Arquivada
                           </span>
                         ) : isHistory ? (
                           <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                             a?.status === 'SAIU' ? 'bg-slate-100 text-slate-500 border-slate-200' : 
                             a?.status === 'DENTRO' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                             'bg-red-50 text-red-500 border-red-100'
                           }`}>
                             {a?.status || 'Finalizado'}
                           </span>
                         ) : (
                           <StatusBadge vehicle={item as Vehicle} />
                         )}
                         
                         {!isHistory && !isMorador && a?.status === 'DENTRO' && (
                           <DurationBadge horaEntrada={a.hora_entrada} />
                         )}
                      </div>
                    </td>

                    {/* COL 5: AÇÃO PORTARIA / RESPONSÁVEIS */}
                    <td className="p-4 text-right">
                       {isHistory ? (
                          <div className="flex flex-col gap-1 items-end">
                             <div className="flex items-center gap-2" title="Operador de Entrada">
                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                                  {operatorMap[a?.operador_entrada_id || '']?.role === 'Owner' 
                                    ? 'System Master' 
                                    : (operatorMap[a?.operador_entrada_id || '']?.nome?.split(' ')[0] || a?.operador_entrada?.nome?.split(' ')[0] || 'SISTEMA')}
                                </span>
                                <div className="size-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-[8px] font-bold border border-slate-200 dark:border-slate-700">
                                  <Plus size={8} />
                                </div>
                             </div>
                             <div className="flex items-center gap-2 opacity-60" title="Operador de Saída">
                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                                  {operatorMap[a?.operador_saida_id || '']?.role === 'Owner' 
                                    ? 'System Master' 
                                    : (operatorMap[a?.operador_saida_id || '']?.nome?.split(' ')[0] || a?.operador_saida?.nome?.split(' ')[0] || '-')}
                                </span>
                                <div className="size-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-[8px] font-bold border border-slate-200 dark:border-slate-700">
                                  <CheckCircle2 size={8} />
                                </div>
                             </div>
                          </div>
                       ) : (
                         !isMorador && a?.status === 'DENTRO' ? (
                            <div className="flex justify-end">
                              <button 
                                 onClick={() => handleOpenExitModal(a.id)}
                                 className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all uppercase flex items-center justify-center gap-2 shadow-sm"
                              >
                                 <CheckCircle2 size={16} /> Saída
                              </button>
                            </div>
                         ) : (
                           <span className="text-slate-300 dark:text-slate-800 font-bold">-</span>
                         )
                       )}
                    </td>

                    {/* COL 6: ADMIN */}
                    <td className="p-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                          {/* 1) LUPA (Sempre Primeiro) */}
                           <button 
                              onClick={() => openDetails(v, (isHistory ? item : a) as any)}
                             className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                             title="Ver Detalhes"
                          >
                             <Search size={16} />
                          </button>

                          {/* 2) REATIVAR / ARQUIVAR */}
                          {isHistory ? (
                             a?.status === 'SAIU' && (
                               <button 
                                  onClick={() => openReopen(v, item.id)}
                                  className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                                  title="Reativar Movimentação"
                               >
                                  <RotateCcw size={16} />
                               </button>
                             )
                          ) : (
                            !isMorador && a?.status === 'DENTRO' && (
                              <button 
                                 onClick={() => handleSairSemData(a.id)}
                                 className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                                 title="Registrar Saída S/ Horário"
                              >
                                 <Archive size={16} />
                              </button>
                            )
                          )}

                          {/* 3) EXCLUIR (Owner Apenas) */}
                          {userRole === 'Owner' && (
                            <button 
                              onClick={() => handleDeleteVehicle(currentVehicleId)}
                              className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                              title="Excluir Veículo (Owner)"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                       </div>
                    </td>
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
                          }}
                          onFocus={() => setShowUnidadeDropdown(true)}
                          className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                          placeholder={randomPlaceholder.apto}
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
                    {/* Observações da Entrada */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Observações / Motivo da Entrada</label>
                      <textarea 
                        value={formData.observacoes}
                        onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                        placeholder="Ex: Entrega de encomenda, visita rápida, manutenção na unidade..."
                        className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:border-blue-500 outline-none transition-all min-h-[100px] resize-none"
                      />
                    </div>
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

      <AnimatePresence>
        {showArchiveModal && selectedVehicle && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
            onClick={() => setShowArchiveModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 text-amber-600 mb-2">
                  <Archive size={24} />
                  <h3 className="text-xl font-black uppercase tracking-tight">Arquivar Veículo</h3>
                </div>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Placa: {selectedVehicle.placa}</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Motivo do Arquivamento</label>
                  <textarea 
                    value={archiveReason}
                    onChange={(e) => setArchiveReason(e.target.value)}
                    placeholder="Ex: Morador mudou-se, Veículo vendido, etc..."
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:border-amber-500 outline-none transition-all min-h-[120px] resize-none"
                    autoFocus
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                <button 
                  onClick={() => setShowArchiveModal(false)}
                  className="flex-1 py-3 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleArchive}
                  disabled={!archiveReason.trim()}
                  className="flex-1 py-3 bg-amber-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  Arquivar Agora
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReopenModal && selectedVehicle && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
            onClick={() => setShowReopenModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 text-emerald-600 mb-2">
                  <RotateCcw size={24} />
                  <h3 className="text-xl font-black uppercase tracking-tight">Reativar Veículo</h3>
                </div>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Placa: {selectedVehicle.placa}</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Motivo da Reativação</label>
                  <textarea 
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    placeholder="Ex: Cadastro reativado para novo morador, erro no arquivamento..."
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:border-emerald-500 outline-none transition-all min-h-[120px] resize-none"
                    autoFocus
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                <button 
                  onClick={() => setShowReopenModal(false)}
                  className="flex-1 py-3 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleReopen}
                  disabled={!reopenReason.trim()}
                  className="flex-1 py-3 bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  Reativar Agora
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetailsModal && selectedVehicle && (
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
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
                <div>
                  <h2 className="text-xl lg:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    <History size={20} className="text-blue-500" />
                    Detalhes da Movimentação - Veículos
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-block px-2 py-0.5 bg-slate-900/5 dark:bg-slate-800 rounded-md text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap uppercase tracking-wider">
                      {selectedVehicle.unidadeDesc || selectedVehicle.unidadedesc || 'CONDOMÍNIO'}
                    </span>
                    <span className="size-1 rounded-full bg-slate-400" />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      selectedAccess?.status === 'SAIU' ? 'text-rose-500' : 
                      selectedVehicle.status === 'ATIVO' ? 'text-blue-500' : 
                      'text-slate-500'
                    }`}>
                      • {selectedAccess?.status === 'SAIU' ? 'SAÍDA REGISTRADA' : (selectedVehicle.status === 'ATIVO' ? (selectedVehicle.tipo?.toUpperCase() === 'ACESSO FIXO' ? 'CADASTRO ATIVO' : 'EM ANDAMENTO') : selectedVehicle.status?.replace('_', ' '))}
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900/50">
                  <div className="space-y-4 relative">
                    <div className="absolute top-4 bottom-4 left-[21px] w-[2px] bg-slate-200 dark:bg-slate-700"></div>
                    
                    {/* 1) Registro Visitante (VERDE) */}
                    <div className="relative flex items-start gap-4">
                      <div className="p-2 rounded-full ring-4 ring-emerald-50 dark:ring-emerald-900/10 relative z-10 bg-emerald-100 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-800/50">
                          <LogIn size={16} />
                      </div>
                      <div className="flex-1 p-4 rounded-2xl bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/20 shadow-sm transition-all">
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">1) Registro Visitante</span>
                                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                  {selectedVehicle.criado_por_nome?.split(' ')[0] || 'SISTEMA'}
                                </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                               <Clock size={10} /> {new Date(selectedVehicle.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                             Registro de entrada efetuado na portaria pelo operador.
                          </div>
                      </div>
                    </div>

                    {/* 2) Dados do Visitante (AZUL) */}
                    <div className="relative flex items-start gap-4">
                      <div className="p-2 rounded-full ring-4 ring-blue-50 dark:ring-blue-900/10 relative z-10 bg-blue-100 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800/50">
                          <Truck size={16} />
                      </div>
                      <div className="flex-1 p-4 rounded-2xl bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/20 shadow-sm transition-all">
                          <div className="flex items-center justify-between gap-4 mb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">2) Dados do Visitante / Movimentação</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black mb-0.5">Morador / Unidade</span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase leading-none">
                                  {selectedVehicle.unidadeDesc || 'Portaria'}
                                </span>
                             </div>
                             <div>
                                <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black mb-0.5">Visitante / Nome</span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase leading-none">
                                  {selectedVehicle.nomeProprietario || selectedVehicle.nomeproprietario || 'NÃO INFORMADO'}
                                </span>
                             </div>
                             <div>
                                <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black mb-0.5">Veículo / Tipo</span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase leading-none">
                                  {formatPlate(selectedVehicle.placa)} {selectedVehicle.modelo} • {selectedVehicle.tipo}
                                </span>
                             </div>
                             <div>
                                <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black mb-0.5">Hora de Entrada</span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase leading-none">
                                  {new Date(selectedVehicle.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                             </div>
                             {selectedVehicle.observacoes && (
                               <div className="col-span-2 mt-2 pt-2 border-t border-blue-100/50 text-xs text-blue-700 dark:text-blue-300 italic">
                                 "{selectedVehicle.observacoes}"
                               </div>
                             )}
                          </div>
                      </div>
                    </div>

                    {/* 3) Saída do Visitante (VERMELHO) */}
                    {selectedAccess?.hora_saida ? (
                      <div className="relative flex items-start gap-4">
                        <div className="p-2 rounded-full ring-4 ring-rose-50 dark:ring-rose-900/10 relative z-10 bg-rose-100 border-rose-200 text-rose-600 dark:bg-rose-900/30 dark:border-rose-800/50">
                            <LogOut size={16} />
                        </div>
                        <div className="flex-1 p-4 rounded-2xl bg-rose-50/30 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/20 shadow-sm transition-all">
                            <div className="flex items-center justify-between gap-4 mb-2">
                              <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400">3) Saída do Visitante</span>
                                  <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                    {selectedAccess.operador_saida?.nome || selectedAccess.operador_saida_nome || 'SISTEMA'}
                                  </span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest whitespace-nowrap">
                                 <Clock size={10} /> {new Date(selectedAccess.hora_saida).toLocaleString('pt-BR')}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                               Saída registrada com sucesso na portaria.
                            </div>
                            {selectedAccess.observacoes && (
                               <div className="mt-2 text-xs text-rose-700 dark:text-rose-300 italic">
                                 "{selectedAccess.observacoes}"
                               </div>
                            )}
                        </div>
                      </div>
                    ) : (
                      <div className="relative flex items-start gap-4 opacity-50">
                        <div className="p-2 rounded-full ring-4 ring-slate-50 dark:ring-slate-900 relative z-10 bg-slate-100 border-slate-200 text-slate-400">
                            <LogOut size={16} />
                        </div>
                        <div className="flex-1 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Aguardando registro de saída...</span>
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
