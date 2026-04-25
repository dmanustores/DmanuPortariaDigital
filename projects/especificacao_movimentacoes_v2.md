# Especificação de Movimentações — Sistema de Portaria
**Versão:** 2.1  
**Objetivo:** Definir estrutura, nomenclatura, regras visuais e histórico de ações intermediárias para todas as telas de "Detalhes da Movimentação", garantindo consistência entre os tipos: Encomendas, Veículos, Ocorrências e Mudanças.

---

## Estrutura Universal Obrigatória

Todo tipo de movimentação segue **exatamente três etapas fixas**, exibidas em linha do tempo vertical. As etapas 1 e 3 são **obrigatórias e imutáveis em nomenclatura**. Apenas a etapa 2 tem seu **nome e campos variando por tipo**.

```
┌─────────────────────────────────────┐
│  1) ABERTURA                        │  ← sempre chamada "ABERTURA" (exceto Veículos e Mudanças — ver abaixo)
├─────────────────────────────────────┤
│  2) DADOS DA [TIPO]                 │  ← nome varia por tipo de movimentação
│     + HISTÓRICO DE AÇÕES           │  ← ações intermediárias ocorridas após o registro
├─────────────────────────────────────┤
│  3) FECHAMENTO                      │  ← sempre chamada "FECHAMENTO" com subtipo (ver abaixo)
└─────────────────────────────────────┘
```

### Regras Globais de Exibição

| Regra | Descrição |
|---|---|
| Linha do tempo | Exibida verticalmente, de cima para baixo, em ordem cronológica |
| Responsável | Sempre exibe o **nome real do operador** cadastrado no sistema (ex: `Lino`, `João`, `Maria`). Nunca exibir perfis ou cargos como `ADMIN`, `OWNER`, `ADMINISTRADOR`. A única exceção é quando a ação é gerada automaticamente pelo sistema, caso em que exibe o texto fixo `"Sistema"` (sem badge, sem caixa alta) |
| Timestamp | Sempre exibido no canto direito de cada etapa no formato `DD/MM/AAAA, HH:MM:SS` |
| Etapa 3 pendente | Enquanto o processo não é encerrado, exibir placeholder: `"Aguardando [ação]..."` com visual desabilitado |
| Observações | Sempre exibidas em itálico entre aspas quando presentes |
| Campo ausente | Exibir `"NÃO INFORMADO"` — nunca deixar campo vazio sem indicação |
| Data inválida | Nunca exibir `"INVALID DATE"` — tratar com fallback: `"—"` ou `"Não registrado"` |

---

## Tipo 1 — ENCOMENDAS

**Título da tela:** `Detalhes da Movimentação — Encomendas`  
**Identificação:** Unidade do destinatário (ex: `BLOCO 02, APT 402`)

### Status da Movimentação

| Status | Significado | Cor |
|---|---|---|
| AGUARDANDO | Encomenda recebida, ainda não retirada | Amarelo |
| RETIRADA | Encomenda retirada pelo morador ou autorizado | Verde |
| RECUSADA | Encomenda não aceita na portaria | Vermelho |

---

### Etapa 1 — RECEBIMENTO NA PORTARIA

> Nome fixo para este tipo. Equivalente à "Abertura" no padrão global.

**Campos registrados:**
| Campo | Descrição |
|---|---|
| Responsável | Nome real do operador que registrou o recebimento (ex: `Lino`, `João`) |
| Data/Hora | Timestamp do recebimento |
| Observação | Campo livre opcional — exibido em itálico entre aspas |

---

### Etapa 2 — DADOS DA ENCOMENDA

> **Nomenclatura obrigatória:** `DADOS DA ENCOMENDA`

**Dados do registro:**
| Campo | Descrição |
|---|---|
| TRANSPORTADORA | Nome da transportadora (ex: AMAZON, CORREIOS, IFOOD) |
| VOLUMES | Quantidade numérica de volumes recebidos |
| IDENTIFICAÇÃO / OBJETO | Código de rastreio ou descrição do objeto. Exibir `"NÃO INFORMADO"` se ausente |

**Histórico de ações intermediárias:**

Após o registro inicial, as seguintes ações podem ocorrer e devem ser exibidas cronologicamente abaixo dos dados, como blocos de histórico:

