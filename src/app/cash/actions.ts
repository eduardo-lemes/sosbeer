"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  db,
  newId,
  createDoc,
  queryAll,
  getCurrentStock,
  allocateNextSaleNumber,
  type Product,
  type Sale,
  type SaleItem,
  type SalePayment,
  type StockMovement,
  type CashSession,
  type PaymentMethod,
} from "@/lib/db";
import { normalizeMoneyInput } from "@/lib/money";
import { getAppSettings } from "@/lib/settings";

export type CashFormState = { message?: string };

const qtySchema = z
  .string()
  .trim()
  .min(1)
  .transform((v) => v.replace(",", "."))
  .refine((v) => !Number.isNaN(Number(v)), "Quantidade inválida");

const lineSchema = z.object({
  productId: z.string().min(1),
  quantity: qtySchema,
});

const paymentSchema = z.object({
  method: z.enum(["CASH", "PIX", "DEBIT", "CREDIT"]),
  amount: z
    .string()
    .trim()
    .min(1)
    .transform((v) => normalizeMoneyInput(v))
    .refine((v) => !Number.isNaN(Number(v)), "Valor inválido"),
});

export async function finalizeSale(_prev: CashFormState, formData: FormData): Promise<CashFormState> {
  const rawLines = formData.get("lines");
  const rawPayments = formData.get("payments");
  const note = String(formData.get("note") ?? "").trim() || null;

  const linesJson = safeJsonParse(rawLines);
  const paymentsJson = safeJsonParse(rawPayments);

  const linesParsed = z.array(lineSchema).min(1, "Carrinho vazio").safeParse(linesJson);
  if (!linesParsed.success) return { message: linesParsed.error.issues[0]?.message ?? "Carrinho inválido" };

  const paymentsParsed = z.array(paymentSchema).min(1, "Informe o pagamento").safeParse(paymentsJson);
  if (!paymentsParsed.success) return { message: paymentsParsed.error.issues[0]?.message ?? "Pagamento inválido" };

  const lines = linesParsed.data;
  const payments = paymentsParsed.data;

  const productIds = Array.from(new Set(lines.map((l) => l.productId)));

  // Fetch products in chunks (Firestore "in" supports max 30)
  const products: Product[] = [];
  for (let i = 0; i < productIds.length; i += 30) {
    const chunk = productIds.slice(i, i + 30);
    const found = await queryAll<Product>("products", {
      where: [["__name__", "in", chunk]],
    });
    products.push(...found.filter((p) => p.active));
  }
  const byId = new Map(products.map((p) => [p.id, p]));

  for (const line of lines) {
    if (!byId.has(line.productId)) return { message: "Produto inválido no carrinho." };
  }

  const quantityByProduct = new Map<string, number>();
  for (const line of lines) {
    const qty = Number(line.quantity);
    if (qty <= 0) return { message: "Quantidade precisa ser maior que zero." };
    quantityByProduct.set(line.productId, (quantityByProduct.get(line.productId) ?? 0) + qty);
  }

  const subtotal = lines.reduce((acc, l) => {
    const p = byId.get(l.productId)!;
    return acc + Number(l.quantity) * p.salePrice;
  }, 0);

  const discount = 0;
  const total = subtotal - discount;

  const paid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  if (paid < total) return { message: "Pagamento insuficiente." };

  const nonCashPaid = payments
    .filter((p) => p.method !== "CASH")
    .reduce((acc, p) => acc + Number(p.amount), 0);
  if (nonCashPaid > total) {
    return { message: "Pagamento excede o total (cartão/pix não pode passar do valor da venda)." };
  }
  const cashPaid = payments
    .filter((p) => p.method === "CASH")
    .reduce((acc, p) => acc + Number(p.amount), 0);
  if (paid > total && cashPaid === 0) {
    return { message: "Pagamento excede o total (troco só em dinheiro)." };
  }

  const settings = await getAppSettings();

  // Find open cash session
  const sessions = await queryAll<CashSession>("cashSessions", {
    where: [["closedAt", "==", null]],
    orderBy: [["openedAt", "desc"]],
    limit: 1,
  });
  if (sessions.length === 0) throw new Error("Caixa está fechado. Abra o caixa para vender.");
  const session = sessions[0]!;

  // Check stock
  if (!settings.allowNegativeStock) {
    for (const [productId, needed] of quantityByProduct) {
      const product = byId.get(productId)!;
      if (!product.trackStock) continue;
      const current = await getCurrentStock(productId);
      if (current - needed < 0) {
        throw new Error(`Estoque insuficiente: ${product.name}`);
      }
    }
  }

  const saleNumber = await allocateNextSaleNumber();
  const saleId = newId();
  const now = new Date();

  await createDoc<Sale>("sales", {
    number: saleNumber,
    status: "COMPLETED",
    cashSessionId: session.id,
    subtotal: Number(subtotal.toFixed(2)),
    discount,
    total: Number(total.toFixed(2)),
    note,
    createdAt: now,
    updatedAt: now,
  }, saleId);

  // Create sale items
  for (const l of lines) {
    const p = byId.get(l.productId)!;
    const qty = Number(l.quantity);
    const lineTotal = qty * p.salePrice;
    await createDoc<SaleItem>("saleItems", {
      saleId,
      productId: p.id,
      quantity: qty,
      unitPrice: p.salePrice,
      lineTotal: Number(lineTotal.toFixed(2)),
    });
  }

  // Create payments
  for (const p of payments) {
    await createDoc<SalePayment>("salePayments", {
      saleId,
      method: p.method as PaymentMethod,
      amount: Number(Number(p.amount).toFixed(2)),
    });
  }

  // Create stock movements
  for (const l of lines) {
    const p = byId.get(l.productId)!;
    if (!p.trackStock) continue;
    const qty = Number(l.quantity);
    await createDoc<StockMovement>("stockMovements", {
      productId: l.productId,
      type: "EXIT",
      quantity: qty,
      delta: -qty,
      note: "Venda",
      reference: `SALE#${saleNumber}`,
      saleId,
      createdBy: null,
      createdAt: now,
    });
  }

  revalidatePath("/stock");
  revalidatePath("/movements");
  revalidatePath("/sales");
  redirect("/cash?done=1");
}

function safeJsonParse(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
