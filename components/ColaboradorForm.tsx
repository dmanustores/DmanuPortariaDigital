import React, { useState, useEffect } from 'react';
import { Colaborador, CargoColaborador } from '@/types/colaborador';
import { supabase } from '@/lib/supabase';
import { useForm, Controller } from 'react-hook-form';
import { X, Save, Clock, CalendarDays, MapPin } from 'lucide-react';
import { formatCPF, formatRG, formatPhone } from '@/lib/utils';
import { motion } from 'motion/react';

interface Props {
  initialData?: Colaborador;
  onSave: (data: Partial<Colaborador>) => Promise<void>;
  onClose: () => void;
}

const CARGOS: CargoColaborador[] = [
  'ZELADOR', 'FAXINEIRA', 'JARDINEIRO', 'EMPREGADA_DOMESTICA', 'SEGURANCA', 'MANUTENCAO', 'OUTRO'
];

const DIAS_SEMANA = [
  { id: 'SEG', label: 'Segunda' },
  { id: 'TER', label: 'Terça' },
  { id: 'QUA', label: 'Quarta' },
  { id: 'QUI', label: 'Quinta' },
  { id: 'SEX', label: 'Sexta' },
  { id: 'SAB', label: 'Sábado' },
  { id: 'DOM', label: 'Domingo' }
];

export function ColaboradorForm({ initialData, onSave, onClose }: Props) {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm({
    defaultValues: initialData || {
      status: 'ATIVO',
      cargo: 'ZELADOR',
      dias_semana: 'SEG,TER,QUA,QUI,SEX',
      horarios_customizados: {
        SEG: { entrada: '08:00', saida: '17:00' },
        TER: { entrada: '08:00', saida: '17:00' },
        QUA: { entrada: '08:00', saida: '17:00' },
        QUI: { entrada: '08:00', saida: '17:00' },
        SEX: { entrada: '08:00', saida: '17:00' }
      }
    }
  });

  const selectedCargo = watch('cargo');
  const selectedDias = watch('dias_semana') || '';

  useEffect(() => {
    supabase.from('units').select('id, bloco, numero').order('bloco').order('numero').then(({ data }: any) => {
      if (data) setUnits(data);
    });
  }, []);

  const toggleDia = (dia: string) => {
    let currentDias = selectedDias ? selectedDias.split(',') : [];
    if (currentDias.includes(dia)) {
      currentDias = currentDias.filter(d => d !== dia);
    } else {
      currentDias.push(dia);
    }
    // Sort logic to keep consistent order
    const ordered = DIAS_SEMANA.map(d => d.id).filter(d => currentDias.includes(d));
    setValue('dias_semana', ordered.join(','));
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Remover mascara de cpf/rg/telefone
      const cleanData = {
        ...data,
        nome: data.nome?.toUpperCase(),
        documento_cpf: data.documento_cpf?.replace(/\D/g, ''),
        documento_rg: data.documento_rg?.replace(/[^\dX]/gi, '').toUpperCase(),
        telefone: data.telefone?.replace(/\D/g, ''),
        empresa: data.empresa?.toUpperCase()
      };
      
      if (!cleanData.unidade_vinculada_id) {
         cleanData.unidade_vinculada_id = null;
      }

      await onSave(cleanData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-full border border-slate-200 dark:border-slate-800">
        
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {initialData ? 'Editar Colaborador' : 'Novo Colaborador'}
          </h2>
          <button onClick={onClose} className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto">
          <form id="colab-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Info Básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo</label>
                <input {...register('nome', { required: true })} placeholder="Ex: Roberto Silva" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/50 uppercase" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo</label>
                <select {...register('cargo')} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/50">
                  {CARGOS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa / Terceirizada (Opcional)</label>
                <input {...register('empresa')} placeholder="Ex: LimpValue Service" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/50 uppercase" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone</label>
                <Controller name="telefone" control={control} render={({ field }) => (
                  <input {...field} value={field.value || ''} onChange={e => field.onChange(formatPhone(e.target.value))} placeholder="(00) 00000-0000" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/50" />
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">RG</label>
                  <Controller name="documento_rg" control={control} render={({ field }) => (
                    <input {...field} value={field.value || ''} onChange={e => field.onChange(formatRG(e.target.value))} placeholder="00.000.000-0" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/50 uppercase" />
                  )} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CPF</label>
                  <Controller name="documento_cpf" control={control} render={({ field }) => (
                    <input {...field} value={field.value || ''} onChange={e => field.onChange(formatCPF(e.target.value))} placeholder="000.000.000-00" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/50" />
                  )} />
                </div>
              </div>
            </div>

            {/* Unidade Vinculada - Opcional */}
            {(selectedCargo === 'EMPREGADA_DOMESTICA' || selectedCargo === 'OUTRO') && (
              <div className="p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold uppercase text-xs tracking-wider">
                  <MapPin size={16} /> Vinculação com Apartamento (Opcional)
                </div>
                <select {...register('unidade_vinculada_id')} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Nenhuma unidade</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>Bloco {u.bloco} - Apto {u.numero}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Horários */}
            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold uppercase text-xs tracking-wider">
                <CalendarDays size={16} className="text-blue-500" /> Horários e Dias de Trabalho
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4 mt-2">
                {DIAS_SEMANA.map(d => {
                  const isSelected = selectedDias?.includes(d.id);
                  return (
                    <button 
                      key={d.id} type="button" onClick={() => toggleDia(d.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${isSelected ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'}`}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>

              {selectedDias ? (
                <div className="space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  <div className="grid grid-cols-12 gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <div className="col-span-4">Dia</div>
                    <div className="col-span-4 text-center">Entrada</div>
                    <div className="col-span-4 text-center">Saída</div>
                  </div>
                  {DIAS_SEMANA.filter(d => selectedDias.includes(d.id)).map(d => (
                    <div key={d.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4 text-xs font-bold text-slate-600 dark:text-slate-300">{d.label}</div>
                      <div className="col-span-4">
                        <input type="time" {...register(`horarios_customizados.${d.id}.entrada`)} className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-primary/50 text-center" />
                      </div>
                      <div className="col-span-4">
                        <input type="time" {...register(`horarios_customizados.${d.id}.saida`)} className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-primary/50 text-center" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 text-center">
                  <p className="text-xs font-bold text-orange-600 uppercase">Selecione ao menos um dia</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Inicial do Cadastro</label>
              <select {...register('status')} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/50">
                <option value="ATIVO">ATIVO</option>
                <option value="SUSPENSO">SUSPENSO (Bloqueado na porta)</option>
                <option value="INATIVO">INATIVO (Demitido/Não vem mais)</option>
              </select>
            </div>

          </form>
        </div>

        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold transition-colors">
            Cancelar
          </button>
          <button form="colab-form" disabled={loading} type="submit" className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-black flex items-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-50">
            {loading ? 'Salvando...' : <><Save size={18} /> Salvar Colaborador</>}
          </button>
        </div>

      </motion.div>
    </div>
  );
}
