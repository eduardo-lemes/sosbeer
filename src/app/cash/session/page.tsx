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
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Caixa</h1>
            <p className="mt-1 text-sm text-muted-foreground">Abra o caixa para começar a vender.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/cash" className="btn-ghost">Voltar ao PDV</Link>
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm font-semibold">Caixa fechado</div>
          <div className="mt-1 text-sm text-muted-foreground">Informe o valor inicial (dinheiro) para abrir.</div>
          <CashSessionPanel mode="open" />
        </div>
      </div>
    );
  }

  // Get payment totals by method for this session
  const completedSales = await queryAll<Sale>("sales", {
    where: [["cashSessionId", "==", session.id], ["status", "==", "COMPLETED"]],
  });
  const saleIds = completedSales.map((s) => s.id);

  // Sum payments by method
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

  // Session movements
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Caixa</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe e feche o caixa.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/cash" className="btn-ghost">Voltar ao PDV</Link>
          <Link href="/sales" className="btn-ghost">Vendas</Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Caixa atual</div>
              <div className="mt-1 text-sm text-muted-foreground">Aberto em {session.openedAt.toLocaleString("pt-BR")}.</div>
              {session.openNote ? <div className="mt-2 text-sm text-muted-foreground">Obs.: {session.openNote}</div> : null}
            </div>
            <div className="rounded-[var(--radius-lg)] border border-border bg-muted/20 px-4 py-3 text-right">
              <div className="text-xs text-muted-foreground">Dinheiro esperado</div>
              <div className="text-lg font-semibold">{formatMoney(expectedCash)}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Metric label="Abertura (dinheiro)" value={formatMoney(session.openingCash)} tone="neutral" />
            <Metric label="Vendas (total)" value={formatMoney(salesTotal)} tone="neutral" />
            <Metric label="Dinheiro (vendas)" value={formatMoney(cashSales)} tone="good" />
            <Metric label="Pix" value={formatMoney(pixSales)} tone="info" />
            <Metric label="Débito" value={formatMoney(debitSales)} tone="info" />
            <Metric label="Crédito" value={formatMoney(creditSales)} tone="info" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Metric label="Suprimento" value={formatMoney(supplies)} tone="good" />
            <Metric label="Sangria" value={formatMoney(withdrawals)} tone="bad" />
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm font-semibold">Movimentações</div>
          <div className="mt-1 text-sm text-muted-foreground">Suprimento/Sangria e fechamento.</div>
          <CashSessionPanel mode="manage" expectedCash={expectedCash.toString()} />
          <div className="mt-4 text-xs text-muted-foreground">
            Vendas: {salesCount} venda(s) nesta sessão.
          </div>
        </div>
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
