# Portaria Digital — Documento de BUILD Completo
> Versão final para desenvolvimento por IA. Cole o CONTEXTO FIXO + o prompt do módulo desejado em cada sessão.

---

## CONTEXTO FIXO — Cole SEMPRE no início de cada sessão

```
PROJETO: Portaria Digital — sistema web de gestão de portaria para condomínios.
URL atual: https://dmanu-portaria-digital.vercel.app

INTERFACE:
- Dark mode padrão (toggle light/dark disponível)
- Sidebar fixa à esquerda com ícones + labels
- Topbar com busca global, notificações e perfil do operador
- Mobile-first obrigatório (375px mínimo)

PALETA DE CORES:
- Fundo:      #171614
- Superfície: #1c1b19
- Superfície2:#201f1d
- Texto:      #cdccca
- Texto mudo: #797876
- Primário:   #4f98a3
- Borda:      #393836
- Sucesso:    #6daa45
- Erro:       #dd6974
- Alerta:     #fdab43

FONTE: Satoshi via Fontshare (https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap)
ÍCONES: Lucide Icons via CDN (https://unpkg.com/lucide@latest)
STACK: HTML + CSS + JavaScript vanilla. Sem frameworks. Dados em memória (arrays/objetos JS).

PERFIS DE USUÁRIO (window.currentUser):
  { role: 'porteiro', nome: 'Operador', turno: 'A' }
  { role: 'zelador',  nome: 'Zelador' }
  { role: 'admin',    nome: 'Administrador' }

DADOS GLOBAIS (window.appData):
  appData.config       → { nomeCondominio, endereco, configurado: false }
  appData.unidades[]   → { id, bloco, numero, andar, tipo, status, observacao }
  appData.moradores[]  → { id, nome, unidadeId, tipo, celular, whatsapp, email, cpf, rg, foto,
                           localTrabalho, endComercial, dependentes[], veiculos[],
                           prestadoresDiarios[], contatoEmergencia, entregaBoleto,
                           dataEntrada, dataSaida, status, observacoesInternas }
  appData.acessos[]    → { id, tipo, nome, documento, unidadeId, entrada, saida,
                           liberadoPor, operador, veiculo }
  appData.preAutorizacoes[] → { id, nome, unidadeId, tipoAcesso, recorrencia,
                                diasSemana, horarioInicio, horarioFim,
                                dataInicio, dataFim, ativo }
  appData.encomendas[] → { id, unidadeId, tipo, transportadora, volumes,
                           status, recebidoEm, retiradoPor, retiradoEm, motivo }
  appData.veiculos[]   → { id, placa, modelo, cor, tipo, moradorId, unidadeId, vaga }
  appData.ocorrencias[]→ { id, tipo, titulo, descricao, prioridade, status,
                           unidadeId, criadoEm, operador, atualizacoes[] }
  appData.mudancas[]   → { id, tipo, unidadeId, dataAgendada, empresa, placa,
                           equipe, itens, responsavel, status, checklistEntrada, checklistSaida }
  appData.reservas[]   → { id, espacoId, unidadeId, dataHoraInicio, dataHoraFim,
                           convidados, status, observacao }
  appData.espacos[]    → { id, nome, descricao, capacidade, horariosDisponiveis, regras }
  appData.colaboradores[] → { id, nome, funcao, empresa, cpf, foto, turno,
                              diasHorarios, dataInicio, dataFim, status }
  appData.avisos[]     → { id, titulo, descricao, data, prioridade, autor }
  appData.logs[]       → { acao, usuario, timestamp, dados }

REGRAS UNIVERSAIS (aplicar em TODO módulo):
1. Toda ação grava em appData.logs[]: { acao, usuario: currentUser.nome, timestamp: new Date(), dados }
2. CPF mascarado para role=porteiro: "756.976.XXX-XX" (mostrar só 7 primeiros + asteriscos)
3. Modal de confirmação antes de qualquer exclusão, arquivamento ou desligamento
4. Feedback inline imediato após cada ação (sucesso em verde, erro em vermelho)
5. Skeleton loader em toda carga ou renderização de lista
6. Estado vazio com ícone + mensagem + botão de ação quando lista estiver vazia
7. Paginação de 20 itens por padrão em todas as listagens
8. Busca com debounce de 300ms em todos os campos de pesquisa
9. Sessão expira após 4h de inatividade — aviso modal 2min antes
10. Modo offline: entradas, consultas de fichas e placas funcionam sem internet (cache local)
```

