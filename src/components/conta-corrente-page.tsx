import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntitySelect } from "@/components/entity-select";
import { MeioPagamentoSelect, CategoriaSelect } from "@/components/lookup-select";
import { AuditInfo } from "@/components/audit-info";
import { formatBRL, formatDate } from "@/lib/format";
import { useUserEmails, userLabel } from "@/hooks/use-user-emails";
import {
  comSaldo, gerarExtratoPdf, resumo, statusConta, STATUS_INFO, textos, TIPO_LABEL,
  type Lancamento, type ParceiroTipo, type StatusConta,
} from "@/lib/conta-corrente";
import { ArrowLeft, FileDown, Plus, Printer, HandCoins, ShoppingBag, Wallet, PencilLine, Search } from "lucide-react";
import { toast } from "sonner";

const EMPRESA = "MEARIM DRONES LTDA";
const hoje = () => new Date().toISOString().slice(0, 10);

type Parceiro = { id: string; nome: string; contato: string | null };

export function ContaCorrentePage({
  parceiroTipo,
  selected,
  onSelect,
}: {
  parceiroTipo: ParceiroTipo;
  selected?: string;
  onSelect: (id: string | undefined) => void;
}) {
  const t = textos(parceiroTipo);
  const tabela = parceiroTipo === "cliente" ? "clientes" : "fornecedores";

  const { data: parceiros = [] } = useQuery({
    queryKey: [`cc-parceiros-${tabela}`],
    queryFn: async () => {
      const { data, error } = await supabase.from(tabela as any).select("id, nome, contato").is("deleted_at", null).order("nome");
      if (error) throw error;
      return data as unknown as Parceiro[];
    },
  });

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ["cc-lancamentos", parceiroTipo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_correntes_lancamentos")
        .select("*, bancos(nome), meios_pagamento(nome)")
        .eq("parceiro_tipo", parceiroTipo)
        .order("data_lancamento");
      if (error) throw error;
      return data as unknown as (Lancamento & { cliente_id: string | null; fornecedor_id: string | null })[];
    },
  });

  const porParceiro = useMemo(() => {
    const map = new Map<string, Lancamento[]>();
    for (const l of lancamentos) {
      const key = (parceiroTipo === "cliente" ? l.cliente_id : l.fornecedor_id) ?? "";
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return map;
  }, [lancamentos, parceiroTipo]);

  if (selected) {
    const parceiro = parceiros.find((p) => p.id === selected);
    return (
      <ContaDetalhe
        parceiroTipo={parceiroTipo}
        parceiro={parceiro ?? { id: selected, nome: t.parceiro, contato: null }}
        lancamentos={porParceiro.get(selected) ?? []}
        onBack={() => onSelect(undefined)}
      />
    );
  }

  return (
    <Painel
      parceiroTipo={parceiroTipo}
      parceiros={parceiros}
      porParceiro={porParceiro}
      loading={isLoading}
      onOpen={(id) => onSelect(id)}
    />
  );
}

/* ============================ PAINEL ============================ */

