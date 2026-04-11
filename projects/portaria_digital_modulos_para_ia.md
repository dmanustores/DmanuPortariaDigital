# Portaria Digital — Guia de Quebra Modular para IAs com Contexto Limitado

> **Como usar este documento:** O projeto completo tem ~30KB de especificação. IAs com janela de contexto limitada (ex: versões gratuitas do ChatGPT, Gemini Free, Copilot) não conseguem processar tudo de uma vez. Este guia divide o projeto em **11 módulos independentes**, cada um com seu próprio prompt pronto para colar na IA.

---

## Visão da Estrutura do Projeto

```
portaria-digital/
│
├── 00-base/                    ← Design System + Layout + Auth
│   └── index.html              ← Tela de login
│   └── style.css               ← Tokens de design globais
│   └── app.html                ← Shell do app (sidebar + topbar)
│
├── 01-dashboard/
│   └── dashboard.js            ← Lógica e componentes do dashboard
│
├── 02-acessos/
│   └── acessos.js              ← Registro de entradas/saídas
│
├── 03-encomendas/
│   └── encomendas.js
│
├── 04-veiculos/
│   └── veiculos.js
│
├── 05-moradores/
│   └── moradores.js            ← Listagem + Ficha + Formulário (já desenvolvido)
│
├── 06-unidades/
│   └── unidades.js
│
├── 07-ocorrencias/
│   └── ocorrencias.js
│
├── 08-mudancas/
│   └── mudancas.js
│
├── 09-reservas/
│   └── reservas.js
│
├── 10-colaboradores/
│   └── colaboradores.js
│
└── 11-relatorios/
    └── relatorios.js
```

---

## CONTEXTO FIXO — Cole SEMPRE no início de cada conversa com a IA

> Copie o bloco abaixo e cole **antes** de qualquer prompt de módulo.

```
PROJETO: Portaria Digital — sistema web de gestão de portaria para condomínios.
INTERFACE: Dark mode padrão. Sidebar fixa à esquerda. Topbar com busca e perfil.
PALETA: fundo #171614, superfície #1c1b19, texto #cdccca, primário #4f98a3, borda #393836
FONTE: Satoshi (Fontshare) para todo o sistema
STACK: HTML + CSS + JavaScript vanilla. Sem frameworks. Sem backend real — dados em memória (arrays/objetos JS).
MOBILE-FIRST: Toda tela funciona em 375px de largura.

PERFIS DE USUÁRIO (variável global: window.currentUser):
- porteiro: { role: 'porteiro', nome: 'Operador', turno: 'A' }
- zelador:  { role: 'zelador', nome: 'Zelador' }
- admin:    { role: 'admin', nome: 'Administrador' }

DADOS GLOBAIS COMPARTILHADOS (window.appData):
- appData.unidades[]   → { id, bloco, numero, tipo, status }
- appData.moradores[]  → { id, nome, unidadeId, tipo, celular, cpf, veiculos[], dependentes[] }
- appData.acessos[]    → { id, tipo, nome, unidadeId, entrada, saida, liberadoPor, operador }
- appData.encomendas[] → { id, unidadeId, tipo, transportadora, status, recebidoEm, retiradoEm }
- appData.veiculos[]   → { id, placa, modelo, cor, moradorId, unidadeId }
- appData.ocorrencias[]→ { id, tipo, titulo, descricao, prioridade, status, criadoEm, operador }

REGRA UNIVERSAL: Toda ação grava em appData.logs[]: { acao, usuario, timestamp, dados }
REGRA UNIVERSAL: CPF exibido mascarado para porteiro: "756.976.XXX-XX"
REGRA UNIVERSAL: Confirmação modal antes de qualquer exclusão ou arquivamento
REGRA UNIVERSAL: Skeleton loader ao carregar qualquer lista
REGRA UNIVERSAL: Estado vazio com mensagem + ícone + botão de ação quando lista estiver vazia
```

---

## MÓDULO 00 — Base: Design System + Login + Shell do App

**Tamanho estimado do prompt:** pequeno | **Dependências:** nenhuma | **Desenvolver primeiro**

