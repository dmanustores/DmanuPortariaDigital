# 📋 PLANO DE IMPLEMENTAÇÃO — MÓDULO COLABORADORES
### Sistema: Portaria Digital — Condomínio
### Versão: 1.0
### Objetivo: Controle de entrada/saída de funcionários fixos do condomínio com dois níveis de acesso (Admin e Porteiro)

---

## 🗄️ ETAPA 0 — BANCO DE DADOS

### Tabela `colaboradores` (nova)
```sql
id                  INT PRIMARY KEY AUTO_INCREMENT,
nome                VARCHAR(100) NOT NULL,
foto                VARCHAR(255) NULL,
cargo               ENUM('ZELADOR','FAXINEIRA','JARDINEIRO',
                    'EMPREGADA_DOMESTICA','SEGURANCA',
                    'MANUTENCAO','OUTRO') NOT NULL,
empresa             VARCHAR(100) NULL,
telefone            VARCHAR(20) NULL,
documento_rg        VARCHAR(30) NULL,
documento_cpf       VARCHAR(20) NULL,
unidade_vinculada_id INT NULL REFERENCES unidades(id),
horario_entrada     TIME NULL,
horario_saida       TIME NULL,
dias_semana         VARCHAR(20) NULL,  -- ex: "SEG,TER,QUA,QUI,SEX"
status              ENUM('ATIVO','INATIVO','SUSPENSO') DEFAULT 'ATIVO',
criado_por          INT REFERENCES usuarios(id),
criado_em           DATETIME DEFAULT CURRENT_TIMESTAMP
```

