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
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Status do caixa</div>
            {open ? (
              <div className="mt-1 text-sm text-muted-foreground">
                Aberto em {open.openedAt.toLocaleString("pt-BR")} • Abertura: {formatMoney(open.openingCash)}
              </div>
            ) : (
              <div className="mt-1 text-sm text-muted-foreground">Caixa fechado. Abra para vender.</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/cash/session" className="btn-primary">
              {open ? "Fechar/Movimentar" : "Abrir caixa"}
            </Link>
          </div>
        </div>
      </div>

      {open ? (
        <CashRegister />
      ) : (
        <div className="card p-5 text-muted-foreground">
          O caixa está fechado. Clique em "Abrir caixa" para iniciar a sessão.
        </div>
      )}
      <RecentSales />
    </div>
  );
}