```
[COLE O CONTEXTO FIXO ACIMA]

MÓDULO 00 — BASE DO SISTEMA

Crie os seguintes arquivos HTML/CSS/JS:

1. LOGIN (index.html):
   - Tela centralizada, dark mode
   - Logo "Portaria Digital" com ícone de prédio SVG inline
   - Campos: Email + Senha
   - Botão "Entrar" (primário, azul #4f98a3)
   - Bloqueio após 5 tentativas falhas (contador em memória)
   - Ao logar com sucesso: redireciona para app.html e salva window.currentUser
   - Credenciais de teste:
     admin@admin.com / admin123 → role: admin
     porteiro@teste.com / 123456 → role: porteiro
     zelador@teste.com / 123456 → role: zelador

2. SHELL DO APP (app.html):
   - Sidebar fixa à esquerda (240px desktop, ícone+label)
   - Menus na sidebar: Dashboard, Acessos, Encomendas, Veículos, Moradores, Unidades, Ocorrências, Mudanças, Reservas, Colaboradores, Relatórios
   - Menus ocultados por permissão (porteiro não vê Unidades/Moradores/Relatórios completos)
   - Topbar: campo de busca global + ícone de notificação + avatar com nome + cargo do operador
   - Botão "Sair do Sistema" na base da sidebar (vermelho, com ícone de logout)
   - Ao sair: verificar se há passagem de plantão pendente → exibir modal antes de deslogar
   - Área de conteúdo principal (main) que troca via hash routing (#dashboard, #acessos, etc.)
   - Incluir appData global com dados fictícios de 3 unidades e 5 moradores para testes
   - Toggle dark/light no topbar

3. style.css com tokens CSS completos:
   - Variáveis de cor, espaçamento (4px base), tipografia (escala clamp)
   - base.css (reset + acessibilidade)
   - Componentes base: .btn-primary, .btn-secondary, .btn-ghost, .card, .badge, .modal, .skeleton, .empty-state
```

---

## MÓDULO 01 — Dashboard

**Tamanho estimado do prompt:** médio | **Dependências:** Módulo 00

```
[COLE O CONTEXTO FIXO ACIMA]

MÓDULO 01 — DASHBOARD

Crie o componente dashboard.js que renderiza na área #dashboard do app.html.

LAYOUT DO DASHBOARD:
┌─ AUTORIZAÇÃO RÁPIDA (card de destaque) ──────────────────────┐
│  Input: Nome do visitante                                      │
│  Select: Liberado por (lista de unidades com morador)          │
│  Botão: [Registrar Entrada]                                    │
└────────────────────────────────────────────────────────────────┘

┌─ KPIs (4 cards em linha) ──────────────────────────────────────┐
│  42 Entradas hoje | 12 Encomendas pendentes | 8 No pátio | 3 Ocorrências abertas │
└────────────────────────────────────────────────────────────────┘

┌─ PESSOAS NA ÁREA AGORA (col esq) ──┐  ┌─ QUADRO DE AVISOS (col dir) ─┐
│  Visitantes ativos: lista           │  │  Lista de avisos com data     │
│  Prestadores ativos: lista          │  └──────────────────────────────┘
└─────────────────────────────────────┘
                                         ┌─ LEMBRETES DA PORTARIA ──────┐
┌─ RESERVAS DO DIA ───────────────────┐  │  Checklist com checkboxes    │
│  Cards de reservas confirmadas hoje │  │  + Adicionar Lembrete        │
└─────────────────────────────────────┘  └──────────────────────────────┘

┌─ FLUXO DO DIA (card azul de destaque) ──────────────────────┐
│  42 ENTRADAS HOJE          12 ENCOMENDAS PENDENTES           │
└─────────────────────────────────────────────────────────────┘

COMPORTAMENTO:
- KPIs calculados a partir de appData (entradas de hoje, encomendas com status 'aguardando', etc.)
- Autorização rápida: ao clicar "Registrar Entrada" → adiciona em appData.acessos + atualiza KPI
- Lembretes: persistem em memória por sessão, com checkbox para marcar como feito
- Quadro de avisos: dados fictícios de 3 avisos com datas diferentes
- Pessoas na área: filtra appData.acessos onde saida === null (ainda dentro)
- Responsivo: em mobile, todos os cards empilham em coluna única
```

---

## MÓDULO 02 — Acessos / Visitantes

**Tamanho estimado do prompt:** grande | **Dependências:** Módulos 00 e 01

