"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  db,
  newId,
  createDoc,
  updateDoc,
  getById,
  queryAll,
  deleteWhere,
  upsertByName,
  type PurchaseImport,
  type PurchaseImportStatus,
  type StockMovement,
  type Product,
  type Payable,
  type Supplier,
  type PayableCategoryDoc,
} from "@/lib/db";
import { parseNfeItems, parseNfeSummary } from "@/lib/nfe";

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

export async function createPurchaseImport(formData: FormData) {
  const file = formData.get("xmlFile");
  if (!(file instanceof File)) throw new Error("Selecione um arquivo XML.");

  const maxBytes = 6 * 1024 * 1024;
  if (file.size <= 0) throw new Error("Arquivo vazio.");
  if (file.size > maxBytes) throw new Error("Arquivo muito grande (máx 6MB).");

  const filename = file.name || null;
  const xml = await file.text();
  const xmlTrim = xml.trim();
  if (!xmlTrim) throw new Error("Arquivo vazio.");
  if (!xmlTrim.startsWith("<")) throw new Error("Arquivo inválido (não parece XML).");

  const summary = parseNfeSummary(xmlTrim);
  const items = parseNfeItems(xmlTrim);
  const hasNFeTag = summary.hasNFeTag;
  const status: PurchaseImportStatus = hasNFeTag ? "IMPORTED" : "ERROR";
  const errorMessage = hasNFeTag ? null : "XML não parece ser uma NF-e (faltando tag <NFe>/<nfeProc>).";

  await createDoc<PurchaseImport>("purchaseImports", {
    status,
    filename,
    supplierName: summary.supplierName,
    invoiceNumber: summary.invoiceNumber,
    series: summary.series,
    issuedAt: summary.issuedAt,
    total: summary.total,
    rawXml: xmlTrim,
    errorMessage: errorMessage ?? (items.length === 0 ? "NF-e sem itens (<det>)." : null),
    createdAt: new Date(),
    appliedAt: null,
  });

  revalidatePath("/purchases");
  redirect("/purchases");
}

