CREATE TYPE public.cc_parceiro AS ENUM ('cliente','fornecedor');
CREATE TYPE public.cc_lanc_tipo AS ENUM ('venda','compra','pagamento','credito','uso_credito','ajuste');

CREATE TABLE public.contas_correntes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  parceiro_tipo public.cc_parceiro NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  saldo_devedor numeric NOT NULL DEFAULT 0,
  saldo_credito numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'quitado',
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE UNIQUE INDEX contas_correntes_cliente_uk ON public.contas_correntes (cliente_id) WHERE cliente_id IS NOT NULL;
CREATE UNIQUE INDEX contas_correntes_fornecedor_uk ON public.contas_correntes (fornecedor_id) WHERE fornecedor_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_correntes TO authenticated;
GRANT ALL ON public.contas_correntes TO service_role;
ALTER TABLE public.contas_correntes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contas_correntes_shared" ON public.contas_correntes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.contas_correntes_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conta_id uuid NOT NULL REFERENCES public.contas_correntes(id) ON DELETE CASCADE,
  parceiro_tipo public.cc_parceiro NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  tipo public.cc_lanc_tipo NOT NULL,
  descricao text NOT NULL,
  valor_debito numeric NOT NULL DEFAULT 0,
  valor_credito numeric NOT NULL DEFAULT 0,
  saldo_apos numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  meio_pagamento_id uuid REFERENCES public.meios_pagamento(id),
  forma_pagamento text,
  banco_id uuid REFERENCES public.bancos(id),
  categoria_id uuid REFERENCES public.categorias(id),
  lancamento_origem_id uuid REFERENCES public.contas_correntes_lancamentos(id),
  conta_financeira_id uuid,
  data_lancamento date NOT NULL DEFAULT current_date,
  data_vencimento date,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE INDEX cc_lanc_conta_idx ON public.contas_correntes_lancamentos (conta_id, data_lancamento, created_at);

GRANT SELECT, INSERT, UPDATE ON public.contas_correntes_lancamentos TO authenticated;
GRANT ALL ON public.contas_correntes_lancamentos TO service_role;
ALTER TABLE public.contas_correntes_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_lanc_select" ON public.contas_correntes_lancamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "cc_lanc_insert" ON public.contas_correntes_lancamentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cc_lanc_update" ON public.contas_correntes_lancamentos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.contas_correntes_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lancamento_id uuid NOT NULL REFERENCES public.contas_correntes_lancamentos(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id),
  servico_id uuid REFERENCES public.servicos(id),
  descricao text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  valor_unitario numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE INDEX cc_itens_lanc_idx ON public.contas_correntes_itens (lancamento_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_correntes_itens TO authenticated;
GRANT ALL ON public.contas_correntes_itens TO service_role;
ALTER TABLE public.contas_correntes_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_itens_shared" ON public.contas_correntes_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.cc_recalcular(_conta uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; run numeric := 0;
BEGIN
  FOR r IN
    SELECT id, valor_debito, valor_credito
    FROM public.contas_correntes_lancamentos
    WHERE conta_id = _conta
    ORDER BY data_lancamento, created_at, id
  LOOP
    run := run + coalesce(r.valor_debito, 0) - coalesce(r.valor_credito, 0);
    UPDATE public.contas_correntes_lancamentos SET saldo_apos = run WHERE id = r.id;
  END LOOP;

  UPDATE public.contas_correntes
     SET saldo_devedor = greatest(run, 0),
         saldo_credito = greatest(-run, 0),
         status = CASE WHEN run > 0.005 THEN 'em_aberto' WHEN run < -0.005 THEN 'credito' ELSE 'quitado' END,
         updated_at = now()
   WHERE id = _conta;
END $$;

REVOKE EXECUTE ON FUNCTION public.cc_recalcular(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cc_lanc_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.cc_recalcular(coalesce(NEW.conta_id, OLD.conta_id));
  RETURN coalesce(NEW, OLD);
END $$;

CREATE TRIGGER trg_cc_lanc_recalc
AFTER INSERT OR DELETE ON public.contas_correntes_lancamentos
FOR EACH ROW EXECUTE FUNCTION public.cc_lanc_after();

CREATE TRIGGER trg_cc_lanc_recalc_upd
AFTER UPDATE OF valor_debito, valor_credito, data_lancamento ON public.contas_correntes_lancamentos
FOR EACH ROW EXECUTE FUNCTION public.cc_lanc_after();

CREATE TRIGGER trg_cc_audit_fields BEFORE INSERT OR UPDATE ON public.contas_correntes FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();
CREATE TRIGGER trg_cc_lanc_audit_fields BEFORE INSERT OR UPDATE ON public.contas_correntes_lancamentos FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();
CREATE TRIGGER trg_cc_itens_audit_fields BEFORE INSERT OR UPDATE ON public.contas_correntes_itens FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

CREATE TRIGGER trg_cc_lanc_audit AFTER INSERT OR DELETE ON public.contas_correntes_lancamentos FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();