```
[COLE O CONTEXTO FIXO ACIMA]

MÓDULO 02 — ACESSOS / VISITANTES

Crie acessos.js com 3 abas: [Registro de Entrada] [Ativos Agora] [Histórico]

ABA 1 — REGISTRO DE ENTRADA:
5 tipos de acesso com formulários ligeiramente diferentes:
  A) Visitante Eventual → Nome* | Documento (RG/CPF)* | Unidade Destino* | Liberado por (morador)* | Veículo (opcional)
  B) Prestador Recorrente → busca por nome (autocomplete) → exibe ficha → confirma entrada
  C) Entregador → Empresa* | Nº volumes* | (não precisa de unidade)
  D) Prestador Avulso → Nome* | Empresa | Tipo de serviço | Documento* | Unidade*
  E) Colaborador do Cond. → busca por nome → confirma turno

Botão de tipo selecionável no topo (pills/tabs: Visitante | Prestador Rec. | Entregador | Prestador Avulso | Colaborador)

ABA 2 — ATIVOS AGORA:
Tabela/lista de todos com saida === null
Colunas: Nome | Tipo | Unidade | Entrou às | Liberado por | [Registrar Saída]
Botão "Registrar Saída" → modal de confirmação → preenche saida com hora atual

ABA 3 — HISTÓRICO:
Lista paginada (10 por página) de todos os acessos
Filtros: tipo | data | unidade
Busca por nome

PRÉ-AUTORIZAÇÕES (modal acessível via botão "Gerenciar Autorizações"):
CRUD de autorizações: Nome | Tipo (Pontual/Recorrente/Período/Permanente) | Unidade | Dias/Horário/Datas
Na entrada de Prestador Recorrente: verificar se existe pré-autorização válida
Se fora do horário: alerta amarelo "Fora do horário autorizado — confirmar mesmo assim?"

LGPD: tooltip informativo nos campos de documento explicando a finalidade da coleta
```

---

## MÓDULO 03 — Encomendas

**Tamanho estimado do prompt:** médio | **Dependências:** Módulo 00

```
[COLE O CONTEXTO FIXO ACIMA]

MÓDULO 03 — ENCOMENDAS

Crie encomendas.js com 2 abas: [Pendentes] [Histórico]

NOVA ENCOMENDA (botão flutuante "+"):
Campos: Unidade (busca/autocomplete)* | Tipo (Caixa/Envelope/Sacola/Outros)* | 
Transportadora (Correios/Mercado Livre/Amazon/iFood/Rappi/Outros)* | 
Nº de volumes* | Código de rastreamento | Observações
Ao salvar: status = 'aguardando', timestamp automático, operador = currentUser

ABA PENDENTES:
Lista de encomendas com status 'aguardando'
Card por encomenda: Unidade | Tipo | Transportadora | Recebida há X horas/dias | Nº volumes
Alerta visual (borda laranja) para encomendas aguardando há mais de 5 dias
Botão [Registrar Retirada] → modal: "Quem retirou?" (nome livre) → confirma → status = 'retirada'
Botão [Recusar/Devolver] → modal: motivo obrigatório → status = 'recusada' ou 'devolvida'

ABA HISTÓRICO:
Lista completa com filtros: status | transportadora | data | unidade
Badge colorido por status: verde=retirada, azul=aguardando, vermelho=recusada, cinza=devolvida

ALERTA NO DASHBOARD:
encomendas.js deve exportar função getAlertaEncomendas() que retorna encomendas 
com mais de 5 dias pendentes para exibir no Dashboard
```

---

## MÓDULO 04 — Veículos

**Tamanho estimado do prompt:** médio | **Dependências:** Módulo 00

```
[COLE O CONTEXTO FIXO ACIMA]

MÓDULO 04 — VEÍCULOS

Crie veiculos.js com 3 abas: [Pátio Agora] [Cadastrados] [Histórico]

ABA PÁTIO AGORA:
Tabela: Placa | Modelo | Cor | Unidade/Morador | Entrou às | Permanência | Tipo | [Registrar Saída]
Ordenado por tempo de permanência (mais antigo no topo)
Alerta vermelho para veículos com mais de 12h sem saída registrada
Botão "Registrar Saída" → confirma → adiciona timestamp de saída

ENTRADA DE VEÍCULO (botão "+ Registrar Entrada"):
1. Campo de placa com validação (AAA-0000 ou AAA0A00 Mercosul)
2. Se placa encontrada em appData.veiculos: exibe morador e unidade automaticamente → confirma entrada
3. Se placa NÃO encontrada: formulário de visita temporária:
   Placa* | Modelo | Cor | Morador/Visitante que autorizou | Unidade visitada*

ABA CADASTRADOS:
Lista de veículos vinculados a unidades
Card: Placa | Modelo | Cor | Unidade | Morador proprietário
Botão "+ Novo Veículo" → formulário: Unidade* | Morador* | Tipo* | Placa* | Modelo | Cor | Vaga

ABA HISTÓRICO:
Entradas e saídas com filtros de data e unidade
Exportar CSV (gerar blob e download)
```

