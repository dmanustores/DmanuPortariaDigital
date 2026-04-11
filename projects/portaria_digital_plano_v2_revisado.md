# Portaria Digital — Plano de Ação Revisado v2.0

> **Revisão completa** baseada em pesquisa de sistemas reais de portaria digital (BRCondos, Condomob, SIN, MinhaPortaria, GroupSoftware, Generall) e análise das telas de cadastro já desenvolvidas. Cada menu foi auditado contra falhas operacionais reais.

---

## ⚠️ Falhas Identificadas no Plano v1 (Corrigidas Nesta Revisão)

| # | Falha | Onde | Correção Aplicada |
|---|-------|------|-------------------|
| 1 | **Livro de Ocorrências ausente** — item obrigatório em toda portaria digital real | Menu inexistente | Adicionado como menu P0 obrigatório |
| 2 | **Prestadores de serviços da unidade** confundidos com colaboradores do condomínio | Módulo Colaboradores | Separação clara: prestador da unidade × colaborador do condomínio |
| 3 | **Fluxo de autorização do visitante incompleto** — não havia o passo de notificação ao morador | Visitantes | Fluxo reescrito com notificação e confirmação pelo morador |
| 4 | **Entrega de boletos ausente no cadastro** — funcionalidade existente na tela real | Cadastro Morador | Campo adicionado (no próprio condomínio / outro endereço) |
| 5 | **Local de trabalho e endereço comercial ausentes** — presentes na tela real e úteis para emergências | Cadastro Morador | Campos adicionados |
| 6 | **Contato de emergência não era obrigatório** — crítico para operação real da portaria | Cadastro Morador | Tornado campo obrigatório |
| 7 | **LGPD mal aplicada** — coletava mais dados do que o mínimo necessário para visitantes | Visitantes | Ajustado: visitante coleta apenas nome + documento (mínimo legal LGPD) |
| 8 | **Turnos de porteiro sem passagem de plantão** | Operador/Turno | Adicionada funcionalidade de "Passagem de Plantão" entre turnos |
| 9 | **Sem modo offline** — portaria sem internet não poderia operar | Sistema | Definido modo degradado offline obrigatório |
| 10 | **Histórico de ações do visitante não rastreável** — sem log de quem liberou | Visitantes | Log de autorização obrigatório: quem liberou + hora + método |

---

## 1. Visão Geral Revisada

O sistema é composto por **dois ambientes distintos**:

- **Painel da Portaria (este sistema)** — operado pelo porteiro/zelador/admin no desktop ou tablet fixo da guarita
- **App do Morador (v2 futura)** — app mobile onde moradores pré-autorizam visitantes e recebem notificações

A interface atual (dark mode, sidebar, dashboard centralizado) está correta como padrão operacional. A tela de **Cadastro de Morador** já desenvolvida foi analisada e está **bem estruturada** — com ajustes menores necessários (detalhados na Seção 4).

---

## 2. Arquitetura de Menus Revisada e Final

### Menus Validados (com prioridade real de operação)

| # | Menu | Perfis | Prioridade | Justificativa Operacional |
|---|------|--------|------------|--------------------------|
| 1 | **Dashboard** | Todos | P0 | Visão do turno ativo — primeiro acesso do porteiro |
| 2 | **Acessos / Visitantes** | Todos | P0 | Operação principal da portaria — todo registro de entrada/saída |
| 3 | **Encomendas** | Todos | P0 | Rotina diária obrigatória — todo condomínio recebe entregas |
| 4 | **Veículos** | Todos | P0 | Controle de entrada/saída de veículos é obrigatório |
| 5 | **Moradores** | Admin, Zelador | P0 | Base de dados central — tudo depende daqui |
| 6 | **Unidades** | Admin | P0 | Estrutura organizacional do condomínio |
| 7 | **Ocorrências** | Todos | P0 | **NOVO — Obrigatório** — livro digital da portaria |
| 8 | **Mudanças** | Todos | P1 | Operação crítica mas não diária |
| 9 | **Reservas / Áreas Comuns** | Admin, Zelador | P1 | Alta demanda em condomínios médios/grandes |
| 10 | **Colaboradores** | Admin, Zelador | P1 | Funcionários do condomínio |
| 11 | **Avisos / Comunicados** | Todos | P1 | Quadro de avisos (já existe no Dashboard, deve ter módulo próprio) |
| 12 | **Relatórios** | Admin, Zelador | P1 | Histórico e exportação |
| 13 | **Configurações** | Admin | P2 | Setup inicial e parametrização |

