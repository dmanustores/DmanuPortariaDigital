'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  Clock,
  UserCheck,
  X,
  Save,
  Search,
  Shield,
  Eye,
  EyeOff,
  Mail,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';

interface Operator {
  id: string;
  nome: string;
  email?: string;
  role: string;
  turno: string;
  created_at: string;
}

const Turnos = [
  { value: 'A', label: 'Turno A (06:00-14:00)', hours: '06:00 - 14:00' },
  { value: 'B', label: 'Turno B (14:00-22:00)', hours: '14:00 - 22:00' },
  { value: 'C', label: 'Turno C (22:00-06:00)', hours: '22:00 - 06:00' },
  { value: 'D', label: 'Folga', hours: 'folga' },
];

const Roles = [
  { value: 'Admin', label: 'Administrador' },
  { value: 'Zelador', label: 'Zelador' },
  { value: 'Porteiro', label: 'Porteiro' },
  { value: 'Operador', label: 'Operador' },
];

export default function AdminPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<{email?: string; senha?: string; confirmar?: string}>({});
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    role: 'Porteiro',
    turno: 'A',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('operators')
      .select('*')
      .order('nome');
    
    if (data) setOperators(data);
    setLoading(false);
  };

  const validateForm = () => {
    const newErrors: {email?: string; senha?: string; confirmar?: string} = {};
    
    if (!editingOperator) {
      if (!formData.email) {
        newErrors.email = 'E-mail é obrigatório';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'E-mail inválido';
      }
      
      if (!formData.senha) {
        newErrors.senha = 'Senha é obrigatória';
      } else if (formData.senha.length < 6) {
        newErrors.senha = 'Mínimo 6 caracteres';
      }
      
      if (formData.senha !== formData.confirmarSenha) {
        newErrors.confirmar = 'As senhas não coincidem';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openModal = (operator?: Operator) => {
    if (operator) {
      setEditingOperator(operator);
      setFormData({ nome: operator.nome, email: '', senha: '', confirmarSenha: '', role: operator.role, turno: operator.turno });
    } else {
      setEditingOperator(null);
      setFormData({ nome: '', email: '', senha: '', confirmarSenha: '', role: 'Porteiro', turno: 'A' });
    }
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingOperator(null);
    setFormData({ nome: '', email: '', senha: '', confirmarSenha: '', role: 'Porteiro', turno: 'A' });
    setErrors({});
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      if (editingOperator) {
        await supabase
          .from('operators')
          .update({ nome: formData.nome, role: formData.role, turno: formData.turno || null })
          .eq('id', editingOperator.id);
      } else {
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.toLowerCase(),
          password: formData.senha,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        
        if (authError) {
          console.error('Auth error:', authError);
          if (authError.message.includes('already been registered')) {
            setErrors({ email: 'Este e-mail já está cadastrado' });
            setSaving(false);
            return;
          }
          alert('Erro no cadastro: ' + authError.message);
          setSaving(false);
          return;
        }
        
        if (authData.user) {
          const { error: insertError } = await supabase.from('operators').insert({
            id: authData.user.id,
            nome: formData.nome,
            email: formData.email.toLowerCase(),
            role: formData.role,
            turno: formData.role === 'Admin' ? null : (formData.turno || null)
          });
          
          if (insertError) {
            console.error('Insert error:', insertError);
            alert('Erro ao criar perfil: ' + insertError.message);
            setSaving(false);
            return;
          }
          
          alert('Operador cadastrado com sucesso! Verifique o e-mail para confirmar a conta.');
        } else {
          alert('Erro: usuário não foi criado');
        }
      }
      fetchOperators();
      closeModal();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar operador: ' + (err.message || 'Erro desconhecido'));
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    await supabase.from('operators').delete().eq('id', id);
    fetchOperators();
  };

  const getTurnoInfo = (turno: string) => {
    return Turnos.find(t => t.value === turno) || { label: turno, hours: '' };
  };

  const filteredOperators = operators.filter(op => 
    op.nome.toLowerCase().includes(search.toLowerCase()) ||
    op.role.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: operators.length,
    porteros: operators.filter(o => o.role === 'Porteiro').length,
    admins: operators.filter(o => o.role === 'Admin').length,
    turnoA: operators.filter(o => o.turno === 'A').length,
    turnoB: operators.filter(o => o.turno === 'B').length,
    turnoC: operators.filter(o => o.turno === 'C').length,
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Administração</h2>
          <p className="text-slate-500 mt-1 text-sm">Gerenciamento de operadores e porteiros</p>
        </motion.div>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => openModal()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={18} />
          Novo Operador
        </motion.button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase">Total</p>
          <p className="text-2xl font-black">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase">Porteiros</p>
          <p className="text-2xl font-black">{stats.porteros}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase">Admins</p>
          <p className="text-2xl font-black">{stats.admins}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-bold text-blue-600 uppercase">Turno A</p>
          <p className="text-2xl font-black text-blue-600">{stats.turnoA}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
          <p className="text-xs font-bold text-green-600 uppercase">Turno B</p>
          <p className="text-2xl font-black text-green-600">{stats.turnoB}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
          <p className="text-xs font-bold text-purple-600 uppercase">Turno C</p>
          <p className="text-2xl font-black text-purple-600">{stats.turnoC}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar operador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Nome</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Função</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Turno</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Horário</th>
                <th className="text-right p-4 text-xs font-bold text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Carregando...</td></tr>
              ) : filteredOperators.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum operador encontrado</td></tr>
              ) : filteredOperators.map((operator) => {
                const turnoInfo = Turnos.find(t => t.value === operator.turno) || { label: operator.turno, hours: '' };
                return (
                  <tr key={operator.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCheck size={18} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{operator.nome}</p>
                          <p className="text-xs text-slate-400">ID: {operator.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                        operator.role === 'Admin' 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {operator.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                        operator.turno === 'A' ? 'bg-blue-100 text-blue-700' :
                        operator.turno === 'B' ? 'bg-green-100 text-green-700' :
                        operator.turno === 'C' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        Turno {operator.turno}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-500">{turnoInfo.hours}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openModal(operator)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Pencil size={16} className="text-slate-400" />
                        </button>
                        <button 
                          onClick={() => handleDelete(operator.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
            onClick={closeModal}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold">
                  {editingOperator ? 'Editar Operador' : 'Novo Operador'}
                </h3>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Nome *</label>
                  <input 
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    placeholder="Nome completo"
                  />
                </div>

                {!editingOperator && (
                  <>
                    <div>
                      <label className="block text-sm font-bold mb-2">E-mail *</label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="email"
                          value={formData.email}
                          onChange={(e) => { setFormData({...formData, email: e.target.value}); setErrors({...errors, email: undefined}); }}
                          className={`w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm ${errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2">Senha *</label>
                      <div className="relative">
                        <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          value={formData.senha}
                          onChange={(e) => { setFormData({...formData, senha: e.target.value}); setErrors({...errors, senha: undefined}); }}
                          className={`w-full pl-10 pr-10 p-3 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm ${errors.senha ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                          placeholder="Mínimo 6 caracteres"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {errors.senha && <p className="text-xs text-red-500 mt-1">{errors.senha}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2">Confirmar Senha *</label>
                      <div className="relative">
                        <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          value={formData.confirmarSenha}
                          onChange={(e) => { setFormData({...formData, confirmarSenha: e.target.value}); setErrors({...errors, confirmar: undefined}); }}
                          className={`w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm ${errors.confirmar ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                          placeholder="Digite a senha novamente"
                        />
                      </div>
                      {errors.confirmar && <p className="text-xs text-red-500 mt-1">{errors.confirmar}</p>}
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-bold mb-2">Função *</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value, turno: e.target.value === 'Admin' ? '' : 'A'})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  >
                    {Roles.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>

                {formData.role !== 'Admin' && (
                  <div>
                    <label className="block text-sm font-bold mb-2">Turno</label>
                    <select 
                      value={formData.turno}
                      onChange={(e) => setFormData({...formData, turno: e.target.value})}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    >
                      {Turnos.map(turno => (
                        <option key={turno.value} value={turno.value}>{turno.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                <button 
                  onClick={closeModal}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving || !formData.nome}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={18} />
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}