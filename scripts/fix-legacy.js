const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltam variaveis de ambiente!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Iniciando migração retroativa de Moradores -> Unidades e Veiculos...");
  
  const { data: residents, error: resError } = await supabase
    .from('residents')
    .select('id, nome, bloco, apto, celular, fone, vehicles(*)');

  if (resError) {
    console.error("Erro ao puxar moradores:", resError);
    return;
  }

  console.log(`Encontrados ${residents?.length || 0} moradores. Aplicando sincronização...`);

  for (const resident of (residents || [])) {
    console.log(`Processando Morador: ${resident.nome} (Bloco ${resident.bloco}, Apt ${resident.apto})`);

    // --- SYNC UNIDADE ---
    if (resident.bloco && resident.apto) {
      const { data: existingUnit } = await supabase
        .from('units')
        .select('id')
        .eq('bloco', resident.bloco)
        .eq('numero', resident.apto)
        .maybeSingle();

      if (existingUnit) {
        await supabase.from('units').update({ status: 'OCUPADA' }).eq('id', existingUnit.id);
        console.log(` -> Unidade Existente: Status setado para OCUPADA`);
      } else {
        await supabase.from('units').insert({
          bloco: resident.bloco,
          numero: resident.apto,
          tipo: 'RESIDENCIAL',
          status: 'OCUPADA',
          vagasGaragem: 1
        });
        console.log(` -> Unidade Inexistente: Criada com sucesso (OCUPADA)`);
      }
    }

    // --- SYNC VEICULOS ---
    if (resident.vehicles && resident.vehicles.length > 0) {
      // Limpa pra evitar duplicate unique key na placa
      await supabase.from('vehicles_registry').delete().eq('moradorid', resident.id);

      const vehiclesToInsert = resident.vehicles.map(v => ({
        placa: v.placa ? v.placa.toUpperCase() : '',
        modelo: v.modelo || null,
        cor: v.cor || null,
        unidadedesc: `Bloco ${resident.bloco}, Apt ${resident.apto}`,
        tipo: 'MORADOR',
        nomeproprietario: resident.nome,
        telefone: resident.celular || resident.fone || null,
        moradorid: resident.id,
        status: 'ATIVO'
      }));

      const { error: vehError } = await supabase.from('vehicles_registry').insert(vehiclesToInsert);
      if (vehError) {
        console.error(` -> Erro ao inserir veiculos de ${resident.nome}:`, vehError);
      } else {
        console.log(` -> ${vehiclesToInsert.length} veículos migrados para o Registro Global.`);
      }
    }
  }

  console.log("\n✅ Migração Retroativa Finalizada com Sucesso!");
}

run();
