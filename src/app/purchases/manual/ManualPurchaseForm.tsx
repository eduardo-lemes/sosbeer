"use client";

import { useMemo, useState } from "react";
import { ProductSearchPicker } from "../[id]/ProductSearchPicker";
import { CostInput } from "../[id]/CostInput";
import { DateInput } from "@/components/DateInput";

type Row = { key: string };

function uid() {
  return Math.random().toString(16).slice(2);
}

export function ManualPurchaseForm({ supplierSuggestions }: { supplierSuggestions: string[] }) {
  const [rows, setRows] = useState<Row[]>([{ key: uid() }]);

  const datalistId = useMemo(() => `suppliers_${uid()}`, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="block md:col-span-2">
          <div className="mb-1 text-sm font-medium">Fornecedor</div>
          <input className="input" name="supplierName" list={datalistId} placeholder="Ex: Cervejaria X" />
          <datalist id={datalistId}>
            {supplierSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <div className="mb-1 text-sm font-medium">Nota (número)</div>
          <input className="input" name="invoiceNumber" placeholder="Ex: 169665" />
        </label>
        <label className="block">
          <div className="mb-1 text-sm font-medium">Série</div>
          <input className="input" name="series" placeholder="Ex: 1" />
        </label>
        <DateInput name="issuedAt" label="Emissão" compact className="block" />
        <DateInput name="dueAt" label="Vencimento (opcional)" compact className="block" />
      </div>

      <label className="block">
        <div className="mb-1 text-sm font-medium">Observação</div>
        <input className="input" name="note" placeholder="Ex: compra balcão / sem XML" />
      </label>

      <div className="card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-4">
          <div className="text-sm font-semibold">Itens</div>
          <div className="mt-1 text-xs text-muted-foreground">Quantidade (em unidades do seu estoque).</div>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-compact text-sm">
            <thead>
              <tr>
                <th className="min-w-[520px]">Produto</th>
                <th className="w-[140px]">Quantidade</th>
                <th className="w-[170px]">Custo (un.)</th>
                <th className="w-[120px] text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.key} className="border-t border-border align-top">
                  <td>
                    <ProductSearchPicker name={`productId_${idx}`} compact placeholder="Digite nome, código ou EAN…" />
                  </td>
                  <td>
                    <input
                      className="input-compact w-28 text-center"
                      name={`qty_${idx}`}
                      inputMode="numeric"
                      placeholder="0"
                      defaultValue="1"
                    />
                  </td>
                  <td>
                    <CostInput centsName={`unitCostCents_${idx}`} defaultValue="" />
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn-inline"
                      onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                      disabled={rows.length <= 1}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-4">
          <button type="button" className="btn-ghost" onClick={() => setRows((p) => [...p, { key: uid() }])}>
            Adicionar item
          </button>
          <div className="flex items-center gap-2">
            <input type="hidden" name="itemsCount" value={String(rows.length)} />
            <button className="btn-primary">Aplicar no estoque</button>
          </div>
        </div>
      </div>
    </div>
  );
}

