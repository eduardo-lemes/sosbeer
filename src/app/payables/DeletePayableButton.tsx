"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePayable } from "./actions";

export function DeletePayableButton({
  id,
  label,
  compact,
}: {
  id: string;
  label: string;
  compact?: boolean;
}) {
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
        await deletePayable(id);
        close();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível excluir.");
      }
    });
  }

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

      <dialog
        ref={dialogRef}
        className="modal"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
        onCancel={(e) => {
          e.preventDefault();
          dialogRef.current?.close();
        }}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">Excluir lançamento</div>
            <div className="modal-subtitle">Essa ação não pode ser desfeita.</div>
          </div>
          <button type="button" className="btn-icon" onClick={close} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="rounded-[var(--radius-lg)] border border-border bg-muted/30 px-4 py-3 text-sm">
            <div className="text-muted-foreground">Você está prestes a excluir:</div>
            <div className="mt-1 font-semibold">{label}</div>
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
