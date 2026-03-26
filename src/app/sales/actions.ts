"use server";

import { revalidatePath } from "next/cache";
import {
  getById,
  queryAll,
  updateDoc,
  createDoc,
  type Sale,
  type SaleItem,
  type Product,
  type StockMovement,
} from "@/lib/db";

export async function cancelSale(saleId: string, reason: string) {
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 3) throw new Error("Informe um motivo para o cancelamento.");

  const sale = await getById<Sale>("sales", saleId);
  if (!sale) throw new Error("Venda não encontrada.");
  if (sale.status === "CANCELED") throw new Error("Venda já está cancelada.");

  const within24h = Date.now() - sale.createdAt.getTime() <= 24 * 60 * 60 * 1000;
  if (!within24h) throw new Error("Só é possível cancelar vendas das últimas 24 horas.");

  // Get sale items with product info
  const items = await queryAll<SaleItem>("saleItems", {
    where: [["saleId", "==", saleId]],
  });

  await updateDoc("sales", saleId, { status: "CANCELED" });

  // Restock items
  for (const item of items) {
    const product = await getById<Product>("products", item.productId);
    if (!product || !product.trackStock) continue;
    await createDoc<StockMovement>("stockMovements", {
      productId: item.productId,
      type: "ENTRY",
      quantity: item.quantity,
      delta: item.quantity,
      note: trimmedReason,
      reference: `ESTORNO SALE#${sale.number}`,
      saleId: sale.id,
      createdBy: null,
      createdAt: new Date(),
    });
  }

  revalidatePath("/sales");
  revalidatePath("/stock");
  revalidatePath("/movements");
}
