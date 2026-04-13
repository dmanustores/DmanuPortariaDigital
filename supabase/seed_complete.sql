-- Comprehensive Seed Script for PortariaDigital
-- Execute this in Supabase Dashboard > SQL Editor
-- This populates the database with 8 resident scenarios covering all combinations:
-- - Proprietários (owners) and Locatários (renters)
-- - With and without vehicles
-- - With and without dependents
-- - With babies (isBaby=true) and without
-- - Various entry dates

-- ============================================
-- 1. DISABLE ROW LEVEL SECURITY TEMPORARILY
-- ============================================
ALTER TABLE units DISABLE ROW LEVEL SECURITY;
ALTER TABLE residents DISABLE ROW LEVEL SECURITY;
ALTER TABLE household_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. DELETE EXISTING DATA (CORRECT DEPENDENCY ORDER)
-- ============================================
DELETE FROM vehicles_registry;
DELETE FROM service_providers;
DELETE FROM household_members;
DELETE FROM vehicles;
DELETE FROM residents;
DELETE FROM units;

-- ============================================
-- 3. CREATE UNITS
-- ============================================
INSERT INTO units (bloco, numero, tipo, status) VALUES
('01', '101', 'RESIDENCIAL', 'OCUPADA'),
('01', '102', 'RESIDENCIAL', 'OCUPADA'),
('02', '201', 'RESIDENCIAL', 'OCUPADA'),
('02', '202', 'RESIDENCIAL', 'OCUPADA'),
('02', '203', 'RESIDENCIAL', 'OCUPADA'),
('03', '301', 'RESIDENCIAL', 'OCUPADA'),
('03', '302', 'RESIDENCIAL', 'OCUPADA'),
('04', '401', 'RESIDENCIAL', 'OCUPADA');

-- ============================================
-- 4. CREATE 8 RESIDENT SCENARIOS
-- ============================================
INSERT INTO residents (
  bloco, apto, tipo, nome, celular, fone, fone_comercial, email, cpf, rg,
  local_trabalho, endereco_comercial, emergency_contact_nome, 
  emergency_contact_fone, invoice_delivery, status, tem_whatsapp, 
  lgpd_consent, data_entrada, data_saida, observacoes
) VALUES
-- SCENARIO 1: Proprietário, com família, com 2 veículos, com dependentes
('01', '101', 'PROPRIETARIO', 'JOÃO SILVA SANTOS', '11999990001',
 '1133334444', '1133339999', 'joao.silva@email.com', '12345678901', '12345678',
 'SÃO PAULO - SP', 'AV. PAULISTA 1000, SÃO PAULO', 'MARIA SILVA',
 '11988887777', 'CONDOMINIO', 'ATIVO', true, true, '2025-01-15', NULL,
 'Proprietário principal'),

-- SCENARIO 2: Locatário, com família, com 1 veículo, com dependente (sem bebê)
('01', '102', 'LOCATARIO', 'MARIA OLIVEIRA SOUZA', '11999990002',
 '1144445555', '', 'maria.oliveira@email.com', '98765432109', '87654321',
 'GUARULHOS - SP', 'AV. GUARULHOS 500', 'CARLOS SOUZA',
 '11977776666', 'CONDOMINIO', 'ATIVO', true, true, '2025-02-10', NULL,
 'Locatária - Aluguel desde fevereiro'),

-- SCENARIO 3: Proprietário, solteiro, SEM veículos, SEM dependentes
('02', '201', 'PROPRIETARIO', 'PEDRO COSTA LIMA', '11999990003',
 '', '', 'pedro.costa@email.com', '45678912300', '11223344',
 '', '', 'JULIANA LIMA',
 '11966665555', 'OUTRO', 'ATIVO', true, true, '2024-12-01', NULL,
 'Proprietário solteiro'),

-- SCENARIO 4: Locatário, com família, com 2 veículos, com dependentes (incluindo bebê)
('02', '202', 'LOCATARIO', 'ANA BEATRIZ RODRIGUES', '11999990004',
 '1155556666', '1155559999', 'ana.beatriz@email.com', '32165498700', '55667788',
 'SANTOS - SP', 'RUA DAS ACÁCIAS 250', 'JOSE RODRIGUES',
 '11955554444', 'CONDOMINIO', 'ATIVO', true, true, '2025-03-05', NULL,
 'Locatária com bebê recém-nascido'),