### Menu que estava na interface e deve ser RENOMEADO

- ❌ "Novo Morador" (ação, não menu) → ✅ "Moradores" (seção) com botão "+ Novo Morador" interno

---

## 3. Plano de Ação Detalhado por Menu (Revisado)

---

### 3.1 Dashboard — Revisado

**Falha corrigida:** Dashboard estava tratando "Acessos em Tempo Real" por tipo de pessoa, mas os sistemas reais agrupam por **status de presença** (dentro/saiu), não por categoria.

**Estrutura correta do Dashboard:**

```
┌─ AUTORIZAÇÃO RÁPIDA ─────────────────────────────────────────────────┐
│  [Nome do visitante]  →  Liberado por: [Unidade - Morador ▼]         │
│                          [Registrar Entrada]                          │
└──────────────────────────────────────────────────────────────────────┘

┌─ KPIs DO TURNO ───────────────────────────────────────────────────────┐
│  42 Entradas hoje  |  12 Encomendas pendentes  |  8 No pátio  |  3 Ocorrências abertas │
└──────────────────────────────────────────────────────────────────────┘

┌─ PESSOAS NA ÁREA AGORA ──────────────┐  ┌─ QUADRO DE AVISOS ─────────┐
│  Visitantes ativos: 5                │  │  [lista de avisos]          │
│  Prestadores ativos: 2               │  └────────────────────────────┘
│  Colaboradores em turno: 3           │
└──────────────────────────────────────┘  ┌─ LEMBRETES DA PORTARIA ────┐
                                           │  [checklist do turno]       │
┌─ RESERVAS DO DIA ──────────────────────┐  └────────────────────────────┘
│  [espaço + horário + unidade]          │
└────────────────────────────────────────┘  ┌─ FLUXO DO DIA ─────────┐
                                              │  42 entradas | 12 enc. │
                                              └────────────────────────┘
```

**Novo item obrigatório no Dashboard:**
- **Passagem de plantão** — ao fazer logout, o sistema deve solicitar um breve registro do estado atual (ocorrências em aberto, visitantes ainda dentro, encomendas sem retirar) para o próximo turno

---

### 3.2 Acessos / Visitantes — Completamente Reescrito

**Falha crítica corrigida:** O plano v1 não definia claramente a distinção entre os **tipos de pessoa** que entram no condomínio. Na prática real, há 5 categorias com fluxos distintos:

#### Categorias e Fluxos

**A) Visitante Eventual (sem cadastro)**
1. Porteiro aciona a unidade (interfone físico ou campo "Contatar Unidade" no sistema)
2. Morador autoriza verbalmente → porteiro registra: nome, documento (RG ou CPF — mínimo LGPD), unidade destino, nome do morador que autorizou, hora
3. Sistema salva com status "Dentro"
4. Na saída: porteiro registra saída → status "Saiu"

**B) Visitante com Pré-Autorização (cadastro prévio)**
1. Visitante chega → porteiro busca no sistema pelo nome
2. Sistema exibe autorização (de qual unidade, validade, dias/horários permitidos)
3. Porteiro confirma documento → registra entrada sem precisar contatar a unidade
4. Na saída: registra saída normalmente

**C) Empregada Doméstica / Prestador Recorrente da Unidade**
1. Cadastro prévio feito pelo porteiro ou admin: nome, documento, foto, unidade(s) que atende, dias da semana, horário de acesso
2. Entrada: porteiro busca nome → sistema exibe perfil → confirma entrada (sem contatar unidade)
3. Alerta automático se prestador chegar fora do dia/horário cadastrado

