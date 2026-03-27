import Link from "next/link";
import { queryAll, getStockByProductIds, type Sale, type SalePayment, type Product, type Payable, type CashSession } from "@/lib/db";
import { formatMoney, formatQty } from "@/lib/format";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export default async function ReportsPage() {
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const today = startOfDay(now);

  const [allCompletedSales, openPayables, productsMin, lastSessions] = await Promise.all([
    queryAll<Sale>("sales", { where: [["status", "==", "COMPLETED"]] }),
    queryAll<Payable>("payables", { where: [["status", "==", "OPEN"]] }),
    queryAll<Product>("products", {
      where: [["trackStock", "==", true], ["active", "==", true]],
      orderBy: [["name", "asc"]],
      limit: 1000,
    }),
    queryAll<CashSession>("cashSessions", { orderBy: [["openedAt", "desc"]], limit: 10 }),
  ]);

  const allSales30 = allCompletedSales.filter((s) => s.createdAt >= since30);
  const salesToday = allSales30.filter((s) => s.createdAt >= today);
  const sales7 = allSales30.filter((s) => s.createdAt >= since7);

  const sumSales = (arr: Sale[]) => ({ count: arr.length, total: arr.reduce((a, s) => a + s.total, 0) });
  const salesTodayAgg = sumSales(salesToday);
  const sales7Agg = sumSales(sales7);
  const sales30Agg = sumSales(allSales30);

  const saleIds7 = sales7.map((s) => s.id);
  const paymentMap = new Map<string, number>();
  const paymentChunks: Promise<SalePayment[]>[] = [];
  for (let i = 0; i < saleIds7.length; i += 30) {
    const chunk = saleIds7.slice(i, i + 30);
    paymentChunks.push(queryAll<SalePayment>("salePayments", { where: [["saleId", "in", chunk]] }));
  }
  const allPayments = (await Promise.all(paymentChunks)).flat();
  for (const p of allPayments) paymentMap.set(p.method, (paymentMap.get(p.method) ?? 0) + p.amount);

  const payablesCount = openPayables.length;
  const payablesTotal = openPayables.reduce((a, p) => a + p.amount, 0);
  const overdue = openPayables.filter((p) => p.dueDate < startOfDay(now));
  const overdueCount = overdue.length;
  const overdueTotal = overdue.reduce((a, p) => a + p.amount, 0);

  const withMin = productsMin.filter((p) => p.stockMin != null);
  const stockMap = await getStockByProductIds(withMin.map((p) => p.id));
  const belowMin = withMin
    .map((p) => ({ p, stock: stockMap.get(p.id) ?? 0 }))
    .filter(({ p, stock }) => p.stockMin != null && stock < p.stockMin!);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Visão rápida do que está acontecendo no PDV.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sales" className="btn-ghost">Vendas</Link>
          <Link href="/stock" className="btn-ghost">Estoque</Link>
        </div>
      </div>

      {/* ── Resumo de vendas & pagamentos ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-xs text-primary">📈</span>
              Vendas
            </h2>
          </div>
          <div className="grid gap-3 p-5">
            <Metric label="Hoje" value={`${salesTodayAgg.count} venda(s) • ${formatMoney(salesTodayAgg.total)}`} tone="neutral" />
            <Metric label="Últimos 7 dias" value={`${sales7Agg.count} venda(s) • ${formatMoney(sales7Agg.total)}`} tone="neutral" />
            <Metric label="Últimos 30 dias" value={`${sales30Agg.count} venda(s) • ${formatMoney(sales30Agg.total)}`} tone="neutral" />
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-success/15 text-xs text-success">💳</span>
              Pagamentos (7 dias)
            </h2>
          </div>
          <div className="grid gap-3 p-5">
            <Metric label="Dinheiro" value={formatMoney(paymentMap.get("CASH") ?? 0)} tone="good" />
            <Metric label="Pix" value={formatMoney(paymentMap.get("PIX") ?? 0)} tone="info" />
            <Metric label="Débito" value={formatMoney(paymentMap.get("DEBIT") ?? 0)} tone="info" />
            <Metric label="Crédito" value={formatMoney(paymentMap.get("CREDIT") ?? 0)} tone="info" />
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-danger/15 text-xs text-danger">📋</span>
              Contas a pagar
            </h2>
          </div>
          <div className="grid gap-3 p-5">
            <Metric label="Em aberto" value={`${payablesCount} lançamento(s) • ${formatMoney(payablesTotal)}`} tone="neutral" />
            <Metric label="Atrasadas" value={`${overdueCount} lançamento(s) • ${formatMoney(overdueTotal)}`} tone={overdueCount > 0 ? "bad" : "neutral"} />
            <Link href="/payables" className="btn-ghost">Ver lançamentos</Link>
          </div>
        </section>
      </div>

      {/* ── Tabelas de detalhe ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-danger/15 text-xs text-danger">⚠️</span>
              Estoque abaixo do mínimo
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{belowMin.length} produto(s)</p>
          </div>
          <table className="table">
            <thead><tr><th>Produto</th><th>Código</th><th>Saldo</th><th>Mín</th></tr></thead>
            <tbody>
              {belowMin.length === 0 ? (
                <tr><td className="px-5 py-8 text-muted-foreground" colSpan={4}>Nenhum produto abaixo do mínimo.</td></tr>
              ) : (
                belowMin.slice(0, 20).map(({ p, stock }) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="font-medium">{p.name}</td>
                    <td className="text-muted-foreground">{p.internalCode}</td>
                    <td className="font-semibold">{formatQty(stock)}</td>
                    <td className="text-muted-foreground">{p.stockMin ? formatQty(p.stockMin) : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="border-t border-border bg-muted/20 px-5 py-3 text-right">
            <Link href="/stock?belowMin=1" className="text-sm text-primary hover:underline">Ver no estoque</Link>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-xs text-primary">💰</span>
              Últimos caixas
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Sessões recentes</p>
          </div>
          <table className="table">
            <thead><tr><th>Abertura</th><th>Status</th><th>Dinheiro (abertura)</th><th>Dinheiro (fechamento)</th></tr></thead>
            <tbody>
              {lastSessions.length === 0 ? (
                <tr><td className="px-5 py-8 text-muted-foreground" colSpan={4}>Nenhum caixa ainda.</td></tr>
              ) : (
                lastSessions.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="text-muted-foreground">{s.openedAt.toLocaleString("pt-BR")}</td>
                    <td className={s.closedAt ? "text-muted-foreground" : "text-success font-semibold"}>{s.closedAt ? "Fechado" : "Aberto"}</td>
                    <td className="font-semibold">{formatMoney(s.openingCash)}</td>
                    <td className="font-semibold">{s.closingCash ? formatMoney(s.closingCash) : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="border-t border-border bg-muted/20 px-5 py-3 text-right">
            <Link href="/cash/session" className="text-sm text-primary hover:underline">Abrir/fechar caixa</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "neutral" | "good" | "bad" | "info" }) {
  const toneClass =
    tone === "good" ? "border-success/30 bg-success/10 text-success"
      : tone === "info" ? "border-accent/30 bg-accent/10 text-accent"
        : tone === "bad" ? "border-danger/30 bg-danger/10 text-danger"
          : "border-border bg-surface text-foreground";
  return (
    <div className={`rounded-[var(--radius-lg)] border px-4 py-3 ${toneClass}`}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold leading-none">{value}</div>
    </div>
  );
}