| Ação | Responsável | Quando ocorre |
|---|---|---|
| Notificação enviada ao morador | Sistema | Automático após o recebimento |
| Reenvio de notificação | Sistema / nome do operador | Quando solicitado manualmente |
| Tentativa de entrega no apartamento | Nome do operador | Quando o porteiro tenta entregar pessoalmente |
| Confirmação de ciência do morador | Sistema | Quando o morador confirma pelo app |

> Cada ação intermediária exibe: **nome do responsável + texto da ação + timestamp**.  
> Se nenhuma ação intermediária ocorreu, esta subseção não é exibida.

---

### Etapa 3 — FECHAMENTO

> Nome fixo. Possui dois subtipos conforme o desfecho:

**Subtipo A — RETIRADA**

| Campo | Descrição |
|---|---|
| Responsável | Nome real do operador que registrou a retirada |
| Data/Hora | Timestamp da retirada |
| Quem retirou | Nome da pessoa que retirou fisicamente a encomenda. Quando o próprio morador retira, exibir o nome do morador cadastrado — o porteiro é sempre quem registra a ação no sistema |
| Observação | Campo livre opcional — itálico entre aspas |

**Subtipo B — RECUSADA**

| Campo | Descrição |
|---|---|
| Responsável | `Sistema` (recusa automática) ou nome real do operador que registrou a recusa |
| Data/Hora | Timestamp da recusa |
| Motivo | Texto descritivo obrigatório (ex: `"Recusada pelo porteiro"`) |

---

## Tipo 2 — VEÍCULOS

**Título da tela:** `Detalhes da Movimentação — Veículos`  
**Identificação:** Unidade vinculada (ex: `BLOCO 05, APT 502`)

### Status da Movimentação

| Status | Significado | Cor |
|---|---|---|
| EM ANDAMENTO | Veículo no interior do condomínio | Azul |
| SAÍDA REGISTRADA | Veículo saiu do condomínio | Verde |

### Regra de nomenclatura da Etapa 2 — condicional

> O nome da etapa 2 **muda conforme o tipo do veículo registrado:**

| Valor do campo VEÍCULO / TIPO | Nome da Etapa 2 |
|---|---|
| VISITANTE | **DADOS DO VISITANTE** |
| PROPRIETARIO | **DADOS DO MORADOR** |

---

### Etapa 1 — REGISTRO DE ENTRADA

> Nome fixo para este tipo. Equivalente à "Abertura" no padrão global.

**Campos registrados:**
| Campo | Descrição |
|---|---|
| Responsável | `Sistema` — o registro de entrada é gerado automaticamente pelo sistema a partir da ação do operador na portaria |
| Data/Hora | Timestamp de entrada |
| Descrição padrão | `"Registro de entrada efetuado na portaria pelo operador."` |

---

### Etapa 2 — DADOS DO VISITANTE / DADOS DO MORADOR

> **Nomenclatura condicional conforme regra acima.**

**Dados do registro:**
| Campo | Descrição |
|---|---|
| MORADOR / UNIDADE | Bloco e apartamento vinculado. Pode ser `"PORTARIA"` em casos sem vínculo de unidade |
| VISITANTE / NOME | Nome do visitante ou condutor |
| VEÍCULO / TIPO | Placa, modelo e tipo (ex: `GGG-9999 CORSA • VISITANTE`) |
| HORA DE ENTRADA | Horário formatado (ex: `15:54`). Fallback: `"—"` se dado inválido |

**Histórico de ações intermediárias:**

| Ação | Responsável | Quando ocorre |
|---|---|---|
| Autorização de acesso confirmada | Sistema | Quando o acesso é liberado pelo sistema |
| Acesso negado | Sistema | Quando o sistema bloqueia o acesso |
| Alerta de permanência prolongada | Sistema | Quando o veículo passa do tempo esperado no condomínio |
| Observação adicionada | Nome do operador | Quando o porteiro inclui uma nota manual |

---

### Etapa 3 — FECHAMENTO

> Nome fixo. Subtipo único para este tipo:

**Subtipo — SAÍDA REGISTRADA**

| Campo | Descrição |
|---|---|
| Responsável | `Sistema` — a saída é registrada automaticamente pelo sistema |
| Data/Hora | Timestamp da saída |
| Descrição padrão | `"Saída registrada com sucesso na portaria."` |
| Observação | Campo livre opcional — itálico entre aspas |

