-- 1) created_by em todas as tabelas de dados
ALTER TABLE public.bancos ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.profissionais ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.vendas_produtos ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.vendas_servicos ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.transferencias ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid, ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.inventario ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.meios_pagamento ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.pecas ADD COLUMN IF NOT EXISTS created_by uuid;

-- 2) função de auditoria
CREATE OR REPLACE FUNCTION public.set_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    NEW.updated_by := COALESCE(NEW.updated_by, auth.uid());
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := now();
  ELSE
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
    NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_audit_fields() FROM anon, authenticated, PUBLIC;

-- 3) aplica em todas as tabelas
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bancos','clientes','produtos','servicos','profissionais','vendas_produtos','vendas_servicos','transferencias','inventario','contas_pagar','contas_receber','categorias','meios_pagamento','fornecedores','equipamentos','pecas','profiles']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER trg_audit_%1$s BEFORE INSERT OR UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields()', t);
  END LOOP;
END $$;