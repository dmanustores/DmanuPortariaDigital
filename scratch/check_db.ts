
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oyvjexatfmdmowjuxovf.supabase.co';
const supabaseKey = '...'; // I don't have the key here, I should get it from the environment or just use the tool

async function checkColumns() {
  const { data, error } = await supabase.from('vehicles_registry').select('*').limit(1);
  if (error) console.error(error);
  else console.log(Object.keys(data[0]));
}