---

## MÓDULO 00 — Base: Login + Shell + Design System
**Desenvolver: PRIMEIRO — tudo depende deste**

```
[COLE O CONTEXTO FIXO]

MÓDULO 00 — BASE DO SISTEMA
Crie 2 arquivos: index.html (login) e app.html (shell do app)

━━━ 1. LOGIN (index.html) ━━━
- Tela centralizada, dark mode, logo SVG inline "Portaria Digital" (ícone de prédio)
- Campos: Email + Senha com ícone de mostrar/ocultar senha
- Botão "Entrar" (cor primária #4f98a3)
- Bloqueio após 5 tentativas falhas (contador em memória, cooldown 15min)
- Credenciais de teste:
    admin@admin.com     / admin123  → role: admin
    porteiro@teste.com  / 123456    → role: porteiro
    zelador@teste.com   / 123456    → role: zelador
- Ao logar: salvar window.currentUser → verificar appData.config.configurado
    Se false → abrir Wizard de configuração (ver Módulo 06)
    Se true  → redirecionar para #dashboard no app.html

━━━ 2. SHELL DO APP (app.html) ━━━
Sidebar (240px, fixa, colapsável para 60px em telas < 1024px):
  Itens de menu com ícone Lucide + label:
  - Dashboard        (LayoutDashboard)
  - Acessos          (Users)
  - Encomendas       (Package)
  - Veículos         (Car)
  - Moradores        (Home)    — oculto para porteiro
  - Unidades         (Building2) — oculto para porteiro
  - Ocorrências      (AlertTriangle)
  - Mudanças         (Truck)
  - Reservas         (CalendarCheck)
  - Colaboradores    (Briefcase) — oculto para porteiro
  - Relatórios       (BarChart2) — oculto para porteiro
  ─────────────────────────────
  Avatar + nome + cargo do operador (base da sidebar)
  Botão "Sair do Sistema" (vermelho, ícone LogOut)
    → Ao clicar: verificar se há passagem de plantão pendente
    → Se role=porteiro: abrir modal de Passagem de Plantão antes de deslogar
    → Se role != porteiro: deslogar direto

Topbar (altura 56px, fixa):
  - Campo de busca global (placeholder "Buscar morador, placa, unidade...")
  - Ícone de notificações com badge de contagem
  - Toggle dark/light (ícone Sol/Lua)
  - Data e hora atual (atualiza a cada minuto)

Área de conteúdo (main): troca via hash routing
  #dashboard → renderDashboard()
  #acessos   → renderAcessos()
  #encomendas → renderEncomendas()
  ... e assim por diante para cada módulo

━━━ 3. appData INICIAL ━━━
Incluir dados fictícios para teste:
- config: { nomeCondominio: '', endereco: '', configurado: false }
- 2 blocos (A e B), 3 andares, 4 aptos por andar = 24 unidades (geradas pelo Wizard)
- 5 moradores de exemplo
- 3 encomendas pendentes
- 2 acessos ativos (pessoas dentro agora)
- 2 avisos no quadro

━━━ 4. style.css ━━━
Tokens CSS completos com todas as variáveis de cor, espaçamento (base 4px),
tipografia (clamp()), border-radius, sombras, transições.
Componentes base: .btn-primary, .btn-secondary, .btn-ghost, .btn-danger,
.card, .badge, .modal-overlay, .modal, .skeleton, .empty-state,
.form-group, .form-label, .form-input, .form-select, .form-textarea,
.table, .pagination, .tabs, .chip-status
```

---

## MÓDULO 01 — Dashboard
**Desenvolver após: Módulo 00**

