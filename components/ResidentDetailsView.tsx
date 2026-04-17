'use client';

import React, { useState, useEffect } from 'react';
import { Resident } from '@/types/resident';
import { 
  User, Home, Phone, Mail, Briefcase, ShieldAlert, 
  Car, Users, Construction, FileText, X, MapPin 
} from 'lucide-react';
import { formatPhone, formatCPF, formatRG, formatPlate } from '@/lib/utils';
import { motion } from 'motion/react';
import { supabase } from '@/lib/supabase';

interface ResidentDetailsViewProps {
  resident: Resident;
  onClose: () => void;
}

export const ResidentDetailsView: React.FC<ResidentDetailsViewProps> = ({ resident, onClose }) => {
  // Helper to check if a section should be shown
  const hasProfessionalInfo = resident.localTrabalho || resident.enderecoComercial;
  const hasHouseholdMembers = resident.householdMembers.length > 0;
  const hasVehicles = resident.vehicles.length > 0;
  const hasServiceProviders = resident.serviceProviders.length > 0;
  const hasEmergencyContact = resident.emergencyContact.nome || resident.emergencyContact.fone;

  const [vagasGaragem, setVagasGaragem] = useState<number | null>(null);
  const [vagasVehicleMap, setVagasVehicleMap] = useState<Record<string, string>>({});
  const [rentedOutCount, setRentedOutCount] = useState(0);

  useEffect(() => {
    async function fetchVagas() {
      if (!resident.bloco || !resident.apto) return;
      const { data } = await supabase
        .from('units')
        .select('id, vagasgaragem')
        .eq('bloco', resident.bloco.padStart(2, '0'))
        .eq('numero', resident.apto)
        .maybeSingle();

      if (data) {
        setVagasGaragem(data.vagasgaragem || 0);

        // Buscar as vagas originais da unidade para saber se o morador emprestou
        const { data: vagasDaUnidade } = await supabase
          .from('vagas')
          .select('status, alugada_para_morador_id')
          .eq('unidade_id', data.id);
          
        if (vagasDaUnidade) {
            const alugadas = vagasDaUnidade.filter((v: any) => v.status === 'ALUGADA' && v.alugada_para_morador_id && v.alugada_para_morador_id !== resident.id).length;
            setRentedOutCount(alugadas);
        }
      }
      
      const vehicleIds = resident.vehicles?.map(v => v.id).filter(Boolean);
      if (vehicleIds && vehicleIds.length > 0) {
         const { data: vagasData } = await supabase
           .from('vagas')
           .select('codigo, veiculo_id')
           .in('veiculo_id', vehicleIds);
           
         if (vagasData) {
            const map: Record<string, string> = {};
            vagasData.forEach((v: any) => {
              if (v.veiculo_id) map[v.veiculo_id] = v.codigo;
            });
            setVagasVehicleMap(map);
         }
      }
    }
    fetchVagas();
  }, [resident.bloco, resident.apto, resident.vehicles]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-w-3xl mx-auto">
      {/* Header / ID Card Style - Moer compact */}
      <div className="bg-primary p-4 lg:p-5 text-white relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30 shrink-0">
            <User size={32} className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl lg:text-2xl font-black uppercase tracking-tight truncate">{resident.nome}</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="bg-white/15 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-white/10 uppercase">
                BL {resident.bloco} • AP {resident.apto}
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm border ${
                resident.tipo === 'PROPRIETARIO' 
                  ? 'bg-blue-500 text-white border-blue-400' 
                  : 'bg-purple-500 text-white border-purple-400'
              }`}>
                {resident.tipo === 'PROPRIETARIO' ? 'PROPRIETÁRIO' : 'LOCATÁRIO'}
              </span>
              <span className="bg-slate-800/30 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-white/5 uppercase">
                ID: {resident.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-5 space-y-4">
        {/* Contact & Docs Grid - Compact */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contato Principal</p>
            <div className="flex items-center justify-between">
              <p className="text-slate-900 dark:text-white font-bold text-sm flex items-center gap-2">
                <Phone size={12} className="text-primary" />
                {formatPhone(resident.celular)}
              </p>
              <a 
                href={`https://wa.me/55${resident.celular.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors shadow-sm"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.067 2.877 1.215 3.076.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">E-mail</p>
            <p className="text-slate-900 dark:text-white font-bold text-sm flex items-center gap-2 truncate">
              <Mail size={12} className="text-primary shrink-0" />
              {resident.email || 'Não informado'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Documentos</p>
            <p className="text-slate-900 dark:text-white font-bold text-xs flex items-center gap-2">
              <FileText size={12} className="text-primary" />
              {resident.cpf ? formatCPF(resident.cpf) : 'CPF s/ inf'} | {resident.rg || 'RG s/ inf'}
            </p>
          </div>
        </div>

        {/* Professional Info - Only if exists */}
        {hasProfessionalInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {resident.localTrabalho && (
              <div className="p-3 border-l-2 border-primary bg-slate-50 dark:bg-slate-800/20">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Local de Trabalho</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Briefcase size={12} className="text-primary" />
                  {resident.localTrabalho}
                </p>
              </div>
            )}
            {resident.enderecoComercial && (
              <div className="p-3 border-l-2 border-primary bg-slate-50 dark:bg-slate-800/20">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Endereço Comercial</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <MapPin size={12} className="text-primary" />
                  {resident.enderecoComercial}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Main Sections Grid - Denser */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Household Members */}
          {hasHouseholdMembers && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary border-b border-slate-100 dark:border-slate-800 pb-1">
                <Users size={14} />
                <h3 className="font-bold text-[10px] uppercase tracking-wider">Dependentes</h3>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {resident.householdMembers.map((member, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/30 rounded-lg text-xs">
                    <span className="font-bold uppercase inline-block truncate max-w-[150px]">{member.nome}</span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded uppercase">
                      {member.parentesco}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vehicles */}
          {(hasVehicles || vagasGaragem !== null) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary border-b border-slate-100 dark:border-slate-800 pb-1">
                <Car size={14} />
                <h3 className="font-bold text-[10px] uppercase tracking-wider">Veículos Cadastrados</h3>
                {vagasGaragem !== null && (
                  <div className="flex gap-2 ml-auto">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase text-white ${resident.vehicles.length > vagasGaragem ? 'bg-red-500' : 'bg-slate-600 dark:bg-slate-700'}`}>
                      LIMITE DA UNIDADE: {vagasGaragem} {vagasGaragem === 1 ? 'VAGA' : 'VAGAS'}
                    </span>
                    {rentedOutCount > 0 && (
                      <span className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/30 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0">
                         Vaga Emprestada
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {vagasGaragem !== null && resident.vehicles.length > vagasGaragem && (
                <div className="p-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg text-red-600 dark:text-red-400 text-[10px] font-bold flex items-center gap-1.5">
                  ⚠️ Há mais veículos ({resident.vehicles.length}) que vagas ({vagasGaragem}).
                </div>
              )}

              <div className="grid grid-cols-1 gap-1.5">
                {resident.vehicles.map((vehicle, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/30 rounded-lg text-xs">
                    <div className="flex flex-col">
                      <span className="font-bold uppercase">{vehicle.modelo} ({vehicle.cor})</span>
                      {vehicle.id && vagasVehicleMap[vehicle.id] && (
                        <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">
                          Vaga Vinculada: <span className="text-primary">{vagasVehicleMap[vehicle.id]}</span>
                        </span>
                      )}
                    </div>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-black text-[10px] border border-primary/20">
                      {vehicle.placa}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Emergency & Services & Invoices - Unified Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Service Providers */}
          {hasServiceProviders && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary border-b border-slate-100 dark:border-slate-800 pb-1">
                <Construction size={14} />
                <h3 className="font-bold text-[10px] uppercase tracking-wider">Prestadores</h3>
              </div>
              <div className="space-y-1">
                {resident.serviceProviders.map((service, i) => (
                  <div key={i} className="text-xs p-1.5 bg-slate-50 dark:bg-slate-800/30 rounded border border-slate-100 dark:border-slate-800">
                    <span className="font-bold uppercase">{service.nome}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency */}
          {hasEmergencyContact && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-500 border-b border-slate-100 dark:border-slate-800 pb-1">
                <ShieldAlert size={14} />
                <h3 className="font-bold text-[10px] uppercase tracking-wider">Emergência</h3>
              </div>
              <div className="p-2.5 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                <p className="font-black text-red-600 dark:text-red-400 uppercase text-[11px] truncate">{resident.emergencyContact.nome}</p>
                <p className="text-red-500 font-bold text-xs">{formatPhone(resident.emergencyContact.fone)}</p>
              </div>
            </div>
          )}

          {/* Invoice Delivery */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary border-b border-slate-100 dark:border-slate-800 pb-1">
              <FileText size={14} />
              <h3 className="font-bold text-[10px] uppercase tracking-wider">Boletos</h3>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-tight">
                {resident.invoiceDelivery === 'CONDOMINIO' 
                  ? 'Entregar no condomínio.' 
                  : `Entregar em: ${resident.invoiceAddress?.logradouro}, ${resident.invoiceAddress?.numero}`}
              </p>
            </div>
          </div>
        </div>

        {/* Observações - If exists */}
        {resident.observacoes && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl">
            <p className="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase mb-1">Observações Internas</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 italic">"{resident.observacoes}"</p>
          </div>
        )}
      </div>

      {/* Footer Actions - Smaller */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
        <button 
          onClick={onClose}
          className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-bold text-xs hover:opacity-90 transition-opacity"
        >
          FECHAR FICHA
        </button>
      </div>
    </div>
  );
};
