-- ============================================================
-- 1. INVENTÁRIO: campos patrimoniais
-- ============================================================
ALTER TABLE public.inventario
  ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'outro',
  ADD COLUMN IF NOT EXISTS numero_patrimonio text,
  ADD COLUMN IF NOT EXISTS marca text,
  ADD COLUMN IF NOT EXISTS modelo text,
  ADD COLUMN IF NOT EXISTS numero_serie text,
  ADD COLUMN IF NOT EXISTS localizacao text,
  ADD COLUMN IF NOT EXISTS responsavel text,
  ADD COLUMN IF NOT EXISTS situacao text DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS valor_unitario numeric,
  ADD COLUMN IF NOT EXISTS kit_id uuid,
  ADD COLUMN IF NOT EXISTS is_kit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banco_id uuid,
  ADD COLUMN IF NOT EXISTS categoria_id uuid,
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid,
  ADD COLUMN IF NOT EXISTS origem text;

ALTER TABLE public.inventario
  ADD CONSTRAINT inventario_kit_fk FOREIGN KEY (kit_id) REFERENCES public.inventario(id) ON DELETE SET NULL;

CREATE SEQUENCE IF NOT EXISTS public.patrimonio_seq START 1;

CREATE OR REPLACE FUNCTION public.set_numero_patrimonio()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.numero_patrimonio IS NULL OR NEW.numero_patrimonio = '' THEN
    NEW.numero_patrimonio := 'PAT-' || lpad(nextval('public.patrimonio_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.set_numero_patrimonio() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_numero_patrimonio ON public.inventario;
CREATE TRIGGER trg_numero_patrimonio BEFORE INSERT ON public.inventario
FOR EACH ROW EXECUTE FUNCTION public.set_numero_patrimonio();

-- ============================================================
-- 2. SOFT DELETE em todas as tabelas de negócio
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['inventario','equipamentos','pecas','contas_pagar','contas_receber','clientes','fornecedores','profissionais','servicos','produtos','vendas_produtos','vendas_servicos','categorias','meios_pagamento','bancos','transferencias']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (deleted_at)', t || '_deleted_at_idx', t);
  END LOOP;
END $$;

-- ============================================================
-- 3. AUDITORIA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  acao text NOT NULL,
  modulo text NOT NULL,
  tabela text NOT NULL,
  registro_id uuid,
  registro_nome text,
  dados_anteriores jsonb,
  dados_novos jsonb
);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS audit_log_occurred_idx ON public.audit_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_registro_idx ON public.audit_log (tabela, registro_id);

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_acao text; v_old jsonb; v_new jsonb; v_id uuid; v_nome text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_acao := 'criou'; v_new := to_jsonb(NEW); v_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_id := NEW.id;
    IF (v_old->>'deleted_at') IS NULL AND (v_new->>'deleted_at') IS NOT NULL THEN v_acao := 'excluiu';
    ELSIF (v_old->>'deleted_at') IS NOT NULL AND (v_new->>'deleted_at') IS NULL THEN v_acao := 'recuperou';
    ELSE v_acao := 'editou';
    END IF;
  ELSE
    v_acao := 'excluiu_definitivo'; v_old := to_jsonb(OLD); v_id := OLD.id;
  END IF;

  v_nome := coalesce(
    v_new->>'nome', v_old->>'nome',
    v_new->>'descricao', v_old->>'descricao',
    v_new->>'codigo', v_old->>'codigo',
    v_id::text);

  INSERT INTO public.audit_log(user_id, acao, modulo, tabela, registro_id, registro_nome, dados_anteriores, dados_novos)
  VALUES (auth.uid(), v_acao, TG_TABLE_NAME, TG_TABLE_NAME, v_id, left(v_nome, 200), v_old, v_new);

  RETURN coalesce(NEW, OLD);
END $$;

REVOKE ALL ON FUNCTION public.audit_trigger() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['inventario','equipamentos','pecas','contas_pagar','contas_receber','clientes','fornecedores','profissionais','servicos','produtos','vendas_produtos','vendas_servicos','categorias','meios_pagamento','bancos','transferencias']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger()', t);
  END LOOP;
END $$;

-- Expurgo definitivo após 7 dias
CREATE OR REPLACE FUNCTION public.purge_expired_deleted()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text; n integer := 0; c integer;
BEGIN
  FOREACH t IN ARRAY ARRAY['inventario','equipamentos','pecas','contas_pagar','contas_receber','clientes','fornecedores','profissionais','servicos','produtos','vendas_produtos','vendas_servicos','categorias','meios_pagamento','bancos','transferencias']
  LOOP
    EXECUTE format('DELETE FROM public.%I WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval ''7 days''', t);
    GET DIAGNOSTICS c = ROW_COUNT;
    n := n + c;
  END LOOP;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.purge_expired_deleted() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_expired_deleted() TO authenticated;

-- ============================================================
-- 4. MOVIMENTAÇÕES DE PATRIMÔNIO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventario_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  inventario_id uuid NOT NULL REFERENCES public.inventario(id) ON DELETE CASCADE,
  data_movimentacao date NOT NULL DEFAULT current_date,
  tipo_movimentacao text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 0,
  quantidade_anterior numeric,
  quantidade_final numeric,
  motivo text,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  nota_fiscal text,
  valor_unitario numeric,
  destino text,
  situacao_final text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario_movimentacoes TO authenticated;
GRANT ALL ON public.inventario_movimentacoes TO service_role;
ALTER TABLE public.inventario_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_mov_all" ON public.inventario_movimentacoes;
CREATE POLICY "inv_mov_all" ON public.inventario_movimentacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS inv_mov_item_idx ON public.inventario_movimentacoes (inventario_id, data_movimentacao DESC);

DROP TRIGGER IF EXISTS trg_inv_mov_audit_fields ON public.inventario_movimentacoes;
CREATE TRIGGER trg_inv_mov_audit_fields BEFORE INSERT OR UPDATE ON public.inventario_movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

-- ============================================================
-- 5. PARCELAMENTO em contas a pagar / receber
-- ============================================================
ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS parcelamento_id uuid,
  ADD COLUMN IF NOT EXISTS parcelamento_modo text,
  ADD COLUMN IF NOT EXISTS parcela_num integer,
  ADD COLUMN IF NOT EXISTS parcela_total integer,
  ADD COLUMN IF NOT EXISTS valor_total_parcelamento numeric;

ALTER TABLE public.contas_receber
  ADD COLUMN IF NOT EXISTS parcelamento_id uuid,
  ADD COLUMN IF NOT EXISTS parcelamento_modo text,
  ADD COLUMN IF NOT EXISTS parcela_num integer,
  ADD COLUMN IF NOT EXISTS parcela_total integer,
  ADD COLUMN IF NOT EXISTS valor_total_parcelamento numeric;

CREATE INDEX IF NOT EXISTS contas_pagar_parcelamento_idx ON public.contas_pagar (parcelamento_id);
CREATE INDEX IF NOT EXISTS contas_receber_parcelamento_idx ON public.contas_receber (parcelamento_id);

-- ============================================================
-- 6. MIGRAÇÃO: equipamentos e peças -> inventário
-- ============================================================
INSERT INTO public.inventario (
  user_id, nome, tipo, categoria, categoria_id, marca, modelo, numero_serie,
  quantidade, valor_total, valor_unitario, valor_pago, status_pagamento,
  data_aquisicao, fornecedor_id, banco_id, situacao, observacao, origem,
  created_at, created_by, updated_at, updated_by
)
SELECT e.user_id, e.nome, 'equipamento',
       coalesce(c.nome, 'Sem categoria'), e.categoria_id, e.marca, e.modelo, e.numero_serie,
       1, e.valor, e.valor, e.valor_pago, e.status_pagamento::text,
       e.data_compra, e.fornecedor_id, e.banco_id,
       CASE WHEN e.ativo THEN 'ativo' ELSE 'baixado' END,
       e.observacao, 'migrado:equipamentos',
       e.created_at, e.created_by, e.updated_at, e.updated_by
FROM public.equipamentos e
LEFT JOIN public.categorias c ON c.id = e.categoria_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventario i WHERE i.origem = 'migrado:equipamentos' AND i.nome = e.nome AND i.created_at = e.created_at
);

