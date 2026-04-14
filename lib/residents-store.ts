'use client';

import { Resident, HouseholdMember, Vehicle, ServiceProvider } from '@/types/resident';
import { supabase } from './supabase';

export const getResidents = async (): Promise<Resident[]> => {
  const { data: residents, error } = await supabase
    .from('residents')
    .select(`
      *,
      household_members (*),
      vehicles (*),
      service_providers (*),
      invoice_addresses (*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching residents:', error);
    return [];
  }

  console.log('Fetched residents from DB:', residents);

  return (residents || []).map((r: any) => ({
    id: r.id,
    bloco: r.bloco,
    apto: r.apto,
    tipo: r.tipo,
    nome: r.nome,
    celular: r.celular,
    fone: r.fone,
    foneComercial: r.fone_comercial,
    email: r.email,
    localTrabalho: r.local_trabalho,
    enderecoComercial: r.endereco_comercial,
    cpf: r.cpf,
    rg: r.rg,
    householdMembers: (r.household_members || []).map((m: any) => ({
      ...m,
      isBaby: m.rg === 'BEBE',
      cpf: m.cpf || ''
    })),
    vehicles: r.vehicles || [],
    serviceProviders: r.service_providers || [],
    emergencyContact: {
      nome: r.emergency_contact_nome,
      fone: r.emergency_contact_fone
    },
    invoiceDelivery: r.invoice_delivery,
    status: r.status || 'ATIVO',
    temWhatsApp: r.tem_whatsapp || false,
    lgpdConsent: r.lgpd_consent || false,
    dataEntrada: r.data_entrada,
    dataSaida: r.data_saida,
    observacoes: r.observacoes,
    invoiceAddress: r.invoice_addresses?.[0] || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
};

export const saveResident = async (resident: Resident) => {
  try {
    console.log('Saving resident data:', resident);
    console.log('Vehicles to save:', resident.vehicles);
    console.log('Number of vehicles:', resident.vehicles?.length);
    
    // Validation: Check for duplicate CPF in the same unit (bloco/apto)
    // Only if it's a new resident or the CPF/Unit changed
    const { data: duplicate, error: checkError } = await supabase
      .from('residents')
      .select('id, nome')
      .eq('bloco', resident.bloco)
      .eq('apto', resident.apto)
      .eq('cpf', resident.cpf)
      .neq('id', resident.id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for duplicate CPF:', checkError);
    }

    if (duplicate) {
      throw new Error(`Já existe um morador cadastrado com este CPF (${resident.cpf}) para a unidade Bloco ${resident.bloco} - Apto ${resident.apto} (${duplicate.nome}).`);
    }

    // Normalização inicial do bloco para garantir padrão 01, 02... no banco
    const normalizedBloco = resident.bloco.padStart(2, '0');

    const residentData = {
      id: resident.id,
      bloco: normalizedBloco,
      apto: resident.apto,
      tipo: resident.tipo,
      nome: resident.nome,
      celular: resident.celular,
      fone: resident.fone,
      fone_comercial: resident.foneComercial,
      email: resident.email,
      local_trabalho: resident.localTrabalho,
      endereco_comercial: resident.enderecoComercial,
      cpf: resident.cpf,
      rg: resident.rg,
      emergency_contact_nome: resident.emergencyContact.nome,
      emergency_contact_fone: resident.emergencyContact.fone,
      invoice_delivery: resident.invoiceDelivery,
      status: resident.status || 'ATIVO',
      tem_whatsapp: resident.temWhatsApp || false,
      lgpd_consent: resident.lgpdConsent || false,
      data_entrada: resident.dataEntrada,
      data_saida: resident.dataSaida,
      observacoes: resident.observacoes,
      updated_at: new Date().toISOString(),
      created_at: resident.createdAt
    };

    // Use upsert for the main resident record
    const { error: residentError } = await supabase
      .from('residents')
      .upsert(residentData);

    if (residentError) {
      console.error('Error saving resident:', residentError);
      throw residentError;
    }

    // Delete existing relations to ensure a clean state (Sync)
    console.log('🗑️ Deleting old relations for resident:', resident.id);
    const delResults = await Promise.all([
      { name: 'household_members', res: await supabase.from('household_members').delete().eq('resident_id', resident.id) },
      { name: 'vehicles', res: await supabase.from('vehicles').delete().eq('resident_id', resident.id) },
      { name: 'service_providers', res: await supabase.from('service_providers').delete().eq('resident_id', resident.id) },
      { name: 'invoice_addresses', res: await supabase.from('invoice_addresses').delete().eq('resident_id', resident.id) },
      { name: 'vehicles_registry', res: await supabase.from('vehicles_registry').delete().eq('moradorid', resident.id) }
    ]);

    const failedDel = delResults.find(r => r.res.error);
    if (failedDel) {
      console.error(`❌ Error clearing old relations in ${failedDel.name}:`, failedDel.res.error.message, failedDel.res.error.details);
      // We log but continue to try saving others, though ideally we should handle this.
    } else {
      console.log('✅ Old relations deleted successfully (5 tables cleared)');
    }

    // Insert relations
    const promises = [];

    // Sincroniza e força atualização da unidade residente (Tolerante a falhas RLS)
    if (resident.bloco && resident.apto) {
      promises.push((async () => {
        try {
          // Normaliza bloco para garantir vínculo (ex: "3" -> "03")
          const normalizedBloco = resident.bloco.padStart(2, '0');
          
          const { data: existingUnit } = await supabase
            .from('units')
            .select('id')
            .eq('bloco', normalizedBloco)
            .eq('numero', resident.apto)
            .maybeSingle();

          if (existingUnit) {
            // Se encontrou a unidade, marca como OCUPADA
            await supabase.from('units').update({ 
              status: 'OCUPADA'
            }).eq('id', existingUnit.id);
            console.log(`🏠 Unit ${normalizedBloco}-${resident.apto} status updated to OCUPADA`);
          } else {
            // Se não encontrou, talvez a unidade não exista, tentamos criar ou apenas logar
            console.warn(`⚠️ Unit ${normalizedBloco}-${resident.apto} not found in 'units' table.`);
          }
        } catch (unitErr) {
          console.error('Error syncing unit status:', unitErr);
        }
      })());
    }

    if (resident.householdMembers && resident.householdMembers.length > 0) {
      promises.push(
        supabase.from('household_members').insert(
          resident.householdMembers.map((m: any) => {
            // Omit 'isBaby' as it is not in the DB schema
            const { id, resident_id, created_at, isBaby, ...rest } = m;
            return { 
              ...rest, 
              resident_id: resident.id,
              // rg is mandatory in DB, so we ensure it's not null
              // If it's a baby, we store 'BEBE' in the RG field
              rg: m.rg || (m.isBaby ? 'BEBE' : ''),
              cpf: m.cpf ? m.cpf.replace(/\D/g, '') : null
            };
          })
        )
      );
    }

    if (resident.vehicles && resident.vehicles.length > 0) {
      console.log('Processing vehicles for resident:', resident.id);
      
      // Delete old vehicles
      const delVehicles = await supabase.from('vehicles').delete().eq('resident_id', resident.id);
      if(delVehicles.error) {
        console.warn('Could not delete old vehicles:', delVehicles.error);
      } else {
        console.log('Old vehicles deleted');
      }

      // Prepare vehicle data
      const vehicleData = resident.vehicles.map((v: any) => {
        const { id, resident_id, created_at, ...rest } = v;
        console.log('Vehicle to save - Modelo:', rest.modelo, 'Cor:', rest.cor, 'Placa:', rest.placa);
        return { ...rest, resident_id: resident.id };
      });
      
      console.log('Inserting', vehicleData.length, 'vehicles');
      const vehicleResult = await supabase.from('vehicles').insert(vehicleData).select();
      
      if(vehicleResult.error) {
        console.error('❌ Error inserting vehicles:', vehicleResult.error);
        throw vehicleResult.error;
      }
      
      const insertedVehicles = vehicleResult.data || [];
      console.log('✅ Vehicles inserted successfully:', insertedVehicles);
      
      // Now insert into vehicles_registry using ACTUAL inserted vehicle data
      if(insertedVehicles.length > 0) {
        // Resolve unit ID for the registry
        let unitId: string | null = null;
        try {
          const { data: unitData } = await supabase
            .from('units')
            .select('id')
            .eq('bloco', resident.bloco)
            .eq('numero', resident.apto)
            .maybeSingle();
          unitId = unitData?.id || null;
        } catch (e) {
          console.warn('Could not resolve unitId for registry:', e);
        }

        const registryData = insertedVehicles.map((v: any) => ({
          placa: v.placa ? v.placa.toUpperCase() : '',
          modelo: v.modelo || null,
          cor: v.cor || null,
          unidadeid: unitId,
          unidadedesc: `Bloco ${resident.bloco}, Apt ${resident.apto}`,
          tipo: resident.tipo,
          nomeproprietario: resident.nome,
          telefone: resident.celular || resident.fone || null,
          moradorid: resident.id,
          status: 'ATIVO'
        }));
        
        console.log('Syncing to vehicles_registry:', registryData);
        
        promises.push(
          supabase.from('vehicles_registry').insert(registryData).then((res: any) => {
            if(res.error) {
              console.warn('⚠️ Error syncing to vehicles_registry:', res.error);
              return { error: null };
            }
            console.log('✅ vehicles_registry synced');
            return res;
          })
        );
      }
    }

    if (resident.serviceProviders && resident.serviceProviders.length > 0) {
      promises.push(
        supabase.from('service_providers').insert(
          resident.serviceProviders.map((s: any) => {
            const { id, resident_id, created_at, ...rest } = s;
            return { ...rest, resident_id: resident.id };
          })
        )
      );
    }

    if (resident.invoiceAddress && resident.invoiceDelivery === 'OUTRO') {
      const { id, resident_id, created_at, ...addressData } = resident.invoiceAddress as any;
      promises.push(
        supabase.from('invoice_addresses').insert({
          ...addressData,
          resident_id: resident.id
        })
      );
    }

    if (promises.length > 0) {
      const results = await Promise.all(promises);
      const errorResult = results.find(r => r && r.error);
      if (errorResult?.error) {
        console.error('Error saving resident relations:', errorResult.error);
        throw errorResult.error;
      }
    }

  } catch (error) {
    console.error('Fatal error in saveResident:', error);
    throw error;
  }
};

export const deleteResident = async (id: string) => {
  try {
    // 1. Delete relations first to avoid foreign key constraints issues
    const rels = await Promise.all([
      { name: 'household_members', res: await supabase.from('household_members').delete().eq('resident_id', id) },
      { name: 'vehicles', res: await supabase.from('vehicles').delete().eq('resident_id', id) },
      { name: 'service_providers', res: await supabase.from('service_providers').delete().eq('resident_id', id) },
      { name: 'invoice_addresses', res: await supabase.from('invoice_addresses').delete().eq('resident_id', id) },
      { name: 'vehicles_registry', res: await supabase.from('vehicles_registry').delete().eq('moradorid', id) }
    ]);

    // Check if any relation deletion failed
    const failedRel = rels.find(r => r.res.error);
    if (failedRel) {
      console.error(`Error deleting resident relations in ${failedRel.name}:`, failedRel.res.error.message);
      throw new Error(`Erro ao remover dados vinculados (${failedRel.name}): ${failedRel.res.error.message}`);
    }

    // 2. Delete the main resident record
    // We use .select() to verify if the row was actually found and deleted
    const { data, error } = await supabase
      .from('residents')
      .delete()
      .eq('id', id)
      .select();
      
    if (error) {
      console.error('Error deleting resident record:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('No resident found with ID to delete:', id);
      throw new Error('O registro do morador não foi encontrado para exclusão.');
    }

    const deletedResident = data[0];
    console.log('Successfully deleted resident and all relations:', id);

    // 3. Sincronismo Reverso: Se for o último morador da unidade, volta o status para VAGA
    if (deletedResident.bloco && deletedResident.apto) {
      try {
        const { count } = await supabase
          .from('residents')
          .select('id', { count: 'exact', head: true })
          .eq('bloco', deletedResident.bloco)
          .eq('apto', deletedResident.apto);

        if (count === 0) {
          console.log(`🧹 Unit ${deletedResident.bloco}-${deletedResident.apto} is now empty. Setting to VAGA.`);
          await supabase
            .from('units')
            .update({ status: 'VAGA' })
            .eq('bloco', deletedResident.bloco)
            .eq('numero', deletedResident.apto);
        }
      } catch (syncErr) {
        console.error('Error updating unit status after deletion:', syncErr);
      }
    }
  } catch (error) {
    console.error('Fatal error in deleteResident:', error);
    throw error;
  }
};
