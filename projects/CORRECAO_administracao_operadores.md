# Correção — Módulo Administração (Novo Operador)

## Problema Identificado

O login do sistema é feito por e-mail + senha, mas o formulário de cadastro
de operadores não tem campo de e-mail nem de senha. Isso significa que os
operadores criados aqui nunca conseguirão fazer login no sistema, pois não
há credencial vinculada a eles.

## Estrutura Atual (errada)

- Nome
- Função (Administrador, Porteiro...)
- Turno

## Correção Necessária

Adicionar os seguintes campos ao formulário "Novo Operador":

**1. E-mail*** (obrigatório)
- Validação de formato de e-mail
- Verificar se já existe em appData.operadores[] antes de salvar
- Exibir erro inline: "Este e-mail já está cadastrado"

**2. Senha*** (obrigatório no cadastro)
- Mínimo 6 caracteres
- Campo com ícone de mostrar/ocultar senha

**3. Confirmar Senha*** (obrigatório)
- Validar que é igual ao campo Senha
- Erro inline se divergir: "As senhas não coincidem"

## Estrutura Final do Formulário

- Nome*
- E-mail* (será usado para login)
- Senha*
- Confirmar Senha*
- Função*: Administrador | Porteiro | Zelador
- Turno: Turno A (06:00-14:00) | Turno B (14:00-22:00) | Turno C (22:00-06:00) | Sem turno fixo

## Objeto a Salvar em appData.operadores[]

```js
{
  id,
  nome,
  email,
  senha,
  role,       // 'admin' | 'porteiro' | 'zelador'
  turno,
  ativo: true,
  criadoEm: new Date()
}
```

## Impacto na Tela de Login (index.html)

A tela de login deve validar as credenciais contra appData.operadores[]
além das credenciais fixas de teste já existentes.

Lógica de autenticação:
1. Verificar primeiro nas credenciais fixas de teste:
   - admin@admin.com / admin123
   - porteiro@teste.com / 123456
   - zelador@teste.com / 123456
2. Se não encontrar: buscar em appData.operadores[] por e-mail + senha
3. Se encontrado: logar com nome, role e turno do operador cadastrado
4. Se não encontrado: exibir erro "E-mail ou senha incorretos"

## O Que NÃO Alterar

Manter intactos:
- KPIs do topo (Total, Porteiros, Admins, Turno A, B, C)
- Listagem de operadores com colunas Nome, Função, Turno, Horário, Ações
- Busca de operadores
- Todos os outros comportamentos do módulo