INSERT INTO public.inventario (
  user_id, nome, tipo, categoria, categoria_id,
  quantidade, valor_total, valor_unitario, valor_pago, status_pagamento,
  data_aquisicao, fornecedor_id, banco_id, situacao, observacao, origem,
  created_at, created_by, updated_at, updated_by
)
SELECT p.user_id, p.nome, 'peca',
       coalesce(c.nome, 'Sem categoria'), p.categoria_id,
       p.quantidade, p.valor_total, p.valor_unitario, p.valor_pago, p.status_pagamento::text,
       p.data_compra, p.fornecedor_id, p.banco_id,
       CASE WHEN p.ativo THEN 'em_estoque' ELSE 'baixado' END,
       p.observacao, 'migrado:pecas',
       p.created_at, p.created_by, p.updated_at, p.updated_by
FROM public.pecas p
LEFT JOIN public.categorias c ON c.id = p.categoria_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventario i WHERE i.origem = 'migrado:pecas' AND i.nome = p.nome AND i.created_at = p.created_at
);

UPDATE public.inventario SET tipo = 'outro' WHERE tipo IS NULL;
UPDATE public.inventario SET situacao = 'ativo' WHERE situacao IS NULL;
UPDATE public.inventario SET valor_unitario = CASE WHEN coalesce(quantidade,0) > 0 THEN valor_total / quantidade ELSE valor_total END WHERE valor_unitario IS NULL;
