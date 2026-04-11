-- Sprint 5: Funcionalidades Secundárias

-- Tabela de Mudanças
CREATE TABLE IF NOT EXISTS moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidadeId UUID REFERENCES units(id),
  unidadeDesc TEXT NOT NULL,
  responsavelNome TEXT NOT NULL,
  responsavelTelefone TEXT,
  cpfResponsavel TEXT,
  dataMovimentacao DATE NOT NULL,
  horaInicio TIME NOT NULL,
  horaFim TIME NOT NULL,
  observacoes TEXT,
  elevadorServico BOOLEAN DEFAULT false,
  veiculoPlaca TEXT,
  veiculoModelo TEXT,
  status TEXT NOT NULL DEFAULT 'AGENDADA' CHECK (status IN ('AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Áreas Comuns
CREATE TABLE IF NOT EXISTS common_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  capacidade INTEGER,
  regras TEXT,
  horarioFuncionamento TEXT,
  imagem TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'MANUTENCAO')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Reservas
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  areaId UUID REFERENCES common_areas(id),
  areaNome TEXT NOT NULL,
  unidadeId UUID REFERENCES units(id),
  unidadeDesc TEXT NOT NULL,
  responsavelNome TEXT NOT NULL,
  responsavelTelefone TEXT,
  dataReserva DATE NOT NULL,
  horaInicio TIME NOT NULL,
  horaFim TIME NOT NULL,
  finalidade TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'CONFIRMADA', 'CANCELADA', 'CONCLUIDA')),
  operadorId UUID REFERENCES operators(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Avisos
CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'INFO' CHECK (tipo IN ('INFO', 'URGENTE', 'AVISO', 'EVENTO')),
  prioridade INTEGER DEFAULT 0,
  validade DATE,
  publicadoPor UUID REFERENCES operators(id),
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'ARQUIVADO')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Todos podem ver mudanças" ON moves FOR SELECT USING (true);
CREATE POLICY "Operadores gerenciam mudanças" ON moves FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Todos podem ver áreas comuns" ON common_areas FOR SELECT USING (true);
CREATE POLICY "Admin gerencia áreas comuns" ON common_areas FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Todos podem ver reservas" ON reservations FOR SELECT USING (true);
CREATE POLICY "Operadores gerenciam reservas" ON reservations FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Todos podem ver avisos" ON notices FOR SELECT USING (true);
CREATE POLICY "Operadores gerenciam avisos" ON notices FOR ALL USING (auth.uid() IS NOT NULL);

-- Inserir áreas comuns padrão
INSERT INTO common_areas (nome, capacidade, regras, horarioFuncionamento) VALUES
('Salão de Festas', 50, 'Música alta após 22h proibida. Limpeza obrigatória após uso.', '08:00-23:00'),
('Churrasqueira', 20, 'Limpeza obrigatória. Gás não fornecido.', '08:00-22:00'),
('Piscina', 30, 'Uso de proteção ocular obrigatório. crianças sob supervisão.', '07:00-21:00'),
('Academia', 15, 'Uso de roupa adequada obrigatório. limpo após uso.', '06:00-23:00'),
('Quadra Poliesportiva', 20, 'Calçado esportivo obrigatório. limpo após uso.', '06:00-22:00'),
('Sala de Jogos', 10, 'Silêncio após 22h. limpar após uso.', '09:00-23:00');