> **Placeholder enquanto pendente:** `"AGUARDANDO REGISTRO DE SAÍDA..."` — exibido na posição da Etapa 3 com visual desabilitado.

---

## Tipo 3 — OCORRÊNCIAS

**Título da tela:** `Detalhes da Movimentação — Ocorrências`  
**Identificação:** Unidade (ex: `BLOCO 05, APT 502`) ou Área (ex: `ÁREA COMUM: PORTARIA`, `CONDOMÍNIO`)

### Status da Movimentação

| Status | Significado | Cor |
|---|---|---|
| ABERTA | Ocorrência registrada, sem ação iniciada | Amarelo |
| EM ANDAMENTO | Ocorrência sendo tratada | Azul |
| RESOLVIDA | Ocorrência encerrada | Verde |

---

### Etapa 1 — ABERTURA

> Nome fixo. Padrão global aplicado diretamente.

**Campos registrados:**
| Campo | Descrição |
|---|---|
| Responsável | Nome real do operador que abriu a ocorrência. Quando gerada automaticamente pelo sistema, exibir `"Sistema"` |
| Data/Hora | Timestamp de abertura |
| Descrição padrão | `"Ocorrência registrada no sistema."` |

---

### Etapa 2 — DADOS DA OCORRÊNCIA

> **Nomenclatura obrigatória:** `DADOS DA OCORRÊNCIA`

**Dados do registro:**
| Campo | Descrição |
|---|---|
| TIPO / CATEGORIA | Classificação (ex: Passagem de Plantão, Informativo, Manutenção, Segurança) |
| PRIORIDADE | Nível de prioridade (Normal, Alta, Urgente) |
| LOCALIZAÇÃO | Onde ocorreu (ex: Condomínio, Área Comum: Portaria, Bloco X Apt Y) |
| RELATO INICIAL | Texto descritivo do registro inicial — itálico entre aspas |

**Histórico de ações intermediárias:**

Este é o tipo com maior volume de ações intermediárias. Cada atualização é um **bloco independente** na linha do tempo com:

| Elemento | Descrição |
|---|---|
| Autor | Nome real do operador que registrou a atualização |
| Data/Hora | Timestamp da atualização |
| Status da atualização | Badge colorido com o status definido nessa interação (ex: `EM ANDAMENTO`, `RESOLVIDA`) |
| Texto | Descrição da atualização — itálico |

> As atualizações intermediárias **não encerram** a ocorrência. Apenas a última interação com status `RESOLVIDA` representa o fechamento formal.

---

### Etapa 3 — FECHAMENTO

> Nome fixo. A última atualização com status `RESOLVIDA` é promovida visualmente como o Fechamento.

| Campo | Descrição |
|---|---|
| Responsável | Nome real do operador que registrou a resolução |
| Data/Hora | Timestamp da resolução |
| Status | Badge `RESOLVIDA` |
| Texto | Descrição do encerramento — itálico |

---

## Tipo 4 — MUDANÇAS

**Título da tela:** `Detalhes da Movimentação — Mudanças`  
**Identificação:** Unidade do solicitante (ex: `BLOCO 08, APT 302`)

### Status da Movimentação

| Status | Significado | Cor |
|---|---|---|
| AGENDADA | Mudança registrada, ainda não ocorreu | Azul |
| EM ANDAMENTO | Mudança em execução | Amarelo |
| CONCLUÍDA | Mudança encerrada com sucesso | Verde |
| CANCELADA | Mudança cancelada antes de ocorrer | Vermelho |

---

### Etapa 1 — CRIAÇÃO / AGENDAMENTO

> Nome fixo para este tipo. Equivalente à "Abertura" no padrão global.

**Campos registrados:**
| Campo | Descrição |
|---|---|
| Responsável | Nome real do operador que criou o agendamento |
| Data/Hora | Timestamp do agendamento |
| Identificação do solicitante | Nome completo + telefone (ex: `VINICIUS GARCIA FERNANDES - 14988108748`) |

---

### Etapa 2 — DADOS DA MUDANÇA

> **Nomenclatura obrigatória:** `DADOS DA MUDANÇA`

