import Link from "next/link";
import { queryAll, type CashSession, type SalePayment, type Sale, type CashSessionMovement } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { CashSessionPanel } from "./sessionPanel";

export default async function CashSessionPage() {
  const sessions = await queryAll<CashSession>("cashSessions", {
    where: [["closedAt", "==", null]],
    orderBy: [["openedAt", "desc"]],
    limit: 1,
  });

  const session = sessions.length > 0 ? sessions[0]! : null;

  if (!session) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Caixa</h1>
            <p className="mt-1 text-sm text-muted-foreground">Abra o caixa para começar a vender.</p>
          </div>
          <Link href="/cash" className="btn-ghost">Voltar ao PDV</Link>
        </div>

        <section className="card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-xs text-primary">🔓</span>
              Abrir caixa
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Informe o valor inicial (dinheiro) para abrir.</p>
          </div>
          <div className="p-5">
            <CashSessionPanel mode="open" />
          </div>
        </section>
      </div>
    );
  }

  const completedSales = await queryAll<Sale>("sales", {
    where: [["cashSessionId", "==", session.id], ["status", "==", "COMPLETED"]],
  });
  const saleIds = completedSales.map((s) => s.id);

  const byMethod = new Map<string, number>();
  let salesTotal = 0;
  let salesCount = 0;
  for (const sale of completedSales) {
    salesTotal += sale.total;
    salesCount++;
  }
  for (let i = 0; i < saleIds.length; i += 30) {
    const chunk = saleIds.slice(i, i + 30);
    const payments = await queryAll<SalePayment>("salePayments", {
      where: [["saleId", "in", chunk]],
    });
    for (const p of payments) {
      byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);
    }
  }

  const sessionMovements = await queryAll<CashSessionMovement>("cashSessionMovements", {
    where: [["cashSessionId", "==", session.id]],
  });
  const byMove = new Map<string, number>();
  for (const m of sessionMovements) {
    byMove.set(m.type, (byMove.get(m.type) ?? 0) + m.amount);
  }

  const cashSales = byMethod.get("CASH") ?? 0;
  const pixSales = byMethod.get("PIX") ?? 0;
  const debitSales = byMethod.get("DEBIT") ?? 0;
  const creditSales = byMethod.get("CREDIT") ?? 0;
  const supplies = byMove.get("SUPPLY") ?? 0;
  const withdrawals = byMove.get("WITHDRAWAL") ?? 0;

  const expectedCash = session.openingCash + cashSales + supplies - withdrawals;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Caixa</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe e feche o caixa.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/cash" className="btn-ghost">Voltar ao PDV</Link>
          <Link href="/sales" className="btn-ghost">Vendas</Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        {/* ── Resumo da sessão ── */}
        <section className="card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-success/15 text-xs text-success">📊</span>
                Caixa atual
              </h2>
              <div className="rounded-[var(--radius-lg)] border border-border bg-muted/20 px-4 py-2 text-right">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Dinheiro esperado</div>
                <div className="text-lg font-semibold">{formatMoney(expectedCash)}</div>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="text-sm text-muted-foreground">
              Aberto em {session.openedAt.toLocaleString("pt-BR")}.
              {session.openNote ? <span className="ml-2">Obs.: {session.openNote}</span> : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Metric label="Abertura (dinheiro)" value={formatMoney(session.openingCash)} tone="neutral" />
              <Metric label="Vendas (total)" value={formatMoney(salesTotal)} tone="neutral" />
              <Metric label="Dinheiro (vendas)" value={formatMoney(cashSales)} tone="good" />
              <Metric label="Pix" value={formatMoney(pixSales)} tone="info" />
              <Metric label="Débito" value={formatMoney(debitSales)} tone="info" />
              <Metric label="Crédito" value={formatMoney(creditSales)} tone="info" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Metric label="Suprimento" value={formatMoney(supplies)} tone="good" />
              <Metric label="Sangria" value={formatMoney(withdrawals)} tone="bad" />
            </div>
          </div>
        </section>

        {/* ── Movimentações ── */}
        <section className="card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-xs text-accent">🔄</span>
              Movimentações
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Suprimento/Sangria e fechamento.</p>
          </div>
          <div className="p-5">
            <CashSessionPanel mode="manage" expectedCash={expectedCash.toString()} />
            <div className="mt-4 rounded-[var(--radius-lg)] border border-border bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
              Vendas: <span className="font-semibold text-foreground">{salesCount}</span> venda(s) nesta sessão.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "neutral" | "good" | "bad" | "info" }) {
  const toneClass =
    tone === "good"
      ? "border-success/30 bg-success/10 text-success"
      : tone === "info"
        ? "border-accent/30 bg-accent/10 text-accent"
        : tone === "bad"
          ? "border-danger/30 bg-danger/10 text-danger"
          : "border-border bg-surface text-foreground";
  return (
    <div className={`rounded-[var(--radius-lg)] border px-4 py-3 ${toneClass}`}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold leading-none">{value}</div>
    </div>
  );
}
