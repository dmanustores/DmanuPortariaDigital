'use client';

import React from 'react';
import { Resident } from '@/types/resident';
import { Edit2, Trash2, Home, User, Phone, Mail, Car, Users, Search, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { formatPhone } from '@/lib/utils';

interface ResidentListProps {
  residents: Resident[];
  onEdit: (resident: Resident) => void;
  onDelete: (id: string) => void;
  onView?: (resident: Resident) => void;
}

export const ResidentList: React.FC<ResidentListProps> = ({ residents, onEdit, onDelete, onView }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredResidents = residents.filter(r => 
    r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.apto.includes(searchTerm) ||
    r.bloco.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text"
          placeholder="Buscar por nome, bloco ou apto..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
        {filteredResidents.map((resident) => (
          <motion.div 
            key={resident.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="bg-primary/10 p-1.5 rounded-lg text-primary shrink-0">
                  <Home size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm lg:text-base font-bold text-slate-900 dark:text-white truncate uppercase leading-tight">{resident.nome}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 uppercase tracking-wider">
                      BL {resident.bloco}
                    </span>
                    <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 uppercase tracking-wider">
                      AP {resident.apto}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-0.5 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
                <button 
                  onClick={() => onView?.(resident)} 
                  className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                  title="Visualizar"
                >
                  <Eye size={14} />
                </button>
                <button 
                  onClick={() => onEdit(resident)} 
                  className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                  title="Editar"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => onDelete(resident.id)} 
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <Phone size={12} className="shrink-0 text-slate-400" />
                  <span className="truncate">{formatPhone(resident.celular)}</span>
                  <a 
                    href={`https://wa.me/55${resident.celular.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-1 p-1 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors shadow-sm"
                    title="Enviar WhatsApp"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.067 2.877 1.215 3.076.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </a>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <Mail size={12} className="shrink-0 text-slate-400" />
                  <span className="truncate">{resident.email}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700 w-fit">
                    <Users size={10} />
                    <span>{resident.householdMembers.length} Moradores</span>
                  </div>
                  {resident.householdMembers.length > 0 && (
                    <p className="text-[9px] text-slate-400 truncate max-w-[120px] ml-1">
                      {resident.householdMembers.map(m => m.nome.split(' ')[0]).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700 h-fit">
                  <Car size={10} />
                  <span>{resident.vehicles.length} Veículos</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredResidents.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <User size={48} className="mb-4 opacity-20" />
            <p className="font-medium">Nenhum morador encontrado</p>
            <p className="text-sm">Tente ajustar sua busca ou cadastre um novo morador.</p>
          </div>
        )}
      </div>
    </div>
  );
};
