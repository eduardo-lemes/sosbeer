import Link from "next/link";
import { getById, queryAll, type PurchaseImport, type Product, type PurchaseImportStatus } from "@/lib/db";
import { confirmPurchaseImport } from "../actions";
import { inferPackMultiplier, parseNfeItems } from "@/lib/nfe";
import { formatMoney, formatQty } from "@/lib/format";
import { RollbackPurchaseButton } from "./RollbackPurchaseButton";
import { redirect } from "next/navigation";
import { PurchaseItemRow } from "./PurchaseItemRow";

function isNextRedirectError(err: unknown) {
  if (!err) return false;
  if (err instanceof Error && err.message === "NEXT_REDIRECT") return true;
  if (typeof err === "object" && err && "digest" in err) {
    const digest = (err as { digest?: unknown }).digest;
    return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
  }
  return false;
}

export default async function PurchaseImportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const error = (sp.error ?? "").trim();
  const imp = await getById<PurchaseImport>("purchaseImports", id);
  if (!imp) {
    return (
      <div className="space-y-4">
        <div className="card p-5 text-muted-foreground">Importação não encontrada.</div>
        <Link href="/purchases" className="btn-ghost">Voltar</Link>
      </div>
    );
  }

  const items = parseNfeItems(imp.rawXml);

  const eans = Array.from(new Set(items.map((i) => i.ean).filter(Boolean))) as string[];
  const productByEan = new Map<string, { id: string; label: string }>();
  if (eans.length) {
    for (let i = 0; i < eans.length; i += 30) {
      const chunk = eans.slice(i, i + 30);
      const matched = await queryAll<Product>("products", {
        where: [["eanGtin", "in", chunk]],
        limit: 200,
      });
      for (const p of matched) {
        if (!p.eanGtin) continue;
        productByEan.set(p.eanGtin, { id: p.id, label: `${p.name} • ${p.internalCode}` });
      }
    }
  }

  const canApply = imp.status !== "ERROR" && !imp.appliedAt && items.length > 0;
  const statusLabel = imp.status === "ERROR" ? "Erro" : imp.appliedAt ? "Aplicada" : "Importada";
  const statusTone = imp.status === "ERROR" ? "text-danger" : imp.appliedAt ? "text-success" : "text-foreground";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Confirmar compra (XML)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Confira os itens e vincule aos seus produtos antes de dar entrada no estoque.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/purchases" className="btn-ghost">Voltar</Link>
          <Link href="/stock" className="btn-ghost">Estoque</Link>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className={`text-sm font-semibold ${statusTone}`}>Status: {statusLabel}</div>
            <div className="text-sm text-muted-foreground">Fornecedor: {imp.supplierName ?? "—"}</div>
            <div className="text-sm text-muted-foreground">
              Nota: {imp.invoiceNumber ?? "—"}
              {imp.series ? <span className="ml-2">Série {imp.series}</span> : null}
            </div>
            <div className="text-sm text-muted-foreground">
              Emissão: {imp.issuedAt ? imp.issuedAt.toLocaleString("pt-BR") : "—"}
            </div>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-border bg-muted/20 px-4 py-3 text-right">
            <div className="text-xs text-muted-foreground">Total (nota)</div>
            <div className="text-lg font-semibold">{imp.total ? formatMoney(imp.total) : "—"}</div>
          </div>
        </div>

        {imp.status === "ERROR" ? (
          <div className="mt-4 rounded-[var(--radius-lg)] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {imp.errorMessage ?? "Importação com erro."}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-[var(--radius-lg)] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="mt-4 rounded-[var(--radius-lg)] border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Nenhum item foi encontrado no XML.
          </div>
        ) : null}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-4">
          <div className="text-sm font-semibold">Itens da nota</div>
          <div className="mt-1 text-xs text-muted-foreground">{items.length} item(ns)</div>
        </div>

        <form
          action={async (fd) => {
            "use server";
            try {
              await confirmPurchaseImport(imp.id, fd);
            } catch (e) {
              if (isNextRedirectError(e)) throw e;
              const msg = e instanceof Error ? e.message : "Não foi possível aplicar no estoque.";
              redirect(`/purchases/${imp.id}?error=${encodeURIComponent(msg)}`);
            }
          }}
        >
          <div className="overflow-x-auto">
            <table className="table table-compact text-sm">
              <thead>
                <tr>
                  <th className="w-[180px] 2xl:w-[220px]">Item</th>
                  <th className="hidden 2xl:table-cell w-[150px] px-3">EAN</th>
                  <th className="w-[70px] px-3">Qtd</th>
                  <th className="min-w-[360px] text-center">Conversão</th>
                  <th className="hidden 2xl:table-cell w-[140px]">Unit. (nota)</th>
                  <th className="hidden 2xl:table-cell w-[150px]">Total (nota)</th>
                  <th className="w-[170px]">Custo (estoque)</th>
                  <th className="min-w-[420px] 2xl:min-w-[520px]">Vincular ao produto</th>
                  <th className="text-right">Ignorar</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const suggestion = it.ean ? productByEan.get(it.ean) ?? null : null;
                  const inferredMult = inferPackMultiplier(it.name) ?? 1;
                  return (
                    <PurchaseItemRow
                      key={`${idx}-${it.name}`}
                      idx={idx}
                      name={it.name}
                      ean={it.ean ?? null}
                      qtyRaw={it.qty.toString()}
                      qtyLabel={formatQty(it.qty)}
                      unitPriceRaw={it.unitPrice ? it.unitPrice.toString() : null}
                      unitPriceLabel={it.unitPrice ? formatMoney(it.unitPrice) : "—"}
                      totalRaw={it.total ? it.total.toString() : null}
                      totalLabel={it.total ? formatMoney(it.total) : "—"}
                      defaultFactor={inferredMult}
                      defaultDivisor={1}
                      suggestion={suggestion ? { id: suggestion.id, label: suggestion.label } : null}
                      canApply={canApply}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-4">
            <div className="text-sm text-muted-foreground">
              {imp.appliedAt ? `Aplicada em ${imp.appliedAt.toLocaleString("pt-BR")}` : "Aplique para gerar entradas no estoque."}
            </div>
            <div className="flex items-center gap-2">
              {imp.appliedAt ? <RollbackPurchaseButton id={imp.id} /> : null}
              <button className="btn-primary" disabled={!canApply}>
                {imp.appliedAt ? "Já aplicada" : "Aplicar no estoque"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
