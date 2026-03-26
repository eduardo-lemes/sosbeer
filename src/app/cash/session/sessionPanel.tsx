"use client";

import { useActionState, useMemo, useState } from "react";
import { MoneyInput } from "@/app/products/MoneyInput";
import { addCashSessionMovement, closeCashSession, openCashSession, type CashSessionFormState } from "./actions";
import { formatMoney } from "@/lib/format";

export function CashSessionPanel({
  mode,
  expectedCash,
}: {
  mode: "open" | "manage";
  expectedCash?: string;
}) {
  if (mode === "open") return <OpenPanel />;
  return <ManagePanel expectedCash={expectedCash ?? "0"} />;
}

function OpenPanel() {
  const [state, action, pending] = useActionState<CashSessionFormState, FormData>(openCashSession, {});

  return (
    <form action={action} className="mt-4 space-y-3">
      {state.message ? (
        <div className="rounded-[var(--radius-lg)] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[260px_1fr]">
        <MoneyInput name="openingCash" label="Abertura (dinheiro) *" required />
        <label className="block">
          <div className="mb-1 text-sm font-medium">Observação</div>
          <input className="input" name="openNote" placeholder="Opcional" />
        </label>
      </div>

      <button className="btn-primary" disabled={pending}>
        {pending ? "Abrindo..." : "Abrir caixa"}
      </button>
    </form>
  );
}

function ManagePanel({ expectedCash }: { expectedCash: string }) {
  const expected = useMemo(() => Number(expectedCash), [expectedCash]);

  const [moveState, moveAction, movePending] = useActionState<CashSessionFormState, FormData>(addCashSessionMovement, {});
  const [closeState, closeAction, closePending] = useActionState<CashSessionFormState, FormData>(closeCashSession, {});

  const [closingCashValue, setClosingCashValue] = useState<number | null>(null);
  const diff = useMemo(() => {
    if (closingCashValue == null) return null;
    const d = closingCashValue - expected;
    return Number.isFinite(d) ? d : null;
  }, [closingCashValue, expected]);

  return (
    <div className="mt-4 space-y-5">
      {moveState.message ? (
        <div className="rounded-[var(--radius-lg)] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {moveState.message}
        </div>
      ) : null}

      <form action={moveAction} className="grid gap-3 md:grid-cols-[220px_260px_1fr_180px]">
        <label className="block">
          <div className="mb-1 text-sm font-medium">Tipo</div>
          <select className="select" name="type">
            <option value="SUPPLY">Suprimento</option>
            <option value="WITHDRAWAL">Sangria</option>
          </select>
        </label>
        <MoneyInput name="amount" label="Valor *" required />
        <label className="block">
          <div className="mb-1 text-sm font-medium">Observação</div>
          <input className="input" name="note" placeholder="Opcional" />
        </label>
        <div className="flex items-end">
          <button className="btn-ghost w-full" disabled={movePending}>
            {movePending ? "Registrando..." : "Registrar"}
          </button>
        </div>
      </form>

      <div className="border-t border-border pt-5">
        <div className="text-sm font-semibold">Fechamento</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Informe o dinheiro em caixa para fechar. Esperado: <span className="font-semibold text-foreground">{formatMoney(expected)}</span>.
        </div>

        {closeState.message ? (
          <div className="mt-3 rounded-[var(--radius-lg)] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {closeState.message}
          </div>
        ) : null}

        <form action={closeAction} className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-[260px_1fr]">
            <MoneyInput
              name="closingCash"
              label="Dinheiro informado (fechamento) *"
              required
              onValueChange={(v) => setClosingCashValue(v)}
            />
            <label className="block">
              <div className="mb-1 text-sm font-medium">Observação</div>
              <input className="input" name="closeNote" placeholder="Opcional" />
            </label>
          </div>

          {diff != null ? (
            <div
              className={`rounded-[var(--radius-lg)] border px-4 py-3 text-sm ${
                Math.abs(diff) < 0.005 ? "border-border bg-surface" : diff < 0 ? "border-danger/30 bg-danger/10 text-danger" : "border-accent/30 bg-accent/10 text-accent"
              }`}
            >
              Diferença: <span className="font-semibold">{formatMoney(diff)}</span>
            </div>
          ) : null}

          <button className="btn-primary" disabled={closePending}>
            {closePending ? "Fechando..." : "Fechar caixa"}
          </button>
        </form>
      </div>
    </div>
  );
}

