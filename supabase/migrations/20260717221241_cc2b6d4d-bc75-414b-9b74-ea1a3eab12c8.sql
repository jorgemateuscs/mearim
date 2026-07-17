
-- ========== FASE 1: FUNDAÇÃO ERP ==========

-- Enum de tipos de categoria (separação por domínio, escalável)
CREATE TYPE public.categoria_tipo AS ENUM ('despesa','receita','patrimonio','servico','estoque');

-- Enum de roles do sistema
CREATE TYPE public.app_role AS ENUM ('admin','financeiro','operador','leitura');

-- Enum de status de pagamento (usado em equipamentos, peças, inventário)
CREATE TYPE public.status_pagamento AS ENUM ('pago','parcial','pendente');

-- Enum de origem para o histórico bancário (extensível no futuro)
CREATE TYPE public.movimentacao_origem AS ENUM (
  'conta_pagar','conta_receber','transferencia','venda_produto','venda_servico','equipamento','peca','ajuste'
);

-- ========== CATEGORIAS ==========
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo public.categoria_tipo NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_categorias" ON public.categorias FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_categorias_updated BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== MEIOS DE PAGAMENTO ==========
CREATE TABLE public.meios_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meios_pagamento TO authenticated;
GRANT ALL ON public.meios_pagamento TO service_role;
ALTER TABLE public.meios_pagamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_meios" ON public.meios_pagamento FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_meios_updated BEFORE UPDATE ON public.meios_pagamento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== FORNECEDORES ==========
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  documento TEXT,
  contato TEXT,
  email TEXT,
  endereco TEXT,
  observacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_fornecedores" ON public.fornecedores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_fornecedores_updated BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== EQUIPAMENTOS ==========
CREATE TABLE public.equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  marca TEXT,
  modelo TEXT,
  numero_serie TEXT,
  data_compra DATE,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_pago NUMERIC(14,2) NOT NULL DEFAULT 0,
  status_pagamento public.status_pagamento NOT NULL DEFAULT 'pendente',
  situacao TEXT,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  banco_id UUID REFERENCES public.bancos(id) ON DELETE SET NULL,
  observacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamentos TO authenticated;
GRANT ALL ON public.equipamentos TO service_role;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_equipamentos" ON public.equipamentos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_equipamentos_updated BEFORE UPDATE ON public.equipamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== PEÇAS ==========
CREATE TABLE public.pecas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  quantidade NUMERIC(14,3) NOT NULL DEFAULT 0,
  valor_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_pago NUMERIC(14,2) NOT NULL DEFAULT 0,
  status_pagamento public.status_pagamento NOT NULL DEFAULT 'pendente',
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  banco_id UUID REFERENCES public.bancos(id) ON DELETE SET NULL,
  data_compra DATE,
  observacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pecas TO authenticated;
GRANT ALL ON public.pecas TO service_role;
ALTER TABLE public.pecas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_pecas" ON public.pecas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_pecas_updated BEFORE UPDATE ON public.pecas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== USER ROLES ==========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_own_roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Admin pode gerenciar todos os roles
CREATE POLICY "admin_manage_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ========== AJUSTES em contas_pagar / contas_receber ==========
-- Vincular a categorias, meios de pagamento e origem (deep link)
ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS meio_pagamento_id UUID REFERENCES public.meios_pagamento(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origem_tipo public.movimentacao_origem,
  ADD COLUMN IF NOT EXISTS origem_id UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.contas_receber
  ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS meio_pagamento_id UUID REFERENCES public.meios_pagamento(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origem_tipo public.movimentacao_origem,
  ADD COLUMN IF NOT EXISTS origem_id UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- ========== VIEW UNIFICADA: HISTÓRICO BANCÁRIO ==========
-- Fonte ÚNICA do extrato. Qualquer módulo que gerar movimentação
-- (contas_pagar/receber, transferências, equipamentos, peças, futuro)
-- aparece aqui automaticamente sem duplicação.
CREATE OR REPLACE VIEW public.movimentacoes_bancarias AS
  -- Saídas: contas a pagar quitadas
  SELECT
    cp.id AS id,
    'conta_pagar'::public.movimentacao_origem AS origem_tipo,
    cp.id AS origem_id,
    cp.user_id,
    cp.banco_id,
    COALESCE(cp.data_pagamento, cp.data_vencimento) AS data_mov,
    'saida'::text AS tipo,
    COALESCE(cp.valor_pago, 0) AS valor,
    COALESCE(cp.descricao, 'Conta a pagar') AS descricao,
    cp.categoria_id,
    cp.meio_pagamento_id
  FROM public.contas_pagar cp
  WHERE cp.banco_id IS NOT NULL AND COALESCE(cp.valor_pago,0) > 0

  UNION ALL
  -- Entradas: contas a receber recebidas
  SELECT
    cr.id,
    'conta_receber'::public.movimentacao_origem,
    cr.id,
    cr.user_id,
    cr.banco_id,
    COALESCE(cr.data_recebimento, cr.data_vencimento),
    'entrada',
    COALESCE(cr.valor_recebido, 0),
    COALESCE(cr.descricao, 'Recebimento'),
    cr.categoria_id,
    cr.meio_pagamento_id
  FROM public.contas_receber cr
  WHERE cr.banco_id IS NOT NULL AND COALESCE(cr.valor_recebido,0) > 0

  UNION ALL
  -- Transferências (saída do banco origem)
  SELECT
    t.id,
    'transferencia'::public.movimentacao_origem,
    t.id,
    t.user_id,
    t.banco_origem_id,
    t.data_transferencia,
    'saida',
    t.valor,
    'Transferência enviada',
    NULL::uuid,
    NULL::uuid
  FROM public.transferencias t
  WHERE t.banco_origem_id IS NOT NULL

  UNION ALL
  -- Transferências (entrada no banco destino)
  SELECT
    t.id,
    'transferencia'::public.movimentacao_origem,
    t.id,
    t.user_id,
    t.banco_destino_id,
    t.data_transferencia,
    'entrada',
    t.valor,
    'Transferência recebida',
    NULL::uuid,
    NULL::uuid
  FROM public.transferencias t
  WHERE t.banco_destino_id IS NOT NULL

  UNION ALL
  -- Equipamentos: valor pago (saída direta se não vinculado a conta_pagar)
  SELECT
    e.id,
    'equipamento'::public.movimentacao_origem,
    e.id,
    e.user_id,
    e.banco_id,
    e.data_compra,
    'saida',
    COALESCE(e.valor_pago, 0),
    'Equipamento: ' || e.nome,
    e.categoria_id,
    NULL::uuid
  FROM public.equipamentos e
  WHERE e.banco_id IS NOT NULL AND COALESCE(e.valor_pago,0) > 0

  UNION ALL
  -- Peças: valor pago
  SELECT
    p.id,
    'peca'::public.movimentacao_origem,
    p.id,
    p.user_id,
    p.banco_id,
    p.data_compra,
    'saida',
    COALESCE(p.valor_pago, 0),
    'Peça: ' || p.nome,
    p.categoria_id,
    NULL::uuid
  FROM public.pecas p
  WHERE p.banco_id IS NOT NULL AND COALESCE(p.valor_pago,0) > 0;

GRANT SELECT ON public.movimentacoes_bancarias TO authenticated;
GRANT SELECT ON public.movimentacoes_bancarias TO service_role;

-- ========== SEEDS: valores padrão para o usuário atual ==========
-- Serão inseridos por trigger no primeiro uso, mas podemos deixar
-- categorias/meios básicos aparecerem automaticamente via um seeder
-- (não fazemos INSERT aqui porque não temos user_id fixo em migration)
