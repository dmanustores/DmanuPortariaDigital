import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('--- Checking tables ---');
  
  const { data: vReg, error: errReg } = await supabase.from('vehicles_registry').select('*');
  console.log('vehicles_registry count:', vReg?.length || 0);
  if (errReg) console.error('Error vehicles_registry:', errReg.message);

  const { data: vBase, error: errBase } = await supabase.from('vehicles').select('*');
  console.log('vehicles count:', vBase?.length || 0);
  if (errBase) console.error('Error vehicles:', errBase.message);

  const { data: vAccess, error: errAccess } = await supabase.from('registros_acesso').select('*');
  console.log('registros_acesso count:', vAccess?.length || 0);
  if (errAccess) console.error('Error registros_acesso:', errAccess.message);

  if (vReg && vReg.length > 0) {
    console.log('Sample vehicles_registry:', vReg[0]);
  }
}

checkTables();