```
[COLE O CONTEXTO FIXO]

MÓDULO 01 — DASHBOARD
Crie a função renderDashboard() que monta o conteúdo do #dashboard.

LAYOUT (grid 2 colunas no desktop, 1 coluna no mobile):

COLUNA ESQUERDA (2/3 da largura):

1. CARD AUTORIZAÇÃO RÁPIDA (destaque com borda primária):
   - Input: Nome do visitante
   - Select: Liberado por (lista de unidades + nome do morador responsável)
   - Botão [Registrar Entrada] → adiciona em appData.acessos com entrada=now(), saida=null
   - Após registrar: limpar campos + toast de sucesso + atualizar KPIs

2. KPIs DO TURNO (4 cards em linha, responsivo 2x2 no mobile):
   - Entradas hoje (filtra acessos de hoje)
   - Encomendas pendentes (status='aguardando')
   - No pátio agora (veículos com saida=null)
   - Ocorrências abertas (status='aberta')
   Números animam ao carregar (contagem de 0 até o valor)

3. PESSOAS NA ÁREA AGORA (tabela compacta):
   Colunas: Nome | Tipo | Unidade | Entrou às | [Registrar Saída]
   Filtra appData.acessos onde saida === null
   Botão Saída → modal confirmação → registra hora de saída

4. RESERVAS DO DIA (lista):
   Filtra appData.reservas onde data = hoje e status = 'confirmada'
   Card: nome do espaço + unidade + horário
   "Nenhuma reserva hoje" se vazio

COLUNA DIREITA (1/3 da largura):

5. QUADRO DE AVISOS:
   Lista de appData.avisos, ordenada por data desc
   Badge de prioridade (urgente=vermelho, normal=azul, info=cinza)
   Link "Ver todos" → navega para #avisos
   Máximo 3 avisos visíveis, resto colapsado

6. LEMBRETES DA PORTARIA:
   Lista de checkboxes persistida em memória por sessão
   Checkbox marcado → riscado visualmente
   Botão "+ Adicionar Lembrete" → input inline
   Botão de remover lembrete (ícone X)

7. FLUXO DO DIA (card azul de destaque):
   Entradas hoje + Encomendas pendentes em destaque
   Subtexto com horário de atualização
```

---

## MÓDULO 02 — Acessos / Visitantes
**Desenvolver após: Módulos 00 e 01 | Mais complexo do sistema**

```
[COLE O CONTEXTO FIXO]

MÓDULO 02 — ACESSOS / VISITANTES
Crie renderAcessos() com 3 abas: [Registrar Entrada] [Ativos Agora] [Histórico]
E um botão flutuante "Gerenciar Autorizações" (ícone Shield)

━━━ ABA 1 — REGISTRAR ENTRADA ━━━
Pills de tipo no topo (seleção obrigatória antes de preencher):
  [Visitante] [Prestador Recorrente] [Entregador] [Prestador Avulso] [Colaborador]

Formulário muda conforme o tipo selecionado:

VISITANTE EVENTUAL:
  Nome completo* | Documento (RG ou CPF)* | Unidade destino* | 
  Liberado por (morador da unidade)* | Placa do veículo (opcional)
  
PRESTADOR RECORRENTE:
  Campo de busca por nome → autocomplete em appData.preAutorizacoes[]
  Se encontrado: exibe card com foto, nome, unidade, dias autorizados
  Se fora do horário/dia: alerta amarelo "Fora do horário autorizado — confirmar?"
  Se não encontrado: mensagem "Não cadastrado — use Prestador Avulso"
  
ENTREGADOR:
  Empresa* (Correios/Mercado Livre/Amazon/iFood/Rappi/Outros) |
  Nº de volumes* | Observação (opcional)
  Não precisa de unidade — vai apenas ao hall
  
PRESTADOR AVULSO:
  Nome* | Empresa | Tipo de serviço* | Documento* | Unidade destino* |
  Liberado por (morador)*
  
COLABORADOR:
  Busca por nome em appData.colaboradores[]
  Exibe: função + turno + status
  Confirmar entrada do turno

Botão [Registrar Entrada] → salva em appData.acessos + log + atualiza Dashboard

━━━ ABA 2 — ATIVOS AGORA ━━━
Tabela de acessos onde saida === null
Colunas: Nome | Tipo badge | Unidade | Entrou às | Permanência (tempo ao vivo) | Ações
Ações: [Registrar Saída] → modal confirmação → saida = now()
Alerta visual para pessoas dentro há mais de 8h
Ordenado por tempo de permanência (mais antigo no topo)

━━━ ABA 3 — HISTÓRICO ━━━
Lista paginada (20 por página) de todos os acessos
Filtros: tipo | data início/fim | unidade | busca por nome
Colunas: Nome | Tipo | Unidade | Entrada | Saída | Duração | Liberado por | Operador

━━━ MODAL GERENCIAR AUTORIZAÇÕES ━━━
Lista de appData.preAutorizacoes[] com filtros: tipo | unidade | ativo/inativo
Botão "+ Nova Autorização":
  Nome da pessoa* | Tipo (Prestador/Familiar/Outro)*
  Unidade que autoriza* | Documento
  Recorrência*:
    Pontual → data específica + horário início/fim
    Semanal → checkboxes dias da semana + horário início/fim  
    Por período → data início + data fim + horário
    Permanente → sem vencimento
  Toggle Ativo/Inativo
Botão Editar e Desativar em cada autorização
```