**D) Prestador de Serviços Avulso (técnico, entregador de móvel, etc.)**
1. Porteiro contata a unidade para confirmar
2. Coleta dados: nome, empresa, tipo de serviço, documento
3. Registra entrada com tipo "Prestador Avulso"
4. Na saída: registra + observação se necessário

**E) Entregador (iFood, Amazon, Correios, etc.)**
1. Acesso liberado diretamente para área de encomendas/hall
2. Porteiro registra apenas: empresa entregadora, número de volumes, hora
3. Não precisa autorização de unidade (vai apenas ao hall, não ao apartamento)
4. Se for entrega dentro do apartamento: fluxo de Prestador Avulso (D)

#### Campos do Registro de Acesso

| Campo | Visitante Eventual | Prestador Recorrente | Entregador |
|-------|-------------------|---------------------|------------|
| Nome | Obrigatório | Obrigatório (pré-cadastrado) | Obrigatório |
| Documento (RG/CPF) | Obrigatório | Pré-cadastrado | Não obrigatório |
| Foto (tirar na entrada) | Recomendado v2 | Pré-cadastrada | Não |
| Unidade destino | Obrigatório | Pré-cadastrada | Não se aplica |
| Liberado por (morador) | Obrigatório | Não (pré-autorizado) | Não se aplica |
| Empresa | Não | Se prestador empresa | Obrigatório |
| Veículo/Placa | Se veículo | Se veículo | Se caminhão |

#### Pré-Autorizações — Tipos

- **Pontual:** data específica, horário (ex: técnico da Net dia 15/04 das 14h às 17h)
- **Recorrente semanal:** dias da semana + horário (ex: faxineira toda 3ª e 5ª das 8h às 12h)
- **Por período:** data início + data fim (ex: equipe de obras de 01/05 a 30/06)
- **Permanente:** sem vencimento (ex: familiar que visita regularmente)

**LGPD — Regra obrigatória para visitantes:**
- Coletar **mínimo necessário**: nome + um documento de identidade
- Não obrigar CPF de visitantes eventuais (RG é suficiente)
- Fotos de visitantes apenas para o registro do acesso, não para banco de dados permanente
- Dados de visitantes apagados/anonimizados após 90 dias (configurável pelo admin, mínimo legal)

---

### 3.3 Encomendas — Revisado

**Falhas corrigidas:**
- Faltava o fluxo de **encomenda recusada** (porteiro não aceita encomenda danificada)
- Faltava o alerta de **encomenda esquecida** (morador não retira após X dias)
- Faltava a distinção entre encomenda para **hall** vs. **almoxarifado**

**Fluxo completo:**

```
RECEBIMENTO:
Entregador chega → [Nova Encomenda] → Unidade + Tipo + Transportadora + Nº volumes
→ Foto da etiqueta (opcional v1, obrigatório v2) → Salvar → Status: "Aguardando"
→ Sistema gera notificação (opcional: aviso no quadro, WhatsApp v2)

RETIRADA:
Morador vai à portaria → Porteiro busca por unidade → Lista encomendas pendentes
→ Porteiro confirma identidade → Clica "Registrar Retirada" → Insere nome de quem retirou
→ Status: "Retirada" → Registro com hora e responsável

RECUSA:
Porteiro recusa encomenda (danificada, unidade não existe, morador recusou)
→ Status: "Recusada" → Campo obrigatório: motivo da recusa

ALERTA DE ENCOMENDA ESQUECIDA:
Sistema verifica diariamente → Encomendas com status "Aguardando" há mais de X dias (padrão: 5 dias)
→ Alerta no Dashboard do porteiro: "3 encomendas aguardam retirada há mais de 5 dias"
```

**Estados completos:**
- `aguardando` — recebida, não retirada
- `retirada` — confirmada saída
- `recusada` — não aceita na entrada
- `devolvida` — porteiro devolveu ao entregador após prazo

---

### 3.4 Veículos — Revisado

**Falha corrigida:** Faltava o fluxo de **veículo de visitante não cadastrado** com processo específico de entrada temporária.

**Dois contextos distintos:**

