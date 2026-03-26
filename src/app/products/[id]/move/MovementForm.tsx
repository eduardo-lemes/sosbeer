"use client";

import { useActionState } from "react";
import type { FormState } from "../../actions";

export function MovementForm({
  action,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <div className="mb-1 text-sm font-medium">Tipo</div>
          <select name="type" className="select">
            <option value="ENTRY">Entrada</option>
            <option value="EXIT">Saída</option>
            <option value="ADJUSTMENT">Ajuste (novo saldo)</option>
          </select>
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium">Quantidade (entrada/saída)</div>
          <input
            name="quantity"
            type="number"
            step="1"
            className="input"
            placeholder="ex: 1"
            inputMode="numeric"
            onInput={(e) => {
              const el = e.currentTarget;
              el.value = el.value.replace(/[.,].*$/, "");
            }}
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-medium">Novo saldo (ajuste)</div>
          <input
            name="newStock"
            type="number"
            step="1"
            className="input"
            placeholder="ex: 10"
            inputMode="numeric"
            onInput={(e) => {
              const el = e.currentTarget;
              el.value = el.value.replace(/[.,].*$/, "");
            }}
          />
        </label>
      </div>

      <label className="block">
        <div className="mb-1 text-sm font-medium">Observação</div>
        <input name="note" className="input" />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary disabled:opacity-60"
        >
          Registrar
        </button>
        {isPending ? <span className="text-sm text-muted-foreground">Salvando…</span> : null}
      </div>
    </form>
  );
}
