import { supabase } from './supabase';
import { Colaborador, RegistroColaborador } from '@/types/colaborador';

// -- CRUD DE COLABORADORES --

export async function getColaboradores(): Promise<Colaborador[]> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select(`
      *,
      unidades:units (
        bloco,
        numero
      )
    `)
    .order('nome');

  if (error) {
    console.error('Error fetching colaboradores', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    ...item,
    unidade_bloco: item.unidades?.bloco,
    unidade_numero: item.unidades?.numero
  }));
}

export async function saveColaborador(colab: Partial<Colaborador>): Promise<Colaborador> {
  const { unidade_bloco, unidade_numero, ...dbData } = colab;

  if (colab.id) {
    const { data, error } = await supabase
      .from('colaboradores')
      .update({ ...dbData, updated_at: new Date().toISOString() })
      .eq('id', colab.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    // Pegar o operador atual
    const { data: { session } } = await supabase.auth.getSession();
    const criado_por = session?.user?.id;

    const { data, error } = await supabase
      .from('colaboradores')
      .insert([{ ...dbData, criado_por }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function deleteColaborador(id: string): Promise<void> {
  const { error } = await supabase.from('colaboradores').delete().eq('id', id);
  if (error) throw error;
}

// -- REGISTRO DE ACESSOS (PORTARIA) --

export async function getRegistrosColaboradores(filtros?: { dataInicio?: string, dataFim?: string, nome?: string, status?: string }): Promise<RegistroColaborador[]> {
  let query = supabase
    .from('registros_colaboradores')
    .select(`
      *,
      colaboradores (nome, cargo, empresa),
      operators:porteiro_id (nome)
    `)
    .order('hora_entrada', { ascending: false });

  if (filtros?.dataInicio) {
    query = query.gte('hora_entrada', `${filtros.dataInicio}T00:00:00Z`);
  }
  if (filtros?.dataFim) {
    query = query.lte('hora_entrada', `${filtros.dataFim}T23:59:59Z`);
  }
  if (filtros?.status) {
    query = query.eq('status', filtros.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching registros colaboradores', error);
    return [];
  }

  // Se tiver filtro por nome, filtramos em JS devido a restriçoes de busca aninhada no maybe
  let result = data || [];
  if (filtros?.nome) {
     const search = filtros.nome.toLowerCase();
     result = result.filter((r: any) => r.colaboradores?.nome?.toLowerCase().includes(search));
  }

  return result.map((item: any) => ({
    ...item,
    porteiro_nome: item.operators?.nome,
    colaborador: item.colaboradores
  }));
}

export async function registrarEntradaColaborador(colaborador_id: string, observacoes?: string): Promise<RegistroColaborador> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Não autorizado. Faça login primeiro.');

  const porteiro_id = session.user.id;
  const hora_entrada = new Date().toISOString();

  const { data, error } = await supabase
    .from('registros_colaboradores')
    .insert([{
      colaborador_id,
      porteiro_id,
      hora_entrada,
      status: 'DENTRO',
      observacoes
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function registrarSaidaColaborador(registro_id: string, observacoes?: string): Promise<RegistroColaborador> {
  // Buscar o registro original para calcular os minutos
  const { data: registroAnterior, error: fetchErr } = await supabase
    .from('registros_colaboradores')
    .select('hora_entrada, observacoes')
    .eq('id', registro_id)
    .single();
    
  if (fetchErr) throw fetchErr;

  const hora_saida = new Date().toISOString();
  let permanencia_min = null;

  if (registroAnterior.hora_entrada) {
      const diffMs = new Date(hora_saida).getTime() - new Date(registroAnterior.hora_entrada).getTime();
      permanencia_min = Math.floor(diffMs / 60000); // converte ms para minutos
  }
  
  const finalObs = observacoes 
    ? (registroAnterior.observacoes ? `${registroAnterior.observacoes} | Saída: ${observacoes}` : observacoes) 
    : registroAnterior.observacoes;

  const { data, error } = await supabase
    .from('registros_colaboradores')
    .update({
      hora_saida,
      permanencia_min,
      status: 'SAIU',
      observacoes: finalObs
    })
    .eq('id', registro_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function marcarFaltaColaborador(colaborador_id: string, observacoes?: string): Promise<RegistroColaborador> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Não autorizado. Faça login primeiro.');

  const porteiro_id = session.user.id;

  const { data, error } = await supabase
    .from('registros_colaboradores')
    .insert([{
      colaborador_id,
      porteiro_id,
      status: 'FALTA',
      observacoes
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}
