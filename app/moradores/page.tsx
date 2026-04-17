'use client';

import React, { useState, useEffect } from 'react';
import { Resident } from '@/types/resident';
import { getResidents, saveResident, deleteResident } from '@/lib/residents-store';
import { ResidentForm } from '@/components/ResidentForm';
import { ResidentDetailsView } from '@/components/ResidentDetailsView';
import { ResidentList } from '@/components/ResidentList';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function MoradoresPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | undefined>(undefined);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    const loadResidents = async () => {
      const data = await getResidents();
      setResidents(data);
    };
    loadResidents();
  }, []);

  const handleSave = async (resident: Resident) => {
    try {
      await saveResident(resident);
      const data = await getResidents();
      setResidents(data);
      setIsFormOpen(false);
      setEditingResident(undefined);
      setIsReadOnly(false);
    } catch (error: any) {
      console.error('Failed to save resident:', error);
      if (error.message && error.message.startsWith('DUPLICATE_CPF:')) {
        const msg = error.message.replace('DUPLICATE_CPF:', '');
        if (window.confirm(`${msg}\n\nDeseja cadastrar mesmo assim?`)) {
          try {
            await saveResident(resident, true);
            const data = await getResidents();
            setResidents(data);
            setIsFormOpen(false);
            setEditingResident(undefined);
            setIsReadOnly(false);
          } catch (forceError: any) {
            console.error('Failed to forcefully save resident:', forceError);
            alert(forceError.message || 'Erro ao salvar morador. Por favor, tente novamente.');
          }
        }
      } else {
        alert(error.message || 'Erro ao salvar morador. Por favor, tente novamente.');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este morador?')) {
      try {
        await deleteResident(id);
        const data = await getResidents();
        setResidents(data);
      } catch (error) {
        console.error('Failed to delete resident:', error);
        alert('Erro ao excluir morador. Verifique se há dados vinculados ou tente novamente.');
      }
    }
  };

  const handleEdit = (resident: Resident) => {
    setEditingResident(resident);
    setIsReadOnly(false);
    setIsFormOpen(true);
  };

  const handleView = (resident: Resident) => {
    setEditingResident(resident);
    setIsReadOnly(true);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingResident(undefined);
    setIsReadOnly(false);
    setIsFormOpen(true);
  };

  return (
    <DashboardLayout headerTitle="Gestão de Moradores">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {isFormOpen ? (
            <button 
              onClick={() => {
                setIsFormOpen(false);
                setEditingResident(undefined);
                setIsReadOnly(false);
              }} 
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-primary transition-all shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <Link href="/" className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-primary transition-all shadow-sm">
              <ArrowLeft size={20} />
            </Link>
          )}
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {isFormOpen ? (isReadOnly ? 'Ficha do Morador' : 'Cadastro de Moradores') : 'Gestão de Moradores'}
          </h1>
        </div>

        {!isFormOpen && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddNew}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            <PlusCircle size={20} />
            Novo Cadastro
          </motion.button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isFormOpen ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {isReadOnly && editingResident ? (
              <ResidentDetailsView 
                resident={editingResident} 
                onClose={() => {
                  setIsFormOpen(false);
                  setEditingResident(undefined);
                  setIsReadOnly(false);
                }} 
              />
            ) : (
              <ResidentForm 
                initialData={editingResident} 
                onSave={handleSave} 
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingResident(undefined);
                  setIsReadOnly(false);
                }} 
                isReadOnly={isReadOnly}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ResidentList 
              residents={residents} 
              onEdit={handleEdit} 
              onDelete={handleDelete} 
              onView={handleView}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
