const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jyxjfivjnuecdmnyolpj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5eGpmaXZqbnVlY2RtbnlvbHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjAzOTUsImV4cCI6MjA4ODMzNjM5NX0.rgwSi_6RxDoGTcQnLYQSyIKYsVSPff08Ez2w20ko3iU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetDatabase() {
  try {
    console.log('🗑️  Iniciando reset do banco de dados...\n');

    // 1. Primeiro, vamos tentar limpar vehicles_registry com a constraint
    console.log('1️⃣  Limpando tabelas com constraints...');
    const { error: vehiclesRegError } = await supabase
      .from('vehicles_registry')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (vehiclesRegError) {
      console.warn('   ⚠️  Aviso ao limpar vehicles_registry:', vehiclesRegError.message);
    } else {
      console.log('   ✓ vehicles_registry limpo');
    }

    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Agora limpar todas as outras tabelas
    console.log('\n2️⃣  Limpando dados das tabelas...');
    const tables = [
      'invoice_addresses',
      'service_providers',
      'vehicles',
      'household_members',
      'residents',
      'operators',
      'units'
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.warn(`   ⚠️  Aviso ao limpar ${table}:`, error.message);
      } else {
        console.log(`   ✓ ${table} limpo`);
      }
    }

    console.log('\n✅ Reset do banco de dados concluído com sucesso!');
    console.log('💾 O banco está pronto para novos cadastros!');
    
  } catch (error) {
    console.error('❌ Erro ao resetar banco:', error);
    process.exit(1);
  }
}

resetDatabase();
