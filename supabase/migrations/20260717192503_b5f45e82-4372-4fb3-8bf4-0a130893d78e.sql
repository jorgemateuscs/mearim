
CREATE TABLE public.inventario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'peca',
  descricao TEXT,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_pago NUMERIC NOT NULL DEFAULT 0,
  status_pagamento TEXT NOT NULL DEFAULT 'pendente',
  data_aquisicao DATE,
  fornecedor TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario TO authenticated;
GRANT ALL ON public.inventario TO service_role;

ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own inventario" ON public.inventario
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_inventario_updated_at
  BEFORE UPDATE ON public.inventario
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
