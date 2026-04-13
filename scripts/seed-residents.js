const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jyxjfivjnuecdmnyolpj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5eGpmaXZqbnVlY2RtbnlvbHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjAzOTUsImV4cCI6MjA4ODMzNjM5NX0.rgwSi_6RxDoGTcQnLYQSyIKYsVSPff08Ez2w20ko3iU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando população do banco de dados...\n');

    // 1️⃣ CREATE UNITS
    console.log('1️⃣  Criando unidades...');
    const units = [
      { bloco: '01', numero: '101', tipo: 'RESIDENCIAL', status: 'OCUPADA' },
      { bloco: '01', numero: '102', tipo: 'RESIDENCIAL', status: 'OCUPADA' },
      { bloco: '02', numero: '201', tipo: 'RESIDENCIAL', status: 'OCUPADA' },
      { bloco: '02', numero: '202', tipo: 'RESIDENCIAL', status: 'VAGA' },
      { bloco: '03', numero: '301', tipo: 'RESIDENCIAL', status: 'OCUPADA' },
    ];

    const { data: unitsCreated, error: unitsError } = await supabase
      .from('units')
      .insert(units)
      .select();

    if (unitsError) throw unitsError;
    console.log(`   ✓ ${unitsCreated.length} unidades criadas\n`);

    // 2️⃣ CREATE RESIDENTS
    console.log('2️⃣  Criando moradores...');
    const residents = [
      {
        bloco: '01',
        apto: '101',
        numero: '101',
        tipo: 'PROPRIETARIO',
        nome: 'JOÃO SILVA SANTOS',
        celular: '11999990001',
        fone: '1133334444',
        email: 'joao.silva@email.com',
        cpf: '12345678901',
        rg: '12345678',
        local_trabalho: 'SÃO PAULO - SP',
        endereco_comercial: 'AV. PAULISTA 1000, SÃO PAULO',
        emergency_contact_nome: 'MARIA SILVA',
        emergency_contact_fone: '11988887777',
        invoice_delivery: 'CONDOMINIO',
        status: 'ATIVO',
        temWhatsApp: true,
        lgpdConsent: true,
        dataEntrada: '2025-01-15',
        observacoes: 'Proprietário principal da unidade'
      },
      {
        bloco: '01',
        apto: '102',
        numero: '102',
        tipo: 'LOCATARIO',
        nome: 'MARIA OLIVEIRA SOUZA',
        celular: '11999990002',
        fone: '1144445555',
        email: 'maria.oliveira@email.com',
        cpf: '98765432109',
        rg: '87654321',
        local_trabalho: 'GUARULHOS - SP',
        endereco_comercial: 'AV. GUARULHOS 500',
        emergency_contact_nome: 'CARLOS SOUZA',
        emergency_contact_fone: '11977776666',
        invoice_delivery: 'CONDOMINIO',
        status: 'ATIVO',
        temWhatsApp: true,
        lgpdConsent: true,
        dataEntrada: '2025-02-10',
        observacoes: 'Locatária - Contrato de aluguel'
      },
      {
        bloco: '02',
        apto: '201',
        numero: '201',
        tipo: 'PROPRIETARIO',
        nome: 'PEDRO COSTA LIMA',
        celular: '11999990003',
        email: 'pedro.costa@email.com',
        cpf: '45678912300',
        rg: '11223344',
        emergency_contact_nome: 'JULIANA LIMA',
        emergency_contact_fone: '11966665555',
        invoice_delivery: 'OUTRO',
        status: 'ATIVO',
        temWhatsApp: true,
        lgpdConsent: true,
        dataEntrada: '2024-12-01',
        observacoes: 'Proprietário'
      },
      {
        bloco: '02',
        apto: '202',
        numero: '202',
        tipo: 'LOCATARIO',
        nome: 'ANA BEATRIZ RODRIGUES',
        celular: '11999990004',
        fone: '1155556666',
        email: 'ana.beatriz@email.com',
        cpf: '32165498700',
        rg: '55667788',
        emergency_contact_nome: 'JOSE RODRIGUES',
        emergency_contact_fone: '11955554444',
        invoice_delivery: 'CONDOMINIO',
        status: 'ATIVO',
        temWhatsApp: true,
        lgpdConsent: true,
        dataEntrada: '2025-03-05',
        observacoes: 'Locatária'
      },
      {
        bloco: '03',
        apto: '301',
        numero: '301',
        tipo: 'PROPRIETARIO',
        nome: 'CARLOS EDUARDO MARTINS',
        celular: '11999990005',
        email: 'carlos.martins@email.com',
        cpf: '78912345600',
        rg: '99887766',
        local_trabalho: 'BAURU - SP',
        endereco_comercial: 'RUA DAS FLORES 750, BAURU',
        emergency_contact_nome: 'PATRICIA MARTINS',
        emergency_contact_fone: '11944443333',
        invoice_delivery: 'CONDOMINIO',
        status: 'ATIVO',
        temWhatsApp: true,
        lgpdConsent: true,
        dataEntrada: '2025-01-20',
        observacoes: 'Proprietário'
      }
    ];

    const { data: residentsCreated, error: residentsError } = await supabase
      .from('residents')
      .insert(residents)
      .select();

    if (residentsError) throw residentsError;
    console.log(`   ✓ ${residentsCreated.length} moradores criados\n`);

    // 3️⃣ CREATE HOUSEHOLD MEMBERS
    console.log('3️⃣  Criando dependentes (moradores adicionais)...');
    const householdMembers = [
      {
        resident_id: residentsCreated[0].id,
        nome: 'LUÍZA SILVA SANTOS',
        rg: '12345679',
        cpf: '12345678902',
        parentesco: 'Esposa',
        status: 'ATIVO'
      },
      {
        resident_id: residentsCreated[0].id,
        nome: 'JOÃO SILVA JR',
        rg: '12345680',
        cpf: '12345678903',
        parentesco: 'Filho',
        status: 'ATIVO'
      },
      {
        resident_id: residentsCreated[1].id,
        nome: 'LUCAS OLIVEIRA',
        rg: '98765432110',
        cpf: '98765432110',
        parentesco: 'Filho',
        status: 'ATIVO'
      },
      {
        resident_id: residentsCreated[3].id,
        nome: 'SOPHIA RODRIGUES',
        rg: '55667789',
        cpf: '32165498701',
        parentesco: 'Filha',
        status: 'ATIVO'
      }
    ];

    const { data: householdCreated, error: householdError } = await supabase
      .from('household_members')
      .insert(householdMembers)
      .select();

    if (householdError) throw householdError;
    console.log(`   ✓ ${householdCreated.length} dependentes criados\n`);

    // 4️⃣ CREATE VEHICLES
    console.log('4️⃣  Criando veículos...');
    const vehicles = [
      {
        resident_id: residentsCreated[0].id,
        modelo: 'Honda Civic',
        cor: 'Prata',
        placa: 'ABC1234'
      },
      {
        resident_id: residentsCreated[0].id,
        modelo: 'Ford Ka',
        cor: 'Vermelho',
        placa: 'DEF5678'
      },
      {
        resident_id: residentsCreated[1].id,
        modelo: 'Toyota Corolla',
        cor: 'Preto',
        placa: 'GHI9012'
      },
      {
        resident_id: residentsCreated[2].id,
        modelo: 'Chevrolet Onix',
        cor: 'Branco',
        placa: 'JKL3456'
      },
      {
        resident_id: residentsCreated[4].id,
        modelo: 'Volkswagen Gol',
        cor: 'Azul',
        placa: 'MNO7890'
      }
    ];

    const { data: vehiclesCreated, error: vehiclesError } = await supabase
      .from('vehicles')
      .insert(vehicles)
      .select();

    if (vehiclesError) throw vehiclesError;
    console.log(`   ✓ ${vehiclesCreated.length} veículos criados\n`);

    // 5️⃣ CREATE SERVICE PROVIDERS
    console.log('5️⃣  Criando prestadores de serviço...');
    const serviceProviders = [
      {
        resident_id: residentsCreated[0].id,
        nome: 'JOÃO ELETRICISTA',
        rg: '99887755'
      },
      {
        resident_id: residentsCreated[1].id,
        nome: 'PEDRO ENCANADOR',
        rg: '88776644'
      },
      {
        resident_id: residentsCreated[4].id,
        nome: 'CARLOS PINTOR',
        rg: '77665533'
      }
    ];

    const { data: providersCreated, error: providersError } = await supabase
      .from('service_providers')
      .insert(serviceProviders)
      .select();

    if (providersError) throw providersError;
    console.log(`   ✓ ${providersCreated.length} prestadores criados\n`);

    // Summary
    console.log('✅ População do banco de dados concluída com sucesso!\n');
    console.log('📊 Resumo:');
    console.log(`   • ${unitsCreated.length} unidades`);
    console.log(`   • ${residentsCreated.length} moradores`);
    console.log(`   • ${householdCreated.length} dependentes`);
    console.log(`   • ${vehiclesCreated.length} veículos`);
    console.log(`   • ${providersCreated.length} prestadores de serviço`);
    console.log('\n🎉 Dados prontos para teste!\n');

  } catch (error) {
    console.error('❌ Erro ao popular banco:', error.message);
    process.exit(1);
  }
}

seedDatabase();
