## 1. "Registro" com o e-mail de quem fez a alteração

Hoje o bloco Registro mostra só data/hora. Os campos `created_by`/`updated_by` já são gravados por gatilho em todas as tabelas, mas guardam o UUID do usuário — e a tabela `profiles` está vazia (o gatilho de criação de perfil nunca foi ligado), então não há de onde tirar o nome.

O que farei:

- Criar uma server function autenticada que recebe uma lista de IDs de usuário e devolve o e-mail correspondente (consulta feita no servidor, com privilégio administrativo; nada de dados sensíveis vai para o navegador além do e-mail).
- Criar um hook `useUserLabels` com cache (React Query) para resolver esses e-mails uma única vez por sessão.
- Atualizar `AuditInfo` para exibir:
  - `Criado em 29/07/2026 15:46 por jorgemateus73@gmail.com`
  - `Última alteração 29/07/2026 16:10 por jorgemateus73@gmail.com`
  - Quando não houver usuário registrado (lançamentos antigos), mostrar "—".
- Como o `AuditInfo` já é usado no CRUD genérico, Financeiro, Inventário e demais modais de detalhe, a mudança vale para o sistema inteiro automaticamente.

## 2. Login com outro e-mail volta para a tela do Google

Diagnóstico do que já verifiquei:

- O site publicado está com visibilidade **pública** (não é bloqueio do Lovable).
- Existem apenas 2 usuários no banco e, nos últimos 7 dias, **nenhuma tentativa de novo login chegou ao servidor de autenticação** — ou seja, o fluxo falha antes de voltar para o app, o que é típico de configuração do cliente OAuth próprio do Google.

Como você usa **credenciais próprias do Google (Google Cloud)**, as causas mais prováveis, em ordem:

1. **Tela de consentimento em modo "Testing"** — nesse modo só os e-mails cadastrados como "Test users" conseguem entrar; qualquer outro é devolvido para a tela de login. Solução: publicar a tela de consentimento ("Publish app") no Google Cloud, ou adicionar o e-mail como test user.
2. **Domínio/URI de redirecionamento** — o `mearim.lovable.app` (e o domínio de preview) precisam estar em "Authorized domains" e a URL de callback exata precisa estar em "Authorized redirect URIs".
3. **Cadastro de novos usuários desabilitado** no backend — se estiver, o login externo é recusado.

O que farei nesta etapa:

- Conferir a configuração de autenticação do projeto (provedor Google ativo, credenciais em uso, cadastro de novos usuários habilitado) e corrigir o que estiver do meu lado.
- Fazer o `/auth` mostrar a mensagem de erro real que voltar do Google/backend (hoje o erro pode ser engolido e o usuário só volta para a tela de login), com log no console para diagnóstico.
- Te entregar a lista exata do que precisa ser ajustado no Google Cloud (o que só você consegue alterar), com os valores prontos para copiar.

## 3. Aviso importante sobre múltiplos usuários

Todas as tabelas do sistema são isoladas por usuário (`user_id = usuário logado`). Isso significa que, mesmo depois de resolver o login, **um novo e-mail vai entrar em um sistema vazio** — não verá bancos, contas, clientes nem vendas já cadastrados.

Se a intenção é que várias pessoas trabalhem sobre os mesmos dados, isso exige uma mudança de modelo (empresa/equipe compartilhada com permissões por papel). Posso planejar isso em seguida — não está incluído nesta entrega.

## Detalhes técnicos

- `src/lib/user-labels.functions.ts`: server fn com `requireSupabaseAuth`, carregando o cliente administrativo dentro do handler para buscar os e-mails por ID.
- `src/hooks/use-user-labels.ts`: React Query com `staleTime` alto, chave por conjunto de IDs.
- `src/components/audit-info.tsx`: passa a receber os rótulos e renderizar "por <e-mail>".
- `src/routes/auth.tsx`: exibição do erro real (toast + mensagem inline) nos fluxos de e-mail/senha e Google.
