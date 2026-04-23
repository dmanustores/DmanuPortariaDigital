import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('--- Inspecting vehicles_registry ---');
  const { data, error } = await supabase.from('vehicles_registry').select('*').limit(10);
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Count:', data?.length);
  console.log('Sample Data:', JSON.stringify(data, null, 2));

  console.log('\n--- Inspecting registros_acesso (Active) ---');
  const { data: access, error: accessError } = await supabase.from('registros_acesso').select('*').eq('status', 'DENTRO');
  if (accessError) {
    console.error('Access Error:', accessError);
    return;
  }
  console.log('Active Access Count:', access?.length);
}

checkData();
