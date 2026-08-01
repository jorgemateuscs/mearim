# Sistema compartilhado, tempo real e e-mail na auditoria

## 1. Uma única base de dados para todos

Hoje cada registro pertence ao usuário que o criou (`user_id`) e as regras de acesso só liberam as próprias linhas — dois usuários veem dados diferentes. Vou transformar em base única da empresa:

- Regras de acesso: qualquer usuário autenticado passa a ver, criar, editar e excluir os registros de todas as tabelas (bancos, categorias, meios de pagamento, clientes, fornecedores, profissionais, serviços, produtos, vendas, contas a pagar/receber, transferências, inventário, equipamentos, peças).
- `user_id` continua sendo gravado apenas como "quem cadastrou" (histórico), deixa de filtrar as consultas.
- Nenhum dado existente é apagado: os registros já cadastrados passam a ser visíveis para todos.

Observação: com isso todos os usuários logados têm acesso total. Se depois quiser restringir por função (admin/financeiro/leitura), a tabela de papéis já existe e podemos usar as permissões em Configurações.

## 2. Atualização em tempo real

- Ativar realtime no banco para todas as tabelas do sistema.
- Um listener central assina as mudanças e invalida os dados em cache, então qualquer cadastro/alteração feita por uma pessoa aparece automaticamente nas telas abertas das outras (Painel, Financeiro, Conciliação, Vendas, Patrimônio, Configurações) sem recarregar a página.
- Um único canal global (montado no layout autenticado) para evitar múltiplas assinaturas e consumo desnecessário.

## 3. E-mail de quem criou/alterou

- Guardar o e-mail do usuário em `profiles` (preenchido no cadastro/login, inclusive Google, e para os usuários já existentes).
- O bloco "Registro" nos modais de detalhe/edição passa a mostrar:
  - Criado em dd/mm/aaaa hh:mm por email@dominio.com
  - Última alteração dd/mm/aaaa hh:mm por email@dominio.com
- A coluna "Última alteração" das listagens ganha o e-mail junto da data.
- Funciona em todos os módulos: cadastros genéricos, Financeiro, Vendas, Inventário, Equipamentos, Peças, Bancos, Transferências e Configurações.

## Detalhes técnicos

- Migração: substituir as políticas `auth.uid() = user_id` por políticas `TO authenticated` com `using (true)`; manter GRANTs; adicionar coluna `email` em `profiles` + atualizar `handle_new_user()`; `ALTER PUBLICATION supabase_realtime ADD TABLE ...` para cada tabela.
- Front: remover dependência de `user_id` nos filtros de leitura; hook `useRealtimeSync()` com `supabase.channel(...).on('postgres_changes', ...)` → `queryClient.invalidateQueries()`, com cleanup no unmount.
- Auditoria: hook compartilhado que carrega o mapa `id → email` de `profiles` e é consumido por `AuditInfo` e pelas tabelas de listagem.
