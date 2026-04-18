import React, { useState, useEffect } from 'react';
import { Colaborador, RegistroColaborador } from '@/types/colaborador';
import { X, LogIn, LogOut, Info, Clock, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { registrarEntradaColaborador, registrarSaidaColaborador } from '@/lib/colaboradores-store';

interface Props {
  colaborador: Colaborador;
  ultimoRegistro?: RegistroColaborador | null;
  acao: 'ENTRADA' | 'SAIDA';
  onClose: () => void;
  onSuccess: () => void;
}

export function RegistroColaboradorModal({ colaborador, ultimoRegistro, acao, onClose, onSuccess }: Props) {
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (acao === 'ENTRADA') {
        await registrarEntradaColaborador(colaborador.id, observacoes);
      } else if (acao === 'SAIDA' && ultimoRegistro) {
        await registrarSaidaColaborador(ultimoRegistro.id, observacoes);
      }
      onSuccess();
    } catch (error: any) {
      alert(error.message || 'Erro ao registrar acesso.');
    } finally {
      setLoading(false);
    }
  };

  // Funcao para formatar HH:mm
  const formatTimeStr = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
        
        <div className={`p-4 sm:p-6 border-b ${acao === 'ENTRADA' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} flex items-start justify-between`}>
          <div>
            <div className={`flex items-center gap-2 font-black uppercase tracking-tight ${acao === 'ENTRADA' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {acao === 'ENTRADA' ? <LogIn size={20} /> : <LogOut size={20} />}
              {acao === 'ENTRADA' ? 'Registrar Entrada' : 'Registrar Saída'}
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 uppercase">{colaborador.nome}</p>
            <p className="text-xs text-slate-500 uppercase">{colaborador.cargo}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={18} /></button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          
          {/* Card Resumo do Horario */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold uppercase"><Clock size={14} className="inline mr-1" /> Previsto Hoje</span>
              <span className="font-black text-slate-700 dark:text-slate-300">
                {colaborador.horarios_customizados && colaborador.horarios_customizados[['DOM','SEG','TER','QUA','QUI','SEX','SAB'][new Date().getDay()]]
                  ? `${colaborador.horarios_customizados[['DOM','SEG','TER','QUA','QUI','SEX','SAB'][new Date().getDay()]].entrada} às ${colaborador.horarios_customizados[['DOM','SEG','TER','QUA','QUI','SEX','SAB'][new Date().getDay()]].saida}`
                  : 'SEM EXPEDIENTE'
                }
              </span>
            </div>
            {colaborador.unidade_bloco && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold uppercase"><Building2 size={14} className="inline mr-1" /> Destino</span>
                <span className="font-black text-slate-700 dark:text-slate-300">
                  BL {colaborador.unidade_bloco} AP {colaborador.unidade_numero}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">
              Hora da {acao === 'ENTRADA' ? 'Entrada' : 'Saída'}
            </p>
            <p className="text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
              {formatTimeStr(currentTime)}
            </p>
            <p className="text-xs font-bold text-slate-500 mt-1">
              {currentTime.toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="space-y-2">
             <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
               <Info size={14} /> Observações (Opcional)
             </label>
             <textarea 
               value={observacoes}
               onChange={e => setObservacoes(e.target.value)}
               placeholder="Alguma anotação que o porteiro queira fazer?"
               className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/50 resize-none h-20"
             />
          </div>

        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold transition-colors">
            Cancelar
          </button>
          <button 
            disabled={loading}
            onClick={handleConfirm}
            className={`px-6 py-2.5 text-white rounded-xl font-black flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 ${
               acao === 'ENTRADA' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
            }`}
          >
            {loading ? 'Salvando...' : <>{acao === 'ENTRADA' ? <LogIn size={18} /> : <LogOut size={18} />} Confirmar</>}
          </button>
        </div>

      </motion.div>
    </div>
  );
}
