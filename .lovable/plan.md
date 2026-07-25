
# Tela de admin para cadastrar usuários

Cria uma página **Configurações › Usuários** onde só administradores conseguem criar novos usuários (e-mail + senha), listar e remover — sem precisar reabrir o cadastro público.

## O que muda

### Backend
- **Server function** `createUser` (protegida por `requireSupabaseAuth`):
  - Verifica se o chamador tem `has_role(admin)`. Se não, retorna 403.
  - Usa `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })` para criar a conta já confirmada.
  - Insere `user_roles` (papel escolhido: `admin` ou `user`).
- **Server function** `listUsers` e `deleteUser` (também admin-only) para listar contas em `auth.users` e apagar.
- **Primeiro admin**: como ninguém é admin ainda, incluo uma migration que promove o seu usuário atual a `admin` em `user_roles`. Preciso do e-mail do seu login para isso.

### Frontend
- Novo item no menu **Configurações › Usuários** (visível só para admin, usando `has_role`).
- Rota `src/routes/_authenticated/usuarios.tsx`:
  - Lista de usuários (e-mail, papel, criado em).
  - Botão **Novo usuário** abre modal com e-mail, senha, papel (Admin/Usuário).
  - Botão de excluir por linha (confirmação).
- Guarda de rota: se o usuário logado não for admin, redireciona para `/painel`.

## Passo a passo depois de pronto
1. Fazer login com seu usuário (já promovido a admin pela migration).
2. Menu → **Configurações › Usuários** → **Novo usuário**.
3. Preencher e-mail, senha e papel → **Salvar**.
4. Passar as credenciais ao novo usuário; ele entra direto em `/auth`.

## Pergunta que preciso responder antes de construir
Qual é o **e-mail da sua conta atual** (a que vai virar admin na migration)?
