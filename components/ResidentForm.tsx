'use client';

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Resident, ResidentType, InvoiceDelivery } from '@/types/resident';
import { X, Plus, Save, User, Car, Users, Construction, Phone, Briefcase, Home, ShieldAlert, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCPF, formatRG, formatPhone, capitalize } from '@/lib/utils';

const residentSchema = z.object({
  id: z.string().optional(),
  bloco: z.string().min(1, 'Obrigatório'),
  apto: z.string().min(1, 'Obrigatório'),
  tipo: z.enum(['LOCATARIO', 'PROPRIETARIO']),
  nome: z.string().min(3, 'Nome muito curto'),
  foto: z.string().optional(),
  celular: z.string().min(10, 'Celular inválido'),
  temWhatsApp: z.boolean().optional(),
  fone: z.string().optional(),
  foneComercial: z.string().optional(),
  email: z.string().email('Email inválido'),
  localTrabalho: z.string().optional(),
  enderecoComercial: z.string().optional(),
  cpf: z.string().min(11, 'CPF inválido'),
  rg: z.string().min(5, 'RG inválido'),
  dataEntrada: z.string().min(1, 'Data de entrada obrigatória'),
  dataSaida: z.string().optional(),
  status: z.enum(['ATIVO', 'INATIVO']),
  observacoes: z.string().optional(),
  householdMembers: z.array(z.object({
    nome: z.string(),
    rg: z.string().optional(),
    cpf: z.string().optional(),
    parentesco: z.string(),
    isBaby: z.boolean().optional()
  })),
  vehicles: z.array(z.object({
    modelo: z.string(),
    cor: z.string(),
    placa: z.string()
  })),
  serviceProviders: z.array(z.object({
    nome: z.string(),
    rg: z.string()
  })),
  emergencyContact: z.object({
    nome: z.string().min(1, 'Obrigatório'),
    fone: z.string().min(1, 'Obrigatório')
  }),
  invoiceDelivery: z.enum(['CONDOMINIO', 'OUTRO']),
  invoiceAddress: z.object({
    nome: z.string().optional(),
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
    cep: z.string().optional(),
  }).optional(),
  lgpdConsent: z.boolean().optional(),
});

type ResidentFormData = z.infer<typeof residentSchema>;

interface ResidentFormProps {
  initialData?: Resident;
  onSave: (data: Resident) => void;
  onCancel: () => void;
  isReadOnly?: boolean;
}

