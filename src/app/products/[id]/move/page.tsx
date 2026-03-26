import Link from "next/link";
import { notFound } from "next/navigation";
import { getById, type Product } from "@/lib/db";
import { formatQty } from "@/lib/format";
import { getCurrentStock } from "@/lib/stock";
import { createMovement } from "../../actions";
import { MovementForm } from "./MovementForm";

export default async function MoveStockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getById<Product>("products", id);
  if (!product) notFound();

  const current = await getCurrentStock(product.id);
  const action = createMovement.bind(null, product.id);

  if (!product.trackStock) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Movimentar estoque</h1>
          <Link
            href={`/products/${product.id}`}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Voltar
          </Link>
        </div>
        <div className="card p-5 text-sm">
          Este produto está com "controlar estoque" desativado.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Movimentar estoque</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.name} • saldo atual: <span className="font-medium">{formatQty(current)}</span>
          </p>
        </div>
        <Link
          href={`/products/${product.id}`}
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Voltar
        </Link>
      </div>

      <div className="card p-5">
        <MovementForm action={action} />
      </div>
    </div>
  );
}