**Dados do registro:**
| Campo | Descrição |
|---|---|
| DATA PREVISTA | Data programada para a mudança (ex: `22/04/2026`) |
| HORÁRIO | Janela de horário de início e fim (ex: `16:00:00 às 18:00:00`) |
| NATUREZA | Tipo com informação de uso de elevador (ex: `SAIDA - Elevador: Não` / `ENTRADA - Elevador: Sim`) |
| VEÍCULO ASSOCIADO | Placa, tipo e cor (ex: `JJJ-0000 CARGO AZUL`) |
| OBSERVAÇÕES | Campo livre — itálico |

**Histórico de ações intermediárias:**

| Ação | Responsável | Quando ocorre |
|---|---|---|
| Notificação de agendamento enviada ao morador | Sistema | Automático após criação |
| Confirmação do morador recebida | Sistema | Quando morador confirma pelo app |
| Chegada do veículo de mudança registrada | Nome do operador | Quando o veículo chega na portaria |
| Saída do veículo de mudança registrada | Nome do operador | Quando o veículo deixa o condomínio |
| Cancelamento registrado | Nome do operador | Quando a mudança é cancelada manualmente |
| Observação adicionada | Nome do operador | Durante a execução da mudança |

---

### Etapa 3 — FECHAMENTO

> Nome fixo. Possui dois subtipos conforme o desfecho:

**Subtipo A — CONCLUSÃO**

| Campo | Descrição |
|---|---|
| Responsável | Nome real do operador que registrou o encerramento |
| Data/Hora | Timestamp do encerramento |
| Ocorrência de Fechamento | Relato obrigatório do encerramento. Exibido com label `OCORRÊNCIA DE FECHAMENTO` e ícone ⚠️ (ex: `"Sem nenhum imprevisto"`) |

**Subtipo B — CANCELAMENTO**

| Campo | Descrição |
|---|---|
| Responsável | Nome real do operador que registrou o cancelamento, ou `"Sistema"` se cancelado automaticamente |
| Data/Hora | Timestamp do cancelamento |
| Motivo | Texto descritivo do motivo do cancelamento |

---

## Resumo Consolidado de Nomenclaturas

### Nomes das Etapas por Tipo

| Tipo | Etapa 1 | Etapa 2 | Etapa 3 |
|---|---|---|---|
| Encomendas | RECEBIMENTO NA PORTARIA | DADOS DA ENCOMENDA | FECHAMENTO: RETIRADA / FECHAMENTO: RECUSADA |
| Veículos (visitante) | REGISTRO DE ENTRADA | DADOS DO VISITANTE | FECHAMENTO: SAÍDA REGISTRADA |
| Veículos (morador) | REGISTRO DE ENTRADA | DADOS DO MORADOR | FECHAMENTO: SAÍDA REGISTRADA |
| Ocorrências | ABERTURA | DADOS DA OCORRÊNCIA | FECHAMENTO: RESOLVIDA |
| Mudanças | CRIAÇÃO / AGENDAMENTO | DADOS DA MUDANÇA | FECHAMENTO: CONCLUSÃO / FECHAMENTO: CANCELAMENTO |

### Status por Tipo

| Tipo | Status possíveis |
|---|---|
| Encomendas | AGUARDANDO · RETIRADA · RECUSADA |
| Veículos | EM ANDAMENTO · SAÍDA REGISTRADA |
| Ocorrências | ABERTA · EM ANDAMENTO · RESOLVIDA |
| Mudanças | AGENDADA · EM ANDAMENTO · CONCLUÍDA · CANCELADA |

---

## Bugs e Pontos de Atenção Técnica

| # | Tipo | Problema | Solução recomendada |
|---|---|---|---|
| 1 | Veículos | `"INVALID DATE"` no campo HORA DE ENTRADA e timestamp da Etapa 1 | Adicionar validação de data antes da renderização. Fallback: exibir `"—"` |
| 2 | Encomendas | Timestamp ausente na Etapa 3 quando recusa é feita pelo sistema | Garantir que o sistema salve timestamp no momento da recusa automática |
| 3 | Mudanças | Nome do operador truncado com `"..."` quando ultrapassa o espaço disponível no componente | Implementar tooltip com nome completo ao passar o mouse sobre o nome truncado |
| 4 | Veículos | Campo `MORADOR / UNIDADE` retorna `"PORTARIA"` sem vínculo de apartamento | Verificar se é valor esperado no fluxo ou falha de vínculo no cadastro |
