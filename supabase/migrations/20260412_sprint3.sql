-- Sprint 3: Operação Diária

-- Tabela de Acessos/Visitantes
CREATE TABLE IF NOT EXISTS accesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('VISITANTE', 'PRESTADOR', 'ENTREGADOR', 'COLABORADOR', 'MORADOR')),
  subtipo TEXT,
  nome TEXT NOT NULL,
  documento TEXT,
  unidadeId UUID REFERENCES units(id),
  unidadeDesc TEXT,
  liberadoPor TEXT,
  liberadoPorUnidade TEXT,
  empresa TEXT,
  veiculoPlaca TEXT,
  veiculoModelo TEXT,
  veiculoCor TEXT,
  foto TEXT,
  observacoes TEXT,
  horaEntrada TIMESTAMPTZ DEFAULT now(),
  horaSaida TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'DENTRO' CHECK (status IN ('DENTRO', 'SAIU', 'CANCELADO')),
  operadorId UUID REFERENCES operators(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Pré-Autorizações
CREATE TABLE IF NOT EXISTS preauthorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  documento TEXT,
  unidadeId UUID REFERENCES units(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('RECORRENTE', 'PONTUAL', 'PERMANENTE')),
  diasSemana TEXT,
  horaInicio TEXT,
  horaFim TEXT,
  dataInicio DATE,
  dataFim DATE,
  veiculoPlaca TEXT,
  veiculoModelo TEXT,
  foto TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'VENCIDO')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Encomendas
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidadeId UUID REFERENCES units(id),
  unidadeDesc TEXT,
  transportadora TEXT NOT NULL,
  numero TEXT,
  volumes INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'AGUARDANDO' CHECK (status IN ('AGUARDANDO', 'RETIRADA', 'RECUSADA', 'DEVOLVIDA')),
  motivoRecusa TEXT,
  RetiradoPor TEXT,
  horaRecebimento TIMESTAMPTZ DEFAULT now(),
  horaRetirada TIMESTAMPTZ,
  operadorRecebimento UUID REFERENCES operators(id),
  operadorRetirada UUID REFERENCES operators(id),
  fotoEtiqueta TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Veículos (complementar à tabela residents)
CREATE TABLE IF NOT EXISTS vehicles_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa TEXT NOT NULL UNIQUE,
  modelo TEXT,
  cor TEXT,
  unidadeId UUID REFERENCES units(id),
  tipo TEXT NOT NULL DEFAULT 'MORADOR' CHECK (tipo IN ('MORADOR', 'VISITANTE', 'PRESTADOR', 'MUDANCA')),
  nomeProprietario TEXT,
  telefone TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Ocorrências (P0 obrigatório)
CREATE TABLE IF NOT EXISTS occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('MANUTENCAO', 'SEGURANCA', 'RECLAMACAO', 'INFORMATIVO', 'PASSAGEM')),
  titulo TEXT NOT NULL,
  descricao TEXT,
  unidadeId UUID REFERENCES units(id),
  unidadeDesc TEXT,
  prioridade TEXT NOT NULL DEFAULT 'Normal' CHECK (prioridade IN ('Baixa', 'Normal', 'Urgente')),
  status TEXT NOT NULL DEFAULT 'Aberta' CHECK (status IN ('Aberta', 'Andamento', 'Resolvida', 'Arquivada')),
  foto TEXT,
  operadorId UUID REFERENCES operators(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE accesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE preauthorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE occurrences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Todos podem ver acessos" ON accesses FOR SELECT USING (true);
CREATE POLICY "Operadores gerenciam acessos" ON accesses FOR ALL USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Todos podem ver pré-autorizações" ON preauthorizations FOR SELECT USING (true);
CREATE POLICY "Operadores gerenciam pré-autorizações" ON preauthorizations FOR ALL USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Todos podem ver encomendas" ON packages FOR SELECT USING (true);
CREATE POLICY "Operadores gerenciam encomendas" ON packages FOR ALL USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Todos podem ver veículos" ON vehicles_registry FOR SELECT USING (true);
CREATE POLICY "Operadores gerenciam veículos" ON vehicles_registry FOR ALL USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Todos podem ver ocorrências" ON occurrences FOR SELECT USING (true);
CREATE POLICY "Operadores gerenciam ocorrências" ON occurrences FOR ALL USING (
  auth.uid() IS NOT NULL
);