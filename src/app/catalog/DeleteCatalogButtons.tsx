"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBrand, deleteCategory, deleteSubcategory, deleteUnit } from "./actions";

type Props = {
  kind: "category" | "subcategory" | "brand" | "unit";
  id: string;
  name: string;
  compact?: boolean;
};

export function DeleteCatalogButton({ kind, id, name, compact }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setError(null);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        if (kind === "category") await deleteCategory(id);
        else if (kind === "subcategory") await deleteSubcategory(id);
        else if (kind === "brand") await deleteBrand(id);
        else await deleteUnit(id);
        close();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível excluir.");
      }
    });
  }

  const title =
    kind === "category"
      ? "Excluir categoria"
      : kind === "subcategory"
        ? "Excluir subcategoria"
        : kind === "brand"
          ? "Excluir marca"
          : "Excluir unidade";
  const warning =
    kind === "category"
      ? "Isso vai remover a categoria e suas subcategorias. Produtos vinculados ficarão sem categoria/subcategoria."
      : kind === "subcategory"
        ? "Produtos vinculados ficarão sem subcategoria."
        : kind === "brand"
          ? "Produtos vinculados ficarão sem marca."
          : "Produtos vinculados ficarão sem unidade.";

  return (
    <>
      {compact ? (
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-danger transition hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
          onClick={open}
          title="Excluir"
          aria-label="Excluir"
        >
          ✕
        </button>
      ) : (
        <button type="button" className="btn-inline text-danger hover:bg-danger/10" onClick={open}>
          Excluir
        </button>
      )}

      <dialog ref={dialogRef} className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">{title}</div>
            <div className="modal-subtitle">{warning}</div>
          </div>
          <button type="button" className="btn-icon" onClick={close} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="rounded-[var(--radius-lg)] border border-border bg-muted/30 px-4 py-3 text-sm">
            <div className="text-muted-foreground">Você está prestes a excluir:</div>
            <div className="mt-1 font-semibold">{name}</div>
          </div>

          {error ? <div className="text-sm text-danger">{error}</div> : null}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={close} disabled={isPending}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={onConfirm} disabled={isPending}>
              {isPending ? "Excluindo..." : "Confirmar exclusão"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
