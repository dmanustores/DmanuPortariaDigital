const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("\n--- EXTRATOR DE ESTRUTURA DO SUPABASE ---");
  
  const { data: res } = await supabase.from('residents').select('*').limit(1);
  console.log("\n-> Tabela: residents");
  if (res && res.length > 0) {
    console.log(Object.keys(res[0]).join(', '));
  } else {
    console.log("[vazia]");
  }

  const { data: unt } = await supabase.from('units').select('*').limit(1);
  console.log("\n-> Tabela: units");
  if (unt && unt.length > 0) {
    console.log(Object.keys(unt[0]).join(', '));
  } else {
    console.log("[vazia]");
  }

  const { data: vr } = await supabase.from('vehicles_registry').select('*').limit(1);
  console.log("\n-> Tabela: vehicles_registry");
  if (vr && vr.length > 0) {
    console.log(Object.keys(vr[0]).join(', '));
  } else {
    console.log("[vazia]");
  }
}
run();