export async function confirmPurchaseImport(id: string, formData: FormData) {
  const imp = await getById<PurchaseImport>("purchaseImports", id);
  if (!imp) throw new Error("Importação não encontrada.");
  if (imp.status === "ERROR") throw new Error("Importação com erro não pode ser aplicada.");
  if (imp.appliedAt) throw new Error("Essa importação já foi aplicada no estoque.");

  const items = parseNfeItems(imp.rawXml);
  if (items.length === 0) throw new Error("Nenhum item encontrado no XML.");

  const mappings = items.map((_, idx) => {
    const ignore = formData.get(`ignore_${idx}`) === "1";
    const productId = String(formData.get(`productId_${idx}`) ?? "").trim();
    return { ignore, productId: productId || null };
  });

  for (let i = 0; i < items.length; i++) {
    if (mappings[i]?.ignore) continue;
    if (!mappings[i]?.productId) throw new Error(`Vincule um produto no item ${i + 1} ou marque como "Ignorar".`);
  }

  const selectedProductIds = Array.from(
    new Set(mappings.filter((m) => !m.ignore).map((m) => m.productId).filter(Boolean) as string[]),
  );

  const products: Product[] = [];
  for (let i = 0; i < selectedProductIds.length; i += 30) {
    const chunk = selectedProductIds.slice(i, i + 30);
    const found = await queryAll<Product>("products", { where: [["__name__", "in", chunk]] });
    products.push(...found);
  }
  const byId = new Map(products.map((p) => [p.id, p]));
  const missing = selectedProductIds.filter((pid) => !byId.has(pid));
  if (missing.length) throw new Error("Um ou mais produtos selecionados não existem mais. Refaça o vínculo.");
  const noTrack = products.filter((p) => !p.trackStock);
  if (noTrack.length) {
    const names = noTrack.map((p) => p.name).slice(0, 5).join(", ");
    throw new Error(`Alguns produtos estão sem "Controlar estoque": ${names}${noTrack.length > 5 ? "…" : ""}. Ative isso no cadastro do produto e tente novamente.`);
  }

  const reference = `purchaseImport:${imp.id}`;
  const notePrefix = imp.invoiceNumber ? `Compra XML NF-e ${imp.invoiceNumber}` : "Compra XML NF-e";
  const payableCategoryName = "Compras";
  const summary = parseNfeSummary(imp.rawXml);

  if (imp.supplierName) await upsertByName<Supplier>("suppliers", imp.supplierName);
  await upsertByName<PayableCategoryDoc>("payableCategories", payableCategoryName);

  for (let i = 0; i < items.length; i++) {
    const map = mappings[i]!;
    const item = items[i]!;
    if (map.ignore) continue;
    const productId = map.productId!;
    const multiplierRaw = String(formData.get(`multiplier_${i}`) ?? "1").replace(/[^\d]/g, "");
    const multiplierInt = Math.max(1, Math.min(999_999, Number(multiplierRaw || "1")));
    const divisorRaw = String(formData.get(`divisor_${i}`) ?? "1").replace(/[^\d]/g, "");
    const divisorInt = Math.max(1, Math.min(999_999, Number(divisorRaw || "1")));
    const qtyToAdd = (item.qty * multiplierInt) / divisorInt;
    const updateCost = formData.get(`updateCost_${i}`) === "1";
    const costCentsRaw = String(formData.get(`costCents_${i}`) ?? "").replace(/[^\d]/g, "");
    const costCents = costCentsRaw ? Math.max(0, Number(costCentsRaw)) : null;

    const product = byId.get(productId);
    if (!product) throw new Error("Produto selecionado não existe mais.");
    if (!product.trackStock) throw new Error(`Produto sem controlar estoque: ${product.name}`);

    if (updateCost && costCents != null) {
      const nextCost = costCents / 100;
      await updateDoc("products", product.id, { costPrice: nextCost });
    }

    await createDoc<StockMovement>("stockMovements", {
      productId: product.id,
      type: "ENTRY",
      quantity: qtyToAdd,
      delta: qtyToAdd,
      note: `${notePrefix}${item.name ? ` • ${item.name}` : ""}${multiplierInt > 1 ? ` (x${multiplierInt})` : ""}${divisorInt > 1 ? ` (÷${divisorInt})` : ""}`,
      reference,
      saleId: null,
      createdBy: null,
      createdAt: new Date(),
    });
  }

  await updateDoc("purchaseImports", imp.id, { appliedAt: new Date() });

  if (imp.total) {
    const dueBase = summary.dueAt ?? imp.issuedAt ?? new Date();
    const due = startOfDayUTC(dueBase);
    await createDoc<Payable>("payables", {
      purchaseImportId: imp.id,
      status: "OPEN",
      description: imp.invoiceNumber ? `Compra NF-e ${imp.invoiceNumber}` : "Compra (XML)",
      supplierName: imp.supplierName ?? null,
      categoryName: payableCategoryName,
      amount: imp.total,
      dueDate: due,
      paidAt: null,
      note: `Gerado automaticamente ao aplicar XML no estoque.${imp.series ? ` Série ${imp.series}.` : ""}`,
      recurrenceId: null,
      recurrenceIdx: null,
      barcode: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  revalidatePath("/stock");
  revalidatePath("/movements");
  revalidatePath("/purchases");
  revalidatePath("/payables");
  redirect("/stock");
}

export async function rollbackPurchaseImport(id: string) {
  const imp = await getById<PurchaseImport>("purchaseImports", id);
  if (!imp) throw new Error("Importação não encontrada.");
  if (!imp.appliedAt) throw new Error("Essa importação ainda não foi aplicada.");

  const reference = `purchaseImport:${imp.id}`;
  await deleteWhere("stockMovements", "reference", reference);
  await deleteWhere("payables", "purchaseImportId", imp.id);
  await updateDoc("purchaseImports", imp.id, { appliedAt: null });

  revalidatePath("/stock");
  revalidatePath("/movements");
  revalidatePath("/payables");
  revalidatePath(`/purchases/${id}`);
  revalidatePath("/purchases");
  redirect(`/purchases/${id}`);
}
