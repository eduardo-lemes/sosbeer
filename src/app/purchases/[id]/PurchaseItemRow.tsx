"use client";

import { useMemo, useState } from "react";
import { QtyFactorInput } from "./QtyFactorInput";
import { CostInput } from "./CostInput";
import { ProductSearchPicker } from "./ProductSearchPicker";

function parseQtyToNumber(raw: string): number {
  const v = String(raw ?? "").trim().replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function decimalToCentsNumber(raw: string): number {
  const v = String(raw ?? "").trim();
  if (!v) return 0;
  const normalized = v.replace(",", ".");
  const negative = normalized.startsWith("-");
  const clean = negative ? normalized.slice(1) : normalized;
  const [intPartRaw, fracRaw] = clean.split(".");
  const intPart = (intPartRaw ?? "").replace(/\D/g, "") || "0";
  const frac2 = (fracRaw ?? "").replace(/\D/g, "").padEnd(2, "0").slice(0, 2);
  const cents = Number(intPart) * 100 + Number(frac2);
  return negative ? -cents : cents;
}

function centsToDecimalString(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const intPart = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${intPart}.${frac}`;
}

export function PurchaseItemRow({
  idx,
  name,
  ean,
  qtyRaw,
  qtyLabel,
  unitPriceRaw,
  unitPriceLabel,
  totalRaw,
  totalLabel,
  defaultFactor,
  defaultDivisor,
  suggestion,
  canApply,
}: {
  idx: number;
  name: string;
  ean: string | null;
  qtyRaw: string;
  qtyLabel: string;
  unitPriceRaw: string | null;
  unitPriceLabel: string;
  totalRaw: string | null;
  totalLabel: string;
  defaultFactor: number;
  defaultDivisor: number;
  suggestion: { id: string; label: string } | null;
  canApply: boolean;
}) {
  const qtyNum = useMemo(() => parseQtyToNumber(qtyRaw), [qtyRaw]);
  const [entry, setEntry] = useState(() => (qtyNum * defaultFactor) / Math.max(1, defaultDivisor));

  const suggestedCostDecimal = useMemo(() => {
    const entrySafe = Number.isFinite(entry) && entry > 0 ? entry : 0;
    if (!entrySafe) return "";

    const totalCents = totalRaw
      ? decimalToCentsNumber(totalRaw)
      : unitPriceRaw
        ? Math.round(decimalToCentsNumber(unitPriceRaw) * qtyNum)
        : 0;
    if (!totalCents) return "";

    const costCents = Math.max(0, Math.round(totalCents / entrySafe));
    return centsToDecimalString(costCents);
  }, [entry, qtyNum, totalRaw, unitPriceRaw]);

  return (
    <tr className="border-t border-border align-top">
      <td>
        <div className="min-w-0 max-w-[180px] 2xl:max-w-[220px]">
          <div className="whitespace-normal break-words font-semibold leading-snug" title={name}>
            <span className="mr-2 text-xs font-semibold text-muted-foreground">#{idx + 1}</span>
            {name}
          </div>
          <div className="mt-1 text-xs text-muted-foreground 2xl:hidden">{ean ? `EAN: ${ean}` : "EAN: —"}</div>
        </div>
      </td>
      <td className="hidden 2xl:table-cell whitespace-nowrap px-3 text-xs text-muted-foreground">{ean ?? "—"}</td>
      <td className="whitespace-nowrap px-3 font-semibold">{qtyLabel}</td>
      <td className="whitespace-nowrap">
        <QtyFactorInput
          name={`multiplier_${idx}`}
          divisorName={`divisor_${idx}`}
          qty={qtyRaw}
          defaultFactor={defaultFactor}
          defaultDivisor={defaultDivisor}
          disabled={!canApply}
          onChange={(next) => setEntry(next.entry)}
        />
      </td>
      <td className="hidden 2xl:table-cell whitespace-nowrap text-muted-foreground">{unitPriceLabel}</td>
      <td className="hidden 2xl:table-cell whitespace-nowrap font-semibold">{totalLabel}</td>
      <td>
        <CostInput
          centsName={`costCents_${idx}`}
          defaultValue={suggestedCostDecimal}
          disabled={!canApply}
        />
      </td>
      <td>
        <ProductSearchPicker
          name={`productId_${idx}`}
          defaultProductId={suggestion?.id ?? null}
          defaultLabel={suggestion?.label ?? null}
          disabled={!canApply}
          placeholder="Digite nome, código ou EAN…"
          compact
        />
      </td>
      <td className="text-right">
        <label className="toggle toggle-sm inline-flex">
          <input type="checkbox" name={`ignore_${idx}`} value="1" className="sr-only peer" disabled={!canApply} />
          <span className="toggle-track peer-checked:border-primary/40 peer-checked:bg-primary">
            <span className="toggle-thumb peer-checked:translate-x-5" />
          </span>
        </label>
      </td>
    </tr>
  );
}