function Painel({
  parceiroTipo, parceiros, porParceiro, loading, onOpen,
}: {
  parceiroTipo: ParceiroTipo;
  parceiros: Parceiro[];
  porParceiro: Map<string, Lancamento[]>;
  loading: boolean;
  onOpen: (id: string) => void;
}) {
  const t = textos(parceiroTipo);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | StatusConta>("todos");

  const linhas = useMemo(() => {
    return parceiros.map((p) => {
      const lancs = porParceiro.get(p.id) ?? [];
      const r = resumo(lancs);
      const status = statusConta(r.saldoDevedor, r.saldoCredito, r.vencimentoMaisAntigo);
      return { ...p, ...r, status, movimentos: lancs.length };
    });
  }, [parceiros, porParceiro]);

  const visiveis = linhas.filter((l) => {
    if (busca && !l.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtro === "todos") return l.movimentos > 0 || busca !== "";
    return l.status === filtro;
  });

  const totalDevedor = linhas.reduce((s, l) => s + l.saldoDevedor, 0);
  const totalCredito = linhas.reduce((s, l) => s + l.saldoCredito, 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.titulo}</h1>
          <p className="text-sm text-muted-foreground">{t.descricao}</p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.devedor}</div>
          <div className="mt-1 text-2xl font-bold text-amber-500">{formatBRL(totalDevedor)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.creditoDisponivel}</div>
          <div className="mt-1 text-2xl font-bold text-sky-500">{formatBRL(totalCredito)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Contas em aberto</div>
          <div className="mt-1 text-2xl font-bold">{linhas.filter((l) => l.saldoDevedor > 0.005).length}</div>
        </Card>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder={`Buscar ${t.parceiro.toLowerCase()}...`} value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Select value={filtro} onValueChange={(v) => setFiltro(v as any)}>
            <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="em_aberto">Em aberto</SelectItem>
              <SelectItem value="atraso">Em atraso</SelectItem>
              <SelectItem value="quitado">Quitados</SelectItem>
              <SelectItem value="credito">Com crédito</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>{t.parceiro}</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-right">{t.totalDebito}</TableHead>
                <TableHead className="text-right">{t.totalCredito}</TableHead>
                <TableHead className="text-right">Saldo devedor</TableHead>
                <TableHead>{t.ultimo}</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!loading && visiveis.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhuma conta encontrada. Busque pelo nome para abrir a conta e lançar o primeiro movimento.
                </TableCell></TableRow>
              )}
              {visiveis.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => onOpen(l.id)}>
                  <TableCell className="font-medium">{l.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{l.contato ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatBRL(l.debitos)}</TableCell>
                  <TableCell className="text-right">{formatBRL(l.creditos)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatBRL(l.saldoDevedor)}</TableCell>
                  <TableCell>{l.ultimoPagamento ? formatDate(l.ultimoPagamento) : "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={STATUS_INFO[l.status].cls}>{STATUS_INFO[l.status].label}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

/* ============================ CONTA ============================ */

type DialogTipo = "debito" | "pagamento" | "credito" | "ajuste" | null;

function ContaDetalhe({
  parceiroTipo, parceiro, lancamentos, onBack,
}: {
  parceiroTipo: ParceiroTipo;
  parceiro: Parceiro;
  lancamentos: Lancamento[];
  onBack: () => void;
}) {
  const t = textos(parceiroTipo);
  const emails = useUserEmails();
  const [dialog, setDialog] = useState<DialogTipo>(null);
  const [detalhe, setDetalhe] = useState<Lancamento | null>(null);
  const r = resumo(lancamentos);
  const extrato = comSaldo(lancamentos);
  const status = statusConta(r.saldoDevedor, r.saldoCredito, r.vencimentoMaisAntigo);

  const pdf = (imprimir?: boolean) =>
    gerarExtratoPdf({
      empresa: EMPRESA,
      parceiroTipo,
      nome: parceiro.nome,
      contato: parceiro.contato,
      lancamentos,
      geradoPor: "sistema",
      imprimir,
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{parceiro.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {parceiro.contato ? `${parceiro.contato} · ` : ""}{t.parceiro} · conta corrente
            </p>
          </div>
          <Badge variant="outline" className={STATUS_INFO[status].cls}>{STATUS_INFO[status].label}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => pdf(true)}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
          <Button variant="outline" onClick={() => pdf(false)}><FileDown className="mr-2 h-4 w-4" />Gerar PDF</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Saldo devedor atual</div>
          <div className="mt-1 text-3xl font-bold text-amber-500">{formatBRL(r.saldoDevedor)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.totalDebito}</div>
          <div className="mt-1 text-2xl font-semibold">{formatBRL(r.debitos)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.totalCredito}</div>
          <div className="mt-1 text-2xl font-semibold">{formatBRL(r.creditos)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.creditoDisponivel}</div>
          <div className="mt-1 text-2xl font-semibold text-sky-500">{formatBRL(r.saldoCredito)}</div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDialog("debito")}><ShoppingBag className="mr-2 h-4 w-4" />{t.debitoLabel}</Button>
        <Button onClick={() => setDialog("pagamento")} variant="secondary"><Wallet className="mr-2 h-4 w-4" />{t.pagamentoLabel}</Button>
        <Button onClick={() => setDialog("credito")} variant="outline"><HandCoins className="mr-2 h-4 w-4" />{t.creditoLabel}</Button>
        <Button onClick={() => setDialog("ajuste")} variant="outline"><PencilLine className="mr-2 h-4 w-4" />Lançar ajuste</Button>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Extrato da conta</h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-28">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Débito</TableHead>
                <TableHead className="text-right">Crédito</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extrato.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum movimento nesta conta.</TableCell></TableRow>
              )}
              {extrato.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => setDetalhe(l)}>
                  <TableCell>{formatDate(l.data_lancamento)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{TIPO_LABEL[l.tipo]}{l.descricao ? ` — ${l.descricao}` : ""}</div>
                    <div className="text-xs text-muted-foreground">
                      {[l.meios_pagamento?.nome ?? l.forma_pagamento, l.bancos?.nome, l.data_vencimento ? `vence ${formatDate(l.data_vencimento)}` : null]
                        .filter(Boolean).join(" · ") || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{Number(l.valor_debito) > 0 ? formatBRL(Number(l.valor_debito)) : "—"}</TableCell>
                  <TableCell className="text-right text-emerald-500">{Number(l.valor_credito) > 0 ? formatBRL(Number(l.valor_credito)) : "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{formatBRL(l.saldo)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          O saldo é sempre calculado pelos lançamentos e não pode ser digitado. Correções são feitas com um lançamento de ajuste,
          preservando o histórico.
        </p>
      </Card>

      {dialog && (
        <LancamentoDialog
          tipo={dialog}
          parceiroTipo={parceiroTipo}
          parceiro={parceiro}
          saldoDevedor={r.saldoDevedor}
          saldoCredito={r.saldoCredito}
          onClose={() => setDialog(null)}
        />
      )}

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{detalhe ? TIPO_LABEL[detalhe.tipo] : ""}</DialogTitle></DialogHeader>
          {detalhe && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Data" value={formatDate(detalhe.data_lancamento)} />
              <Info label="Vencimento" value={detalhe.data_vencimento ? formatDate(detalhe.data_vencimento) : "—"} />
              <Info label="Débito" value={formatBRL(Number(detalhe.valor_debito))} />
              <Info label="Crédito" value={formatBRL(Number(detalhe.valor_credito))} />
              <Info label="Forma de pagamento" value={detalhe.meios_pagamento?.nome ?? detalhe.forma_pagamento ?? "—"} />
              <Info label="Banco" value={detalhe.bancos?.nome ?? "—"} />
              <div className="col-span-2"><Info label="Descrição" value={detalhe.descricao} /></div>
              <div className="col-span-2"><Info label="Observação" value={detalhe.observacao ?? "—"} /></div>
              <div className="col-span-2 text-xs text-muted-foreground">
                Registrado por {userLabel(emails, detalhe.created_by)}
              </div>
              <AuditInfo row={detalhe} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

/* ======================== LANÇAMENTOS ======================== */

type ItemLinha = { descricao: string; quantidade: string; valor_unitario: string; produto_id: string | null; servico_id: string | null };

function LancamentoDialog({
  tipo, parceiroTipo, parceiro, saldoDevedor, saldoCredito, onClose,
}: {
  tipo: Exclude<DialogTipo, null>;
  parceiroTipo: ParceiroTipo;
  parceiro: Parceiro;
  saldoDevedor: number;
  saldoCredito: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const t = textos(parceiroTipo);
  const cliente = parceiroTipo === "cliente";

  const [data, setData] = useState(hoje());
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [desconto, setDesconto] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [meioId, setMeioId] = useState<string | null>(null);
  const [meioNome, setMeioNome] = useState<string | null>(null);
  const [bancoId, setBancoId] = useState<string | null>(null);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [ajusteSentido, setAjusteSentido] = useState<"debito" | "credito">("credito");
  const [itens, setItens] = useState<ItemLinha[]>([{ descricao: "", quantidade: "1", valor_unitario: "", produto_id: null, servico_id: null }]);
  const [confirmacao, setConfirmacao] = useState<{ anterior: number; movimento: number; novo: number; excedente: number } | null>(null);

  const totalItens = itens.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.valor_unitario) || 0), 0);
  const valorDebito = tipo === "debito" ? Math.max(totalItens - (Number(desconto) || 0), 0) : 0;
  const valorInformado = Number(valor) || 0;
  const excedente = tipo === "pagamento" ? Math.max(valorInformado - saldoDevedor, 0) : 0;

  const salvar = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user?.id;
      if (!user_id) throw new Error("Não autenticado");

      // conta corrente do parceiro (criada na primeira movimentação)
      const col = cliente ? "cliente_id" : "fornecedor_id";
      const { data: existente, error: e1 } = await supabase
        .from("contas_correntes").select("id").eq(col, parceiro.id).maybeSingle();
      if (e1) throw e1;
      let contaId = existente?.id as string | undefined;
      if (!contaId) {
        const { data: nova, error: e2 } = await supabase
          .from("contas_correntes")
          .insert({ user_id, parceiro_tipo: parceiroTipo, [col]: parceiro.id } as any)
          .select("id").single();
        if (e2) throw e2;
        contaId = nova.id as string;
      }

      const base = {
        user_id,
        conta_id: contaId,
        parceiro_tipo: parceiroTipo,
        cliente_id: cliente ? parceiro.id : null,
        fornecedor_id: cliente ? null : parceiro.id,
        data_lancamento: data,
        observacao: observacao || null,
        meio_pagamento_id: meioId,
        forma_pagamento: meioNome,
        banco_id: bancoId,
        categoria_id: categoriaId,
      };

      let payload: any;
      if (tipo === "debito") {
        payload = {
          ...base,
          tipo: t.debitoTipo,
          descricao: descricao || (cliente ? "Venda fiado" : "Compra a prazo"),
          valor_debito: valorDebito,
          valor_credito: 0,
          desconto: Number(desconto) || 0,
          data_vencimento: vencimento || null,
          banco_id: null,
          meio_pagamento_id: null,
          forma_pagamento: null,
        };
      } else if (tipo === "pagamento") {
        payload = { ...base, tipo: "pagamento", descricao: descricao || "Pagamento", valor_debito: 0, valor_credito: valorInformado };
      } else if (tipo === "credito") {
        payload = { ...base, tipo: "credito", descricao: descricao || t.creditoLabel, valor_debito: 0, valor_credito: valorInformado };
      } else {
        payload = {
          ...base,
          tipo: "ajuste",
          descricao: descricao || "Ajuste",
          valor_debito: ajusteSentido === "debito" ? valorInformado : 0,
          valor_credito: ajusteSentido === "credito" ? valorInformado : 0,
          banco_id: null,
        };
      }

      const { data: lanc, error: e3 } = await supabase
        .from("contas_correntes_lancamentos").insert(payload).select("id, saldo_apos").single();
      if (e3) throw e3;

      // itens da venda/compra
      if (tipo === "debito") {
        const linhas = itens
          .filter((i) => i.descricao || Number(i.valor_unitario) > 0)
          .map((i) => ({
            user_id,
            lancamento_id: lanc.id,
            produto_id: i.produto_id,
            servico_id: i.servico_id,
            descricao: i.descricao || "Item",
            quantidade: Number(i.quantidade) || 1,
            valor_unitario: Number(i.valor_unitario) || 0,
            valor_total: (Number(i.quantidade) || 0) * (Number(i.valor_unitario) || 0),
          }));
        if (linhas.length) {
          const { error } = await supabase.from("contas_correntes_itens").insert(linhas as any);
          if (error) throw error;
        }
      }

      // entrada/saída no banco escolhido (Conciliação e Dashboard)
      if ((tipo === "pagamento" || tipo === "credito") && bancoId && valorInformado > 0) {
        if (cliente) {
          const { data: cr, error } = await supabase.from("contas_receber").insert({
            user_id,
            cliente_id: parceiro.id,
            pagador_nome: parceiro.nome,
            descricao: `${tipo === "credito" ? "Haver" : "Pagamento"} — conta do cliente ${parceiro.nome}`,
            valor_parcela: valorInformado,
            data_vencimento: data,
            data_recebimento: data,
            valor_recebido: valorInformado,
            status: "recebido",
            banco_id: bancoId,
            meio_pagamento_id: meioId,
            categoria_id: categoriaId,
            observacao: observacao || null,
            origem_tipo: "conta_receber",
            origem_id: lanc.id,
          } as any).select("id").single();
          if (error) throw error;
          await supabase.from("contas_correntes_lancamentos").update({ conta_financeira_id: cr.id }).eq("id", lanc.id);
        } else {
          const { data: cp, error } = await supabase.from("contas_pagar").insert({
            user_id,
            descricao: `${tipo === "credito" ? "Adiantamento" : "Pagamento"} — conta do fornecedor ${parceiro.nome}`,
            valor_previsto: valorInformado,
            data_vencimento: data,
            data_pagamento: data,
            valor_pago: valorInformado,
            status: "pago",
            banco_id: bancoId,
            meio_pagamento_id: meioId,
            categoria_id: categoriaId,
            observacao: observacao || null,
            origem_tipo: "conta_pagar",
            origem_id: lanc.id,
          } as any).select("id").single();
          if (error) throw error;
          await supabase.from("contas_correntes_lancamentos").update({ conta_financeira_id: cp.id }).eq("id", lanc.id);
        }
      }

      return { movimento: tipo === "debito" ? valorDebito : valorInformado };
    },
    onSuccess: ({ movimento }) => {
      qc.invalidateQueries();
      const anterior = saldoDevedor - saldoCredito;
      const delta = tipo === "debito" ? movimento : -movimento;
      setConfirmacao({ anterior: Math.max(anterior, 0), movimento, novo: anterior + delta, excedente });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const podeSalvar = tipo === "debito" ? valorDebito > 0 : valorInformado > 0;

  if (confirmacao) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Lançamento registrado</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <Linha label="Saldo anterior" value={formatBRL(confirmacao.anterior)} />
            <Linha label={tipo === "debito" ? t.debitoLabel : TIPO_LABEL[tipo === "pagamento" ? "pagamento" : tipo === "credito" ? "credito" : "ajuste"]} value={formatBRL(confirmacao.movimento)} />
            <Linha
              label={confirmacao.novo < -0.005 ? "Crédito disponível" : "Novo saldo devedor"}
              value={formatBRL(Math.abs(confirmacao.novo))}
              destaque
            />
            {confirmacao.excedente > 0.005 && (
              <p className="rounded-md border border-sky-500/30 bg-sky-500/10 p-2 text-xs text-sky-500">
                O valor recebido passou do saldo devedor. O excedente de {formatBRL(confirmacao.excedente)} ficou como crédito (haver) do {t.parceiro.toLowerCase()}.
              </p>
            )}
          </div>
          <DialogFooter><Button onClick={onClose}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {tipo === "debito" ? t.debitoLabel : tipo === "pagamento" ? t.pagamentoLabel : tipo === "credito" ? t.creditoLabel : "Lançar ajuste"}
          </DialogTitle>
          <DialogDescription>
            {parceiro.nome} · saldo atual {formatBRL(saldoDevedor)}
            {saldoCredito > 0.005 ? ` · crédito disponível ${formatBRL(saldoCredito)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div><Label>Data *</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>

          {tipo === "debito" ? (
            <div><Label>Vencimento (opcional)</Label><Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} /></div>
          ) : (
            <div>
              <Label>{tipo === "pagamento" ? "Valor recebido *" : "Valor *"}</Label>
              <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
            </div>
          )}

          {tipo === "ajuste" && (
            <div className="col-span-2">
              <Label>Sentido do ajuste</Label>
              <Select value={ajusteSentido} onValueChange={(v) => setAjusteSentido(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credito">Reduzir o saldo devedor (crédito)</SelectItem>
                  <SelectItem value="debito">Aumentar o saldo devedor (débito)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {tipo !== "debito" && tipo !== "ajuste" && (
            <>
              <div><Label>Forma de pagamento</Label>
                <MeioPagamentoSelect valueId={meioId} valueNome={meioNome} onChange={(id, nome) => { setMeioId(id); setMeioNome(nome); }} />
              </div>
              <div><Label>Banco da movimentação</Label>
                <EntitySelect table="bancos" value={bancoId} onChange={setBancoId} />
              </div>
              <div className="col-span-2 -mt-1 text-xs text-muted-foreground">
                Com um banco selecionado, o valor entra na Conciliação e no Dashboard. Sem banco, o movimento fica apenas na conta do {t.parceiro.toLowerCase()}.
              </div>
              <div className="col-span-2"><Label>Categoria (opcional)</Label>
                <CategoriaSelect tipos={[cliente ? "receita" : "despesa"]} valueId={categoriaId} valueNome={null} onChange={(id) => setCategoriaId(id)} />
              </div>
            </>
          )}

          <div className="col-span-2"><Label>Descrição</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={tipo === "debito" ? (cliente ? "Ex.: compra no balcão" : "Ex.: compra de peças") : "Opcional"} /></div>

          {tipo === "debito" && (
            <div className="col-span-2 space-y-2 rounded-lg border border-border p-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Produtos / serviços</Label>
              {itens.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Input className="col-span-6" placeholder="Descrição do item" value={it.descricao}
                    onChange={(e) => setItens((p) => p.map((x, idx) => idx === i ? { ...x, descricao: e.target.value } : x))} />
                  <Input className="col-span-2" type="number" step="0.01" placeholder="Qtd" value={it.quantidade}
                    onChange={(e) => setItens((p) => p.map((x, idx) => idx === i ? { ...x, quantidade: e.target.value } : x))} />
                  <Input className="col-span-3" type="number" step="0.01" placeholder="Valor unit." value={it.valor_unitario}
                    onChange={(e) => setItens((p) => p.map((x, idx) => idx === i ? { ...x, valor_unitario: e.target.value } : x))} />
                  <div className="col-span-1 flex items-center justify-end text-xs text-muted-foreground">
                    {formatBRL((Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0))}
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm"
                onClick={() => setItens((p) => [...p, { descricao: "", quantidade: "1", valor_unitario: "", produto_id: null, servico_id: null }])}>
                <Plus className="mr-1 h-4 w-4" />Adicionar item
              </Button>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div><Label className="text-xs">Desconto</Label><Input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} /></div>
                <div className="flex flex-col justify-end text-right">
                  <span className="text-xs text-muted-foreground">Valor total da {cliente ? "venda" : "compra"}</span>
                  <span className="text-lg font-bold">{formatBRL(valorDebito)}</span>
                </div>
              </div>
              {saldoCredito > 0.005 && (
                <p className="rounded-md border border-sky-500/30 bg-sky-500/10 p-2 text-xs text-sky-500">
                  Existe crédito de {formatBRL(saldoCredito)} nesta conta. Ele é abatido automaticamente desta {cliente ? "venda" : "compra"}:
                  o saldo devedor gerado será {formatBRL(Math.max(valorDebito - saldoCredito, 0))}.
                </p>
              )}
            </div>
          )}

          {tipo === "pagamento" && excedente > 0.005 && (
            <p className="col-span-2 rounded-md border border-sky-500/30 bg-sky-500/10 p-2 text-xs text-sky-500">
              O valor passa o saldo devedor de {formatBRL(saldoDevedor)}. O excedente de {formatBRL(excedente)} será registrado como crédito (haver).
            </p>
          )}

          <div className="col-span-2"><Label>Observação</Label><Textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} /></div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={!podeSalvar || salvar.isPending} onClick={() => salvar.mutate()}>
            {salvar.isPending ? "Salvando..." : tipo === "pagamento" ? "Confirmar pagamento" : "Salvar lançamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Linha({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-md px-2 py-1.5 ${destaque ? "bg-muted/40 font-bold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