---

## MÓDULO 03 — Encomendas
**Desenvolver após: Módulo 00**

```
[COLE O CONTEXTO FIXO]

MÓDULO 03 — ENCOMENDAS
Crie renderEncomendas() com 2 abas: [Pendentes] [Histórico]
Botão flutuante "+ Nova Encomenda"

━━━ MODAL NOVA ENCOMENDA ━━━
Unidade destinatária* (busca com autocomplete — exibe morador responsável)
Tipo*: Caixa | Envelope | Sacola | Documento | Outros
Transportadora*: Correios | Mercado Livre | Amazon | Shopee | iFood | Rappi | Outros
Número de volumes* (mínimo 1)
Código de rastreamento (opcional)
Observações (máx 200 chars)
Campos automáticos: status='aguardando', recebidoEm=now(), operador=currentUser.nome

━━━ ABA PENDENTES ━━━
Cards de encomendas com status='aguardando'
Card contém: badge da transportadora (cor específica por marca) | unidade + morador |
             tipo | volumes | "Recebida há X horas" | operador que recebeu
Alerta visual (borda laranja + ícone ⚠️) para encomendas aguardando > 5 dias
Ações no card:
  [Registrar Retirada] → modal: campo "Nome de quem retirou"* → status='retirada'
  [Recusar / Devolver] → modal: motivo obrigatório → status='recusada' ou 'devolvida'

━━━ ABA HISTÓRICO ━━━
Lista completa com filtros: status | transportadora | data | unidade
Badge colorido por status:
  aguardando = azul | retirada = verde | recusada = vermelho | devolvida = cinza
Busca por unidade ou transportadora

━━━ ALERTA PARA DASHBOARD ━━━
Exportar: window.getAlertaEncomendas = () => 
  retorna array de encomendas com status='aguardando' há mais de 5 dias
  (usado pelo Dashboard para exibir badge de alerta)
```

---

## MÓDULO 04 — Veículos
**Desenvolver após: Módulo 00**

```
[COLE O CONTEXTO FIXO]

MÓDULO 04 — VEÍCULOS
Crie renderVeiculos() com 3 abas: [Pátio Agora] [Cadastrados] [Histórico]

━━━ ABA PÁTIO AGORA ━━━
Tabela de veículos com saida === null (atualmente dentro)
Colunas: Placa | Modelo | Cor | Tipo badge | Unidade/Morador | Entrou às | Permanência | [Saída]
Ordenado: mais antigo no topo
Alerta vermelho para veículos com permanência > 12h
Botão [Registrar Saída] → modal confirmação → saida = now()

Botão "+ Registrar Entrada de Veículo":
  1. Campo de placa* com validação (AAA-0000 ou AAA0A00 Mercosul)
  2. Se placa em appData.veiculos[]:
     → Exibe card: morador + unidade + modelo + cor
     → Confirmar entrada com 1 clique
  3. Se placa NÃO cadastrada (visitante):
     → Formulário: Placa* | Modelo | Cor | Unidade visitada* | Nome do visitante*
     → Tipo automático: 'visitante'

━━━ ABA CADASTRADOS ━━━
Lista de appData.veiculos[] agrupada por unidade
Filtros: bloco | tipo (Carro/Moto/Bicicleta/Caminhonete)
Card: placa em destaque | modelo | cor | ícone do tipo | unidade | morador
Botão "+ Novo Veículo" (apenas zelador/admin):
  Unidade* | Morador* | Tipo* | Placa* (validada) | Modelo | Cor | Vaga
Botão Editar e Remover (apenas zelador/admin) com confirmação

━━━ ABA HISTÓRICO ━━━
Todas as movimentações de entrada e saída
Filtros: data | unidade | tipo
Exportar CSV: gerar blob → download automático
```

---

## MÓDULO 05 — Moradores
**Desenvolver após: Módulo 06 (Unidades devem existir antes)**

