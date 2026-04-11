-- Initial Schema for Portaria Digital

-- Residents Table
CREATE TABLE IF NOT EXISTS residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bloco TEXT NOT NULL,
  apto TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('LOCATARIO', 'PROPRIETARIO')),
  nome TEXT NOT NULL,
  celular TEXT NOT NULL,
  fone TEXT,
  fone_comercial TEXT,
  email TEXT NOT NULL,
  local_trabalho TEXT,
  endereco_comercial TEXT,
  cpf TEXT NOT NULL,
  rg TEXT NOT NULL,
  emergency_contact_nome TEXT NOT NULL,
  emergency_contact_fone TEXT NOT NULL,
  invoice_delivery TEXT NOT NULL CHECK (invoice_delivery IN ('CONDOMINIO', 'OUTRO')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Household Members Table
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  rg TEXT NOT NULL,
  parentesco TEXT NOT NULL
);

-- Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
  modelo TEXT NOT NULL,
  cor TEXT NOT NULL,
  placa TEXT NOT NULL
);

-- Service Providers Table
CREATE TABLE IF NOT EXISTS service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  rg TEXT NOT NULL
);

-- Invoice Addresses Table
CREATE TABLE IF NOT EXISTS invoice_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  logradouro TEXT NOT NULL,
  numero TEXT NOT NULL,
  bairro TEXT NOT NULL,
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL,
  cep TEXT NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_addresses ENABLE ROW LEVEL SECURITY;

-- ... (previous tables)

-- Operators Table (Profiles for authenticated users)
CREATE TABLE IF NOT EXISTS operators (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Operador',
  turno TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on operators
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;

-- Policies for operators
CREATE POLICY "Operators can view all profiles" ON operators FOR SELECT USING (true);
CREATE POLICY "Operators can update their own profile" ON operators FOR UPDATE USING (auth.uid() = id);

-- Trigger to create an operator profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.operators (id, nome, role, turno)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'nome', 'Novo Operador'), 'Operador', 'A');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
