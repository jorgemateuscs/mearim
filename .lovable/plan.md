# Gráficos de contas a receber x pagar no Dashboard

Hoje o Dashboard já tem um gráfico de barras "Contas a receber x contas a pagar (por vencimento)" e KPIs de A receber / A pagar / Vencidos. Falta a visão de **situação** das contas: o que está atrasado, o que vence hoje, o que vence em breve e o que já foi liquidado.

## O que será adicionado

### 1. Gráfico de situação (rosca dupla)
Dois gráficos de pizza/rosca lado a lado — um para Contas a receber, outro para Contas a pagar — quebrando o valor do período em:
- Atrasado (vencimento anterior a hoje e não liquidado)
- Vence hoje
- A vencer (futuro)
- Liquidado (recebido / pago)

Cada fatia mostra valor em R$ e a legenda traz a quantidade de contas. Clicar numa fatia leva para Financeiro na aba correspondente.

### 2. Gráfico de aging (atrasos por faixa)
Barras horizontais comparando receber x pagar por faixa de atraso: 1–7 dias, 8–15, 16–30, 31–60, 60+ dias. Mostra rapidamente onde está concentrado o atraso.

### 3. Evolução previsto x realizado
Ao lado do gráfico mensal existente, uma linha acumulada por mês: Recebido acumulado x Pago acumulado x Saldo do período — para ver a tendência do fluxo dentro do período filtrado.

Todos os gráficos respeitam o filtro de período (data inicial/final e os botões rápidos) que já existe no topo do Dashboard.

## Notas técnicas

- Alterações concentradas em `src/routes/_authenticated/painel.tsx`; sem mudança de banco e sem novas consultas — os dados de `contas_pagar` e `contas_receber` já são carregados pela query `painel`.
- Novos componentes de gráfico usando `recharts` (`PieChart`, `BarChart` horizontal, `LineChart`), com as cores semânticas dos tokens (`--color-chart-*`, destructive, warning, success).
- Classificação de situação feita em `useMemo` sobre as listas já existentes, reaproveitando a lógica de status atual (`status !== 'pago' / 'recebido'`).
- Navegação por clique reutiliza `navigate({ to: "/financeiro", search: { tab, id } })` já usado no card de próximos vencimentos.
