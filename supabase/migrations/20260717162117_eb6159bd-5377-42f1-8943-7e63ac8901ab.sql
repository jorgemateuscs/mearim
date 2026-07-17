ALTER TABLE public.contas_pagar ADD COLUMN banco_id uuid REFERENCES public.bancos(id) ON DELETE SET NULL;
ALTER TABLE public.contas_receber ADD COLUMN banco_id uuid REFERENCES public.bancos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contas_pagar_banco_id ON public.contas_pagar(banco_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_banco_id ON public.contas_receber(banco_id);