---

## MÓDULO 05 — Moradores (Integrar Telas Existentes)

**Tamanho estimado do prompt:** médio | **Dependências:** Módulo 00
**ATENÇÃO:** Este módulo já tem telas desenvolvidas. O objetivo é integrá-las ao shell do app.

```
[COLE O CONTEXTO FIXO ACIMA]

MÓDULO 05 — MORADORES (integração de telas existentes)

As telas de Listagem, Ficha e Formulário de Cadastro já existem.
Crie moradores.js para integrá-las ao sistema com as seguintes adições:

1. LISTAGEM: conectar busca ao appData.moradores[]
   Adicionar filtros: Tipo (Proprietário/Inquilino/Dependente) | Status (Ativo/Inativo)
   Exibir chip de status no card (verde=Ativo, cinza=Inativo)

2. FICHA DO MORADOR: carregar dados de appData.moradores[id]
   - CPF mascarado para role=porteiro: mostrar "756.976.XXX-XX"
   - Adicionar botão "Registrar Ocorrência" → abre modal pré-preenchido com a unidade
   - Adicionar botão "Ver Histórico de Acessos" → filtra appData.acessos por moradorId/unidadeId

3. FORMULÁRIO DE CADASTRO: adicionar os campos que faltam:
   - Campo: Foto do morador (input file com preview) + checkbox LGPD de consentimento
   - Campo: Data de entrada na unidade (obrigatório)
   - Campo: Data prevista de saída (opcional, para inquilinos)
   - Campo: checkbox "Este celular tem WhatsApp" ao lado do campo Celular
   - Campo: Status (toggle Ativo/Inativo)
   - Campo: Observações internas (textarea — visível apenas para zelador e admin)
   - Entrega de boletos "Outro endereço": exibir campos CEP + Rua + Nº + Complemento + Bairro + Cidade
   - Dependentes: adicionar campo Data de Nascimento

4. PERMISSÃO: botão "+ Novo Morador" visível apenas para role=admin
   Ficha completa com CPF/email visível apenas para role=zelador e role=admin
```

---

## MÓDULO 06 — Unidades

**Tamanho estimado do prompt:** médio | **Dependências:** Módulo 05

```
[COLE O CONTEXTO FIXO ACIMA]

MÓDULO 06 — UNIDADES

Crie unidades.js com listagem + detalhe.

LISTAGEM DE UNIDADES:
Filtros: Bloco | Status (Ocupada/Vaga/Em Obras) | Tipo (Residencial/Comercial)
Card por unidade: Bloco + Nº | Status badge | Moradores ativos (nomes) | Veículos | Encomendas pendentes
Botão "+ Nova Unidade" (apenas admin)

FORMULÁRIO DE UNIDADE:
Bloco* | Número/Ap* | Tipo (Residencial/Comercial/Misto)* | Andar | Status* | Observações
(apenas admin pode criar/editar)

DETALHE DA UNIDADE (modal ou página):
Header: Bloco + Nº + Tipo + Status
Seções:
├── Moradores Ativos (com foto e tipo)
├── Histórico de Moradores Anteriores (nome + período)
├── Veículos Cadastrados
├── Encomendas Pendentes
├── Pré-Autorizações Ativas
└── Observações da administração (apenas zelador/admin)

Botão "Editar Unidade" (apenas admin)
Botão "Desativar Unidade" (apenas admin) → modal: "Ao desativar, todos os acessos serão encerrados. Confirmar?"
```

---

## MÓDULO 07 — Ocorrências (Livro Digital)

**Tamanho estimado do prompt:** médio | **Dependências:** Módulo 00