### Tabela `registros_colaboradores` (nova)
```sql
id                  INT PRIMARY KEY AUTO_INCREMENT,
colaborador_id      INT NOT NULL REFERENCES colaboradores(id),
porteiro_id         INT NOT NULL REFERENCES usuarios(id),
hora_entrada        DATETIME NULL,
hora_saida          DATETIME NULL,
permanencia_min     INT NULL,
status              ENUM('DENTRO','SAIU','FALTA') DEFAULT 'DENTRO',
observacoes         TEXT NULL,
criado_em           DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## 🖥️ ETAPA 1 — TELA PRINCIPAL DE COLABORADORES

### Visão ADMIN — CRUD Completo

**Cards de resumo no topo:**

| Card | Dado |
|---|---|
| 👥 Total de colaboradores | COUNT status = ATIVO |
| 🟢 Dentro agora | COUNT registros status = DENTRO hoje |
| ⚠️ Fora do horário | Colaboradores que entraram/saíram fora do horário cadastrado |
| 🔴 Falta hoje | Colaboradores esperados que não registraram entrada |

**Tabela com colunas:**
`Foto` | `Nome / Cargo` | `Empresa` | `Unidade Vinculada` | `Horário Previsto` | `Status` | `Entrada Hoje` | `Saída Hoje` | `Ações`

**Ações disponíveis para ADMIN:**
- `✏️ Editar` — editar dados do colaborador
- `🔑 Ver Acessos` — histórico completo
- `⛔ Suspender` — bloqueia acesso temporariamente
- `🗑️ Excluir` — remove do sistema

---

### Visão PORTEIRO — Somente Operação

**Mesma tabela**, porém:
- ❌ Sem botões de Editar, Suspender ou Excluir
- ✅ Apenas botões contextuais de acesso:

| Status do colaborador | Botões exibidos |
|---|---|
| Esperado / Não chegou | `✅ Registrar Entrada` |
| `DENTRO` | `✅ Registrar Saída` |
| `SAIU` | `🔁 Nova Entrada` |
| `SUSPENSO` | `🚫 Acesso Bloqueado` (apenas informativo) |

---

## 📝 ETAPA 2 — MODAL DE CADASTRO (somente ADMIN)

Botão `+ Novo Colaborador` abre modal com:

```
┌──────────────────────────────────────────┐
│        👤 Novo Colaborador               │
├──────────────────────────────────────────┤
│ Nome completo: [____________________]    │
│ Cargo: [select ▼]                        │
│ Empresa/Terceirizado: [_____________]    │
│ Telefone: [_____________]               │
│ RG: [___________] CPF: [___________]    │
│                                          │
│ Unidade vinculada (se aplicável):        │
│ Bloco [__] Apt [__]                      │
│                                          │
│ Horário de trabalho:                     │
│ Entrada [__:__]  Saída [__:__]           │
│ Dias: [☑ Seg ☑ Ter ☑ Qua ☑ Qui ☑ Sex   │
│        ☐ Sab ☐ Dom]                      │
│                                          │
│ Status: [Ativo ▼]                        │
│                                          │
│ [Cancelar]          [✅ Salvar]          │
└──────────────────────────────────────────┘
```

---

## ✅ ETAPA 3 — MODAL DE REGISTRO DE ENTRADA/SAÍDA (Porteiro e Admin)

**Ao clicar `✅ Registrar Entrada`:**
```
┌──────────────────────────────────────────┐
│    ✅ Registrar Entrada — João Zelador   │
├──────────────────────────────────────────┤
│ Colaborador: João Silva — Zelador        │
│ Horário previsto: 07:00 - 16:00          │
│                                          │
│ Hora de entrada: [17/04/2026 07:05] 🕐   │
│ (preenchida automaticamente — editável)  │
│                                          │
│ Observações: [____________________]      │
│                                          │
│ [Cancelar]       [✅ Confirmar Entrada]  │
└──────────────────────────────────────────┘
```

**Ao clicar `✅ Registrar Saída`:**
- Mesmo modal com campo `Hora de saída` pré-preenchido
- Exibe tempo de permanência calculado em tempo real
- Ao confirmar: salva `hora_saida`, calcula `permanencia_min`, atualiza status para `SAIU`

---

## ⚠️ ETAPA 4 — ALERTAS AUTOMÁTICOS

### Alerta 1 — Entrada fora do horário
```
SE hora_entrada < horario_entrada - 30min
OU hora_entrada > horario_entrada + 30min
→ Badge ⚠️ FORA DO HORÁRIO na linha do colaborador
→ Registrar normalmente mas destacar visualmente
```

### Alerta 2 — Saída não registrada
```
SE hora_atual > horario_saida + 1h
E status = 'DENTRO'
→ Colaborador aparece em destaque vermelho na tabela
→ Aparece na aba ⚠️ Pendências (mesma lógica de veículos)
```

### Alerta 3 — Falta
```
SE dia_semana está em dias_semana do colaborador
E hora_atual > horario_entrada + 2h
E nenhum registro_entrada existe para hoje
→ Status vira 🔴 FALTA na tabela
→ Card "Falta hoje" incrementa
```

---

## 📂 ETAPA 5 — HISTÓRICO DE ACESSOS

**Filtros disponíveis:**
- 📅 Data inicial / Data final
- 👤 Colaborador (busca por nome)
- 🏷️ Cargo
- 🔘 Status (DENTRO / SAIU / FALTA)
- ⚠️ Apenas fora do horário

**Colunas da tabela:**
`Colaborador` | `Cargo` | `Data` | `Entrada` | `Saída` | `Permanência` | `Status` | `Porteiro` | `Observações`

**Exportação:** botão `📥 Exportar CSV`

---

## 📊 ETAPA 6 — INTEGRAÇÃO COM O DASHBOARD PRINCIPAL

**Card "Colaboradores Cond. — X ativos"** (já existe na tela):
- Número = COUNT de colaboradores com status `DENTRO` agora
- Clicável → leva para tela de Colaboradores filtrada por `DENTRO`

**Fluxo do Dia** (canto inferior direito do Dashboard):
- Incluir contador de colaboradores nas entradas do dia junto com os demais acessos

---

## 🔐 ETAPA 7 — REGRAS DE PERMISSÃO POR PERFIL

| Funcionalidade | PORTEIRO | ADMIN |
|---|---|---|
| Ver lista de colaboradores | ✅ | ✅ |
| Registrar entrada/saída | ✅ | ✅ |
| Cadastrar novo colaborador | ❌ | ✅ |
| Editar colaborador | ❌ | ✅ |
| Suspender/Excluir | ❌ | ✅ |
| Ver histórico completo | ⚠️ Só do turno | ✅ Completo |
| Exportar CSV | ❌ | ✅ |

---

## 📐 OBSERVAÇÕES TÉCNICAS PARA IMPLEMENTAÇÃO

1. **Padrão visual:** Badges de status (`DENTRO`, `SAIU`, `FALTA`, `SUSPENSO`) devem seguir o **mesmo padrão visual** já usado nos módulos de Veículos e Encomendas
2. **Reaproveitamento:** A lógica de `registros_colaboradores` é idêntica à de `registros_acesso` de veículos — reaproveitar componentes de modal e badge de tempo real (`⏱️ 3h 20min`)
3. **Tempo real:** Badge de permanência atualiza a cada 60 segundos via `setInterval`
4. **Unidade vinculada:** Campo opcional — usado apenas para empregadas domésticas vinculadas a um apartamento específico
5. **Verificação de turno:** Todo registro deve capturar o `id` do porteiro logado no momento
6. **Dias da semana:** Salvar como string separada por vírgula (`"SEG,TER,QUA,QUI,SEX"`) e validar no front-end ao calcular faltas

---

## 🎯 ORDEM DE EXECUÇÃO RECOMENDADA

| Etapa | Descrição | Dependência |
|---|---|---|
| Etapa 0 | Banco de dados | Nenhuma |
| Etapa 1 | Tela principal | Etapa 0 |
| Etapa 2 | Modal de cadastro | Etapa 0 |
| Etapa 3 | Modal entrada/saída | Etapas 0 e 1 |
| Etapa 4 | Alertas automáticos | Etapa 3 |
| Etapa 5 | Histórico | Etapa 3 |
| Etapa 6 | Dashboard | Etapas 3 e 5 |
| Etapa 7 | Permissões | Todas anteriores |

> ⚠️ As etapas 4, 5 e 6 dependem de dados reais já registrados pelas etapas anteriores para funcionar corretamente.
