import { updateStockSettings } from "./actions";
import { getAppSettings } from "@/lib/settings";

export default async function SettingsPage() {
  const settings = await getAppSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Regras gerais do sistema (por empresa).</p>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-xs text-primary">⚙️</span>
            Estoque
          </h2>
        </div>
        <div className="p-5">
          <form action={updateStockSettings} className="space-y-4">
            <label className="flex items-start justify-between gap-4 rounded-[var(--radius-lg)] border border-border bg-muted/20 px-4 py-3 transition hover:bg-muted/30">
              <div className="space-y-1">
                <div className="text-sm font-semibold">Permitir estoque negativo</div>
                <div className="text-sm text-muted-foreground">
                  Se desativado, o sistema bloqueia saídas/vendas que deixariam o estoque menor que zero.
                </div>
              </div>
              <span className="mt-1">
                <input type="checkbox" name="allowNegativeStock" defaultChecked={settings.allowNegativeStock} className="sr-only peer" />
                <span className="toggle-track peer-checked:border-primary/40 peer-checked:bg-primary">
                  <span className="toggle-thumb peer-checked:translate-x-5" />
                </span>
              </span>
            </label>

            <div className="flex items-center justify-end gap-2">
              <button type="submit" className="btn-primary">Salvar</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
