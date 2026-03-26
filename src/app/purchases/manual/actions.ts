"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createDoc,
  queryAll,
  upsertByName,
  type PurchaseImport,
  type StockMovement,
  type Product,
  type Payable,
  type Supplier,
  type PayableCategoryDoc,
} from "@/lib/db";

function startOfDayUTCFromISO(iso: string): Date {
  const m = String(iso ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error("Data inválida.");
  const yyyy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0, 0));
  if (Number.isNaN(dt.getTime())) throw new Error("Data inválida.");
  return dt;
}

function escapeXml(text: string) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toDecimalQty(raw: string): number {
  const normalized = String(raw ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) throw new Error("Quantidade inválida.");
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Quantidade inválida.");
  return Number(n.toFixed(3));
}

function centsToNum(cents: string): number | null {
  const only = String(cents ?? "").replace(/[^\d]/g, "");
  if (!only) return null;
  const n = Math.max(0, Number(only));
  if (!Number.isFinite(n)) return null;
  return n / 100;
}

export async function createManualPurchase(formData: FormData) {
  const supplierName = String(formData.get("supplierName") ?? "").trim() || null;
  const invoiceNumber = String(formData.get("invoiceNumber") ?? "").trim() || null;
  const series = String(formData.get("series") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  const issuedAtISO = String(formData.get("issuedAt") ?? "").trim();
  const dueAtISO = String(formData.get("dueAt") ?? "").trim();
  const issuedAt = issuedAtISO ? startOfDayUTCFromISO(issuedAtISO) : null;
  const dueAt = dueAtISO ? startOfDayUTCFromISO(dueAtISO) : null;

  const countRaw = String(formData.get("itemsCount") ?? "0").replace(/[^\d]/g, "");
  const itemsCount = Math.max(0, Math.min(200, Number(countRaw || "0")));
  if (!itemsCount) throw new Error("Adicione pelo menos 1 item.");

  const rows: Array<{ productId: string; qty: number; unitCost: number | null }> = [];
  for (let i = 0; i < itemsCount; i++) {
    const productId = String(formData.get(`productId_${i}`) ?? "").trim();
    const qtyRaw = String(formData.get(`qty_${i}`) ?? "").trim();
    const costCents = String(formData.get(`unitCostCents_${i}`) ?? "");
    if (!productId) continue;
    const qty = toDecimalQty(qtyRaw);
    const unitCost = centsToNum(costCents);
    rows.push({ productId, qty, unitCost });
  }

  if (rows.length === 0) throw new Error("Selecione pelo menos 1 produto.");

  const productIds = rows.map((r) => r.productId);
  const products: Product[] = [];
  for (let i = 0; i < productIds.length; i += 30) {
    const chunk = productIds.slice(i, i + 30);
    const found = await queryAll<Product>("products", { where: [["__name__", "in", chunk]] });
    products.push(...found);
  }
  const byId = new Map(products.map((p) => [p.id, p]));
  const missing = rows.filter((r) => !byId.has(r.productId));
  if (missing.length) throw new Error("Um ou mais produtos selecionados não existem mais.");
  const noTrack = products.filter((p) => !p.trackStock);
  if (noTrack.length) {
    const names = noTrack.map((p) => p.name).slice(0, 5).join(", ");
    throw new Error(`Alguns produtos estão sem "Controlar estoque": ${names}${noTrack.length > 5 ? "…" : ""}.`);
  }

  let total = 0;
  const detXml: string[] = [];
  for (const r of rows) {
    const p = byId.get(r.productId)!;
    const unitCost = r.unitCost ?? 0;
    const lineTotal = unitCost * r.qty;
    total += lineTotal;

    detXml.push(
      [
        "<det>",
        "<prod>",
        `<xProd>${escapeXml(p.name)}</xProd>`,
        `<cEAN>${escapeXml(p.eanGtin ?? "")}</cEAN>`,
        `<qCom>${escapeXml(r.qty.toString())}</qCom>`,
        `<vUnCom>${escapeXml(unitCost.toFixed(2))}</vUnCom>`,
        `<vProd>${escapeXml(lineTotal.toFixed(2))}</vProd>`,
        "</prod>",
        "</det>",
      ].join(""),
    );
  }

  const dueTag = dueAt ? `<cobr><dup><dVenc>${dueAtISO}</dVenc></dup></cobr>` : "";
  const issuedTag = issuedAt ? `<dhEmi>${issuedAtISO}T00:00:00-00:00</dhEmi>` : "";
  const xml = [
    "<nfeProc>",
    "<NFe>",
    "<infNFe>",
    supplierName ? `<emit><xNome>${escapeXml(supplierName)}</xNome></emit>` : "",
    "<ide>",
    invoiceNumber ? `<nNF>${escapeXml(invoiceNumber)}</nNF>` : "",
    series ? `<serie>${escapeXml(series)}</serie>` : "",
    issuedTag,
    "</ide>",
    "<total><ICMSTot>",
    `<vNF>${escapeXml(total.toFixed(2))}</vNF>`,
    "</ICMSTot></total>",
    dueTag,
    detXml.join(""),
    "</infNFe>",
    "</NFe>",
    "</nfeProc>",
  ].join("");

  const payableCategoryName = "Compras";
  const now = new Date();

  if (supplierName) await upsertByName<Supplier>("suppliers", supplierName);
  await upsertByName<PayableCategoryDoc>("payableCategories", payableCategoryName);

  const imp = await createDoc<PurchaseImport>("purchaseImports", {
    status: "IMPORTED",
    filename: null,
    supplierName,
    invoiceNumber,
    series,
    issuedAt,
    total: Number(total.toFixed(2)),
    rawXml: xml,
    errorMessage: null,
    appliedAt: now,
    createdAt: now,
  });

  const reference = `purchaseImport:${imp.id}`;
  const notePrefix = invoiceNumber ? `Compra manual ${invoiceNumber}` : "Compra manual";

  for (const r of rows) {
    const p = byId.get(r.productId)!;
    await createDoc<StockMovement>("stockMovements", {
      productId: p.id,
      type: "ENTRY",
      quantity: r.qty,
      delta: r.qty,
      reference,
      note: `${notePrefix} • ${p.name}${note ? ` • ${note}` : ""}`,
      saleId: null,
      createdBy: null,
      createdAt: now,
    });
  }

  if (total > 0) {
    const due = dueAt ?? issuedAt ?? startOfDayUTCFromISO(now.toISOString().slice(0, 10));
    await createDoc<Payable>("payables", {
      purchaseImportId: imp.id,
      status: "OPEN",
      description: invoiceNumber ? `Compra NF-e ${invoiceNumber}` : "Compra (manual)",
      supplierName,
      categoryName: payableCategoryName,
      amount: Number(total.toFixed(2)),
      dueDate: due,
      paidAt: null,
      note: `Gerado automaticamente ao lançar compra manual.${series ? ` Série ${series}.` : ""}${note ? ` ${note}` : ""}`,
      recurrenceId: null,
      recurrenceIdx: null,
      barcode: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  revalidatePath("/purchases");
  revalidatePath("/stock");
  revalidatePath("/movements");
  revalidatePath("/payables");
  redirect("/stock");
}
