## 📄 Documento de Padronização — Portaria Digital

### CONTEXTO

Sistema de portaria digital com 4 módulos: **Mudanças**, **Ocorrências**, **Veículos** e **Encomendas**. Cada módulo possui duas abas: **Lista Ativa** e **Histórico**. O objetivo é padronizar nomes de colunas, formatos de data, badges de status e ícones, mantendo as particularidades de cada tela.

***

### 1. REGRA GLOBAL — ESTRUTURA DE COLUNAS

Toda tabela deve seguir esta ordem de colunas, adaptando apenas as colunas intermediárias:

```
[1] ENTIDADE PRINCIPAL  →  [2] DETALHE DA TELA  →  [3] DATA / HORÁRIO  →  [4] STATUS / PRIORIDADE  →  [5] AÇÃO PORTARIA ou RESPONSÁVEL  →  [6] ADMIN
```

**Regras fixas:**

- Coluna `[5]` na aba **Lista Ativa** = sempre `AÇÃO PORTARIA`
- Coluna `[5]` na aba **Histórico** = sempre `RESPONSÁVEL`
- Coluna `[6]` = sempre `ADMIN` com ícones: 🔍 (visualizar), 🔄 (restaurar/editar), 🗑️ (excluir)
- Coluna `[6]` deve estar presente em **todas as abas**, incluindo Lista Ativa

***

### 2. REGRA GLOBAL — FORMATO DE DATA

**Padrão único obrigatório em todos os módulos:**

```
DD/MM/AAAA · HH:MM
```

**Exemplos de correção:**


| Antes | Depois |
| :-- | :-- |
| `19/04/2026` + `14:30:00 às 16:00:00` | `19/04/2026 · 14:30–16:00` |
| `22/04/2026` + `00:00` | `22/04/2026 · 00:00` |
| `14:30:00` | `14:30` (remover segundos) |
| `16:10:00 às 18:00:00` | `16:10–18:00` (para intervalos) |

**Regras:**

- Separador entre data e hora: `·` (ponto médio)
- Horários com intervalo: `HH:MM–HH:MM` (travessão, sem "às")
- Nunca exibir segundos (`:00` no final)
- Horas sempre com 2 dígitos: `08:00`, não `8:00`

***

### 3. REGRA GLOBAL — BADGES DE STATUS

Dicionário de cores fixo para todos os módulos:

```
AGENDADA     → fundo amarelo-ouro    (#F59E0B)  texto branco
ABERTA       → fundo amarelo-ouro    (#F59E0B)  texto branco
AGUARDANDO   → fundo laranja         (#EA580C)  texto branco
EM ANDAMENTO → fundo azul            (#3B82F6)  texto branco
DENTRO       → fundo azul-verde      (#10B981)  texto branco  [exclusivo Veículos]
CONCLUÍDA    → fundo verde           (#16A34A)  texto branco
RESOLVIDA    → fundo verde           (#16A34A)  texto branco
RETIRADA     → fundo verde           (#16A34A)  texto branco
SAIU         → fundo cinza médio     (#6B7280)  texto branco
ARQUIVADA    → fundo cinza escuro    (#374151)  texto branco
RECUSADA     → fundo vermelho        (#DC2626)  texto branco
URGENTE      → fundo vermelho        (#DC2626)  texto branco
```

Badges de **tipo/subtipo** (linha secundária do status):

```
ENTRADA      → fundo verde escuro    (#15803D)  texto branco  [Mudanças]
SAÍDA        → fundo roxo            (#7C3AED)  texto branco  [Mudanças]
TRANSPORTE   → fundo laranja         (#C2410C)  texto branco  [Mudanças]
MORADOR      → fundo azul            (#1D4ED8)  texto branco  [Veículos]
VISITANTE    → fundo roxo            (#7C3AED)  texto branco  [Veículos]
PROPRIETÁRIO → fundo azul-ciano      (#0891B2)  texto branco  [Veículos]
```

Badges de **prioridade:**

```
NORMAL   → borda cinza, fundo transparente, texto cinza claro
BAIXA    → borda cinza, fundo transparente, texto cinza claro
URGENTE  → borda vermelha, fundo vermelho escuro, texto vermelho claro
```


***

