'use client';

import React from 'react';
import { Resident } from '@/types/resident';
import { 
  User, Home, Phone, Mail, Briefcase, ShieldAlert, 
  Car, Users, Construction, FileText, X, MapPin 
} from 'lucide-react';
import { formatPhone, formatCPF, formatRG } from '@/lib/utils';
import { motion } from 'motion/react';

interface ResidentDetailsViewProps {
  resident: Resident;
  onClose: () => void;
}

export const ResidentDetailsView: React.FC<ResidentDetailsViewProps> = ({ resident, onClose }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-w-4xl mx-auto">
      {/* Header / ID Card Style */}
      <div className="bg-primary p-6 lg:p-8 text-white relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
            <User size={48} className="text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl lg:text-4xl font-black uppercase tracking-tight">{resident.nome}</h2>
            <div className="flex flex-wrap gap-3">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm">
                BL {resident.bloco}
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm">
                AP {resident.apto}
              </span>
              <span className="bg-emerald-500 px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                {resident.tipo === 'PROPRIETARIO' ? 'PROPRIETÁRIO' : 'LOCATÁRIO'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-8 space-y-8">
        {/* Contact & Docs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Celular</p>
            <p className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
              <Phone size={14} className="text-primary" />
              {formatPhone(resident.celular)}
              <a 
                href={`https://wa.me/55${resident.celular.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-md flex items-center gap-1.5 text-[10px]"
                title="Enviar WhatsApp"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.067 2.877 1.215 3.076.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                WHATSAPP
              </a>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</p>
            <p className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
              <Mail size={14} className="text-primary" />
              {resident.email}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentos</p>
            <p className="text-slate-900 dark:text-white font-bold">
              CPF: {formatCPF(resident.cpf)} | RG: {formatRG(resident.rg)}
            </p>
          </div>
        </div>

        <div className="h-px bg-slate-100 dark:bg-slate-800" />

        {/* Professional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Local de Trabalho</p>
            <p className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
              <Briefcase size={14} className="text-primary" />
              {resident.localTrabalho || 'NÃO INFORMADO'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço Comercial</p>
            <p className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
              <MapPin size={14} className="text-primary" />
              {resident.enderecoComercial || 'NÃO INFORMADO'}
            </p>
          </div>
        </div>

        {/* Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Household Members */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Users size={18} />
              <h3 className="font-bold text-sm uppercase">Dependentes / Moradores</h3>
            </div>
            <div className="space-y-2">
              {resident.householdMembers.length > 0 ? resident.householdMembers.map((member, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p className="font-bold text-slate-900 dark:text-white uppercase text-sm">{member.nome}</p>
                  <p className="text-xs text-slate-500">
                    {member.parentesco}
                    {member.isBaby && <span className="ml-2 bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold">BEBÊ</span>}
                    {member.rg && ` • RG: ${member.rg}`}
                    {member.cpf && ` • CPF: ${formatCPF(member.cpf)}`}
                  </p>
                </div>
              )) : (
                <p className="text-sm text-slate-400 italic">Nenhum dependente cadastrado.</p>
              )}
            </div>
          </div>

          {/* Vehicles */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Car size={18} />
              <h3 className="font-bold text-sm uppercase">Veículos</h3>
            </div>
            <div className="space-y-2">
              {resident.vehicles.length > 0 ? resident.vehicles.map((vehicle, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white uppercase text-sm">{vehicle.modelo}</p>
                    <p className="text-xs text-slate-500">{vehicle.cor}</p>
                  </div>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded font-black text-sm">
                    {vehicle.placa}
                  </span>
                </div>
              )) : (
                <p className="text-sm text-slate-400 italic">Nenhum veículo cadastrado.</p>
              )}
            </div>
          </div>
        </div>

        {/* Emergency & Services */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Construction size={18} />
              <h3 className="font-bold text-sm uppercase">Prestadores Diários</h3>
            </div>
            <div className="space-y-2">
              {resident.serviceProviders.length > 0 ? resident.serviceProviders.map((service, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p className="font-bold text-slate-900 dark:text-white uppercase text-sm">{service.nome}</p>
                  <p className="text-xs text-slate-500">RG: {service.rg}</p>
                </div>
              )) : (
                <p className="text-sm text-slate-400 italic">Nenhum prestador cadastrado.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-red-500">
              <ShieldAlert size={18} />
              <h3 className="font-bold text-sm uppercase">Contato de Emergência</h3>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
              <p className="font-black text-red-600 dark:text-red-400 uppercase">{resident.emergencyContact.nome}</p>
              <p className="text-red-500 font-bold">{formatPhone(resident.emergencyContact.fone)}</p>
            </div>
          </div>
        </div>

        {/* Invoice Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <FileText size={18} />
            <h3 className="font-bold text-sm uppercase">Entrega de Boletos</h3>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
            {resident.invoiceDelivery === 'CONDOMINIO' ? (
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Entrega no próprio condomínio.</p>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Endereço de Entrega</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {resident.invoiceAddress?.nome}<br />
                  {resident.invoiceAddress?.logradouro}, {resident.invoiceAddress?.numero}<br />
                  {resident.invoiceAddress?.bairro} - {resident.invoiceAddress?.cidade}/{resident.invoiceAddress?.estado}<br />
                  CEP: {resident.invoiceAddress?.cep}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
        <button 
          onClick={onClose}
          className="px-8 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
        >
          FECHAR FICHA
        </button>
      </div>
    </div>
  );
};