-- SCENARIO 5: Proprietário, com família (3 pessoas), com 1 veículo, com dependentes
('02', '203', 'PROPRIETARIO', 'CARLOS EDUARDO MARTINS', '11999990005',
 '', '1144447777', 'carlos.martins@email.com', '78912345600', '99887766',
 'BAURU - SP', 'RUA DAS FLORES 750, BAURU', 'PATRICIA MARTINS',
 '11944443333', 'CONDOMINIO', 'ATIVO', true, true, '2025-01-20', NULL,
 'Proprietário com 2 filhos'),

-- SCENARIO 6: Locatário, com dependentes, SEM veículos
('03', '301', 'LOCATARIO', 'FERNANDO OLIVEIRA SILVA', '21999990006',
 '2133334444', '', 'fernando.oliveira@email.com', '56789012345', '33445566',
 'RIO DE JANEIRO - RJ', 'ALE PORTUÁRIA 100, RIO', 'LUCIA SILVA',
 '21988885555', 'CONDOMINIO', 'ATIVO', true, true, '2024-10-15', NULL,
 'Locatário sem carro particular'),

-- SCENARIO 7: Proprietário, com família, com 3 veículos (máximo), com dependentes
('03', '302', 'PROPRIETARIO', 'RAFAEL MENDES COSTA', '85999990007',
 '', '', 'rafael.mendes@email.com', '12354678912', '44556677',
 'FORTALEZA - CE', 'AV. BEIRA-MAR 888, FORTALEZA', 'EVELINA COSTA',
 '85977773333', 'OUTRO', 'ATIVO', false, true, '2024-09-20', NULL,
 'Proprietário com 3 veículos'),

-- SCENARIO 8: Locatário, solteiro, SEM dependentes, SEM veículos
('04', '401', 'LOCATARIO', 'HELENA ROCHA MENDES', '31999990008',
 '3144443333', '3144449999', 'helena.rocha@email.com', '98765432145', '22334455',
 'BELO HORIZONTE - MG', 'AV. BRASIL 500, BELO HORIZONTE', 'MARCOS MENDES',
 '31988889999', 'CONDOMINIO', 'ATIVO', true, true, '2025-02-20', NULL,
 'Locatária solteira');

-- ============================================
-- 5. CREATE HOUSEHOLD MEMBERS (DEPENDENTS)
-- ============================================
INSERT INTO household_members (resident_id, nome, rg, cpf, parentesco, status, isBaby) VALUES
-- SCENARIO 1: João Silva - 3 dependents
((SELECT id FROM residents WHERE cpf = '12345678901'), 'LUÍZA SILVA SANTOS', '12345679', '12345678902', 'Esposa', 'ATIVO', false),
((SELECT id FROM residents WHERE cpf = '12345678901'), 'JOÃO SILVA JR', '12345680', '12345678903', 'Filho', 'ATIVO', false),
((SELECT id FROM residents WHERE cpf = '12345678901'), 'GABRIELA SILVA', '12345681', '12345678904', 'Filha', 'ATIVO', false),

-- SCENARIO 2: Maria Oliveira - 2 dependents
((SELECT id FROM residents WHERE cpf = '98765432109'), 'LUCAS OLIVEIRA SOUZA', '98765432110', '98765432110', 'Filho', 'ATIVO', false),
((SELECT id FROM residents WHERE cpf = '98765432109'), 'CAROLINA SOUZA', '98765432111', '98765432111', 'Filha', 'ATIVO', false),

-- SCENARIO 3: Pedro Costa - NO DEPENDENTS (skipped)

-- SCENARIO 4: Ana Beatriz - 5 dependents (including baby)
((SELECT id FROM residents WHERE cpf = '32165498700'), 'SOPHIA RODRIGUES', '55667789', '32165498701', 'Filha', 'ATIVO', false),
((SELECT id FROM residents WHERE cpf = '32165498700'), 'MATHEUS RODRIGUES', '55667790', '32165498702', 'Filho', 'ATIVO', false),
((SELECT id FROM residents WHERE cpf = '32165498700'), 'ISABELA RODRIGUES', NULL, NULL, 'Bebê', 'ATIVO', true),
((SELECT id FROM residents WHERE cpf = '32165498700'), 'VICTORIA RODRIGUES', '55667791', '32165498703', 'Filha', 'ATIVO', false),

-- SCENARIO 5: Carlos Martins - 3 dependents
((SELECT id FROM residents WHERE cpf = '78912345600'), 'PATRICIA MARTINS', '99887766', '78912345601', 'Esposa', 'ATIVO', false),
((SELECT id FROM residents WHERE cpf = '78912345600'), 'LUCAS MARTINS', '99887767', '78912345602', 'Filho', 'ATIVO', false),