**A) Veículo de Morador (cadastrado na unidade)**
- Acesso liberado automaticamente ao identificar placa
- Registro automático de entrada/saída no histórico da unidade
- Alertas se veículo ultrapassar 48h no pátio sem saída registrada

**B) Veículo de Visitante (não cadastrado)**
- Porteiro registra: placa, modelo, cor, unidade visitada, nome do motorista
- Sistema registra como "Visita Temporária"
- Saída obrigatória — sistema alerta após 12h sem saída registrada

**C) Veículo de Prestador/Mudança**
- Registro vinculado ao registro de acesso do prestador ou ao registro de mudança
- Placa do veículo incluída no registro da ocorrência

**Pátio em Tempo Real (aba obrigatória):**
Visualização de todos os veículos atualmente dentro do condomínio:
- Placa | Modelo | Cor | Unidade | Entrada às | Tipo (morador/visitante/prestador)
- Ordenado por tempo de permanência (mais antigo no topo)
- Alerta visual para veículos com mais de 12h

---

### 3.5 Moradores — Revisado com Análise das Telas Enviadas

**Análise da tela de Cadastro de Morador existente:**

A tela apresentada está **bem estruturada**. Os campos identificados são:

✅ **Corretos e completos (manter):**
- Identificação da Unidade (Bloco + Apartamento + Tipo Proprietário/Inquilino)
- Dados do Morador (Nome + Email)
- Local de trabalho + Endereço comercial
- Contatos e Documentos (Celular, Fone Fixo, Fone Comercial, CPF, RG)
- Dependentes/Pessoas que habitarão o imóvel
- Veículos
- Prestadores de Serviços Diários
- Contato de Emergência (Nome + Telefone)
- Entrega de Boletos (No próprio condomínio / Outro endereço)

⚠️ **Ajustes necessários:**

| Campo | Problema | Correção |
|-------|----------|----------|
| CPF | Não há validação explícita descrita | Implementar validação de dígitos verificadores do CPF |
| Foto do morador | Campo ausente no formulário | Adicionar campo de upload/câmera com checkbox de consentimento LGPD |
| Data de entrada na unidade | Campo ausente | Campo obrigatório — necessário para histórico e contratos de locação |
| WhatsApp | Apenas ícone no card da listagem | No formulário, adicionar checkbox "Este número tem WhatsApp" no campo Celular |
| Tipo de entrega de boletos | "Outro endereço" sem campo de endereço | Quando selecionado "Outro endereço", abrir campos de endereço completo |
| Dependentes | Formulário simples (nome + relação + doc) | Adicionar campo de data de nascimento (necessário para verificar maioridade na entrada) |

❌ **O que está faltando no formulário mas DEVE ser adicionado:**
- **Período de contrato** (data início + data fim) — para inquilinos com prazo
- **Autorização de acesso ativo/inativo** — toggle visível no formulário
- **Observações internas** — campo livre para a portaria (ex: "mora no 3º andar fundos, campainha quebrada")

**Listagem de Moradores (tela já desenvolvida):**
A listagem com busca por "nome, bloco ou apto" está correta. Melhorias sugeridas:
- Adicionar filtro por tipo (Proprietário / Inquilino / Dependente)
- Adicionar filtro por status (Ativo / Inativo)
- Indicador visual de unidades com encomendas pendentes
- Exibir foto do morador no card (quando cadastrada)

**Ficha do Morador (tela já desenvolvida — muito boa):**
A ficha com Header azul (nome + bloco + ap + tipo), dados de contato, documentos, dependentes, veículos, prestadores diários, contato de emergência e entrega de boletos está **excelente** e representa uma operação real completa. Sugestões menores:
- CPF na ficha deve ser mascarado: `756.976.XXX-XX` (mostrar apenas os 7 primeiros dígitos + asteriscos)
- RG igualmente: `15.404.XXX-X`
- Adicionar botão "Registrar Ocorrência" diretamente na ficha
- Adicionar botão "Ver Histórico de Acessos" para ver quando o morador entrou/saiu

---

### 3.6 Unidades — Revisado

