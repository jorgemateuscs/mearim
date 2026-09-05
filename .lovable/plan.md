# Conta do Cliente (Fiado / Crediário)

Novo módulo de conta corrente por cliente, convivendo com o Contas a Receber tradicional (que continua igual, com parcelamento em pagar e receber).

## Estado atual (verificado)

- Contas a Receber grava uma linha por parcela em `contas_receber`, com agrupamento (`parcelamento_id`, `parcela_num`, `parcela_total`) gerado pelo `ParcelamentoBuilder`. Nada disso será removido.
- Cada cliente já tem cadastro em `clientes` (nome, contato) e o financeiro já usa bancos, categorias e meios de pagamento cadastrados.
- O sistema é de uma única empresa compartilhada por todos os usuários: o isolamento é feito pelo login (somente usuários autenticados acessam), como nas demais telas. Não existe divisão por empresa no sistema hoje, então a conta do cliente segue o mesmo padrão.

## Como vai funcionar

Novo item de menu **Comercial → Contas de clientes**.

**Painel de clientes:** lista com Cliente | Telefone | Total comprado | Total pago | Saldo devedor | Último pagamento | Status (Quitado, Em aberto, Crédito disponível, Em atraso). Filtros: Todos, Em aberto, Quitados, Com crédito, Em atraso, além da busca por nome. Cartões no topo com o total a receber de fiado e o total de créditos.

**Página do cliente:** nome, saldo devedor atual, total comprado, total pago, créditos disponíveis, e os botões:

- **+ Nova venda fiado** — data, itens (produto/serviço, quantidade, valor unitário), desconto, valor total, vencimento opcional, observação. Se o cliente tiver crédito, o sistema pergunta se usa o crédito disponível e abate na hora.
- **+ Registrar pagamento** — tela curta: saldo atual, valor recebido, data, forma de pagamento, banco de entrada e observação. Ao confirmar mostra saldo anterior → pagamento → novo saldo. Se o valor recebido passar do saldo, pergunta se o excedente vira crédito do cliente.
- **+ Registrar haver** — crédito entregue antes da compra, com data, valor, forma de pagamento, banco e observação.
- **Extrato da conta** — Data | Descrição | Débito | Crédito | Saldo, em ordem cronológica, com Imprimir e Gerar PDF (mesmo padrão dos outros relatórios).

**Regras:** o saldo nunca é digitado, é sempre somado a partir dos lançamentos. Lançamentos não são apagados nem sobrescritos: correções são feitas por um lançamento de **Ajuste** que fica visível no extrato. Todo lançamento guarda quem registrou, data e hora, e entra na Auditoria.

**Financeiro:** a venda fiado fica apenas na conta do cliente; cada pagamento recebido (e cada haver) gera a entrada no banco escolhido, aparecendo na Conciliação e no Dashboard como recebimento.

## Detalhes técnicos

Migração (aditiva, nada removido):

- `contas_clientes`: `id`, `cliente_id`, `user_id`, `saldo_devedor`, `saldo_credito`, `status`, `created_at/by`, `updated_at/by` — cache do saldo, sempre recalculado a partir dos lançamentos.
- `contas_clientes_lancamentos`: `id`, `conta_cliente_id`, `cliente_id`, `user_id`, `tipo` (`venda`, `pagamento`, `credito`, `uso_credito`, `ajuste`), `descricao`, `valor_debito`, `valor_credito`, `saldo_apos`, `meio_pagamento_id`, `forma_pagamento`, `banco_id`, `venda_id`, `data_vencimento`, `data_lancamento`, `observacao`, `created_by`, `created_at`, `updated_at`.
- `contas_clientes_itens`: itens da venda fiado (`lancamento_id`, `produto_id`, `servico_id`, `descricao`, `quantidade`, `valor_unitario`, `desconto`, `valor_total`).
- GRANT + RLS `TO authenticated` no padrão compartilhado do projeto; triggers `set_audit_fields` e `audit_trigger` nas três tabelas; sem `deleted_at` nos lançamentos (não se apaga movimento financeiro).
- Função no banco para inserir lançamento, calcular `saldo_apos` e atualizar `contas_clientes` de forma consistente; a conta do cliente é criada na primeira movimentação.
- O recebimento no banco é gravado em `contas_receber` com `origem_tipo`/`origem_id` apontando para o lançamento, status `recebido`, para reaproveitar Conciliação, extrato bancário e Dashboard sem alterá-los.

Código:

- Novo `src/routes/_authenticated/contas-clientes.tsx` (painel + página do cliente por `?cliente=<id>`), `src/components/conta-cliente-dialogs.tsx` (venda, pagamento, haver, ajuste) e `src/lib/conta-cliente.ts` (cálculo de saldos, status e PDF do extrato).
- `src/components/app-sidebar.tsx`: novo item em Comercial.
- `src/routes/_authenticated/financeiro.tsx` e `parcelamento.tsx`: sem alteração de comportamento; contas a receber tradicional segue funcionando.
- Realtime: as novas tabelas entram no `useRealtimeSync` para atualizar em todas as telas abertas.
