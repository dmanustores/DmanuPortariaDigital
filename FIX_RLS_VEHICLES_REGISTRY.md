# 🔐 Como Desabilitar RLS em vehicles_registry

## ⚡ Solução Rápida (Faça Agora)

O problema é que `vehicles_registry` tem RLS (Row-Level Security) ativada, bloqueando a sincronização de veículos. 

### Passo 1: Abra Supabase Dashboard
1. Vá para: https://app.supabase.com
2. Selecione seu projeto **PortariaDigital**
3. Clique em **SQL Editor** (canto esquerdo)

### Passo 2: Execute Este SQL

Copie e cole este comando no SQL Editor:

```sql
ALTER TABLE vehicles_registry DISABLE ROW LEVEL SECURITY;
```

Clique em **Execute** (ou Shift + Enter)

✅ **Pronto!** RLS foi desabilitado em `vehicles_registry`

---

## 🧪 Teste Imediatamente

Agora volte ao app e:
1. Edite um morador
2. Mude a cor de um veículo
3. Clique **Salvar**
4. Verifique o **Console (F12)**
5. Procure por: `✅ vehicles_registry synced` (sem erros ⚠️)
6. Vá em **Veículos** → Deve mostrar a cor NEW ✅

---

## 📋 Alternativa: Usar Migração

Se preferir via migração (mais formal), foi criado:
- Arquivo: `supabase/migrations/20260428_disable_rls_vehicles_registry.sql`
- Você pode executar essa migração no Supabase Dashboard > Migrations

---

## ⚠️ Por que isso funciona?

`vehicles_registry` é uma tabela **espelho/display-only** da tabela `vehicles`:
- Contém dados públicos (placas, modelos, cores)
- É usada apenas para exibição e filtros
- Não contém dados sensíveis
- RLS não é necessária

Podemos disabilitar com segurança!

---

## 🚀 Próximas Etapas

Depois que o RLS for desabilitado:
1. ✅ Testar edição de veículos (color, modelo, placa)
2. ✅ Testar adição de novos veículos
3. ✅ Testar remoção de veículos
4. ✅ Executar `seed_complete.sql` para popular 8 moradores de teste
5. ✅ Fazer teste completo do fluxo

---

**Qualquer dúvida, me avisa!** 🚗