**Falha corrigida:** Faltava a visualização de status de ocupação e histórico de moradores anteriores.

**Estrutura da tela de Unidade:**

```
LISTA DE UNIDADES:
Filtros: Bloco | Status (Ocupada/Vaga/Em Obras) | Tipo
Card de unidade: Bloco + Nº | Moradores ativos | Veículos | Encomendas pendentes

DETALHE DA UNIDADE:
├── Header: Bloco + Nº + Tipo + Status
├── Moradores Ativos (com fotos e tipo: Proprietário/Inquilino/Dependente)
├── Histórico de Moradores (anteriores — nome + período)
├── Veículos cadastrados
├── Encomendas pendentes
├── Pré-autorizações ativas (visitantes recorrentes)
└── Observações da administração
```

---

### 3.7 Ocorrências — NOVO (Obrigatório P0)

**Por que é P0:** Todo sistema de portaria real exige um livro de ocorrências digital. O porteiro precisa registrar eventos que não são entradas/saídas nem encomendas: problemas de manutenção, reclamações, incidentes, alertas de segurança.

**Tipos de ocorrência:**

| Tipo | Quem registra | Visível para |
|------|--------------|--------------|
| Manutenção | Porteiro, Zelador | Zelador, Admin |
| Segurança / Incidente | Porteiro | Admin |
| Reclamação de Morador | Porteiro (transcrevendo) | Admin |
| Informativo de Turno | Porteiro | Zelador, Admin |
| Passagem de Plantão | Porteiro (ao sair) | Porteiro do próximo turno, Admin |

**Campos do registro de ocorrência:**
- Tipo (seleção obrigatória)
- Título (curto, obrigatório)
- Descrição (texto livre, obrigatório)
- Unidade relacionada (opcional — para reclamações específicas)
- Prioridade: Baixa / Normal / Urgente
- Status: Aberta / Em Andamento / Resolvida / Arquivada
- Data/hora (automática)
- Operador (automático pelo login)
- Foto/anexo (opcional)

**Dashboard:** Ocorrências abertas e urgentes devem aparecer como alerta no Dashboard.

**Passagem de Plantão:**
- Ao fazer logout, sistema abre modal "Passagem de Plantão"
- Porteiro preenche: visitantes ainda dentro, encomendas sem retirar, ocorrências em aberto, observações para o próximo turno
- Próximo porteiro ao fazer login vê a passagem do turno anterior antes de acessar o dashboard

---

### 3.8 Mudanças — Revisado

**Falha corrigida:** Faltava o controle de **uso do elevador de serviço** e a **checklist de condição das áreas comuns** (antes e depois da mudança).

**Campos adicionais obrigatórios:**
- Checklist de entrada: condição do elevador de serviço, corredor, hall (fotos — opcional)
- Checklist de saída: mesma vistoria confirmada
- Caução/depósito declarado (apenas informativo — não financeiro)
- Assinatura digital do responsável pela mudança (v2)

**Regra de negócio adicionada:**
- Sistema deve bloquear agendamento de mudança se houver outra mudança no mesmo bloco/elevador no mesmo período
- Porteiro deve confirmar "início da mudança" e "fim da mudança" — sem confirmação, status permanece "Em andamento" e gera alerta

---

### 3.9 Reservas / Áreas Comuns — Revisado

**Sem alterações críticas no v1 — ajuste menor:**

**Adicionado:** campo de **regras específicas por espaço** (ex: salão de festas proíbe música após 22h). Exibidas para o porteiro ao iniciar a reserva para que ele informe o morador.

---

### 3.10 Colaboradores — Revisado (Separação Clara)

**DISTINÇÃO OBRIGATÓRIA — confusão frequente na operação real:**

| | Colaborador do Condomínio | Prestador da Unidade |
|-|--------------------------|----------------------|
| **Quem é** | Porteiro, zelador, faxineira do cond., jardineiro | Empregada doméstica, babá, cuidador, diarista |
| **Cadastrado por** | Admin/Zelador no módulo Colaboradores | Porteiro/Admin como Prestador Recorrente no módulo Acessos |
| **Autorização de acesso** | Por turno/horário cadastrado | Por unidade específica + dias da semana |
| **Controla acesso a** | Áreas comuns + guarita | Apenas à unidade vinculada |
| **Registro de ponto** | Sim (futuro) | Não |

