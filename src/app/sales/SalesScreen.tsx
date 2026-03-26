"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, formatQty } from "@/lib/format";
import { CancelSaleButton } from "./CancelSaleButton";

type SaleRow = {
  id: string;
  number: number;
  status: "COMPLETED" | "CANCELED";
  createdAtIso: string;
  total: string;
  payments: { method: string }[];
  items: { id: string; name: string; quantity: string }[];
};

const NOW = Date.now();

export function SalesScreen({ initialSales }: { initialSales: SaleRow[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"history" | "open" | "quotes">("history");
  const [query, setQuery] = useState("");
  const [hideTotal, setHideTotal] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "F3") {
        e.preventDefault();
        router.push("/cash");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialSales;

    return initialSales.filter((s) => {
      if (String(s.number).includes(q)) return true;
      if (s.payments.some((p) => paymentLabel(p.method).toLowerCase().includes(q))) return true;
      if (s.items.some((it) => it.name.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [initialSales, query]);

  const visible = useMemo(() => (tab === "history" ? filtered : []), [filtered, tab]);

  const totals = useMemo(() => {
    const cents = visible.reduce((acc, s) => acc + centsFromDecimalString(s.total), 0n);
    return { count: visible.length, cents };
  }, [visible]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Vendas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Atalho: F3 para nova venda.</p>
        </div>
        <Link href="/cash" className="btn-primary">
          Nova venda — F3
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="tabs">
          <button
            type="button"
            className={`tab ${tab === "history" ? "tab-active" : ""}`}
            onClick={() => setTab("history")}
          >
            Histórico
          </button>
          <button
            type="button"
            className={`tab ${tab === "open" ? "tab-active" : ""}`}
            onClick={() => setTab("open")}
            disabled
            title="Em breve"
          >
            Pedido em aberto
          </button>
          <button
            type="button"
            className={`tab ${tab === "quotes" ? "tab-active" : ""}`}
            onClick={() => setTab("quotes")}
            disabled
            title="Em breve"
          >
            Orçamentos
          </button>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <label className="relative w-full sm:w-[320px]">
            <span className="sr-only">Buscar</span>
            <input
              className="input pr-10"
              placeholder="Buscar por número, produto ou pagamento…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2">
              <span className="text-foreground">Últimos 7 dias:</span>
              <span className="font-semibold text-foreground">{totals.count}</span>
              <span>venda(s)</span>
              <span>—</span>
              <span className="font-semibold text-foreground">
                {hideTotal ? "••••••" : formatMoney(centsToDecimalString(totals.cents))}
              </span>
            </span>
            <button
              type="button"
              className="btn-icon h-10 w-10"
              onClick={() => setHideTotal((v) => !v)}
              title={hideTotal ? "Mostrar total" : "Ocultar total"}
              aria-label={hideTotal ? "Mostrar total" : "Ocultar total"}
            >
              {hideTotal ? "Mostrar" : "Ocultar"}
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Ação</th>
                <th>Número</th>
                <th>Resumo</th>
                <th>Tipo</th>
                <th>Data</th>
                <th>Hora</th>
                <th>Origem</th>
                <th>Itens</th>
                <th>Cliente</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={9}>
                    {query.trim() ? "Nenhuma venda encontrada." : "Sem vendas ainda."}
                  </td>
                </tr>
              ) : (
                visible.map((s) => {
                  const createdAt = new Date(s.createdAtIso);
                  const isCanceled = s.status === "CANCELED";
                  const disableCancel = NOW - createdAt.getTime() > 24 * 60 * 60 * 1000;

                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link href={`/sales/${s.id}`} className="btn-inline">
                            Abrir
                          </Link>
                          {isCanceled ? (
                            <span className="text-xs text-danger">Cancelada</span>
                          ) : (
                            <CancelSaleButton saleId={s.id} saleNumber={s.number} disabled={disableCancel} />
                          )}
                        </div>
                      </td>
                      <td className="font-medium">{s.number}</td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{formatMoney(s.total)}</span>
                          <div className="flex flex-wrap items-center gap-1">
                            {s.payments.length === 0 ? (
                              <span className="text-xs text-muted-foreground">-</span>
                            ) : (
                              s.payments.slice(0, 2).map((p, idx) => (
                                <span
                                  key={`${p.method}-${idx}`}
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${paymentPillClass(
                                    p.method,
                                  )}`}
                                >
                                  {paymentLabel(p.method)}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-muted-foreground">Venda</td>
                      <td className="text-muted-foreground">{createdAt.toLocaleDateString("pt-BR")}</td>
                      <td className="text-muted-foreground">
                        {createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="text-muted-foreground">Desktop</td>
                      <td className="text-muted-foreground">
                        {s.items.length === 0 ? (
                          "-"
                        ) : (
                          <div className="max-w-[520px] space-y-0.5">
                            {s.items.slice(0, 2).map((it) => (
                              <div key={it.id} className="truncate">
                                {formatQty(it.quantity)}x {it.name}
                              </div>
                            ))}
                            {s.items.length > 2 ? (
                              <div className="text-xs text-muted-foreground">+{s.items.length - 2} item(ns)</div>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="text-muted-foreground">-</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function paymentLabel(method: string) {
  if (method === "CASH") return "Dinheiro";
  if (method === "PIX") return "Pix";
  if (method === "DEBIT") return "Débito";
  if (method === "CREDIT") return "Crédito";
  return method;
}

function paymentPillClass(method: string) {
  if (method === "CASH") return "bg-success/12 text-success";
  if (method === "PIX") return "bg-accent/14 text-accent";
  if (method === "DEBIT") return "bg-primary/14 text-primary";
  if (method === "CREDIT") return "bg-accent/14 text-accent";
  return "bg-muted text-foreground";
}

function centsFromDecimalString(value: string): bigint {
  const raw = String(value ?? "").trim();
  if (!raw) return 0n;
  const normalized = raw.replace(",", ".");
  const negative = normalized.startsWith("-");
  const clean = negative ? normalized.slice(1) : normalized;
  const [intPartRaw, fracRaw] = clean.split(".");
  const intPart = (intPartRaw ?? "").replace(/\D/g, "") || "0";
  const frac2 = (fracRaw ?? "").replace(/\D/g, "").padEnd(2, "0").slice(0, 2);
  const cents = BigInt(intPart) * 100n + BigInt(frac2);
  return negative ? -cents : cents;
}

function centsToDecimalString(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const intPart = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${intPart.toString()}.${frac}`;
}