### 4. CORREÇÕES POR MÓDULO


***

#### 4.1 MÓDULO — MUDANÇAS

**Colunas — Lista Ativa:**

```
MORADOR / UNIDADE  |  VEÍCULO / TIPO  |  DATA / HORÁRIO  |  STATUS / PRIORIDADE  |  AÇÃO PORTARIA  |  ADMIN
```

**Colunas — Histórico:**

```
MORADOR / UNIDADE  |  VEÍCULO / TIPO  |  DATA / HORÁRIO  |  STATUS / PRIORIDADE  |  RESPONSÁVEL  |  ADMIN
```

**Correções específicas:**

- Coluna `ADMIN` está **ausente na Lista Ativa** → adicionar com ícones 🔍 🗑️
- Horário deve exibir intervalo: `14:30–16:00` (não `14:30:00 às 16:00:00`)
- Coluna `DATA / HORÁRIO` deve ser **única célula** com data e horário-intervalo separados por `·`

**Particularidades mantidas:**

- Tipo de mudança exibido como badge colorido: `ENTRADA`, `SAÍDA`, `TRANSPORTE`
- Ícone direcional dentro de círculo colorido na coluna `VEÍCULO / TIPO`

***

#### 4.2 MÓDULO — OCORRÊNCIAS

**Colunas — Lista Ativa:**

```
OCORRÊNCIA / TIPO  |  LOCALIZAÇÃO  |  DATA / HORÁRIO  |  STATUS / PRIORIDADE  |  AÇÃO PORTARIA  |  ADMIN
```

**Colunas — Histórico:**

```
OCORRÊNCIA / TIPO  |  LOCALIZAÇÃO  |  ABERTURA / RESOLUÇÃO  |  STATUS / PRIORIDADE  |  RESPONSÁVEL  |  ADMIN
```

**Correções específicas:**

- `STATUS / PRIORID.` → corrigir para `STATUS / PRIORIDADE` (sem abreviação)
- `DATA DE ABERTURA` (lista ativa) → padronizar para `DATA / HORÁRIO`
- `ABERTURA / RESOLUÇÃO` (histórico) → manter este nome pois exibe duas datas
- `RESPONSÁVEIS` → corrigir para `RESPONSÁVEL` (sem plural)
- Data de resolução no histórico: exibir como segunda linha na célula `ABERTURA / RESOLUÇÃO` no formato `DD/MM/AAAA · HH:MM`

**Particularidades mantidas:**

- Coluna `LOCALIZAÇÃO` com badge de área (ex: `ÁREA COMUM: PORTARIA`, `CONDOMÍNIO`)
- Ícones distintos por tipo: informativo (ℹ️), passagem (🕐), manutenção (🔧)

***

#### 4.3 MÓDULO — VEÍCULOS

**Colunas — Lista Ativa:**

```
VEÍCULO / TIPO  |  MORADOR / UNIDADE  |  ENTRADA / SAÍDA  |  STATUS / TEMPO  |  AÇÃO PORTARIA  |  ADMIN
```

**Colunas — Histórico:**

```
VEÍCULO / TIPO  |  MORADOR / UNIDADE  |  ENTRADA / SAÍDA  |  STATUS / TEMPO  |  RESPONSÁVEL  |  ADMIN
```

**Correções específicas:**

- Na aba Histórico, a coluna `ENTRADA / SAÍDA` deve exibir **duas linhas** na mesma célula:
    - Linha 1: `📅 DD/MM/AAAA · HH:MM` (entrada)
    - Linha 2: `📅 DD/MM/AAAA · HH:MM` (saída) — com label `SAÍDA` sutil em cinza
- Remover label `ACESSO FIXO` da célula de data quando o veículo for morador — mover essa info para o badge de tipo

**Particularidades mantidas:**

- Coluna `STATUS / TEMPO` com contador de permanência (`1h 6min`) — exclusiva deste módulo
- Cards de métricas: `TOTAL ATIVOS`, `MORADORES REGISTRADOS`, `NO CONDOMÍNIO (VISITAS)`, `ALERTAS PERMANÊNCIA`
- Badge `PROPRIETÁRIO`, `VISITANTE`, `MORADOR` na linha secundária do veículo