```
[COLE O CONTEXTO FIXO]

MÓDULO 05 — MORADORES
Crie renderMoradores() com listagem, ficha e formulário.
As telas de Listagem, Ficha e Formulário já existem — integrar ao appData e adicionar campos.

━━━ LISTAGEM ━━━
Busca em tempo real por: nome | bloco | apartamento
Filtros adicionais: Tipo (Proprietário/Inquilino/Dependente) | Status (Ativo/Inativo)
Card por morador (existente — adicionar):
  - Chip de status: verde=Ativo, cinza=Inativo
  - Foto do morador (avatar com inicial se sem foto)
Botão "+ Novo Morador" (apenas admin, abre formulário)

━━━ FICHA DO MORADOR ━━━
(tela existente — manter layout, adicionar:)
- CPF mascarado para role=porteiro: "756.976.XXX-XX"
- RG mascarado para role=porteiro: "15.404.XXX-X"  
- Email visível apenas para zelador/admin
- Local de trabalho / endereço comercial visível apenas para zelador/admin
- Observações internas visíveis apenas para zelador/admin
- Botão "Registrar Ocorrência" → abre modal de nova ocorrência com unidade pré-preenchida
- Botão "Ver Histórico de Acessos" → filtra appData.acessos por unidadeId do morador

━━━ FORMULÁRIO DE CADASTRO ━━━
(tela existente — manter estrutura, adicionar campos:)

SEÇÃO IDENTIFICAÇÃO DA UNIDADE (existente):
  Bloco* | Apartamento* | Tipo (Proprietário/Inquilino/Dependente)*

SEÇÃO DADOS DO MORADOR (existente — adicionar):
  + Foto (input file com preview circular) 
  + [checkbox] "Autorizo uso da foto para identificação na portaria" (LGPD — obrigatório se foto)
  + Data de entrada na unidade* 
  + Data prevista de saída (apenas para Inquilino)

SEÇÃO CONTATOS E DOCUMENTOS (existente — adicionar):
  + [checkbox] "Este número tem WhatsApp" ao lado do campo Celular

SEÇÃO DEPENDENTES (existente — adicionar campo):
  + Data de nascimento em cada dependente

SEÇÃO ENTREGA DE BOLETOS (existente — adicionar):
  Quando "Outro endereço" selecionado → exibir:
  CEP* | Rua | Número | Complemento | Bairro | Cidade

NOVA SEÇÃO — CONFIGURAÇÕES DE ACESSO:
  Toggle: Status [Ativo ●] / [Inativo]
  Observações internas (textarea — visível e editável apenas por zelador/admin)

━━━ VALIDAÇÕES OBRIGATÓRIAS ━━━
- CPF: validar dígitos verificadores (algoritmo real de CPF)
- Celular: máscara (99) 99999-9999
- CEP: máscara 99999-999 + busca automática de endereço via ViaCEP API
```

---

## MÓDULO 06 — Unidades + Wizard de Configuração
**Desenvolver após: Módulo 00 | Executado ANTES de cadastrar moradores**

```
[COLE O CONTEXTO FIXO]

MÓDULO 06 — UNIDADES + WIZARD DE PRIMEIRO ACESSO

━━━ WIZARD DE PRIMEIRO ACESSO ━━━
Disparado automaticamente quando appData.config.configurado === false
Modal fullscreen (não pode ser fechado/pulado)
Barra de progresso no topo: Passo 1 de 3

PASSO 1 — Dados do Condomínio:
  Nome do condomínio*
  Endereço completo (rua, número, bairro, cidade)
  Botão [Próximo →]

PASSO 2 — Gerar Unidades:
  Número de blocos* (1 a 10, input numérico)
  Nome de cada bloco (inputs dinâmicos: A, B, C... ou Torre Norte, Sul...)
  Número de andares por bloco*
  Número de apartamentos por andar*
  Número inicial do apartamento* 
    ex: "01" → gera 101, 102, 201, 202...
    ex: "001" → gera 1001, 1002...
  Tipo padrão*: ( ) Residencial  ( ) Comercial  ( ) Misto

  PREVIEW AO VIVO (atualiza enquanto digita):
  ┌────────────────────────────────────────┐
  │  Bloco A: Ap 101 até 304 → 12 unidades │
  │  Bloco B: Ap 101 até 304 → 12 unidades │
  │  Total: 24 unidades serão criadas      │
  └────────────────────────────────────────┘

  Botões: [← Voltar] [Gerar e Continuar →]
  Ao clicar Gerar: criar todos os objetos em appData.unidades[]

PASSO 3 — Revisar e Ajustar:
  "✅ X unidades criadas com sucesso!"
  Lista editável de todas as unidades geradas
  Cada linha: Bloco | Nº | Tipo | Status | [Editar]
  Botão "+ Adicionar Unidade Avulsa" (para coberturas, lojas, depósitos)
  Botão [Começar a usar o sistema →]
    → appData.config.configurado = true
    → Fechar wizard → abrir Dashboard

━━━ MÓDULO DE UNIDADES (menu Unidades) ━━━
Acessível apenas para zelador e admin.

LISTAGEM:
  Filtros: Bloco | Status (Ocupada/Vaga/Em Obras/Inativa) | Tipo
  Card: Bloco+Nº | Status badge | Moradores ativos | Veículos | Encomendas pendentes
  Busca por número ou bloco

DETALHE DA UNIDADE (modal):
  Header: Bloco + Nº + Tipo + Status
  ├── Moradores Ativos (nome + tipo + foto)
  ├── Histórico de Moradores Anteriores (nome + período)
  ├── Veículos Cadastrados
  ├── Encomendas Pendentes
  ├── Pré-Autorizações Ativas
  └── Observações (zelador/admin)
  Botões: [Editar Unidade] [Desativar] (apenas admin, com confirmação)

FORMULÁRIO DE EDIÇÃO:
  Bloco | Número | Tipo | Andar | Status | Observações
  (apenas admin pode editar)
```

