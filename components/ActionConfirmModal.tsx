
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

interface ActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'success';
}

export const ActionConfirmModal: React.FC<ActionConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'info'
}) => {
  const themes = {
    danger: {
      icon: <AlertTriangle className="text-red-600" size={28} />,
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-100 dark:border-red-800/30',
      button: 'bg-red-600 hover:bg-red-700 shadow-red-600/20',
      text: 'text-red-600'
    },
    info: {
      icon: <Info className="text-blue-600" size={28} />,
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-100 dark:border-blue-800/30',
      button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20',
      text: 'text-blue-600'
    },
    success: {
      icon: <CheckCircle2 className="text-emerald-600" size={28} />,
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-100 dark:border-emerald-800/30',
      button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20',
      text: 'text-emerald-600'
    }
  };

  const theme = themes[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            {/* Top Bar Decoration */}
            <div className={`h-2 w-full ${theme.button.split(' ')[0]}`} />
            
            <div className="p-8">
              <div className="flex flex-col items-center text-center">
                <div className={`p-4 ${theme.bg} rounded-3xl mb-6 border ${theme.border}`}>
                  {theme.icon}
                </div>
                
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">
                  {title}
                </h3>
                
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
                  {description}
                </p>
              </div>

              <div className="flex gap-3 mt-10">
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  {cancelText}
                </button>
                <button 
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-1 py-4 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg active:scale-95 ${theme.button}`}
                >
                  {confirmText}
                </button>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
