-- Seed data para teste do sistema (blocos numerados 01-22)

-- Inserir 5 unidades em blocos diferentes
INSERT INTO units (bloco, numero, tipo, status, vagasGaragem) VALUES
('01', '101', 'RESIDENCIAL', 'OCUPADA', 1),
('02', '202', 'RESIDENCIAL', 'OCUPADA', 2),
('05', '301', 'RESIDENCIAL', 'OCUPADA', 1),
('08', '102', 'RESIDENCIAL', 'OCUPADA', 1),
('10', '401', 'RESIDENCIAL', 'OCUPADA', 2)
ON CONFLICT DO NOTHING;

-- Inserir moradores (campos do schema original)
INSERT INTO residents (bloco, apto, nome, tipo, celular, email, cpf, rg, emergency_contact_nome, emergency_contact_fone, invoice_delivery) VALUES
('01', '101', 'JOÃO SILVA SANTOS', 'PROPRIETARIO', '11999990001', 'joao@email.com', '12345678901', '12345678', 'MARIA SILVA', '11988887777', 'CONDOMINIO'),
('02', '202', 'MARIA OLIVEIRA SOUZA', 'PROPRIETARIO', '11999990002', 'maria@email.com', '98765432109', '87654321', 'CARLOS SOUZA', '11977776666', 'CONDOMINIO'),
('05', '301', 'PEDRO COSTA LIMA', 'LOCATARIO', '11999990003', 'pedro@email.com', '45678912300', '11223344', 'JULIANA LIMA', '11966665555', 'OUTRO'),
('08', '102', 'ANA BEATRIZ RODRIGUES', 'LOCATARIO', '11999990004', 'ana@email.com', '32165498700', '55667788', 'PAI RODRIGUES', '11955554444', 'CONDOMINIO'),
('10', '401', 'CARLOS EDUARDO MARTINS', 'LOCATARIO', '11999990005', 'carlos@email.com', '78912345600', '99887766', 'PATRICIA MARTINS', '11944443333', 'CONDOMINIO')
ON CONFLICT DO NOTHING;

-- Inserir veículos para os moradores
DO $$
DECLARE
  u01_101 UUID; u02_202 UUID; u05_301 UUID; u08_102 UUID; u10_401 UUID;
  rJoao UUID; rMaria UUID; rPedro UUID; rAna UUID; rCarlos UUID;
BEGIN
  SELECT id INTO u01_101 FROM units WHERE bloco = '01' AND numero = '101';
  SELECT id INTO u02_202 FROM units WHERE bloco = '02' AND numero = '202';
  SELECT id INTO u05_301 FROM units WHERE bloco = '05' AND numero = '301';
  SELECT id INTO u08_102 FROM units WHERE bloco = '08' AND numero = '102';
  SELECT id INTO u10_401 FROM units WHERE bloco = '10' AND numero = '401';
  
  SELECT id INTO rJoao FROM residents WHERE nome = 'JOÃO SILVA SANTOS';
  SELECT id INTO rMaria FROM residents WHERE nome = 'MARIA OLIVEIRA SOUZA';
  SELECT id INTO rPedro FROM residents WHERE nome = 'PEDRO COSTA LIMA';
  SELECT id INTO rAna FROM residents WHERE nome = 'ANA BEATRIZ RODRIGUES';
  SELECT id INTO rCarlos FROM residents WHERE nome = 'CARLOS EDUARDO MARTINS';

  -- Bloco 01 - João (proprietário) - 2 veículos
  IF u01_101 IS NOT NULL AND rJoao IS NOT NULL THEN
    INSERT INTO vehicles_registry (placa, modelo, cor, unidadeId, tipo, nomeProprietario, telefone, moradorId, unidadeDesc, status) VALUES
    ('ABC-1234', 'Honda Civic', 'Prata', u01_101, 'MORADOR', 'JOÃO SILVA SANTOS', '11999990001', rJoao, 'Bloco 01, Apt 101', 'ATIVO'),
    ('DEF-5678', 'Ford Ka', 'Vermelho', u01_101, 'MORADOR', 'JOÃO SILVA SANTOS', '11999990001', rJoao, 'Bloco 01, Apt 101', 'ATIVO')
    ON CONFLICT (placa) DO NOTHING;
  END IF;

  -- Bloco 02 - Maria (proprietário) - 3 veículos
  IF u02_202 IS NOT NULL AND rMaria IS NOT NULL THEN
    INSERT INTO vehicles_registry (placa, modelo, cor, unidadeId, tipo, nomeProprietario, telefone, moradorId, unidadeDesc, status) VALUES
    ('GHI-9012', 'Chevrolet Onix', 'Preto', u02_202, 'MORADOR', 'MARIA OLIVEIRA SOUZA', '11999990002', rMaria, 'Bloco 02, Apt 202', 'ATIVO'),
    ('JKL-3456', 'Toyota Corolla', 'Branco', u02_202, 'MORADOR', 'MARIA OLIVEIRA SOUZA', '11999990002', rMaria, 'Bloco 02, Apt 202', 'ATIVO'),
    ('MNO-7890', 'Volkswagen Gol', 'Azul', u02_202, 'MORADOR', 'MARIA OLIVEIRA SOUZA', '11999990002', rMaria, 'Bloco 02, Apt 202', 'ATIVO')
    ON CONFLICT (placa) DO NOTHING;
  END IF;

  -- Bloco 05 - Pedro (locatário) - 1 veículo
  IF u05_301 IS NOT NULL AND rPedro IS NOT NULL THEN
    INSERT INTO vehicles_registry (placa, modelo, cor, unidadeId, tipo, nomeProprietario, telefone, moradorId, unidadeDesc, status) VALUES
    ('PQR-1122', 'Renault Kwid', 'Verde', u05_301, 'MORADOR', 'PEDRO COSTA LIMA', '11999990003', rPedro, 'Bloco 05, Apt 301', 'ATIVO')
    ON CONFLICT (placa) DO NOTHING;
  END IF;

  -- Bloco 08 - Ana (locatária) - 1 veículo
  IF u08_102 IS NOT NULL AND rAna IS NOT NULL THEN
    INSERT INTO vehicles_registry (placa, modelo, cor, unidadeId, tipo, nomeProprietario, telefone, moradorId, unidadeDesc, status) VALUES
    ('STU-2233', 'Nissan March', 'Rosa', u08_102, 'MORADOR', 'ANA BEATRIZ RODRIGUES', '11999990004', rAna, 'Bloco 08, Apt 102', 'ATIVO')
    ON CONFLICT (placa) DO NOTHING;
  END IF;

  -- Bloco 10 - Carlos (locatário) - 2 veículos
  IF u10_401 IS NOT NULL AND rCarlos IS NOT NULL THEN
    INSERT INTO vehicles_registry (placa, modelo, cor, unidadeId, tipo, nomeProprietario, telefone, moradorId, unidadeDesc, status) VALUES
    ('VWX-4455', 'Jeep Renegade', 'Laranja', u10_401, 'MORADOR', 'CARLOS EDUARDO MARTINS', '11999990005', rCarlos, 'Bloco 10, Apt 401', 'ATIVO'),
    ('YZA-6677', 'Fiat Pulse', 'Cinza', u10_401, 'MORADOR', 'CARLOS EDUARDO MARTINS', '11999990005', rCarlos, 'Bloco 10, Apt 401', 'ATIVO')
    ON CONFLICT (placa) DO NOTHING;
  END IF;