---

## MÓDULO 07 — Ocorrências + Passagem de Plantão
**Desenvolver após: Módulo 00**

```
[COLE O CONTEXTO FIXO]

MÓDULO 07 — OCORRÊNCIAS + PASSAGEM DE PLANTÃO
Crie renderOcorrencias() com listagem, formulário e modal de passagem de plantão.

━━━ LISTAGEM DE OCORRÊNCIAS ━━━
Filtros: Tipo | Prioridade | Status | Data | Unidade
Ordenação: urgentes no topo, depois mais recentes
Badge prioridade: vermelho=Urgente, amarelo=Normal, cinza=Baixa
Badge status: azul=Aberta, laranja=Em Andamento, verde=Resolvida, cinza=Arquivada
Card: título | tipo | unidade (se houver) | operador | data/hora | prioridade + status
Clique no card → expande com descrição completa e histórico de atualizações

Botão "+ Registrar Ocorrência"

━━━ MODAL NOVA OCORRÊNCIA ━━━
Tipo*: Manutenção | Segurança/Incidente | Reclamação | Informativo de Turno
Título* (máx 80 chars, contador de caracteres visível)
Descrição* (textarea, sem limite)
Unidade relacionada (opcional, busca)
Prioridade*: Baixa | Normal | Urgente
Automático: data/hora atual + operador logado + status='aberta'

━━━ ATUALIZAÇÃO DE STATUS ━━━
(apenas zelador e admin podem resolver/arquivar)
Botão [Atualizar Status] no detalhe da ocorrência:
  Novo status* | Comentário (obrigatório para Resolvida/Arquivada)
  Cada atualização salva em ocorrencia.atualizacoes[]:
  { status, comentario, usuario, timestamp }

━━━ PASSAGEM DE PLANTÃO ━━━
Modal disparado ao clicar "Sair do Sistema" quando role=porteiro
Título: "Passagem de Plantão — Turno [A/B/C]"

Seções pré-preenchidas automaticamente (somente leitura):
  Visitantes ainda dentro:
    Lista de appData.acessos onde saida === null
    "Nenhum visitante dentro" se vazio

  Encomendas pendentes:
    Lista de appData.encomendas onde status='aguardando'
    "Nenhuma encomenda pendente" se vazio

  Ocorrências abertas:
    Lista de appData.ocorrencias onde status='aberta' ou 'em_andamento'
    "Nenhuma ocorrência aberta" se vazio

Campo livre: "Observações para o próximo turno" (textarea)

Botões:
  [💾 Salvar Passagem e Sair] → cria ocorrência tipo='Passagem de Plantão' + desloga
  [Sair sem registrar] → alerta "Passagem não registrada. O próximo turno não será informado. Confirmar saída?" → desloga

Na próxima vez que um porteiro fizer login:
  Verificar se há passagem de plantão do turno anterior
  Se sim: exibir card destacado no topo do Dashboard: "Passagem do turno anterior" + conteúdo

━━━ INTEGRAÇÃO COM DASHBOARD ━━━
window.getOcorrenciasUrgentes = () => 
  retorna ocorrencias com prioridade='urgente' e status='aberta'
```

