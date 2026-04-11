-- Sprint 2: Unidades, Colaboradores, Operadores

-- Tabela de Unidades
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bloco TEXT NOT NULL,
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('RESIDENCIAL', 'COMERCIAL', 'GARAGE')),
  status TEXT NOT NULL DEFAULT 'VAGA' CHECK (status IN ('OCUPADA', 'VAGA', 'OBRAS', 'MANUTENCAO')),
  vagasGaragem INTEGER DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Colaboradores do Condomínio
CREATE TABLE IF NOT EXISTS collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  rg TEXT,
  foto TEXT,
  funcao TEXT NOT NULL,
  turno TEXT NOT NULL,
  empresa TEXT,
  telefone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'DEMITIDO')),
  dataAdmissao TEXT,
  dataDemissao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alterar tabela operators para incluir novos campos
ALTER TABLE operators ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS dataAdmissao TEXT;

-- RLS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Todos podem ver unidades" ON units FOR SELECT USING (true);
CREATE POLICY "Admin gerencia unidades" ON units FOR ALL USING (
  EXISTS (SELECT 1 FROM operators WHERE id = auth.uid() AND role = 'Admin')
);

CREATE POLICY "Todos podem ver colaboradores" ON collaborators FOR SELECT USING (true);
CREATE POLICY "Admin/Zelador gerencia colaboradores" ON collaborators FOR ALL USING (
  EXISTS (SELECT 1 FROM operators WHERE id = auth.uid() AND role IN ('Admin', 'Zelador'))
);