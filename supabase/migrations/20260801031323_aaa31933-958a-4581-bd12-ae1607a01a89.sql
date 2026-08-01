-- 1. Perfis: e-mail + leitura compartilhada
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND (p.email IS NULL OR p.email <> u.email);

INSERT INTO public.profiles (id, full_name, email)
SELECT u.id, u.raw_user_meta_data->>'full_name', u.email
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "own profile" ON public.profiles;
CREATE POLICY "profiles_read_all_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 2. Dados compartilhados entre todos os usuários autenticados
DROP POLICY IF EXISTS "own bancos" ON public.bancos;
DROP POLICY IF EXISTS "own_categorias" ON public.categorias;
DROP POLICY IF EXISTS "own clientes" ON public.clientes;
DROP POLICY IF EXISTS "own contas_pagar" ON public.contas_pagar;
DROP POLICY IF EXISTS "own contas_receber" ON public.contas_receber;
DROP POLICY IF EXISTS "own_equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "own_fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Users manage own inventario" ON public.inventario;
DROP POLICY IF EXISTS "own_meios" ON public.meios_pagamento;
DROP POLICY IF EXISTS "own_pecas" ON public.pecas;
DROP POLICY IF EXISTS "own produtos" ON public.produtos;
DROP POLICY IF EXISTS "own profissionais" ON public.profissionais;
DROP POLICY IF EXISTS "own servicos" ON public.servicos;
DROP POLICY IF EXISTS "own transferencias" ON public.transferencias;
DROP POLICY IF EXISTS "own vendas_produtos" ON public.vendas_produtos;
DROP POLICY IF EXISTS "own vendas_servicos" ON public.vendas_servicos;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bancos','categorias','clientes','contas_pagar','contas_receber','equipamentos',
    'fornecedores','inventario','meios_pagamento','pecas','produtos','profissionais',
    'servicos','transferencias','vendas_produtos','vendas_servicos'
  ]
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t || '_shared_authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;