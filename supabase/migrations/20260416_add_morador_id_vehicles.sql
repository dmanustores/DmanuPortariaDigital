-- Sprint 6: Complete schema fix

-- Create operators table
CREATE TABLE IF NOT EXISTS operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Porteiro',
  turno TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create units table
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bloco TEXT NOT NULL,
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'RESIDENCIAL' CHECK (tipo IN ('RESIDENCIAL', 'COMERCIAL', 'GARAGE')),
  status TEXT NOT NULL DEFAULT 'VAGA' CHECK (status IN ('OCUPADA', 'VAGA', 'OBRAS', 'MANUTENCAO')),
  vagasGaragem INTEGER DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create residents table
CREATE TABLE IF NOT EXISTS residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bloco TEXT,
  numero TEXT,
  tipo TEXT NOT NULL DEFAULT 'LOCATARIO' CHECK (tipo IN ('LOCATARIO', 'PROPRIETARIO')),
  nome TEXT NOT NULL,
  celular TEXT,
  fone TEXT,
  fone_comercial TEXT,
  email TEXT,
  local_trabalho TEXT,
  endereco_comercial TEXT,
  cpf TEXT,
  rg TEXT,
  emergency_contact_nome TEXT,
  emergency_contact_fone TEXT,
  invoice_delivery TEXT DEFAULT 'CONDOMINIO',
  foto TEXT,
  dataEntrada TEXT,
  status TEXT DEFAULT 'ATIVO',
  observacoes TEXT,
  temWhatsApp BOOLEAN DEFAULT true,
  lgpdConsent BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create vehicles_registry table
CREATE TABLE IF NOT EXISTS vehicles_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa TEXT NOT NULL UNIQUE,
  modelo TEXT,
  cor TEXT,
  unidadeId UUID REFERENCES units(id),
  tipo TEXT NOT NULL DEFAULT 'MORADOR' CHECK (tipo IN ('MORADOR', 'VISITANTE', 'PRESTADOR', 'MUDANCA')),
  nomeProprietario TEXT,
  telefone TEXT,
  moradorId UUID REFERENCES residents(id),
  unidadeDesc TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles_registry ENABLE ROW LEVEL SECURITY;

-- Policies for operators
CREATE POLICY "Everyone can read operators" ON operators FOR SELECT USING (true);
CREATE POLICY "Admins manage operators" ON operators FOR ALL USING (
  EXISTS (SELECT 1 FROM operators WHERE id = auth.uid() AND role = 'Admin')
);

-- Policies for units
CREATE POLICY "Everyone can read units" ON units FOR SELECT USING (true);
CREATE POLICY "Admins manage units" ON units FOR ALL USING (
  EXISTS (SELECT 1 FROM operators WHERE id = auth.uid() AND role = 'Admin')
);

-- Policies for residents
CREATE POLICY "Everyone can read residents" ON residents FOR SELECT USING (true);
CREATE POLICY "Admins manage residents" ON residents FOR ALL USING (
  EXISTS (SELECT 1 FROM operators WHERE id = auth.uid() AND role = 'Admin')
);

-- Policies for vehicles_registry
CREATE POLICY "Everyone can read vehicles" ON vehicles_registry FOR SELECT USING (true);
CREATE POLICY "Admins manage vehicles" ON vehicles_registry FOR ALL USING (
  EXISTS (SELECT 1 FROM operators WHERE id = auth.uid() AND role = 'Admin')
);