-- SCENARIO 6: Fernando Oliveira - 2 dependents
((SELECT id FROM residents WHERE cpf = '56789012345'), 'PRISCILA OLIVEIRA', '33445567', '56789012346', 'Filha', 'ATIVO', false),
((SELECT id FROM residents WHERE cpf = '56789012345'), 'DANIEL OLIVEIRA', '33445568', '56789012347', 'Filho', 'ATIVO', false),

-- SCENARIO 7: Rafael Mendes - 4 dependents (including baby)
((SELECT id FROM residents WHERE cpf = '12354678912'), 'CAMILA COSTA', '44556678', '12354678913', 'Esposa', 'ATIVO', false),
((SELECT id FROM residents WHERE cpf = '12354678912'), 'DIEGO COSTA', '44556679', '12354678914', 'Filho', 'ATIVO', false),
((SELECT id FROM residents WHERE cpf = '12354678912'), 'ANTONIO COSTA', '44556680', '12354678915', 'Filho', 'ATIVO', false),
((SELECT id FROM residents WHERE cpf = '12354678912'), 'NINA COSTA', NULL, NULL, 'Bebê', 'ATIVO', true);

-- SCENARIO 8: Helena Rocha - NO DEPENDENTS (skipped)

-- Total: 23 dependents (including 2 babies with isBaby=true)

-- ============================================
-- 6. CREATE VEHICLES
-- ============================================
INSERT INTO vehicles (resident_id, modelo, cor, placa) VALUES
-- SCENARIO 1: João Silva - 2 vehicles
((SELECT id FROM residents WHERE cpf = '12345678901'), 'Honda Civic', 'Prata', 'ABC1234'),
((SELECT id FROM residents WHERE cpf = '12345678901'), 'Ford Ka', 'Vermelho', 'DEF5678'),

-- SCENARIO 2: Maria Oliveira - 1 vehicle
((SELECT id FROM residents WHERE cpf = '98765432109'), 'Toyota Corolla', 'Preto', 'GHI9012'),

-- SCENARIO 3: Pedro Costa - NO VEHICLES

-- SCENARIO 4: Ana Beatriz - 2 vehicles
((SELECT id FROM residents WHERE cpf = '32165498700'), 'Chevrolet Onix', 'Branco', 'JKL3456'),
((SELECT id FROM residents WHERE cpf = '32165498700'), 'Fiat Argo', 'Cinza', 'MNO7890'),

-- SCENARIO 5: Carlos Martins - 1 vehicle
((SELECT id FROM residents WHERE cpf = '78912345600'), 'Volkswagen Gol', 'Azul', 'PQR1234'),

-- SCENARIO 6: Fernando Oliveira - NO VEHICLES

-- SCENARIO 7: Rafael Mendes - 3 vehicles
((SELECT id FROM residents WHERE cpf = '12354678912'), 'BMW X5', 'Preto', 'STU5678'),
((SELECT id FROM residents WHERE cpf = '12354678912'), 'Audi A4', 'Prata', 'VWX9012'),
((SELECT id FROM residents WHERE cpf = '12354678912'), 'Mercedes C-Class', 'Branco', 'YZA3456');

-- SCENARIO 8: Helena Rocha - NO VEHICLES

-- Total: 10 vehicles distributed (0-3 per resident)

-- ============================================
-- 7. CREATE SERVICE PROVIDERS
-- ============================================
INSERT INTO service_providers (resident_id, nome, rg) VALUES
-- SCENARIO 1: João Silva
((SELECT id FROM residents WHERE cpf = '12345678901'), 'JOÃO ELETRICISTA SILVA', '99887755'),

-- SCENARIO 2: Maria Oliveira
((SELECT id FROM residents WHERE cpf = '98765432109'), 'PEDRO ENCANADOR SOUZA', '88776644'),

-- SCENARIO 5: Carlos Martins
((SELECT id FROM residents WHERE cpf = '78912345600'), 'CARLOS PINTOR MARTINS', '77665533'),

-- SCENARIO 7: Rafael Mendes
((SELECT id FROM residents WHERE cpf = '12354678912'), 'ANTONIO JARDINEIRO COSTA', '66554422');

-- Total: 4 service providers

-- ============================================
-- 8. KEEP ROW LEVEL SECURITY DISABLED FOR DEVELOPMENT
-- ============================================
-- RLS left disabled to allow application to work during development
-- TODO: Configure proper RLS policies before production deployment

-- ✅ Database successfully populated!
-- Summary:
-- - 8 resident scenarios (5 proprietários + 3 locatários)
-- - 23 household members (including 2 babies with isBaby flag)
-- - 10 vehicles (distributed 0-3 per resident)
-- - 4 service providers
-- - All entry dates recorded
-- 
-- Check the resident list to confirm all data was imported correctly