**Módulo Colaboradores deve ter:**
- Cadastro completo (nome, CPF, foto, função, turno, empresa se terceirizado)
- Histórico de entradas e saídas
- Alerta se colaborador não registrou entrada no início do turno

---

### 3.11 Relatórios — Revisado

**Relatórios P0 (operacionais — devem existir desde o início):**
1. **Fluxo do dia/período** — entradas e saídas por hora, com filtro por tipo
2. **Encomendas** — pendentes, retiradas, prazo médio de retirada por unidade
3. **Ocorrências** — abertas, resolvidas, por tipo e por período
4. **Passagens de plantão** — histórico de todos os registros de turno

**Relatórios P1 (gerenciais):**
5. Veículos — movimentação e tempo médio de permanência
6. Visitantes por unidade — quem mais recebe visitas
7. Mudanças realizadas no período
8. Reservas de áreas comuns — taxa de ocupação

**Exportação:** PDF e CSV obrigatórios em todos os relatórios desde a v1.

---

## 4. Controle de Acesso e Permissões (Revisado)

### Matriz Revisada

| Funcionalidade | Porteiro | Zelador | Admin |
|----------------|----------|---------|-------|
| Dashboard completo | ✅ | ✅ | ✅ |
| Registrar entrada/saída | ✅ | ✅ | ✅ |
| Gerenciar encomendas | ✅ | ✅ | ✅ |
| Registrar ocorrências | ✅ | ✅ | ✅ |
| Resolver/arquivar ocorrências | ❌ | ✅ | ✅ |
| Cadastrar pré-autorizações | ✅ | ✅ | ✅ |
| Criar/editar unidades | ❌ | ❌ | ✅ |
| Cadastrar/editar moradores | ❌ | ❌ | ✅ |
| Ver ficha completa do morador | ✅ (parcial) | ✅ | ✅ |
| Ver CPF/RG completo | ❌ (mascarado) | ✅ | ✅ |
| Criar colaboradores | ❌ | ✅ | ✅ |
| Aprovar reservas | ❌ | ✅ | ✅ |
| Publicar avisos | ❌ | ✅ | ✅ |
| Ver relatórios | Apenas do turno | Últimos 30 dias | Total |
| Exportar relatórios | ❌ | ✅ | ✅ |
| Configurações do sistema | ❌ | ❌ | ✅ |
| Apagar/arquivar registros | ❌ | ❌ | ✅ |

### Porteiro — O Que Vê na Ficha do Morador

O porteiro **DEVE VER** (operação crítica):
- Nome completo, foto, unidade
- Telefone (para contato)
- Dependentes (para identificar na entrada)
- Veículos (placa para liberar)
- Prestadores recorrentes (para liberar sem contatar)
- Contato de emergência

O porteiro **NÃO DEVE VER** (proteção de dados LGPD):
- CPF/RG completos (mascarados)
- Email
- Local de trabalho / endereço comercial
- Observações internas da administração

---

## 5. Cadastro de Morador — Análise Completa das Telas Desenvolvidas

### Tela: Gestão de Moradores (Listagem)
**Status: ✅ Aprovada com ajuste menor**
- Busca por nome/bloco/apto: ✅
- Card com: nome, bloco, ap, telefone, WhatsApp, email, nº moradores, nº veículos, nomes dos dependentes: ✅
- **Ajuste:** Adicionar chip de status (Ativo/Inativo) e foto do morador principal no card

### Tela: Ficha do Morador
**Status: ✅ Excelente — melhor tela do sistema**
- Header com nome, bloco, ap, tipo (PROPRIETÁRIO): ✅
- Celular com botão WhatsApp: ✅
- Email e Documentos: ✅
- Local de trabalho e Endereço Comercial: ✅
- Dependentes com relação + RG + CPF: ✅
- Veículos com modelo + cor + placa: ✅
- Prestadores Diários: ✅
- Contato de Emergência: ✅
- Entrega de Boletos: ✅
- **Ajustes:**
  - Mascarar CPF: mostrar apenas `756.976.XXX-XX`
  - Adicionar botão de ação: "Registrar Ocorrência" e "Ver Histórico de Acessos"
  - Adicionar foto do morador no avatar (atualmente é ícone genérico)

