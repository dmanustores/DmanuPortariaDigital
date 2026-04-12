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
    invoiceAddress: r.invoice_addresses?.[0] || undefined,
    createdAt: r.created_at
  }));
};

export const saveResident = async (resident: Resident) => {
  try {
    console.log('Saving resident data:', resident);
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

    const residentData = {
      id: resident.id,
      bloco: resident.bloco,
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
    const delResults = await Promise.all([
      supabase.from('household_members').delete().eq('resident_id', resident.id),
      supabase.from('vehicles').delete().eq('resident_id', resident.id),
      supabase.from('service_providers').delete().eq('resident_id', resident.id),
      supabase.from('invoice_addresses').delete().eq('resident_id', resident.id),
      supabase.from('vehicles_registry').delete().eq('moradorid', resident.id)
    ]);

    const delError = delResults.find(r => r.error)?.error;
    if (delError) {
      console.error('Error clearing old relations:', delError);
    }

    // Insert relations
    const promises = [];

    // Sincroniza e força atualização da unidade residente
    if (resident.bloco && resident.apto) {
      promises.push((async () => {
        const { data: existingUnit } = await supabase
          .from('units')
          .select('id')
          .eq('bloco', resident.bloco)
          .eq('numero', resident.apto)
          .maybeSingle();

        if (existingUnit) {
          await supabase.from('units').update({ status: 'OCUPADA' }).eq('id', existingUnit.id);
        } else {
          await supabase.from('units').insert({
            bloco: resident.bloco,
            numero: resident.apto,
            tipo: 'RESIDENCIAL',
            status: 'OCUPADA',
            vagasgaragem: 1
          });
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
      promises.push(
        supabase.from('vehicles').insert(
          resident.vehicles.map((v: any) => {
            const { id, resident_id, created_at, ...rest } = v;
            return { ...rest, resident_id: resident.id };
          })
        )
      );

      promises.push(
        supabase.from('vehicles_registry').insert(
          resident.vehicles.map((v: any) => ({
            placa: v.placa ? v.placa.toUpperCase() : '',
            modelo: v.modelo || null,
            cor: v.cor || null,
            unidadedesc: `Bloco ${resident.bloco}, Apt ${resident.apto}`,
            tipo: 'MORADOR',
            nomeproprietario: resident.nome,
            telefone: resident.celular || resident.fone || null,
            moradorid: resident.id,
            status: 'ATIVO'
          }))
        )
      );
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
      const firstError = results.find(r => r.error)?.error;
      if (firstError) {
        console.error('Error saving resident relations:', firstError);
        throw firstError;
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
      supabase.from('household_members').delete().eq('resident_id', id),
      supabase.from('vehicles').delete().eq('resident_id', id),
      supabase.from('service_providers').delete().eq('resident_id', id),
      supabase.from('invoice_addresses').delete().eq('resident_id', id),
      supabase.from('vehicles_registry').delete().eq('moradorid', id)
    ]);

    // Check if any relation deletion failed
    const relError = rels.find(r => r.error)?.error;
    if (relError) {
      console.error('Error deleting resident relations:', relError);
      throw new Error(`Erro ao remover dados vinculados: ${relError.message}`);
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
      // If it wasn't found, maybe it was already deleted or the ID is wrong
      // We'll throw to let the user know something is off
      throw new Error('O registro do morador não foi encontrado para exclusão.');
    }

    console.log('Successfully deleted resident and all relations:', id);
  } catch (error) {
    console.error('Fatal error in deleteResident:', error);
    throw error;
  }
};
