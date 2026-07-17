
-- Trigger utility for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  business_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  contato TEXT,
  cpf_cnpj TEXT,
  instagram_email TEXT,
  data_nascimento DATE,
  forma_prospeccao TEXT,
  interesse TEXT,
  ultimo_contato DATE,
  dias_proximo_contato INTEGER,
  proximo_contato DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own clientes" ON public.clientes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profissionais
CREATE TABLE public.profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  funcao TEXT,
  contato TEXT,
  dias_trabalho TEXT,
  salario_fixo NUMERIC(12,2) DEFAULT 0,
  comissao_percentual NUMERIC(5,2) DEFAULT 0,
  beneficios TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profissionais TO authenticated;
GRANT ALL ON public.profissionais TO service_role;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profissionais" ON public.profissionais FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_profissionais_updated BEFORE UPDATE ON public.profissionais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Serviços
CREATE TABLE public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_venda NUMERIC(12,2) DEFAULT 0,
  custo_medio NUMERIC(12,2) DEFAULT 0,
  comissao_percentual NUMERIC(5,2) DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicos TO authenticated;
GRANT ALL ON public.servicos TO service_role;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own servicos" ON public.servicos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_servicos_updated BEFORE UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Produtos (estoque)
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo TEXT,
  nome TEXT NOT NULL,
  descricao TEXT,
  fornecedor TEXT,
  valor_venda NUMERIC(12,2) DEFAULT 0,
  custo_medio NUMERIC(12,2) DEFAULT 0,
  qtde_adquirida INTEGER DEFAULT 0,
  qtde_vendida INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own produtos" ON public.produtos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_produtos_updated BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vendas de produtos
CREATE TABLE public.vendas_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  descricao TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_total NUMERIC(12,2) DEFAULT 0,
  forma_pagamento TEXT,
  local_recebimento TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas_produtos TO authenticated;
GRANT ALL ON public.vendas_produtos TO service_role;
ALTER TABLE public.vendas_produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vendas_produtos" ON public.vendas_produtos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_vp_updated BEFORE UPDATE ON public.vendas_produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vendas de serviços
CREATE TABLE public.vendas_servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  data_prevista_fim DATE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  servico_id UUID REFERENCES public.servicos(id) ON DELETE SET NULL,
  profissional_id UUID REFERENCES public.profissionais(id) ON DELETE SET NULL,
  descricao TEXT,
  valor_venda NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_recebido NUMERIC(12,2) DEFAULT 0,
  custo NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'Em andamento',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas_servicos TO authenticated;
GRANT ALL ON public.vendas_servicos TO service_role;
ALTER TABLE public.vendas_servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vendas_servicos" ON public.vendas_servicos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_vs_updated BEFORE UPDATE ON public.vendas_servicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contas a pagar
CREATE TABLE public.contas_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  categoria TEXT,
  data_vencimento DATE NOT NULL,
  valor_previsto NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_pagamento DATE,
  valor_pago NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'Pendente',
  forma_pagamento TEXT,
  local_saida TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_pagar TO authenticated;
GRANT ALL ON public.contas_pagar TO service_role;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contas_pagar" ON public.contas_pagar FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_cp_updated BEFORE UPDATE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contas a receber
CREATE TABLE public.contas_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  pagador_nome TEXT,
  contato TEXT,
  cpf_cnpj TEXT,
  descricao TEXT NOT NULL,
  data_venda DATE,
  parcela TEXT,
  valor_parcela NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  valor_recebido NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'Pendente',
  local_recebimento TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_receber TO authenticated;
GRANT ALL ON public.contas_receber TO service_role;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contas_receber" ON public.contas_receber FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_cr_updated BEFORE UPDATE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bancos / locais de dinheiro
CREATE TABLE public.bancos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  saldo_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bancos TO authenticated;
GRANT ALL ON public.bancos TO service_role;
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bancos" ON public.bancos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_bancos_updated BEFORE UPDATE ON public.bancos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Transferências
CREATE TABLE public.transferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_transferencia DATE NOT NULL DEFAULT CURRENT_DATE,
  banco_origem_id UUID REFERENCES public.bancos(id) ON DELETE SET NULL,
  banco_destino_id UUID REFERENCES public.bancos(id) ON DELETE SET NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transferencias TO authenticated;
GRANT ALL ON public.transferencias TO service_role;
ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transferencias" ON public.transferencias FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
