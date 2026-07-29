## 1. Painel — incluir Contas a Pagar e Contas a Receber

Hoje o painel mostra faturamento (vendas de produtos + serviços) e despesas pagas. Vou ampliar para trazer o financeiro completo dentro do período selecionado:

- **Novos cartões (KPIs)**, todos respeitando o período:
  - A receber (pendente) — total e quantidade
  - Recebido no período
  - A pagar (pendente) — total e quantidade
  - Pago no período
  - Vencidos (a pagar e a receber), destacados
- **Faturamento ampliado**: o cartão de Faturamento passa a somar vendas de produtos, vendas de serviços e recebimentos de contas a receber, com o detalhamento das três origens embaixo (evitando dupla contagem quando a conta a receber tem origem numa venda).
- **Novo gráfico "Contas a receber x Contas a pagar por mês"** (previsto vs realizado).
- **Listas rápidas**: próximas contas a pagar e a receber a vencer, clicáveis, abrindo o registro exato em Financeiro (mesmo deep link já usado na Conciliação).

## 2. Bloqueio de tela por inatividade (PIN)

- Após 2 minutos sem mouse, teclado, toque ou scroll, a aplicação exibe uma tela de bloqueio em tela cheia (blur sobre o conteúdo, relógio, nome/e-mail do usuário, campo de PIN e botão "Sair").
- O PIN também é exigido **logo após o login**, inclusive no login com Google, antes de liberar qualquer tela protegida.
- O desbloqueio é validado no servidor: o PIN (01235) fica guardado como segredo do backend, nunca no código do navegador. A comparação é feita de forma segura e o estado "desbloqueado" fica numa sessão assinada, com limite de tentativas para evitar força bruta.
- O bloqueio cobre todas as telas internas (fica no layout autenticado), portanto vale para todos os menus automaticamente.

Observação: como é um PIN único do sistema (não por usuário), ele funciona como trava de estação de trabalho, não como autenticação individual — o login continua sendo o Google/e-mail.

## 3. Auditoria de data e hora em todo o sistema

O banco já grava `created_at` e `updated_at` automaticamente em todas as tabelas (gatilhos verificados). O que falta é registrar **quem** fez e **mostrar** isso nas telas:

- Migração: adicionar `created_by` e `updated_by` onde ainda não existem (clientes, bancos, produtos, servicos, profissionais, vendas_produtos, vendas_servicos, transferencias, inventario, contas_pagar/receber já têm `updated_by`), preenchendo automaticamente com o usuário logado via gatilho.
- Padronizar todos os formulários (CRUD genérico, Financeiro, Vendas, Inventário, Patrimônio, Configurações) para gravar esses campos.
- Exibir em todos os modais de detalhe um bloco **"Registro"**: Criado em dd/mm/aaaa hh:mm por Fulano · Última alteração dd/mm/aaaa hh:mm por Fulano.
- Adicionar coluna opcional "Última alteração" nas tabelas de listagem, e formatador de data+hora compartilhado em `src/lib/format.ts`.

## Detalhes técnicos

- Painel: uma única query agregada por período, reaproveitando as mesmas consultas usadas em Financeiro para não divergir números.
- Bloqueio: `SITE_PIN` + `SESSION_SECRET` como segredos do backend; server function `unlockScreen`/`lockScreen` com comparação em tempo constante e sessão criptografada; componente `ScreenLockProvider` montado em `src/routes/_authenticated/route.tsx` com listeners de atividade e `visibilitychange`.
- Auditoria: gatilho `set_audit_fields()` usando `auth.uid()` para `created_by`/`updated_by`, mais join leve em `profiles` para exibir o nome.
