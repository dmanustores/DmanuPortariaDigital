# Correção — Visualização da Página Unidades

## Problema Atual

A página exibe apenas uma lista vazia sem identidade visual.
Não há distinção de status, cores ou informações úteis por unidade.

---

## Nova Visualização

### 1. Toggle de Visualização

Adicionar no topo direito (junto aos filtros existentes):
`[⊞ Grade]` `[☰ Lista]` — padrão: **Grade**

---

### 2. Modo Grade (padrão)

Grid responsivo de cards por unidade:
- 4 colunas no desktop
- 3 colunas no tablet
- 2 colunas no mobile

**Cada card exibe:**
- Número do apartamento em destaque (fonte grande, centralizado)
- Bloco abaixo do número (fonte menor, texto mudo)
- Indicador visual de status (descrição abaixo)
- Badge de status com texto e cor correspondente
- Nome do morador principal (se status = Ocupado)
- Ícones de resumo na base do card:
  - 👤 número de moradores
  - 🚗 número de veículos
  - 📦 encomendas pendentes

**Interações:**
- Hover: elevar card com box-shadow + cursor pointer
- Clique: abrir modal de detalhe da unidade

---

### 3. Cores e Status

| Status | Cor da borda esquerda | Efeito visual adicional |
|--------|----------------------|------------------------|
| Ocupado | Verde `#6daa45` | Ponto verde pulsante animado (ver item 5) |
| Vago | Cinza `#393836` | Borda tracejada no card inteiro |
| Em Obras | Laranja `#fdab43` | Ícone 🔧 no canto superior direito do card |
| Inativo | Vermelho `#dd6974` | Opacidade 0.5 no card inteiro |

---

### 4. Modo Lista

Tabela compacta com as colunas:
`Unidade` | `Bloco` | `Status` (badge colorido) | `Moradores` | `Veículos` | `Encomendas` | `Ações`

Manter o comportamento atual de filtros neste modo.

---

### 5. Barra de Resumo (chips de filtro rápido)

Adicionar abaixo dos filtros existentes, chips clicáveis:

```
[● X Ocupadas]  [○ X Vagas]  [▲ X Em Obras]  [✕ X Inativas]
```

- Cada chip exibe a contagem real de unidades naquele status
- Clicar em um chip aplica o filtro automaticamente
- Clicar novamente remove o filtro

---

### 6. Animação do Ponto Pulsante (apenas status Ocupado)

Implementar com CSS keyframes:

```css
@keyframes pulse {
  0%   { transform: scale(1);   opacity: 1;   }
  50%  { transform: scale(1.4); opacity: 0.4; }
  100% { transform: scale(1);   opacity: 1;   }
}

.status-dot-ocupado {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #6daa45;
  animation: pulse 2s infinite;
  display: inline-block;
}
```

---

### 7. Estado Vazio

Quando o filtro não retornar resultados:
- Ícone de prédio centralizado
- Texto: "Nenhuma unidade encontrada para este filtro"
- Botão: "Limpar filtros"

Manter o estado vazio atual para quando não há unidades cadastradas no sistema.

---

## O Que NÃO Alterar

- Filtros existentes: Bloco, Status, Tipo
- Campo de busca por texto
- Contador "X / 440 unidades" no topo direito
- Modal de detalhe da unidade
- Lógica de dados (appData.unidades[])