### Tela: Cadastro de Morador (Formulário)
**Status: ✅ Aprovado com campos a adicionar**
- Identificação da Unidade (Bloco + Ap + Tipo): ✅
- Dados do Morador: ✅
- Contatos e Documentos: ✅
- Dependentes com "+ Adicionar Morador": ✅
- Veículos com "+ Adicionar Veículo": ✅
- Prestadores Diários com "+ Adicionar Prestador": ✅
- Contato de Emergência: ✅
- Entrega de Boletos (radio buttons): ✅

**Campos a adicionar:**

```
SEÇÃO: DADOS DO MORADOR
+ Foto do morador (upload/câmera)
+ [checkbox] Autorizo o uso da minha foto para identificação na portaria (LGPD)
+ Data de entrada na unidade *
+ Data prevista de saída (para inquilinos)

SEÇÃO: CONTATOS E DOCUMENTOS
+ [checkbox] Este celular tem WhatsApp (ao lado do campo Celular)

SEÇÃO: ENTREGA DE BOLETOS
+ Quando "Outro endereço" selecionado → exibir campos:
  CEP | Rua | Nº | Complemento | Bairro | Cidade

NOVA SEÇÃO: CONFIGURAÇÕES DE ACESSO
+ Status do morador: [Ativo ●] / [Inativo]
+ Observações internas (campo textarea — visível apenas para zelador e admin)
```

---

## 6. Modo Offline Obrigatório

**Falha crítica do v1:** Sistema de portaria **não pode parar** se a internet cair. Toda portaria física precisa de um plano B.

**Comportamento offline obrigatório:**

| Funcionalidade | Comportamento sem Internet |
|---------------|---------------------------|
| Registrar entrada/saída | ✅ Funciona (salva localmente, sincroniza depois) |
| Consultar morador cadastrado | ✅ Funciona (cache local das fichas) |
| Consultar veículo cadastrado | ✅ Funciona (cache local das placas) |
| Consultar pré-autorizações | ✅ Funciona (cache local) |
| Encomendas | ✅ Funciona (salva localmente) |
| Relatórios e exportação | ❌ Requer conexão |
| Cadastro de novos moradores | ❌ Requer conexão |
| Sincronização de avisos | ❌ Requer conexão |

**Banner de alerta:** Quando offline, exibir faixa vermelha no topo: "Modo offline — dados sendo salvos localmente. Reconecte para sincronizar."

---

## 7. Funcionalidades LGPD Obrigatórias (Revisado)

Com base nas normas reais aplicadas a condomínios:

1. **Base legal declarada** para cada tipo de dado coletado (segurança do condomínio = obrigação legal)
2. **Minimização de dados de visitantes** — coletar apenas nome + documento de identidade
3. **Foto de morador** — somente com consentimento explícito (checkbox no cadastro)
4. **CPF/RG mascarados** em todas as listagens e fichas para porteiros
5. **Prazo de retenção de dados de visitantes** — configurável, padrão 90 dias, após os quais são anonimizados
6. **Log de acesso a dados sensíveis** — registrar quem acessou qual ficha e quando
7. **Termos de uso/privacidade** — exibido no primeiro login de cada novo operador
8. **Dados de ex-moradores** — arquivados (não excluídos) com histórico de acessos preservado, dados pessoais anonimizados após 2 anos

---

## 8. Acessibilidade Revisada — 15 Regras Mais 3 Adicionadas

Os 15 itens do v1 permanecem. Adicionados:

16. **Formulários com progresso visível** — quando há múltiplas seções, indicar em qual seção o usuário está
17. **Timeout com aviso prévio** — 2 minutos antes de expirar a sessão, exibir modal "Sua sessão expirará em 2 minutos. Continuar?"
18. **Modo de alto contraste** — além de dark/light, suporte a `forced-colors: active` (Windows High Contrast Mode)

