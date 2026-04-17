export type CargoColaborador = 'ZELADOR' | 'FAXINEIRA' | 'JARDINEIRO' | 'EMPREGADA_DOMESTICA' | 'SEGURANCA' | 'MANUTENCAO' | 'OUTRO';

export type StatusColaborador = 'ATIVO' | 'INATIVO' | 'SUSPENSO';

export type StatusRegistroColaborador = 'DENTRO' | 'SAIU' | 'FALTA';

export interface Colaborador {
  id: string;
  nome: string;
  cargo: CargoColaborador | string;
  empresa?: string | null;
  telefone?: string | null;
  documento_rg?: string | null;
  documento_cpf?: string | null;
  unidade_vinculada_id?: string | null;
  unidade_bloco?: string | null; // Joined from units
  unidade_numero?: string | null; // Joined from units
  horario_entrada?: string | null; // 'HH:mm:ss'
  horario_saida?: string | null; // 'HH:mm:ss'
  dias_semana?: string | null; // 'SEG,TER,QUA...'
  status: StatusColaborador;
  criado_por?: string | null;
  criado_em?: string | null;
  updated_at?: string | null;
}

export interface RegistroColaborador {
  id: string;
  colaborador_id: string;
  porteiro_id: string;
  porteiro_nome?: string; // Joined from operators
  hora_entrada: string | null;
  hora_saida: string | null;
  permanencia_min: number | null;
  status: StatusRegistroColaborador;
  observacoes: string | null;
  criado_em: string;
  colaborador?: Colaborador; // Joined from colaboradores
}
