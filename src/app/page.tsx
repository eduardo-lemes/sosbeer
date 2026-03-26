import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary to-accent" />
        <div className="p-6">
          <h1 className="text-2xl font-semibold tracking-tight">MVP: Cadastro + Estoque</h1>
          <p className="mt-2 text-sm text-muted-foreground">
          Comece cadastrando produtos e usando movimentações para controlar o saldo.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/products"
          className="card p-5 transition hover:-translate-y-0.5 hover:border-primary/40"
        >
          <div className="text-sm text-muted-foreground">Cadastro</div>
          <div className="mt-1 font-medium">Produtos</div>
        </Link>
        <Link
          href="/stock"
          className="card p-5 transition hover:-translate-y-0.5 hover:border-primary/40"
        >
          <div className="text-sm text-muted-foreground">Visão</div>
          <div className="mt-1 font-medium">Estoque</div>
        </Link>
        <Link
          href="/movements"
          className="card p-5 transition hover:-translate-y-0.5 hover:border-primary/40"
        >
          <div className="text-sm text-muted-foreground">Histórico</div>
          <div className="mt-1 font-medium">Movimentos</div>
        </Link>
      </div>
    </div>
  );
}