export const ResidentForm: React.FC<ResidentFormProps> = ({ initialData, onSave, onCancel, isReadOnly = false }) => {
  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ResidentFormData>({
    resolver: zodResolver(residentSchema),
    defaultValues: initialData ? {
      ...initialData,
      celular: formatPhone(initialData.celular),
      fone: initialData.fone ? formatPhone(initialData.fone) : '',
      foneComercial: initialData.foneComercial ? formatPhone(initialData.foneComercial) : '',
      cpf: formatCPF(initialData.cpf),
      rg: formatRG(initialData.rg),
      emergencyContact: {
        ...initialData.emergencyContact,
        fone: formatPhone(initialData.emergencyContact.fone)
      },
      householdMembers: initialData.householdMembers.map(m => ({
        ...m,
        cpf: m.cpf ? formatCPF(m.cpf) : '',
        rg: m.rg ? formatRG(m.rg) : '',
        isBaby: !!m.isBaby
      })),
      serviceProviders: initialData.serviceProviders || []
    } : {
      tipo: 'PROPRIETARIO',
      status: 'ATIVO',
      householdMembers: [],
      vehicles: [],
      serviceProviders: [],
      emergencyContact: { nome: '', fone: '' },
      invoiceDelivery: 'CONDOMINIO',
      invoiceAddress: {
        nome: '',
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: ''
      },
      temWhatsApp: false,
      lgpdConsent: false,
      dataEntrada: new Date().toISOString().split('T')[0]
    }
  });

  React.useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        celular: formatPhone(initialData.celular),
        fone: initialData.fone ? formatPhone(initialData.fone) : '',
        foneComercial: initialData.foneComercial ? formatPhone(initialData.foneComercial) : '',
        cpf: formatCPF(initialData.cpf),
        rg: formatRG(initialData.rg),
        emergencyContact: {
          ...initialData.emergencyContact,
          fone: formatPhone(initialData.emergencyContact.fone)
        },
        householdMembers: initialData.householdMembers.map(m => ({
          ...m,
          cpf: m.cpf ? formatCPF(m.cpf) : '',
          rg: m.rg ? formatRG(m.rg) : ''
        })),
        serviceProviders: initialData.serviceProviders || []
      });
    } else {
      reset({
        tipo: 'PROPRIETARIO',
        householdMembers: [],
        vehicles: [],
        serviceProviders: [],
        emergencyContact: { nome: '', fone: '' },
        invoiceDelivery: 'CONDOMINIO',
        invoiceAddress: {
          nome: '',
          logradouro: '',
          numero: '',
          bairro: '',
          cidade: '',
          estado: '',
          cep: ''
        },
        dataEntrada: new Date().toISOString().split('T')[0],
        status: 'ATIVO'
      });
    }
  }, [initialData, reset]);

  const { fields: memberFields, append: appendMember, remove: removeMember } = useFieldArray({
    control,
    name: "householdMembers"
  });

  const { fields: vehicleFields, append: appendVehicle, remove: removeVehicle } = useFieldArray({
    control,
    name: "vehicles"
  });

  const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
    control,
    name: "serviceProviders"
  });

  const onSubmit = (data: ResidentFormData) => {
    const cleanData = {
      ...data,
      nome: data.nome.toUpperCase(),
      celular: data.celular.replace(/\D/g, ''),
      fone: data.fone ? data.fone.replace(/\D/g, '') : '',
      foneComercial: data.foneComercial ? data.foneComercial.replace(/\D/g, '') : '',
      cpf: data.cpf.replace(/\D/g, ''),
      rg: data.rg.replace(/[^\dX]/gi, '').toUpperCase(),
      localTrabalho: data.localTrabalho?.toUpperCase(),
      enderecoComercial: data.enderecoComercial?.toUpperCase(),
      householdMembers: (data.householdMembers || []).map(m => ({
        ...m,
        nome: (m.nome || '').toUpperCase(),
        cpf: m.cpf ? m.cpf.replace(/\D/g, '') : '',
        rg: m.rg ? m.rg.replace(/[^\dX]/gi, '').toUpperCase() : '',
        isBaby: !!m.isBaby
      })),
      vehicles: (data.vehicles || []).map(v => ({
        ...v,
        modelo: capitalize(v.modelo || ''),
        cor: capitalize(v.cor || ''),
        placa: (v.placa || '').toUpperCase()
      })),
      serviceProviders: (data.serviceProviders || []).map(s => ({
        ...s,
        nome: (s.nome || '').toUpperCase(),
        rg: s.rg ? s.rg.replace(/[^\dX]/gi, '').toUpperCase() : ''
      })),
      emergencyContact: {
        ...data.emergencyContact,
        fone: data.emergencyContact.fone.replace(/\D/g, '')
      }
    };
    onSave({
      ...cleanData,
      id: initialData?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      })),
      createdAt: initialData?.createdAt || new Date().toISOString()
    } as Resident);
  };

  const invoiceDelivery = watch('invoiceDelivery');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 lg:space-y-8 bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-2xl shadow-xl max-w-4xl mx-auto border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <User size={24} />
          </div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">
            {isReadOnly ? 'Detalhes do Morador' : initialData ? 'Editar Morador' : 'Cadastro de Morador'}
          </h2>
        </div>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X size={24} />
        </button>
      </div>

      {/* Basic Info */}
      {/* Unidade Section */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Home size={18} />
          <h3 className="font-bold text-sm uppercase">Identificação da Unidade</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Bloco</label>
            <input 
              {...register('bloco')} 
              disabled={isReadOnly}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-70" 
              placeholder="Ex: 05" 
            />
            {errors.bloco && <p className="text-red-500 text-xs">{errors.bloco.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Apartamento</label>
            <input 
              {...register('apto')} 
              disabled={isReadOnly}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-70" 
              placeholder="Ex: 502" 
            />
            {errors.apto && <p className="text-red-500 text-xs">{errors.apto.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Tipo</label>
            <select 
              {...register('tipo')} 
              disabled={isReadOnly}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-70"
            >
              <option value="PROPRIETARIO">Proprietário</option>
              <option value="LOCATARIO">Locatário</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
              Data de Entrada
            </label>
            <input 
              type="date"
              {...register('dataEntrada')} 
              disabled={isReadOnly}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-70" 
            />
            {errors.dataEntrada && <p className="text-red-500 text-xs font-bold mt-1">{errors.dataEntrada.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
              Data Prevista de Saída
            </label>
            <input 
              type="date"
              {...register('dataSaida')} 
              disabled={isReadOnly}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-70" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
              Status Cadastral
            </label>
            <select 
              {...register('status')} 
              disabled={isReadOnly}
              className={`w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold ${watch('status') === 'ATIVO' ? 'text-green-600' : 'text-red-500'}`}
            >
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dados Pessoais Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <User size={18} />
          <h3 className="font-bold text-sm uppercase">Dados do Morador</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Nome Completo</label>
            <input 
              {...register('nome')} 
              disabled={isReadOnly}
              onChange={(e) => setValue('nome', e.target.value.toUpperCase())}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-70" 
            />
            {errors.nome && <p className="text-red-500 text-xs">{errors.nome.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Email</label>
            <input 
              {...register('email')} 
              disabled={isReadOnly}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-70" 
            />
            {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
              <Briefcase size={12} /> Local de Trabalho
            </label>
            <input 
              {...register('localTrabalho')} 
              disabled={isReadOnly}
              onChange={(e) => setValue('localTrabalho', e.target.value.toUpperCase())}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-70" 
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
              <Home size={12} /> Endereço Comercial
            </label>
            <input 
              {...register('enderecoComercial')} 
              disabled={isReadOnly}
              onChange={(e) => setValue('enderecoComercial', e.target.value.toUpperCase())}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-70" 
            />
          </div>
        </div>
      </div>

      {/* Contatos e Documentos Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Phone size={18} />
          <h3 className="font-bold text-sm uppercase">Contatos e Documentos</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Celular</label>
            <input 
              {...register('celular')} 
              disabled={isReadOnly}
              onChange={(e) => setValue('celular', formatPhone(e.target.value))}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-70" 
            />
            {errors.celular && <p className="text-red-500 text-xs">{errors.celular.message}</p>}
            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
              <input 
                type="checkbox" 
                {...register('temWhatsApp')} 
                disabled={isReadOnly} 
                className="text-primary focus:ring-primary w-4 h-4 rounded" 
              />
              Este número tem WhatsApp
            </label>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Fone Fixo</label>
            <input 
              {...register('fone')} 
              disabled={isReadOnly}
              onChange={(e) => setValue('fone', formatPhone(e.target.value))}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-70" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Fone Comercial</label>
            <input 
              {...register('foneComercial')} 
              disabled={isReadOnly}
              onChange={(e) => setValue('foneComercial', formatPhone(e.target.value))}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-70" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">CPF</label>
            <input 
              {...register('cpf')} 
              disabled={isReadOnly}
              onChange={(e) => setValue('cpf', formatCPF(e.target.value))}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-70" 
            />
            {errors.cpf && <p className="text-red-500 text-xs">{errors.cpf.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">RG</label>
            <input 
              {...register('rg')} 
              disabled={isReadOnly}
              onChange={(e) => setValue('rg', formatRG(e.target.value))}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-70" 
            />
            {errors.rg && <p className="text-red-500 text-xs">{errors.rg.message}</p>}
          </div>
        </div>
      </div>

      {/* Household Members */}
      <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Users size={18} />
            <h3 className="font-bold text-sm uppercase">Pessoas que habitarão o imóvel (Dependentes)</h3>
          </div>
          {!isReadOnly && (
            <button type="button" onClick={() => appendMember({ nome: '', rg: '', cpf: '', parentesco: '' })} className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-primary/20 transition-colors">
              <Plus size={14} /> Adicionar Morador
            </button>
          )}
        </div>
        <div className="space-y-3">
          {memberFields.length === 0 && !isReadOnly && (
            <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <p className="text-xs text-slate-400">Nenhum morador adicional cadastrado.</p>
            </div>
          )}
          {memberFields.map((field, index) => (
            <div key={field.id} className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl relative group border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Nome Completo</label>
                  <input 
                    {...register(`householdMembers.${index}.nome`)} 
                    disabled={isReadOnly}
                    onChange={(e) => setValue(`householdMembers.${index}.nome`, e.target.value.toUpperCase())}
                    placeholder="Nome" 
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs disabled:opacity-70" 
                  />
                  {errors.householdMembers?.[index]?.nome && <p className="text-red-500 text-[10px] font-bold">{errors.householdMembers[index].nome.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">CPF</label>
                  <input 
                    {...register(`householdMembers.${index}.cpf`)} 
                    disabled={isReadOnly}
                    onChange={(e) => setValue(`householdMembers.${index}.cpf`, formatCPF(e.target.value))}
                    placeholder="000.000.000-00" 
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs disabled:opacity-70" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">RG</label>
                  <input 
                    {...register(`householdMembers.${index}.rg`)} 
                    disabled={isReadOnly}
                    onChange={(e) => setValue(`householdMembers.${index}.rg`, formatRG(e.target.value))}
                    placeholder="00.000.000-0" 
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs disabled:opacity-70" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Parentesco</label>
                  <input 
                    {...register(`householdMembers.${index}.parentesco`)} 
                    disabled={isReadOnly}
                    placeholder="Ex: Filho, Esposa" 
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs disabled:opacity-70" 
                  />
                  {errors.householdMembers?.[index]?.parentesco && <p className="text-red-500 text-[10px] font-bold">{errors.householdMembers[index].parentesco.message}</p>}
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input 
                    type="checkbox"
                    {...register(`householdMembers.${index}.isBaby`)} 
                    disabled={isReadOnly}
                    id={`baby-${index}`}
                    className="w-4 h-4 text-primary focus:ring-primary border-slate-300 rounded"
                  />
                  <label htmlFor={`baby-${index}`} className="text-[10px] font-bold uppercase text-slate-500 cursor-pointer">
                    Bebê (Sem Doc)
                  </label>
                </div>
              </div>
              
              {/* Validation Error for RG or CPF requirement */}
              {errors.householdMembers?.[index]?.rg && !errors.householdMembers?.[index]?.rg.message?.includes("RG inválido") && (
                <p className="text-red-500 text-[10px] font-black mt-2 bg-red-50 dark:bg-red-900/20 p-1.5 rounded border border-red-100 dark:border-red-900/30">
                  ⚠️ {errors.householdMembers[index].rg.message}
                </p>
              )}
              
              {!isReadOnly && (
                <button type="button" onClick={() => removeMember(index)} className="absolute -right-2 -top-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Vehicles */}
      <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Car size={18} />
            <h3 className="font-bold text-sm uppercase">Veículos</h3>
          </div>
          {!isReadOnly && (
            <button type="button" onClick={() => appendVehicle({ modelo: '', cor: '', placa: '' })} className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-primary/20 transition-colors">
              <Plus size={14} /> Adicionar Veículo
            </button>
          )}
        </div>
        <div className="space-y-3">
          {vehicleFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg relative group border border-slate-200 dark:border-slate-700">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Modelo</label>
                <input 
                  {...register(`vehicles.${index}.modelo`)} 
                  disabled={isReadOnly}
                  onChange={(e) => setValue(`vehicles.${index}.modelo`, capitalize(e.target.value))}
                  placeholder="Ex: Corolla" 
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs disabled:opacity-70" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Cor</label>
                <input 
                  {...register(`vehicles.${index}.cor`)} 
                  disabled={isReadOnly}
                  onChange={(e) => setValue(`vehicles.${index}.cor`, capitalize(e.target.value))}
                  placeholder="Ex: Prata" 
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs disabled:opacity-70" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Placa</label>
                <input 
                  {...register(`vehicles.${index}.placa`)} 
                  disabled={isReadOnly}
                  onChange={(e) => setValue(`vehicles.${index}.placa`, e.target.value.toUpperCase())}
                  placeholder="ABC-1234" 
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs disabled:opacity-70" 
                />
              </div>
              {!isReadOnly && (
                <button type="button" onClick={() => removeVehicle(index)} className="absolute -right-2 -top-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          
          {vehicleFields.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl text-amber-800 dark:text-amber-200"
            >
              <div className="bg-amber-500 text-white p-1.5 rounded-lg">
                <Plus size={14} />
              </div>
              <p className="text-xs font-semibold">
                Será enviada <span className="font-black underline">1 TAG</span> de controle de acesso com custo de <span className="font-black">R$ 15,00 reais</span> por veículo cadastrado.
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Service Providers */}
      <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Construction size={18} />
            <h3 className="font-bold text-sm uppercase">Prestadores de Serviços Diário</h3>
          </div>
          {!isReadOnly && (
            <button type="button" onClick={() => appendService({ nome: '', rg: '' })} className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-primary/20 transition-colors">
              <Plus size={14} /> Adicionar Prestador
            </button>
          )}
        </div>
        <div className="space-y-3">
          {serviceFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg relative group border border-slate-200 dark:border-slate-700">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Nome do Prestador</label>
                <input 
                  {...register(`serviceProviders.${index}.nome`)} 
                  disabled={isReadOnly}
                  onChange={(e) => setValue(`serviceProviders.${index}.nome`, e.target.value.toUpperCase())}
                  placeholder="Nome" 
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs disabled:opacity-70" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">RG</label>
                <input 
                  {...register(`serviceProviders.${index}.rg`)} 
                  disabled={isReadOnly}
                  onChange={(e) => setValue(`serviceProviders.${index}.rg`, formatRG(e.target.value))}
                  placeholder="RG" 
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs disabled:opacity-70" 
                />
              </div>
              {!isReadOnly && (
                <button type="button" onClick={() => removeService(index)} className="absolute -right-2 -top-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <ShieldAlert size={18} />
          <h3 className="font-bold text-sm uppercase">Contato de Emergência</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            {...register('emergencyContact.nome')} 
            disabled={isReadOnly}
            onChange={(e) => setValue('emergencyContact.nome', e.target.value.toUpperCase())}
            placeholder="Nome do Contato" 
            className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-70" 
          />
          <input 
            {...register('emergencyContact.fone')} 
            disabled={isReadOnly}
            onChange={(e) => setValue('emergencyContact.fone', formatPhone(e.target.value))}
            placeholder="Telefone de Emergência" 
            className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-70" 
          />
        </div>
      </div>

      {/* Invoice Delivery */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <FileText size={18} />
          <h3 className="font-bold text-sm uppercase">Entrega de Boletos</h3>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" value="CONDOMINIO" {...register('invoiceDelivery')} disabled={isReadOnly} className="text-primary focus:ring-primary disabled:opacity-70" />
            No próprio condomínio
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" value="OUTRO" {...register('invoiceDelivery')} disabled={isReadOnly} className="text-primary focus:ring-primary disabled:opacity-70" />
            Outro endereço
          </label>
        </div>
        {invoiceDelivery === 'OUTRO' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Nome do Destinatário</label>
                <input {...register('invoiceAddress.nome')} disabled={isReadOnly} placeholder="Ex: Maria Silva" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm disabled:opacity-70" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">CEP</label>
                <input {...register('invoiceAddress.cep')} disabled={isReadOnly} placeholder="00000-000" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm disabled:opacity-70" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Logradouro / Endereço</label>
                <input {...register('invoiceAddress.logradouro')} disabled={isReadOnly} placeholder="Rua, Avenida, etc" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm disabled:opacity-70" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Número</label>
                <input {...register('invoiceAddress.numero')} disabled={isReadOnly} placeholder="123" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm disabled:opacity-70" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Bairro</label>
                <input {...register('invoiceAddress.bairro')} disabled={isReadOnly} placeholder="Centro" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm disabled:opacity-70" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Cidade</label>
                <input {...register('invoiceAddress.cidade')} disabled={isReadOnly} placeholder="Bauru" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm disabled:opacity-70" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Estado</label>
                <input {...register('invoiceAddress.estado')} disabled={isReadOnly} placeholder="SP" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm disabled:opacity-70" />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {Object.keys(errors).length > 0 && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
        >
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-sm mb-2">
            <ShieldAlert size={16} />
            Não é possível salvar. Verifique os campos abaixo:
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 list-disc list-inside">
            {Object.entries(errors).map(([key, error]: [string, any]) => (
              <li key={key} className="text-[10px] text-red-600 dark:text-red-400 uppercase font-black">
                {key === 'nome' ? 'Nome Completo' : 
                 key === 'celular' ? 'Celular' :
                 key === 'cpf' ? 'CPF' :
                 key === 'rg' ? 'RG' :
                 key === 'email' ? 'E-mail' :
                 key === 'dataEntrada' ? 'Data de Entrada' :
                 key === 'bloco' ? 'Bloco' :
                 key === 'apto' ? 'Apartamento' :
                 key === 'emergencyContact' ? 'Contato de Emergência' :
                 key}: {error.message}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
        <button type="button" onClick={onCancel} className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          {isReadOnly ? 'Fechar' : 'Cancelar'}
        </button>
        {!isReadOnly && (
          <button type="submit" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-8 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
            <Save size={18} />
            Salvar Cadastro
          </button>
        )}
      </div>
    </form>
  );
};
