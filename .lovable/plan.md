
## Objetivo
Ver o saldo de cada banco separadamente na tela **Conciliação Bancária**, com saldo inicial, entradas, saídas e saldo atual próprios — além do consolidado.

## Mudanças no banco
Hoje `contas_pagar` e `contas_receber` não têm vínculo com banco, então não é possível saber em qual conta o dinheiro entrou/saiu. Migration para adicionar:
- `contas_pagar.banco_id` (uuid, FK → bancos, nullable)
- `contas_receber.banco_id` (uuid, FK → bancos, nullable)

Contas antigas ficam sem banco (não entram no cálculo por banco, mas continuam no consolidado).

## Mudanças na UI (`src/routes/_authenticated/conciliacao.tsx`)

1. **Seletor de banco** no topo da página: "Todos os bancos" + um item por banco cadastrado.

2. **Cards de resumo** passam a refletir o banco selecionado:
   - Saldo inicial (do banco, ou soma se "Todos")
   - Entradas recebidas (contas_receber `recebido` com `banco_id` = filtro) + transferências recebidas
   - Saídas pagas (contas_pagar `pago` com `banco_id` = filtro) + transferências enviadas
   - Saldo atual = inicial + entradas − saídas

3. **Nova aba "Saldos por banco"**: tabela com uma linha por banco mostrando as 4 colunas (inicial, entradas, saídas, atual) — visão comparativa rápida.

4. **Aba Transferências**: adiciona filtro pelo banco selecionado (mostra transferências onde ele é origem ou destino).

5. Formulários de **contas a pagar/receber** (em `financeiro.tsx`) ganham campo opcional "Banco" para que futuras movimentações sejam atribuíveis. *(Somente o select; nenhuma outra lógica muda.)*

## Fora do escopo
- Não altero o comportamento de vendas/estoque.
- Contas antigas sem `banco_id` não são migradas automaticamente (usuário pode editar se quiser).
