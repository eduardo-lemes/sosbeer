"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { finalizeSale, type CashFormState } from "./actions";
import { MoneyInput } from "@/app/products/MoneyInput";
import { formatMoney, formatQty } from "@/lib/format";

type ProductHit = {
  id: string;
  name: string;
  internalCode: string;
  eanGtin: string | null;
  imageUrl?: string | null;
  salePrice: string;
  trackStock: boolean;
  stock: string;
};

type CartLine = {
  productId: string;
  name: string;
  imageUrl?: string | null;
  price: number;
  quantity: number;
  trackStock: boolean;
  stock: number;
};

type PaymentLine = { method: "CASH" | "PIX" | "DEBIT" | "CREDIT"; amount: number };

export function CashRegister() {
  const [state, formAction, isPending] = useActionState<CashFormState, FormData>(finalizeSale, {});

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductHit[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState("");

  const [payments, setPayments] = useState<PaymentLine[]>([{ method: "CASH", amount: 0 }]);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const shownResults = useMemo(() => (query.trim() ? results : []), [query, results]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, l) => acc + l.price * l.quantity, 0);
    const total = subtotal;
    const nonCashPaid = payments
      .filter((p) => p.method !== "CASH")
      .reduce((acc, p) => acc + (p.amount || 0), 0);
    const cashPaid = payments.filter((p) => p.method === "CASH").reduce((acc, p) => acc + (p.amount || 0), 0);
    const paid = nonCashPaid + cashPaid;
    const maxCashForSale = Math.max(0, total - nonCashPaid);
    const change = Math.max(0, cashPaid - maxCashForSale);
    const remaining = Math.max(0, total - paid);
    return { subtotal, total, paid, change, remaining };
  }, [cart, payments]);

  const paymentIssues = useMemo(() => {
    const subtotal = cart.reduce((acc, l) => acc + l.price * l.quantity, 0);
    const total = subtotal;
    const nonCashPaid = payments
      .filter((p) => p.method !== "CASH")
      .reduce((acc, p) => acc + (p.amount || 0), 0);
    const cashPaid = payments.filter((p) => p.method === "CASH").reduce((acc, p) => acc + (p.amount || 0), 0);
    const paid = nonCashPaid + cashPaid;

    if (total <= 0) return { message: null };
    if (nonCashPaid > total + 0.00001) return { message: "Pix/Débito/Crédito não pode passar do total da venda." };
    if (paid > total + 0.00001 && cashPaid <= 0) return { message: "Troco só é possível quando tiver Dinheiro." };
    return { message: null };
  }, [cart, payments]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/products/search?q=${encodeURIComponent(q)}&take=20`, { signal: ctrl.signal })
        .then(async (res) => (await res.json()) as { items: ProductHit[] })
        .then((data) => setResults(data.items))
        .catch(() => {});
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  function addToCart(hit: ProductHit) {
    const price = Number(hit.salePrice);
    const stock = Number(hit.stock);
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.productId === hit.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          productId: hit.id,
          name: hit.name,
          imageUrl: hit.imageUrl ?? null,
          price,
          quantity: 1,
          trackStock: hit.trackStock,
          stock,
        },
      ];
    });
    setQuery("");
    setResults([]);
    searchRef.current?.focus();
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  function setQty(productId: string, qty: number) {
    if (!Number.isFinite(qty) || qty <= 0) return;
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity: qty } : l)));
  }

  function canAdd(line: CartLine) {
    if (!line.trackStock) return true;
    return line.quantity < line.stock;
  }

  function buildPayload() {
    const lines = cart.map((l) => ({ productId: l.productId, quantity: String(l.quantity) }));
    const pays = payments
      .filter((p) => (p.amount ?? 0) > 0)
      .map((p) => ({ method: p.method, amount: p.amount.toFixed(2) }));
    return { lines, pays };
  }

  return (
    <form
      action={(fd) => {
        const { lines, pays } = buildPayload();
        fd.set("lines", JSON.stringify(lines));
        fd.set("payments", JSON.stringify(pays));
        fd.set("note", note);
        return formAction(fd);
      }}
      className="cash-screen grid gap-6 lg:grid-cols-[1fr_1.15fr] xl:grid-cols-[1fr_1.25fr]"
    >
      <div className="cash-left space-y-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Caixa</h1>
              <p className="mt-1 text-base text-muted-foreground">Bipe ou digite nome/código/EAN e pressione Enter.</p>
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setCart([]);
                setPayments([{ method: "CASH", amount: 0 }]);
                setNote("");
                setQuery("");
                setResults([]);
                searchRef.current?.focus();
              }}
            >
              Limpar
            </button>
          </div>

          {state.message ? (
            <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.message}
            </div>
          ) : null}

          <div className="mt-4">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"> </span>
              <input
                ref={searchRef}
                className="input pl-10"
                placeholder="Código, nome ou EAN…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const exact = results.find((r) => r.internalCode === query.trim() || r.eanGtin === query.trim());
                    if (exact) addToCart(exact);
                    else if (results[0]) addToCart(results[0]);
                  }
                }}
              />
              <div className="mt-2 text-xs text-muted-foreground">
                Dica: se tiver mais de um resultado, o Enter adiciona o primeiro.
              </div>
            </div>
          </div>

          {shownResults.length ? (
            <div className="mt-3 overflow-hidden rounded-[var(--radius-lg)] border border-border">
              <div className="border-b border-border bg-muted/40 px-5 py-3 text-sm font-semibold text-muted-foreground">
                <div className="grid grid-cols-[1fr_140px_120px_160px] items-center gap-4">
                  <div>Produto</div>
                  <div>Preço</div>
                  <div>Estoque</div>
                  <div></div>
                </div>
              </div>

              <div className="divide-y divide-border">
                {shownResults.map((r) => {
                  const stock = r.trackStock ? Number(r.stock) : null;
                  const stockTone =
                    stock == null ? "text-muted-foreground" : stock <= 0 ? "text-danger" : stock <= 3 ? "text-accent" : "text-foreground";

                  return (
                    <div key={r.id} className="px-5 py-4">
                      <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[1fr_140px_120px_160px]">
                        <div className="flex items-center gap-4">
                          {r.imageUrl ? (
                            <Image
                              src={r.imageUrl}
                              alt={r.name}
                              width={96}
                              height={96}
                              className="h-24 w-24 rounded-[var(--radius-lg)] border border-border bg-muted object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-24 w-24 rounded-[var(--radius-lg)] border border-border bg-muted/60" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="clamp-2 text-lg font-semibold leading-tight" title={r.name}>
                              {r.name}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {r.eanGtin ? `EAN: ${r.eanGtin}` : " "}
                            </div>
                          </div>
                        </div>

                        <div className="text-lg font-semibold">{formatMoney(r.salePrice)}</div>

                        <div className={`text-lg font-semibold ${stockTone}`}>
                          {r.trackStock ? formatQty(r.stock) : "—"}
                          {r.trackStock ? <span className="ml-2 text-sm font-medium text-muted-foreground">un</span> : null}
                        </div>

                        <div className="flex justify-start lg:justify-end">
                          <button type="button" className="btn-primary px-6 py-3" onClick={() => addToCart(r)}>
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Carrinho</div>
                <div className="mt-1 text-sm text-muted-foreground">{cart.length} item(ns)</div>
              </div>
              <div className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-2 text-right">
                <div className="text-xs text-muted-foreground">Subtotal</div>
                <div className="text-lg font-semibold">{formatMoney(totals.subtotal)}</div>
              </div>
            </div>
          </div>
          {cart.length === 0 ? (
            <div className="px-5 py-7 text-muted-foreground">Carrinho vazio.</div>
          ) : (
            <div className="divide-y divide-border">
              {cart.map((l) => {
                const stockTone =
                  !l.trackStock
                    ? "text-muted-foreground"
                    : l.stock <= 0
                      ? "text-danger"
                      : l.stock <= 3
                        ? "text-accent"
                        : "text-muted-foreground";

                return (
                  <div key={l.productId} className="px-5 py-3">
                    <div className="grid grid-cols-1 items-center gap-3 xl:grid-cols-[minmax(340px,1fr)_200px_120px_140px_56px]">
                      <div className="flex items-center gap-3">
                        {l.imageUrl ? (
                          <Image
                            src={l.imageUrl}
                            alt={l.name}
                            width={80}
                            height={80}
                            className="h-20 w-20 rounded-[var(--radius-lg)] border border-border bg-muted object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-20 w-20 rounded-[var(--radius-lg)] border border-border bg-muted/60" />
                        )}
                        <div className="min-w-0 flex-1 xl:min-w-[320px]">
                          <div className="clamp-2 text-lg font-semibold leading-tight" title={l.name}>
                            {l.name}
                          </div>
                          <div className={`mt-1 text-sm whitespace-nowrap ${stockTone}`}>
                            {l.trackStock ? `Estoque: ${formatQty(l.stock)} un` : "Sem controle de estoque"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="btn-icon h-12 w-12"
                          onClick={() => setQty(l.productId, l.quantity - 1)}
                          disabled={l.quantity <= 1}
                          aria-label="Diminuir quantidade"
                          title="Diminuir"
                        >
                          −
                        </button>
                        <input
                          className="input w-20 px-2 text-center text-lg"
                          inputMode="numeric"
                          value={String(l.quantity)}
                          onChange={(e) => setQty(l.productId, Number(e.target.value.replace(/[^\d]/g, "")))}
                        />
                        <button
                          type="button"
                          className="btn-icon h-12 w-12"
                          onClick={() => setQty(l.productId, l.quantity + 1)}
                          disabled={!canAdd(l)}
                          aria-label="Aumentar quantidade"
                          title="Aumentar"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Unitário</div>
                        <div className="text-xl font-semibold">{formatMoney(l.price)}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Total</div>
                        <div className="text-xl font-semibold">{formatMoney(l.price * l.quantity)}</div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="btn-icon h-12 w-12"
                          onClick={() => removeLine(l.productId)}
                          title="Remover"
                          aria-label="Remover"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>

      <div className="cash-payment space-y-4 lg:sticky lg:top-[92px] lg:self-start">
        <div className="card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">Pagamento</div>
              <div className="mt-1 text-base text-muted-foreground">
                Você pode dividir: dinheiro + pix + cartão.
              </div>
            </div>
            <div className="flex items-stretch gap-2 text-right">
              <div className="min-w-[180px] rounded-[var(--radius-lg)] border border-border bg-muted/30 px-3 py-2">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-xl font-semibold">{formatMoney(totals.total)}</div>
              </div>

              {totals.remaining > 0 ? (
                <div className="min-w-[160px] rounded-[var(--radius-lg)] border border-danger/30 bg-danger/10 px-3 py-2">
                  <div className="text-xs text-danger/90">Falta</div>
                  <div className="text-lg font-semibold text-danger">{formatMoney(totals.remaining)}</div>
                </div>
              ) : null}

              {totals.change > 0 ? (
                <div className="min-w-[160px] rounded-[var(--radius-lg)] border border-success/30 bg-success/10 px-3 py-2">
                  <div className="text-xs text-success/90">Troco</div>
                  <div className="text-lg font-semibold text-success">{formatMoney(totals.change)}</div>
                </div>
              ) : null}
            </div>
          </div>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-2 sm:grid-cols-4">
              <button
                type="button"
                className="btn-ghost justify-center text-lg"
                onClick={() => setPayments((prev) => [...prev, { method: "CASH", amount: 0 }])}
              >
                Dinheiro
              </button>
              <button
                type="button"
                className="btn-ghost justify-center text-lg"
                onClick={() => setPayments((prev) => [...prev, { method: "PIX", amount: 0 }])}
              >
                Pix
              </button>
              <button
                type="button"
                className="btn-ghost justify-center text-lg"
                onClick={() => setPayments((prev) => [...prev, { method: "DEBIT", amount: 0 }])}
              >
                Débito
              </button>
              <button
                type="button"
                className="btn-ghost justify-center text-lg"
                onClick={() => setPayments((prev) => [...prev, { method: "CREDIT", amount: 0 }])}
              >
                Crédito
              </button>
            </div>

            <div className="space-y-3">
              <div className="hidden sm:grid sm:grid-cols-[180px_280px_52px] items-center gap-3 px-3 text-sm font-semibold text-muted-foreground">
                <div>Forma</div>
                <div>Valor</div>
                <div></div>
              </div>
              {payments.map((p, idx) => (
                <div
                  key={idx}
                  className="rounded-[var(--radius-lg)] border border-border bg-muted/20 p-3"
                >
                  <div className="grid items-center gap-3 sm:grid-cols-[180px_280px_52px]">
                    <select
                      className="select"
                      value={p.method}
                      aria-label="Forma de pagamento"
                      onChange={(e) => {
                        const method = e.target.value as PaymentLine["method"];
                        setPayments((prev) => prev.map((x, i) => (i === idx ? { ...x, method } : x)));
                      }}
                    >
                      <option value="CASH">Dinheiro</option>
                      <option value="PIX">Pix</option>
                      <option value="DEBIT">Débito</option>
                      <option value="CREDIT">Crédito</option>
                    </select>

                    <div className="w-full">
                      <MoneyInput
                        name={`pay_${idx}`}
                        label="Valor"
                        hideLabel
                        defaultValue={String(p.amount ?? 0)}
                        onValueChange={(v) => {
                          setPayments((prev) => prev.map((x, i) => (i === idx ? { ...x, amount: v ?? 0 } : x)));
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn-icon h-12 w-12"
                      onClick={() => setPayments((prev) => prev.filter((_, i) => i !== idx))}
                      disabled={payments.length <= 1}
                      aria-label="Remover pagamento"
                      title="Remover"
                    >
                      ✕
                    </button>
                  </div>

                  {p.method === "CASH" ? (
                    <div className="mt-3 grid items-center gap-3 text-sm sm:grid-cols-[180px_280px_52px]">
                      <div className="text-muted-foreground">Troco (dinheiro)</div>
                      <div className="text-right font-semibold">{formatMoney(totals.change)}</div>
                      <div />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {paymentIssues.message ? (
            <div className="mt-4 rounded-[var(--radius-lg)] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {paymentIssues.message}
            </div>
          ) : null}

          <div className="mt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Total" value={formatMoney(totals.total)} tone="neutral" strong />
              <Metric label="Pago" value={formatMoney(totals.paid)} tone={totals.paid > 0 ? "good" : "neutral"} />
              {totals.remaining > 0 ? <Metric label="Falta" value={formatMoney(totals.remaining)} tone="bad" /> : null}
              {totals.change > 0 ? <Metric label="Troco" value={formatMoney(totals.change)} tone="info" /> : null}
              {totals.remaining <= 0 && totals.change <= 0 ? <Metric label="Status" value="Ok" tone="neutral" /> : null}
            </div>

            {totals.total > 0 ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                  <div>Progresso do pagamento</div>
                  <div className="font-semibold text-foreground">{Math.min(100, Math.round((totals.paid / totals.total) * 100))}%</div>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full border border-border bg-muted/40">
                  <div
                    className={`h-full ${totals.remaining > 0 ? "bg-danger/70" : "bg-success/70"}`}
                    style={{ width: `${Math.min(100, Math.round((totals.paid / totals.total) * 100))}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <label className="block">
              <div className="mb-1 text-sm font-medium">Observação</div>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {cart.length === 0 ? "Adicione itens para finalizar." : "Finalize quando estiver ok."}
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={isPending || cart.length === 0 || totals.remaining > 0 || !!paymentIssues.message}
            >
              {isPending ? "Finalizando..." : "Finalizar venda"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function Metric({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone: "neutral" | "good" | "bad" | "info";
  strong?: boolean;
}) {
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
      <div className={`mt-1 text-2xl font-semibold leading-none ${strong ? "text-foreground" : ""}`}>{value}</div>
    </div>
  );
}