***

#### 4.4 MÓDULO — ENCOMENDAS

**Colunas — Lista Ativa (Aguardando Retirada):**

```
MORADOR / UNIDADE  |  TRANSPORTADORA  |  VOLUME  |  DATA / HORÁRIO  |  STATUS  |  AÇÃO DA PORTARIA  |  ADMIN
```

**Colunas — Histórico Completo:**

```
MORADOR / UNIDADE  |  TRANSPORTADORA  |  VOLUME  |  DATA / HORÁRIO  |  STATUS  |  RESPONSÁVEL  |  ADMIN
```

**Correções específicas:**

- `AÇÃO DA PORTARIA` → padronizar para `AÇÃO PORTARIA` (remover "DA", igual aos outros módulos)
- Data de retirada exibida **dentro do badge** `RETIRADA` como sublabel (`21/04/2026 · 23:48`) → mover para **segunda linha da coluna `DATA / HORÁRIO`** com label `Retirada:` em cinza
- Nesta tela o STATUS **não tem `/ PRIORIDADE`** — manter apenas `STATUS` pois encomendas não têm prioridade

**Particularidades mantidas:**

- Coluna `VOLUME` com número centralizado em badge neutro
- Coluna `TRANSPORTADORA` com nome em maiúsculas + código de rastreio `#XXXXXXX` em cinza abaixo
- Cards de métricas: `AGUARDANDO`, `CHEGARAM HOJE`, `RETIRADAS HOJE`, `AVISOS VIA WHATSAPP`

***

### 5. REGRA GLOBAL — CARDS DE MÉTRICAS (TOPO)

Todos os módulos devem manter 4 cards no topo com o padrão:

```
[Card 1 — Branco]     TOTAL ATIVAS / ATIVOS   → número grande branco
[Card 2 — Laranja]    MÉTRICA PRINCIPAL        → número grande laranja
[Card 3 — Azul]       EM ANDAMENTO             → número grande azul
[Card 4 — Vermelho]   URGÊNCIAS / ALERTAS      → número grande vermelho
```

Card 4 deve ter **fundo levemente avermelhado** quando valor > 0.

***

### 6. REGRA GLOBAL — BOTÕES DE AÇÃO PORTARIA

Botões da coluna `AÇÃO PORTARIA` devem seguir:

```
INICIAR    → fundo azul escuro, ícone ▶️ seta
CONCLUIR   → fundo verde, ícone ✅
ATENDER    → fundo azul escuro, ícone 🔑
RESOLVER   → fundo verde, ícone ✅
SAÍDA      → fundo verde, ícone ✅
ENTREGAR   → fundo verde, ícone ✅
RECUSAR    → fundo vermelho escuro, ícone 🚫
```

Todos os botões: `border-radius: 6px`, padding uniforme, texto em maiúsculas, font-size igual.

***

### 7. CHECKLIST FINAL DE IMPLEMENTAÇÃO

```
[ ] Corrigir "STATUS / PRIORID." → "STATUS / PRIORIDADE" em Ocorrências
[ ] Corrigir "DATA DE ABERTURA" → "DATA / HORÁRIO" em Ocorrências (lista ativa)
[ ] Corrigir "RESPONSÁVEIS" → "RESPONSÁVEL" em Ocorrências (histórico)
[ ] Corrigir "AÇÃO DA PORTARIA" → "AÇÃO PORTARIA" em Encomendas
[ ] Remover segundos de todos os horários (HH:MM:SS → HH:MM)
[ ] Substituir "às" por "–" em intervalos de horário em Mudanças
[ ] Adicionar separador " · " entre data e hora em todos os módulos
[ ] Mover data de retirada do badge para coluna DATA / HORÁRIO em Encomendas
[ ] Adicionar coluna ADMIN na Lista Ativa de Mudanças
[ ] Mover "ACESSO FIXO" de célula de data para badge de tipo em Veículos
[ ] Aplicar dicionário de cores dos badges em todos os módulos
[ ] Padronizar botões AÇÃO PORTARIA com tamanho e border-radius uniformes
[ ] Garantir que Lista Ativa sempre exibe "AÇÃO PORTARIA" e Histórico sempre "RESPONSÁVEL"
```


***

