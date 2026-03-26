import { queryAll, getById, type Sale, type SaleItem, type SalePayment, type Product } from "@/lib/db";
import { SalesScreen } from "./SalesScreen";

export default async function SalesPage() {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const sales = await queryAll<Sale>("sales", {
    where: [["createdAt", ">=", since]],
    orderBy: [["createdAt", "desc"]],
    limit: 200,
  });

  const initialSales = await Promise.all(
    sales.map(async (s) => {
      const items = await queryAll<SaleItem>("saleItems", { where: [["saleId", "==", s.id]] });
      const payments = await queryAll<SalePayment>("salePayments", { where: [["saleId", "==", s.id]] });

      const productIds = [...new Set(items.map((i) => i.productId))];
      const products: Product[] = [];
      for (let i = 0; i < productIds.length; i += 30) {
        const chunk = productIds.slice(i, i + 30);
        const found = await queryAll<Product>("products", { where: [["__name__", "in", chunk]] });
        products.push(...found);
      }
      const productMap = new Map(products.map((p) => [p.id, p]));

      return {
        id: s.id,
        number: s.number,
        status: s.status,
        createdAtIso: s.createdAt.toISOString(),
        total: String(s.total),
        payments: payments.map((p) => ({ method: p.method })),
        items: items.map((it) => ({
          id: it.id,
          name: productMap.get(it.productId)?.name ?? "—",
          quantity: String(it.quantity),
        })),
      };
    }),
  );

  return <SalesScreen initialSales={initialSales} />;
}
