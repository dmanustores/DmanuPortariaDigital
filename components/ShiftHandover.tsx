'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlertTriangle, Package, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ShiftHandoverProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ShiftData) => void;
}

export interface ShiftData {
  visitorsInside: string;
  pendingPackages: string;
  openOccurrences: string;
  notes: string;
}

export function ShiftHandoverModal({ isOpen, onClose, onConfirm }: ShiftHandoverProps) {
  const [data, setData] = useState<ShiftData>({
    visitorsInside: '',
    pendingPackages: '',
    openOccurrences: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('occurrences').insert({
        tipo: 'Passagem de Plantão',
        titulo: `Passagem Turno ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit' })}`,
        descricao: `Visitantes: ${data.visitorsInside || 'Nenhum'}\nEncomendas: ${data.pendingPackages || 'Nenhuma'}\nOcorrências: ${data.openOccurrences || 'Nenhuma'}\nObs: ${data.notes || 'Sem observações'}`,
        prioridade: 'Normal',
        status: 'Aberta'
      });
      
      onConfirm(data);
      onClose();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
                  <AlertTriangle className="text-amber-600" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Passagem de Plantão</h3>
                  <p className="text-xs text-slate-500">Obligatório antes de sair</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                  <Users size={16} />
                  Visitantes ainda dentro
                </label>
                <textarea 
                  value={data.visitorsInside}
                  onChange={(e) => setData({...data, visitorsInside: e.target.value})}
                  placeholder="Nomes dos visitantes que ainda estão no condomínio..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                  <Package size={16} />
                  Encomendas pendentes
                </label>
                <textarea 
                  value={data.pendingPackages}
                  onChange={(e) => setData({...data, pendingPackages: e.target.value})}
                  placeholder="Unidades com encomendas pendentes..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  Ocorrências abertas
                </label>
                <input 
                  type="text"
                  value={data.openOccurrences}
                  onChange={(e) => setData({...data, openOccurrences: e.target.value})}
                  placeholder="Ocorrências que precisam de atenção..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  Observações para o próximo turno
                </label>
                <textarea 
                  value={data.notes}
                  onChange={(e) => setData({...data, notes: e.target.value})}
                  placeholder="Outras observações..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm h-20 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={18} />
                    Salvar & Sair
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}