---

## 9. Ordem de Entrega Revisada (Sprints)

**Sprint 1 — Autenticação + Base (Semanas 1-2):**
- Login, perfis, turnos, sessão
- Design system, sidebar, layout base
- Dashboard com dados reais (não simulados — conectar ao banco desde o início)

**Sprint 2 — Entidade Central (Semanas 3-4):**
- Unidades (CRUD completo)
- Moradores (aproveitar as telas já desenvolvidas + ajustes do item 5 deste plano)
- Colaboradores do condomínio

**Sprint 3 — Operação Diária (Semanas 5-6):**
- Módulo Acessos/Visitantes (fluxo completo com 5 categorias)
- Módulo Encomendas (com fluxo de recusa e alerta de prazo)
- Módulo Veículos

**Sprint 4 — Ocorrências e Turnos (Semana 7):**
- Módulo Ocorrências (livro digital)
- Passagem de plantão integrada ao logout
- Modo offline (cache local)

**Sprint 5 — Funcionalidades Secundárias (Semanas 8-9):**
- Módulo Mudanças
- Módulo Reservas/Áreas Comuns
- Avisos e Comunicados (módulo próprio)

**Sprint 6 — Relatórios e Go-Live (Semana 10):**
- Módulo Relatórios com exportação PDF/CSV
- Testes de acessibilidade (WCAG AA)
- Ajuste de permissões e segurança
- Revisão de LGPD

---

## 10. Prompt Revisado para IA Desenvolvedora

```
SISTEMA: Portaria Digital — sistema web de gestão de portaria para condomínios.
STACK: HTML/CSS/JS vanilla ou React. PWA com suporte offline parcial obrigatório.
INTERFACE: Dark mode padrão, sidebar fixa, dashboard centralizado, mobile-first (375px).

ENTIDADES PRINCIPAIS:
- Condomínio > Blocos > Unidades > Moradores (proprietários, inquilinos, dependentes)
- Colaboradores do Condomínio (funcionários)
- Prestadores das Unidades (recorrentes — empregadas, diaristas)
- Visitantes (eventuais ou com pré-autorização)
- Acessos (registro de toda entrada/saída)
- Encomendas
- Veículos
- Ocorrências
- Reservas de Áreas Comuns

PERFIS DE USUÁRIO:
- Porteiro/Operador: acesso restrito — registra entradas/saídas, encomendas, ocorrências. Não vê CPF completo.
- Zelador: acesso gerencial — tudo do porteiro + colaboradores, relatórios parciais, aprovação de reservas.
- Admin/Síndico: acesso total.

REGRAS ABSOLUTAS:
1. Toda ação grava log: usuário + timestamp + IP
2. CPF/RG mascarados em listagens para porteiros
3. Confirmação modal antes de qualquer ação irreversível
4. Feedback inline imediato após cada operação (sucesso/erro)
5. Skeleton loader em toda carga de dados
6. Modo offline: entradas, consultas de fichas e placas funcionam sem internet
7. Passagem de plantão obrigatória no logout do porteiro
8. LGPD: visitantes eventuais — coletar apenas nome + documento (mínimo legal)
9. Foto de morador apenas com consentimento explícito (checkbox LGPD)
10. Sessão expira após inatividade de 4h com aviso 2min antes

DISTINÇÃO CRÍTICA:
- "Prestador da unidade" (empregada, diarista) ≠ "Colaborador do condomínio" (porteiro, zelador)
- Prestador da unidade é cadastrado no módulo Acessos/Visitantes como tipo "Prestador Recorrente"
- Colaborador do condomínio é cadastrado no módulo Colaboradores com turno e função

MÓDULOS POR PRIORIDADE:
P0: Dashboard, Acessos/Visitantes, Encomendas, Veículos, Moradores, Unidades, Ocorrências
P1: Mudanças, Reservas, Colaboradores, Avisos, Relatórios
P2: Configurações
```