---

## MÓDULO 08 — Mudanças
**Desenvolver após: Módulo 00**

```
[COLE O CONTEXTO FIXO]

MÓDULO 08 — MUDANÇAS
Crie renderMudancas() com listagem e formulário.

LISTAGEM:
  Filtros: Status | Data | Unidade | Tipo
  Card: Unidade | Tipo badge (Entrada/Saída) | Data agendada | Empresa | Status
  Status: Agendada | Em andamento | Concluída | Cancelada

MODAL NOVA MUDANÇA (botão "+ Agendar Mudança"):
  Tipo*: Entrada de Mudança | Saída de Mudança
  Unidade* (busca com autocomplete)
  Data e hora agendada* 
  Empresa transportadora | CNPJ (opcional)
  Placa do veículo | Número de funcionários
  Itens declarados (textarea: "sofá, guarda-roupa, 10 caixas...")
  Responsável pelo acompanhamento: nome + telefone
  Áreas que serão utilizadas (checkboxes):
    [x] Elevador de serviço  [ ] Corredor B  [ ] Hall de entrada  [ ] Estacionamento

VALIDAÇÕES:
  - Não permitir agendamento com menos de 24h de antecedência
  - Alertar se já existe mudança no mesmo bloco na mesma data/horário:
    "⚠️ Já existe uma mudança agendada no Bloco A em 14/05 às 14h. Confirmar mesmo assim?"

CONTROLE DO DIA (botões no card da mudança):
  [▶ Iniciar Mudança] → status='em_andamento' + timestamp início
  [✅ Concluir Mudança] → modal checklist de saída:
    "Confirme as condições das áreas utilizadas após a mudança:"
    [x] Elevador sem avarias  [x] Corredor limpo  [x] Nenhum dano registrado
    Campo: Observações finais
    → status='concluida' + timestamp fim
  [✕ Cancelar] → modal: motivo + confirmação
```

---

## MÓDULO 09 — Reservas / Áreas Comuns
**Desenvolver após: Módulo 00**

```
[COLE O CONTEXTO FIXO]

MÓDULO 09 — RESERVAS / ÁREAS COMUNS
Crie renderReservas() com 2 abas: [Reservas] [Espaços]

━━━ ABA RESERVAS ━━━
Visão de lista (toggle para grade de calendário semanal)
Filtros: espaço | data | status
Card de reserva: espaço | unidade + morador | data/hora início-fim | convidados | status badge
Ações (zelador/admin): [✓ Confirmar] [✗ Recusar] com campo de motivo obrigatório para recusa

Botão "+ Solicitar Reserva":
  Espaço* (select dos appData.espacos[])
  Unidade solicitante* (busca)
  Data* | Horário início* | Horário fim*
  Número estimado de convidados
  Observações
  VALIDAÇÃO: checar conflito antes de salvar:
    "⚠️ O Salão de Festas já está reservado em 20/05 das 14h às 20h. Escolha outro horário."

━━━ ABA ESPAÇOS (apenas zelador/admin) ━━━
CRUD de espaços (appData.espacos[]):
  Nome* | Descrição | Capacidade máxima | 
  Horários disponíveis (início e fim por dia da semana) |
  Regras de uso (textarea — exibidas para morador ao solicitar reserva)
Dados iniciais fictícios: Salão de Festas, Churrasqueira, Academia, Piscina
```

---

## MÓDULO 10 — Colaboradores
**Desenvolver após: Módulo 00**

```
[COLE O CONTEXTO FIXO]

MÓDULO 10 — COLABORADORES DO CONDOMÍNIO
ATENÇÃO: Este módulo é APENAS para funcionários do condomínio
(porteiros, zeladores, faxineiras do cond., segurança, jardineiro).
Empregadas domésticas e diaristas das unidades → cadastrar no Módulo 02 como Prestador Recorrente.

Crie renderColaboradores() com listagem e formulário. Acesso: apenas zelador e admin.

LISTAGEM:
  Filtros: Função | Turno | Status
  Card: foto (avatar com inicial se sem foto) | nome | função badge | turno | status badge
  Status: Ativo=verde | Inativo=cinza | Afastado=amarelo

MODAL CADASTRO (botão "+ Novo Colaborador"):
  Nome completo* | CPF* (validado + mascarado na listagem)
  Função*: Porteiro | Zelador | Limpeza | Segurança | Jardineiro | Manutenção | Outros
  Empresa (se terceirizado — campo condicional)
  Foto (upload com checkbox consentimento LGPD)
  Turno*: A | B | C | Diurno | Noturno
  Dias e horários (checkboxes Seg-Dom + hora início/fim por dia)
  Data de início*
  Data de término (opcional — para contratos temporários)
  Status*: Ativo | Inativo | Afastado

DETALHE DO COLABORADOR:
  Dados cadastrais completos
  Histórico de entradas/saídas (filtrado de appData.acessos onde nome = colaborador)
```

