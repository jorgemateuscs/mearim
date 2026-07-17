# Sistema Gestão — Plano de Construção

Sistema completo de gestão comercial (baseado nas telas da planilha "Gestão Excel"), redesenhado do zero com visual moderno e banco de dados persistente.

## Módulos (8 telas)

1. **Painel** — dashboard com KPIs, gráficos mensais, ranking, resumo de clientes e contas a pagar
2. **Cadastro de Vendas** — Vendas de Produtos + Vendas de Serviços
3. **Controle Financeiro** — Contas a Pagar + Contas a Receber (com filtros ano/mês/status)
4. **Cadastro de Clientes** — dados, aniversário, prospecção, próximo contato
5. **Profissionais** — funcionários, comissão, salário, dias de trabalho
6. **Serviços** — catálogo de serviços com valor, custo, comissão
7. **Controle de Estoque** — produtos, quantidade, custo, valor de venda
8. **Conciliação Bancária** — bancos/caixas, transferências, saldo

## Design

- Layout novo com **sidebar lateral** de navegação (troca as abas horizontais da planilha)
- Paleta escura moderna (deep navy + accent teal/electric), tipografia contemporânea
- Cards, tabelas modernas com filtros, dialogs para cadastro (troca os "botões vermelhos")
- Português como idioma principal, formatação BRL/datas pt-BR

## Backend (Lovable Cloud)

- **Autenticação:** email/senha + Google
- **Tabelas principais:**
  - `profiles`, `user_roles` (padrão seguro)
  - `clientes`, `profissionais`, `servicos`, `produtos`
  - `vendas_produtos`, `vendas_produtos_itens`, `vendas_servicos`
  - `contas_pagar`, `contas_receber`
  - `bancos`, `transferencias`
- Todos com RLS por `user_id` (cada usuário vê só seus dados)

## Cálculos automáticos (regra de negócio)

- **Venda de produto** → dá baixa no estoque + gera conta a receber
- **Venda de serviço** → gera conta a receber + comissão para profissional
- **Painel** → agrega faturamento, despesas, saldo, rankings, aniversariantes, contas vencendo

## Ordem de construção

**Fase 1 (esta entrega):** Cloud + auth + design system + Sidebar/Layout + Painel + Cadastros base (Clientes, Profissionais, Serviços, Produtos)

**Fase 2:** Vendas + Controle Financeiro (com integração automática)

**Fase 3:** Conciliação Bancária + refinos de gráficos e relatórios

Vou entregar a Fase 1 em cheio nesta rodada; depois seguimos com Fase 2 e 3.

---

**Confirma que posso começar por aí?** Se quiser mudar a ordem, ou priorizar algum módulo específico primeiro, me avise.