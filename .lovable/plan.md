# Modernização do sistema (sem perder nada do que já existe)

Revisei todas as telas atuais (Dashboard, Vendas, Financeiro, Clientes, Profissionais, Serviços, Estoque, Inventário, Conciliação) e comparei com ERPs modernos. Nenhum dado atual é alterado ou apagado: todas as propostas são adições em cima das tabelas que já existem.

## O que encontrei hoje

- Tabelas já criadas no banco que **não têm tela nenhuma**: Categorias, Fornecedores, Meios de pagamento, Equipamentos e Peças. Elas existem, mas não há como cadastrar ou consultar pelo sistema.
- As listagens (Clientes, Serviços, Estoque etc.) não têm ordenação por coluna, paginação, exportação nem filtros — apenas uma busca em um único campo.
- Não existe menu de Relatórios nem de Configurações; o menu é uma lista única de 9 itens sem agrupamento.
- Não há indicador de atrasado / vencimento próximo no Financeiro, nem totalizadores nas listas.
- Não há tema claro/escuro alternável nem busca global por atalho.

## Proposta em 4 etapas

### Etapa 1 — Fechar as lacunas (maior ganho, risco zero)
- Criar as telas que faltam para tabelas que já existem: **Categorias** (por tipo), **Fornecedores**, **Meios de pagamento**, **Equipamentos** e **Peças** (com status de pagamento).
- Reorganizar o menu em grupos: Dashboard · Comercial · Financeiro · Pessoas · Patrimônio · Relatórios · Configurações.

### Etapa 2 — Tabelas de nível ERP
Melhorias no componente de listagem, aplicadas a todas as páginas de uma vez:
- Ordenar clicando no cabeçalho da coluna.
- Paginação (25/50/100) e contagem de registros.
- Busca em todos os campos, não só um.
- Rodapé com totais automáticos nas colunas de valor.
- Exportar a lista visível em **CSV** e **PDF**.
- Seletor de colunas visíveis.

### Etapa 3 — Inteligência financeira
- Semáforo de vencimento: badge Atrasado / Vence hoje / A vencer em contas a pagar e receber.
- Cartões de alerta no Dashboard: atrasados, vencendo em 7 dias, saldo projetado.
- **Fluxo de caixa projetado** (previsto x realizado por mês).
- DRE simplificado (receitas – despesas por categoria).
- Central de Relatórios com filtro de período e exportação PDF, reaproveitando o PDF que já existe na Conciliação.

### Etapa 4 — Experiência de uso
- Busca global (Ctrl+K) para achar cliente, conta ou venda de qualquer tela.
- Alternar tema claro/escuro mantendo a identidade atual.
- Responsividade: listas viram cartões no celular.
- Trilha de auditoria consultável (quem alterou o quê e quando), usando os campos de auditoria já gravados.
- Duplicar registro e ações em lote (baixar várias contas de uma vez).

## Notas técnicas

- Sem migração destrutiva: apenas novas telas sobre tabelas existentes; qualquer campo novo entra como coluna opcional com valor padrão.
- As melhorias de tabela ficam concentradas em `src/components/crud-page.tsx`, então todas as páginas herdam automaticamente.
- Relatórios e fluxo de caixa leem as tabelas atuais (`contas_pagar`, `contas_receber`, `transferencias`, `vendas_*`), sem duplicar dados.
- Realtime e invalidação global de cache continuam como estão.

## Sugestão de ordem

Começar pela Etapa 1 (telas que faltam + menu agrupado), depois a Etapa 2. Etapas 3 e 4 em seguida, conforme prioridade.