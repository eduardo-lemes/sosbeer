import Link from "next/link";
import { queryAll, type PurchaseImport } from "@/lib/db";
import { createPurchaseImport } from "./actions";
import { formatMoney } from "@/lib/format";

export default async function PurchasesPage() {
  let imports: PurchaseImport[] = [];
  try {
    imports = await queryAll<PurchaseImport>("purchaseImports", { orderBy: [["createdAt", "desc"]], limit: 50 });
  } catch { imports = []; }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Compras</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Importe o XML da NF-e ou lance manualmente quando não tiver o arquivo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/purchases/manual" className="btn-primary">Compra manual</Link>
          <Link href="/stock" className="btn-ghost">Estoque</Link>
        </div>
      </div>

      <div className="card p-5">
        <div className="text-sm font-semibold">Nova importação</div>
        <form action={createPurchaseImport} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <div className="mb-1 text-sm font-medium">XML da nota *</div>
            <input
              type="file"
              name="xmlFile"
              accept=".xml,text/xml,application/xml"
              className="input w-[min(560px,calc(100vw-2rem))] cursor-pointer py-2"
              required
            />
            <div className="mt-1 text-xs text-muted-foreground">Aceita arquivo `.xml` (até 6MB).</div>
          </label>
          <button className="btn-primary">Importar</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-4">
          <div className="text-sm font-semibold">Importações recentes</div>
          <div className="mt-1 text-xs text-muted-foreground">Últimas {Math.min(50, imports.length)}</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Status</th>
              <th>Fornecedor</th>
              <th>Nº/Série</th>
              <th>Total</th>
              <th>Arquivo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {imports.length === 0 ? (
              <tr>
                <td className="px-5 py-8 text-muted-foreground" colSpan={7}>Nenhuma importação ainda.</td>
              </tr>
            ) : (
              imports.map((imp) => (
                <tr key={imp.id} className="border-t border-border">
                  <td className="text-muted-foreground">{imp.createdAt.toLocaleString("pt-BR")}</td>
                  <td className={imp.status === "ERROR" ? "text-danger font-semibold" : "text-success font-semibold"}>
                    {imp.status === "ERROR" ? "Erro" : "Importado"}
                    {imp.appliedAt ? <span className="ml-2 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">Aplicada</span> : null}
                    {imp.status === "ERROR" && imp.errorMessage ? (
                      <div className="mt-1 text-xs font-normal text-muted-foreground">{imp.errorMessage}</div>
                    ) : null}
                  </td>
                  <td className="font-semibold">{imp.supplierName ?? "—"}</td>
                  <td className="text-muted-foreground">
                    {imp.invoiceNumber ? imp.invoiceNumber : "—"}
                    {imp.series ? <span className="ml-2">/ {imp.series}</span> : null}
                  </td>
                  <td className="whitespace-nowrap font-semibold">{imp.total ? formatMoney(imp.total) : "—"}</td>
                  <td className="text-muted-foreground">{imp.filename ?? "—"}</td>
                  <td className="text-right">
                    <Link href={`/purchases/${imp.id}`} className="text-sm text-primary hover:underline">Conferir</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
