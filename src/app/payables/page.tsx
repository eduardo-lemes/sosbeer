import { queryAll, type Payable, type Supplier, type PayableCategoryDoc, type PayableStatus } from "@/lib/db";
import { createPayable, setPayableStatus } from "./actions";
import { formatMoney } from "@/lib/format";
import { PayableForm } from "./PayableForm";
import { DeletePayableButton } from "./DeletePayableButton";

export default async function PayablesPage() {
  const [suppliers, categories, payables] = await Promise.all([
    queryAll<Supplier>("suppliers", { orderBy: [["name", "asc"]] }).catch(() => [] as Supplier[]),
    queryAll<PayableCategoryDoc>("payableCategories", { orderBy: [["name", "asc"]] }).catch(() => [] as PayableCategoryDoc[]),
    queryAll<Payable>("payables", { orderBy: [["dueDate", "asc"]], limit: 200 }),
  ]);

  const totalAll = payables.reduce((acc, p) => acc + p.amount, 0);
  const totalOpen = payables.reduce((acc, p) => acc + (p.status === "OPEN" ? p.amount : 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contas a pagar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre contas manualmente ou cole/bipe a linha digitável.
        </p>
      </div>

      <PayableForm
        action={createPayable}
        supplierSuggestions={suppliers.map((s) => s.name)}
        categorySuggestions={categories.map((c) => c.name)}
      />

      {/* ── Lançamentos ── */}
      <section className="card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3.5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-xs text-primary">📋</span>
              Lançamentos
              <span className="ml-1 text-xs font-normal text-muted-foreground">Últimos {Math.min(200, payables.length)}</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold">
                Em aberto: {formatMoney(totalOpen)}
              </div>
              <div className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
                Total: {formatMoney(totalAll)}
              </div>
            </div>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Vencimento</th>
              <th>Descrição</th>
              <th>Fornecedor</th>
              <th>Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {payables.length === 0 ? (
              <tr>
                <td className="px-5 py-8 text-muted-foreground" colSpan={6}>
                  Nenhuma conta cadastrada ainda.
                </td>
              </tr>
            ) : (
              payables.map((p) => {
                const isLate = p.status === "OPEN" && p.dueDate < startOfDayUTC(new Date());
                const statusLabel = p.status === "OPEN" ? (isLate ? "Atrasada" : "Aberta") : p.status === "PAID" ? "Paga" : "Cancelada";
                const statusClass =
                  p.status === "PAID" ? "text-success" : p.status === "CANCELED" ? "text-muted-foreground" : isLate ? "text-danger" : "text-foreground";

                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className={`font-semibold ${statusClass}`}>{statusLabel}</td>
                    <td className="text-muted-foreground">{p.dueDate.toLocaleDateString("pt-BR")}</td>
                    <td className="font-semibold">{p.description}</td>
                    <td className="text-muted-foreground">{p.supplierName ?? "—"}</td>
                    <td className="whitespace-nowrap font-semibold">{formatMoney(p.amount)}</td>
                    <td className="text-right">
                      {p.status === "OPEN" ? (
                        <div className="flex justify-end gap-2">
                          <form action={async () => { "use server"; await setPayableStatus(p.id, "PAID" as PayableStatus); }}>
                            <button className="btn-inline">Marcar paga</button>
                          </form>
                          <form action={async () => { "use server"; await setPayableStatus(p.id, "CANCELED" as PayableStatus); }}>
                            <button className="btn-inline">Cancelar</button>
                          </form>
                          <DeletePayableButton id={p.id} label={`${p.description} • ${formatMoney(p.amount)}`} />
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <div className="text-xs text-muted-foreground">
                            {p.status === "PAID" && p.paidAt ? `Pago em ${p.paidAt.toLocaleDateString("pt-BR")}` : "—"}
                          </div>
                          <DeletePayableButton id={p.id} label={`${p.description} • ${formatMoney(p.amount)}`} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}
