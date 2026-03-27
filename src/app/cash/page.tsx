import Link from "next/link";
import { queryAll, type CashSession } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { CashRegister } from "./CashRegister";
import { RecentSales } from "./RecentSales";

export default async function CashPage() {
  const sessions = await queryAll<CashSession>("cashSessions", {
    where: [["closedAt", "==", null]],
    orderBy: [["openedAt", "desc"]],
    limit: 1,
  });
  const open = sessions.length > 0 ? sessions[0]! : null;

  return (
    <div className="space-y-6">
      {/* ── Status do caixa ── */}
      <section className="card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-xs text-primary">💰</span>
            Status do caixa
          </h2>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            {open ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
                  <span className="text-sm font-semibold text-success">Aberto</span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Aberto em {open.openedAt.toLocaleString("pt-BR")} • Abertura: {formatMoney(open.openingCash)}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                  <span className="text-sm font-semibold text-muted-foreground">Fechado</span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">Caixa fechado. Abra para vender.</div>
              </>
            )}
          </div>
          <Link href="/cash/session" className="btn-primary">
            {open ? "Fechar/Movimentar" : "Abrir caixa"}
          </Link>
        </div>
      </section>

      {open ? (
        <CashRegister />
      ) : (
        <div className="card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-xs text-accent">🛒</span>
              PDV
            </h2>
          </div>
          <div className="p-5 text-center text-sm text-muted-foreground">
            O caixa está fechado. Clique em &quot;Abrir caixa&quot; para iniciar a sessão.
          </div>
        </div>
      )}
      <RecentSales />
    </div>
  );
}
