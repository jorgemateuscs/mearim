# Usar as Categorias e Meios de pagamento cadastrados em todo o sistema

## O que está acontecendo

Confirmei nos arquivos: nas telas de **Financeiro** (contas a pagar/receber) e **Vendas**, os campos "Categoria" e "Forma de pagamento" são campos de **texto livre digitado**, não listas ligadas aos cadastros. As colunas corretas (`categoria_id`, `meio_pagamento_id`) existem no banco mas não são preenchidas por essas telas. No **Inventário**, a categoria usa uma lista fixa escrita no código, também sem ligação com o cadastro.

Ou seja: o que você cadastra em Categorias e Meios de pagamento nunca é oferecido nas outras telas.

## O que será feito

### Financeiro (contas a pagar e a receber)
- Trocar o campo de texto "Categoria" por uma lista suspensa das categorias cadastradas, filtrada pelo tipo certo: **despesa** em contas a pagar, **receita** em contas a receber.
- Trocar "Forma de pagamento" por lista dos **Meios de pagamento** cadastrados (só os ativos).
- Passar a gravar `categoria_id` e `meio_pagamento_id`, mantendo o texto antigo salvo para não perder histórico.
- Na lista e na tela de detalhes, mostrar o nome da categoria/meio de pagamento vindo do cadastro (com fallback para o texto antigo em registros anteriores).

### Vendas (produtos e serviços)
- "Forma de pagamento" passa a ser lista dos meios de pagamento cadastrados.

### Inventário
- Categoria passa a usar as categorias cadastradas do tipo **estoque/patrimônio**, em vez da lista fixa do código. Os filtros da tela acompanham as categorias reais.

### Dashboard
- O gráfico de gastos por categoria passa a agrupar pela categoria cadastrada, exibindo o nome oficial.

Nenhum registro atual é apagado ou alterado: os textos já digitados continuam visíveis; a partir de agora as novas seleções vêm dos cadastros.

## Notas técnicas

- Reaproveita `src/components/entity-select.tsx` (já usado em Equipamentos e Peças) para os selects, com filtro por `tipo` em `categorias` e `ativo` em `meios_pagamento`.
- Arquivos afetados: `src/routes/_authenticated/financeiro.tsx`, `vendas.tsx`, `inventario.tsx`, `painel.tsx`.
- Sem migração de banco: `categoria_id` e `meio_pagamento_id` já existem em `contas_pagar` e `contas_receber`. Para `vendas_*` e `inventario`, que só têm campo texto, a seleção grava o **nome** da opção escolhida — mantendo compatibilidade com os dados atuais.
- Leituras das listas via query com `qc.invalidateQueries()` global já existente, então cadastrar uma categoria nova a faz aparecer imediatamente nas outras telas.
