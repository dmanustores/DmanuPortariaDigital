import { SupabaseClient } from '@supabase/supabase-js';

export interface VehicleAccessLog {
  id: string;
  veiculo_id: string;
  status: 'DENTRO' | 'SAIU' | 'NEGADO';
  hora_entrada: string;
  hora_saida?: string;
  observacoes?: string;
  operador_entrada_id?: string;
  operador_saida_id?: string;
  permanencia_minutos?: number;
  created_at: string;
}

export const vehiclesService = {
  /**
   * Registra uma nova entrada (ou tentativa negada) para um veículo
   */
  async registrarAcesso(
    supabase: SupabaseClient, 
    data: {
      veiculo_id: string;
      status: 'DENTRO' | 'NEGADO';
      operador_id: string;
      observacoes?: string;
      hora_entrada?: string;
    }
  ) {
    const { data: result, error } = await supabase
      .from('registros_acesso')
      .insert({
        veiculo_id: data.veiculo_id,
        status: data.status,
        operador_entrada_id: data.operador_id,
        observacoes: data.observacoes || null,
        hora_entrada: data.hora_entrada || new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  /**
   * Registra a saída de um veículo
   */
  async registrarSaida(
    supabase: SupabaseClient,
    acessoId: string,
    data: {
      operador_id: string;
      observacoes?: string;
      hora_saida?: string;
    }
  ) {
    const horaSaida = data.hora_saida || new Date().toISOString();
    
    // Buscar hora de entrada para calcular permanência
    const { data: access } = await supabase
      .from('registros_acesso')
      .select('hora_entrada')
      .eq('id', acessoId)
      .single();

    let permanencia = null;
    if (access?.hora_entrada) {
      const entrada = new Date(access.hora_entrada);
      const saida = new Date(horaSaida);
      permanencia = Math.floor((saida.getTime() - entrada.getTime()) / (1000 * 60));
    }

    const { data: result, error } = await supabase
      .from('registros_acesso')
      .update({
        status: 'SAIU',
        hora_saida: horaSaida,
        operador_saida_id: data.operador_id,
        observacoes: data.observacoes || null,
        permanencia_minutos: permanencia
      })
      .eq('id', acessoId)
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  /**
   * Busca as configurações do sistema para veículos
   */
  async getSettings(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'veiculo_config')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.value || { tempo_alerta_permanencia: 480, tipo_padrao_novo_veiculo: 'VISITANTE' };
  },

  /**
   * Atualiza as configurações do sistema
   */
  async updateSettings(supabase: SupabaseClient, value: any) {
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key: 'veiculo_config', value, updated_at: new Date().toISOString() });

    if (error) throw error;
  }
};