---

## MÓDULO 11 — Relatórios
**Desenvolver por último — depende de todos os módulos**

```
[COLE O CONTEXTO FIXO]

MÓDULO 11 — RELATÓRIOS
Crie renderRelatorios() com 4 relatórios. Acesso: apenas zelador e admin.
Porteiro acessa apenas "Relatório do Turno Atual".

RELATÓRIO 1 — FLUXO DE ACESSOS:
  Filtros: período (data início/fim) | tipo de acesso | unidade
  Tabela: Nome | Tipo | Unidade | Entrada | Saída | Duração | Liberado por | Operador
  KPI no topo: total de entradas no período
  Exportar: [PDF] [CSV]

RELATÓRIO 2 — ENCOMENDAS:
  Filtros: período | status | transportadora | unidade
  Tabela: Unidade | Morador | Transportadora | Tipo | Volumes | Recebida em | Retirada em | Prazo
  KPIs: total recebidas | total pendentes | média de dias para retirada
  Exportar: [PDF] [CSV]

RELATÓRIO 3 — OCORRÊNCIAS:
  Filtros: período | tipo | prioridade | status
  Tabela: Data | Tipo | Título | Prioridade | Status | Unidade | Operador
  Exportar: [PDF] [CSV]

RELATÓRIO 4 — PASSAGENS DE PLANTÃO:
  Lista cronológica de todas as passagens registradas
  Cada entrada expansível para ver o conteúdo completo
  Filtro: período | operador

━━━ EXPORTAÇÃO PDF ━━━
Usar CSS @media print:
  Cabeçalho: "Portaria Digital | [Nome do Condomínio] | [Nome do Relatório] | Gerado em [data]"
  Remover sidebar, topbar e botões na impressão
  Tabela com bordas visíveis no papel
Botão "🖨️ Imprimir / Salvar PDF" → window.print()

━━━ EXPORTAÇÃO CSV ━━━
Função gerarCSV(dados, nomeArquivo):
  Converter array de objetos → string CSV com headers
  Criar Blob com type 'text/csv'
  Criar link temporário → click() → download automático
  Nome do arquivo: "portaria-[tipo]-[data].csv"
```

---

## Ordem de Execução

```
Sessão 1  → Módulo 00  (Base: login + shell + CSS)
Sessão 2  → Módulo 06  (Wizard + Unidades — deve vir antes dos moradores)
Sessão 3  → Módulo 05  (Moradores — integrar telas existentes)
Sessão 4  → Módulo 02  (Acessos — mais complexo)
Sessão 5  → Módulo 01  (Dashboard — depende de acessos e encomendas)
Sessão 6  → Módulo 03  (Encomendas)
Sessão 7  → Módulo 04  (Veículos)
Sessão 8  → Módulo 07  (Ocorrências + Passagem de Plantão)
Sessão 9  → Módulo 08  (Mudanças)
Sessão 10 → Módulo 09  (Reservas)
Sessão 11 → Módulo 10  (Colaboradores)
Sessão 12 → Módulo 11  (Relatórios — por último)
```

## Dicas de Uso com IA Limitada

1. Uma sessão = um módulo. Nunca misture dois módulos na mesma conversa
2. Cole sempre o CONTEXTO FIXO antes do prompt do módulo
3. Ao terminar: peça "Mostre o código final completo do arquivo" antes de fechar
4. Se a IA errar: cole o trecho errado + "Corrija apenas X, mantendo o resto intacto"
5. Para integrar dois módulos: abra nova sessão, cole os dois arquivos e diga "Integre sem quebrar nenhum"
6. Módulo 06 (Wizard) deve rodar antes do Módulo 05 (Moradores) — essa ordem é obrigatória