END $$;

-- Veículos de visitantes
INSERT INTO vehicles_registry (placa, modelo, cor, tipo, nomeProprietario, telefone, status) VALUES
('STU-3344', 'Fiat Uno', 'Amarelo', 'VISITANTE', 'Visitante João', '11988887777', 'ATIVO'),
('VWX-5566', 'Hyundai HB20', 'Cinza', 'VISITANTE', 'Visitante Pedro', '11977776666', 'ATIVO')
ON CONFLICT (placa) DO NOTHING;

-- DEPENDENTES / MEMBROS DA FAMÍLIA

-- Bloco 01 - João Silva (proprietário) - esposa e 2 filhos
INSERT INTO household_members (resident_id, nome, rg, parentesco, cpf) 
SELECT r.id, 'MARIA CLAUDIA SILVA', '44332211', 'CÔNJUGE', '12345678902'
FROM residents r WHERE r.nome = 'JOÃO SILVA SANTOS';

INSERT INTO household_members (resident_id, nome, rg, parentesco, cpf) 
SELECT r.id, 'JOÃO VITOR SILVA', '55443322', 'FILHO', '12345678903'
FROM residents r WHERE r.nome = 'JOÃO SILVA SANTOS';

INSERT INTO household_members (resident_id, nome, rg, parentesco, cpf) 
SELECT r.id, 'LUCAS SILVA', '66554433', 'FILHO', '12345678904'
FROM residents r WHERE r.nome = 'JOÃO SILVA SANTOS';

-- Bloco 02 - Maria Oliveira (proprietária) - marido e 1 filho
INSERT INTO household_members (resident_id, nome, rg, parentesco, cpf) 
SELECT r.id, 'CARLOS SOUZA', '77665544', 'CÔNJUGE', '98765432110'
FROM residents r WHERE r.nome = 'MARIA OLIVEIRA SOUZA';

INSERT INTO household_members (resident_id, nome, rg, parentesco, cpf) 
SELECT r.id, 'FERNANDA SOUZA', '88776655', 'FILHA', '98765432111'
FROM residents r WHERE r.nome = 'MARIA OLIVEIRA SOUZA';

-- Bloco 05 - Pedro Costa (locatário) - esposa
INSERT INTO household_members (resident_id, nome, rg, parentesco, cpf) 
SELECT r.id, 'JULIANA LIMA', '99887766', 'CÔNJUGE', '45678912301'
FROM residents r WHERE r.nome = 'PEDRO COSTA LIMA';

-- Bloco 08 - Ana Beatriz (locatária) - filha
INSERT INTO household_members (resident_id, nome, rg, parentesco, cpf) 
SELECT r.id, 'SOFIA RODRIGUES', '11223344', 'FILHA', '32165498701'
FROM residents r WHERE r.nome = 'ANA BEATRIZ RODRIGUES';

-- Bloco 10 - Carlos Eduardo (locatário) - esposa e 2 filhos
INSERT INTO household_members (resident_id, nome, rg, parentesco, cpf) 
SELECT r.id, 'PATRÍCIA MARTINS', '22334455', 'CÔNJUGE', '78912345601'
FROM residents r WHERE r.nome = 'CARLOS EDUARDO MARTINS';

INSERT INTO household_members (resident_id, nome, rg, parentesco, cpf) 
SELECT r.id, 'GUILHERME MARTINS', '33445566', 'FILHO', '78912345602'
FROM residents r WHERE r.nome = 'CARLOS EDUARDO MARTINS';

INSERT INTO household_members (resident_id, nome, rg, parentesco, cpf) 
SELECT r.id, 'RAFAELA MARTINS', '44556677', 'FILHA', '78912345603'
FROM residents r WHERE r.nome = 'CARLOS EDUARDO MARTINS';