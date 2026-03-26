import Link from "next/link";
import { queryAll, type Supplier } from "@/lib/db";
import { createManualPurchase } from "./actions";
import { ManualPurchaseForm } from "./ManualPurchaseForm";

export default async function ManualPurchasePage() {
  const suppliers = await queryAll<Supplier>("suppliers", { orderBy: [["name", "asc"]], limit: 200 });
  const supplierSuggestions = suppliers.map((s) => s.name);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Compra manual</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Para quando você não tiver o XML. Selecione os produtos e aplique a entrada no estoque.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/purchases" className="btn-ghost">Voltar</Link>
          <Link href="/stock" className="btn-ghost">Estoque</Link>
        </div>
      </div>

      <form action={createManualPurchase} className="space-y-4">
        <ManualPurchaseForm supplierSuggestions={supplierSuggestions} />
      </form>
    </div>
  );
}