```
[COLE O CONTEXTO FIXO ACIMA]

MÓDULO 07 — OCORRÊNCIAS (Livro Digital da Portaria)

Crie ocorrencias.js com listagem + formulário + passagem de plantão.

LISTAGEM:
Filtros: Tipo | Prioridade | Status | Data
Badge de prioridade: vermelho=Urgente, amarelo=Normal, cinza=Baixa
Badge de status: azul=Aberta, laranja=Em Andamento, verde=Resolvida, cinza=Arquivada
Ordenação padrão: mais recente primeiro, urgentes sempre no topo

NOVA OCORRÊNCIA (botão "+ Registrar"):
Tipo*: Manutenção | Segurança/Incidente | Reclamação | Informativo de Turno | Passagem de Plantão
Título* (máx 80 chars)
Descrição* (textarea)
Unidade relacionada (opcional)
Prioridade*: Baixa | Normal | Urgente
Campos automáticos: data/hora, operador logado

DETALHE DA OCORRÊNCIA:
Histórico de atualizações (quem alterou o status e quando)
Campo de atualização de status (apenas zelador/admin para resolver/arquivar)
Campo de comentário ao atualizar status

PASSAGEM DE PLANTÃO (modal ao fazer logout):
Disparado automaticamente quando porteiro clica "Sair do Sistema"
Campos pré-preenchidos automaticamente:
- Visitantes ainda dentro (lista de appData.acessos com saida=null)
- Encomendas pendentes (lista de appData.encomendas aguardando)
- Ocorrências abertas (lista de appData.ocorrencias com status='aberta')
Campo livre: "Observações para o próximo turno"
Botões: [Salvar e Sair] [Sair sem registrar] (este último com aviso de risco)
Ao salvar: cria ocorrência do tipo 'Passagem de Plantão' automaticamente

DASHBOARD: exportar função getOcorrenciasUrgentes() para exibir alerta no Dashboard
```

---

## MÓDULO 08 — Mudanças

**Tamanho estimado do prompt:** pequeno | **Dependências:** Módulo 00

```
[COLE O CONTEXTO FIXO ACIMA]

MÓDULO 08 — MUDANÇAS

Crie mudancas.js com listagem e formulário.

LISTAGEM:
Filtros: Status | Data | Unidade
Card: Unidade | Tipo (Entrada/Saída) | Data agendada | Empresa | Status badge
Status: Agendada | Em andamento | Concluída | Cancelada

NOVA MUDANÇA (botão "+ Agendar"):
Tipo*: Entrada de Mudança | Saída de Mudança
Unidade* (busca)
Data e hora agendada*
Empresa transportadora
Placa do veículo
Número de funcionários da equipe
Itens declarados (textarea)
Responsável pelo acompanhamento (nome + telefone)
Checklist de áreas a usar: [x] Elevador de serviço [ ] Corredor [ ] Hall

VALIDAÇÕES:
- Não permitir agendamento com menos de 24h de antecedência (configurável)
- Alertar se já existe mudança no mesmo bloco/elevador no mesmo período

CONTROLE DO DIA:
Botão "Iniciar Mudança" → status = Em andamento + timestamp início
Botão "Concluir Mudança" → status = Concluída + timestamp fim + checklist de saída (condição das áreas)
```

---

## MÓDULO 09 — Reservas / Áreas Comuns

**Tamanho estimado do prompt:** médio | **Dependências:** Módulo 00

```
[COLE O CONTEXTO FIXO ACIMA]

MÓDULO 09 — RESERVAS / ÁREAS COMUNS

Crie reservas.js com 2 abas: [Calendário/Lista] [Espaços Cadastrados]

ABA RESERVAS:
Visão de lista (com toggle para calendário simples — grid de dias)
Filtros: espaço | data | status
Card de reserva: Espaço | Unidade | Data/Hora | Nº convidados | Status | Ações
Status: Solicitada | Confirmada | Em Uso | Concluída | Cancelada
Botões (apenas zelador/admin): [Confirmar] [Recusar] com campo de motivo para recusa

NOVA RESERVA (botão "+ Solicitar"):
Espaço* (select dos espaços cadastrados)
Unidade solicitante* (busca)
Data* + Horário início* + Horário fim*
Número estimado de convidados
Observações
VALIDAÇÃO: verificar conflito de horário para o mesmo espaço antes de salvar

ABA ESPAÇOS (apenas zelador/admin):
CRUD de espaços: Nome | Descrição | Capacidade | Horários disponíveis | Regras de uso
```

---

## MÓDULO 10 — Colaboradores

**Tamanho estimado do prompt:** pequeno | **Dependências:** Módulo 00

