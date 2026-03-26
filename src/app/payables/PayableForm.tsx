"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { PayablesFormState } from "./actions";
import { CatalogPicker } from "@/components/CatalogPicker";
import { MoneyInput } from "@/app/products/MoneyInput";
import { DateInput } from "@/components/DateInput";

export function PayableForm({
  action,
  supplierSuggestions,
  categorySuggestions,
}: {
  action: (prev: PayablesFormState, formData: FormData) => Promise<PayablesFormState>;
  supplierSuggestions: string[];
  categorySuggestions: string[];
}) {
  const [state, formAction, isPending] = useActionState<PayablesFormState, FormData>(action, {});
  const [supplierName, setSupplierName] = useState("");
  const [suppliers, setSuppliers] = useState<string[]>(supplierSuggestions);
  const [categoryName, setCategoryName] = useState("");
  const [categories, setCategories] = useState<string[]>(categorySuggestions);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const categoryDialogRef = useRef<HTMLDialogElement | null>(null);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => setSuppliers(supplierSuggestions), [supplierSuggestions]);
  useEffect(() => setCategories(categorySuggestions), [categorySuggestions]);

  const today = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }, []);

  const [status, setStatus] = useState<"OPEN" | "PAID" | "CANCELED">("OPEN");
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatMonths, setRepeatMonths] = useState("1");

  async function refreshSuppliers() {
    const res = await fetch("/api/catalog/suppliers", { method: "GET" });
    if (!res.ok) return;
    const data = (await res.json()) as { suppliers: string[] };
    setSuppliers(data.suppliers ?? []);
  }

  async function refreshCategories() {
    const res = await fetch("/api/catalog/payable-categories", { method: "GET" });
    if (!res.ok) return;
    const data = (await res.json()) as { categories: string[] };
    setCategories(data.categories ?? []);
  }

  async function quickCreateSupplier() {
    const name = newSupplierName.trim();
    if (!name) return;
    try {
      setBusy(true);
      setMessage("");
      const res = await fetch("/api/catalog/suppliers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setMessage(body?.message ?? "Não foi possível criar o fornecedor.");
        return;
      }
      const created = (await res.json()) as { name: string };
      setSupplierName(created.name);
      setNewSupplierName("");
      dialogRef.current?.close();
      await refreshSuppliers();
    } finally {
      setBusy(false);
    }
  }

  async function quickCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      setBusy(true);
      setMessage("");
      const res = await fetch("/api/catalog/payable-categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setMessage(body?.message ?? "Não foi possível criar a categoria.");
        return;
      }
      const created = (await res.json()) as { name: string };
      setCategoryName(created.name);
      setNewCategoryName("");
      categoryDialogRef.current?.close();
      await refreshCategories();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="text-sm font-semibold">Nova conta</div>
      {state.message ? (
        <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      ) : null}

      <form action={formAction} className="mt-4 grid grid-cols-12 gap-4">
        <label className="col-span-12 lg:col-span-6">
          <div className="mb-1 text-sm font-medium">Descrição *</div>
          <input name="description" className="input" placeholder="ex: Energia elétrica" required />
        </label>

        <div className="col-span-12 lg:col-span-3">
          <MoneyInput name="amount" label="Valor *" required defaultValue="" />
        </div>

        <DateInput
          name="dueDate"
          label="Vencimento"
          required
          defaultValueISO={today}
          className="col-span-12 lg:col-span-3"
        />

        <div className="col-span-12 lg:col-span-4">
          <div className="mb-1 text-sm font-medium">Fornecedor</div>
          <input type="hidden" name="supplierName" value={supplierName} />
          <div className="flex gap-2">
            <CatalogPicker
              value={supplierName}
              onChange={(v) => setSupplierName(v)}
              placeholder="Selecione um fornecedor"
              options={suppliers}
            />
            <button
              type="button"
              className="btn-inline shrink-0"
              onClick={() => {
                setMessage("");
                setNewSupplierName(supplierName.trim());
                dialogRef.current?.showModal();
              }}
            >
              Criar
            </button>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <div className="mb-1 text-sm font-medium">Categoria</div>
          <input type="hidden" name="categoryName" value={categoryName} />
          <div className="flex gap-2">
            <CatalogPicker
              value={categoryName}
              onChange={(v) => setCategoryName(v)}
              placeholder="Selecione uma categoria"
              options={categories}
            />
            <button
              type="button"
              className="btn-inline shrink-0"
              onClick={() => {
                setMessage("");
                setNewCategoryName(categoryName.trim());
                categoryDialogRef.current?.showModal();
              }}
            >
              Criar
            </button>
          </div>
        </div>

        <label className="col-span-12 lg:col-span-8">
          <div className="mb-1 text-sm font-medium">Linha digitável / código (scanner)</div>
          <input
            name="barcode"
            className="input"
            placeholder="Bipe aqui ou cole a linha digitável…"
            autoComplete="off"
            inputMode="numeric"
          />
        </label>

        <label className="col-span-12 lg:col-span-4">
          <div className="mb-1 text-sm font-medium">Status</div>
          <select
            className="select"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="OPEN">Aberta</option>
            <option value="PAID">Paga</option>
            <option value="CANCELED">Cancelada</option>
          </select>
        </label>

        <div className="col-span-12 lg:col-span-4">
          <DateInput name="paidAt" label="Pago em" defaultValueISO={today} disabled={status !== "PAID"} />
          {status !== "PAID" ? (
            <div className="mt-1 text-xs text-muted-foreground">Disponível quando status = Paga.</div>
          ) : null}
        </div>

        <div className="col-span-12 lg:col-span-4">
          <div className="mb-1 text-sm font-medium">Recorrência</div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="toggle">
              <input
                type="checkbox"
                className="sr-only peer"
                name="repeatEnabled"
                checked={repeatEnabled}
                onChange={(e) => setRepeatEnabled(e.target.checked)}
              />
              <span className="toggle-track peer-checked:border-primary/40 peer-checked:bg-primary">
                <span className="toggle-thumb peer-checked:translate-x-5" />
              </span>
              <span>Repetir</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">por</div>
              <input
                name="repeatMonths"
                className="input w-24 text-center"
                inputMode="numeric"
                value={repeatMonths}
                onChange={(e) => setRepeatMonths(e.target.value.replace(/[^\d]/g, ""))}
                disabled={!repeatEnabled}
              />
              <div className="text-sm text-muted-foreground">meses</div>
            </div>
          </div>
        </div>

        <label className="col-span-12">
          <div className="mb-1 text-sm font-medium">Observação</div>
          <input name="note" className="input" placeholder="Opcional" />
        </label>

        <div className="col-span-12 flex items-center justify-end">
          <button className="btn-primary" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar conta"}
          </button>
        </div>
      </form>

      <dialog
        ref={dialogRef}
        className="modal"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
        onCancel={(e) => {
          e.preventDefault();
          dialogRef.current?.close();
        }}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">Novo fornecedor</div>
            <div className="modal-subtitle">Ele vai aparecer nas sugestões imediatamente.</div>
          </div>
          <button type="button" className="btn-icon" onClick={() => dialogRef.current?.close()} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {message ? (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{message}</div>
          ) : null}
          <input
            className="input"
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
            placeholder="ex: Companhia X"
            autoFocus
          />
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={() => dialogRef.current?.close()} disabled={busy}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={quickCreateSupplier} disabled={busy}>
              Criar
            </button>
          </div>
        </div>
      </dialog>

      <dialog
        ref={categoryDialogRef}
        className="modal"
        onClick={(e) => {
          if (e.target === e.currentTarget) categoryDialogRef.current?.close();
        }}
        onCancel={(e) => {
          e.preventDefault();
          categoryDialogRef.current?.close();
        }}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">Nova categoria</div>
            <div className="modal-subtitle">Ela vai aparecer nas sugestões imediatamente.</div>
          </div>
          <button type="button" className="btn-icon" onClick={() => categoryDialogRef.current?.close()} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {message ? (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{message}</div>
          ) : null}
          <input
            className="input"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="ex: Despesas fixas"
            autoFocus
          />
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={() => categoryDialogRef.current?.close()} disabled={busy}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={quickCreateCategory} disabled={busy}>
              Criar
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
