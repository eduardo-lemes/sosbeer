import Link from "next/link";
import { notFound } from "next/navigation";
import { getById, queryAll, type Sale, type SaleItem, type SalePayment, type Product } from "@/lib/db";
import { formatMoney, formatQty } from "@/lib/format";
import { CancelSaleButton } from "../CancelSaleButton";

export default async function SaleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const sale = await getById<Sale>("sales", id);
  if (!sale) notFound();

  const items = await queryAll<SaleItem>("saleItems", { where: [["saleId", "==", id]] });
  const payments = await queryAll<SalePayment>("salePayments", { where: [["saleId", "==", id]] });

  // Hydrate product info
  const productIds = [...new Set(items.map((i) => i.productId))];
  const products: Product[] = [];
  for (let i = 0; i < productIds.length; i += 30) {
    const chunk = productIds.slice(i, i + 30);
    const found = await queryAll<Product>("products", { where: [["__name__", "in", chunk]] });
    products.push(...found);
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  const itemsWithProduct = items.map((it) => ({
    ...it,
    product: productMap.get(it.productId) ?? { name: "—", internalCode: "—" },
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Venda #{sale.number}</div>
          <h1 className="text-xl font-semibold tracking-tight">Detalhes</h1>
        </div>
        <div className="flex items-center gap-2">
          {sale.status === "CANCELED" ? (
            <span className="inline-flex items-center rounded-full bg-danger/12 px-2 py-1 text-xs font-semibold text-danger">
              Cancelada
            </span>
          ) : (
            <CancelSaleButton saleId={sale.id} saleNumber={sale.number} />
          )}
          <Link href="/sales" className="btn-ghost">Voltar</Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="card p-4 md:col-span-2">
          <div className="text-sm font-semibold">Itens</div>
          <div className="mt-3 overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Produto</th>
                  <th className="text-right">Qtd</th>
                  <th className="text-right">Preço</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {itemsWithProduct.map((it) => (
                  <tr key={it.id} className="border-t border-border">
                    <td className="text-muted-foreground">{it.product.internalCode}</td>
                    <td className="font-medium">{it.product.name}</td>
                    <td className="text-right text-muted-foreground">{formatQty(it.quantity)}</td>
                    <td className="text-right text-muted-foreground">{formatMoney(it.unitPrice)}</td>
                    <td className="text-right font-semibold">{formatMoney(it.lineTotal)}</td>
                  </tr>
                ))}
                {itemsWithProduct.length === 0 ? (
                  <tr className="border-t border-border">
                    <td colSpan={5} className="px-4 py-6 text-muted-foreground">Sem itens.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <div className="card p-4">
            <div className="text-sm font-semibold">Resumo</div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Quando</dt>
                <dd className="font-medium">{sale.createdAt.toLocaleString("pt-BR")}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium">{formatMoney(sale.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Desconto</dt>
                <dd className="font-medium">{formatMoney(sale.discount)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Total</dt>
                <dd className="text-base font-semibold">{formatMoney(sale.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-4">
            <div className="text-sm font-semibold">Pagamento</div>
            <div className="mt-3 space-y-2 text-sm">
              {payments.length === 0 ? (
                <div className="text-muted-foreground">-</div>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="text-muted-foreground">{paymentLabel(p.method)}</div>
                    <div className="font-medium">{formatMoney(p.amount)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {sale.note ? (
            <div className="card p-4">
              <div className="text-sm font-semibold">Observações</div>
              <div className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{sale.note}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function paymentLabel(method: string) {
  if (method === "CASH") return "Dinheiro";
  if (method === "PIX") return "Pix";
  if (method === "DEBIT") return "Débito";
  if (method === "CREDIT") return "Crédito";
  return method;
}