```
[COLE O CONTEXTO FIXO ACIMA]

MÓDULO 10 — COLABORADORES DO CONDOMÍNIO

ATENÇÃO — DISTINÇÃO CRÍTICA:
Este módulo é APENAS para funcionários do condomínio (porteiros, zeladores, faxineiras do cond., jardineiros).
Empregadas domésticas e prestadores das unidades são cadastrados no Módulo 02 (Acessos) como Prestadores Recorrentes.

Crie colaboradores.js com listagem e formulário.

LISTAGEM:
Card: Foto | Nome | Função | Turno | Status badge (Ativo/Inativo/Afastado)
Filtros: Função | Turno | Status

CADASTRO (botão "+ Novo Colaborador", apenas zelador/admin):
Nome completo*
Função*: Porteiro | Zelador | Limpeza | Segurança | Jardineiro | Manutenção | Outros
Empresa (se terceirizado)
CPF* (mascarado na listagem)
Foto (upload com consentimento LGPD)
Dias e horários de trabalho (checkboxes de dias + campos de hora início/fim)
Turno: A | B | C | Diurno | Noturno
Data de início*
Data de término (opcional — para contratos temporários)
Status: Ativo | Inativo | Afastado

DETALHE DO COLABORADOR:
Dados cadastrais
Histórico de entradas/saídas registradas pelo sistema
```

---

## MÓDULO 11 — Relatórios

**Tamanho estimado do prompt:** médio | **Dependências:** Todos os módulos anteriores

```
[COLE O CONTEXTO FIXO ACIMA]

MÓDULO 11 — RELATÓRIOS

Crie relatorios.js com 4 relatórios principais (acesso apenas zelador e admin).

RELATÓRIO 1 — Fluxo de Acessos:
Filtros: período (data início/fim) | tipo de acesso | unidade
Tabela: Nome | Tipo | Unidade | Entrada | Saída | Liberado por | Operador
Total de entradas no período
Exportar: PDF (usando window.print() com CSS @media print) e CSV (blob download)

RELATÓRIO 2 — Encomendas:
Filtros: período | status | transportadora
Tabela: Unidade | Transportadora | Tipo | Recebida em | Retirada em | Prazo (dias)
KPIs: total recebidas | total pendentes | média de dias para retirada
Exportar: PDF e CSV

RELATÓRIO 3 — Ocorrências:
Filtros: período | tipo | prioridade | status
Tabela: Data | Tipo | Título | Prioridade | Status | Operador
Exportar: PDF e CSV

RELATÓRIO 4 — Passagens de Plantão:
Lista cronológica de todas as passagens registradas
Cada entrada expandível para ver observações completas
Filtro: período | operador

EXPORTAÇÃO PDF:
Usar CSS @media print com cabeçalho "Portaria Digital — [nome do relatório] — gerado em [data]"
Botão "Imprimir/Salvar PDF" → window.print()

EXPORTAÇÃO CSV:
Gerar string CSV dos dados filtrados → criar Blob → link de download automático
```

---

## Ordem de Execução Recomendada

```
Sessão 1:  Módulo 00 — Base (login + shell + design system)
Sessão 2:  Módulo 05 — Moradores (integrar telas já prontas)
Sessão 3:  Módulo 06 — Unidades
Sessão 4:  Módulo 02 — Acessos/Visitantes (mais complexo)
Sessão 5:  Módulo 01 — Dashboard (depende de dados de Acessos)
Sessão 6:  Módulo 03 — Encomendas
Sessão 7:  Módulo 04 — Veículos
Sessão 8:  Módulo 07 — Ocorrências + Passagem de Plantão
Sessão 9:  Módulo 08 — Mudanças
Sessão 10: Módulo 09 — Reservas
Sessão 11: Módulo 10 — Colaboradores
Sessão 12: Módulo 11 — Relatórios
```

## Dicas para Trabalhar com IAs Limitadas

1. **Uma sessão = um módulo** — nunca misture dois módulos numa mesma conversa
2. **Sempre cole o CONTEXTO FIXO primeiro** — garante que a IA entende o projeto completo
3. **Ao terminar um módulo, peça:** "Mostre o código final completo do arquivo X" antes de fechar a conversa
4. **Se a IA errar a estrutura:** cole o código errado + diga "Corrija apenas [problema específico], mantendo o restante"
5. **Teste cada módulo isolado** antes de integrar ao próximo
6. **Para integração:** quando dois módulos precisarem conversar, mostre o código de ambos na mesma sessão e diga "Integre estes dois arquivos"

