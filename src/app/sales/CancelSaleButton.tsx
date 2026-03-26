"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelSale } from "./actions";

type Props = {
  saleId: string;
  saleNumber: number;
  disabled?: boolean;
};

export function CancelSaleButton({ saleId, saleNumber, disabled }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onClose = () => {
      setError(null);
      setReason("");
    };

    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  function open() {
    if (disabled) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    setError(null);
    dialog.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await cancelSale(saleId, reason);
        close();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível cancelar.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className="btn-inline text-danger hover:bg-danger/10"
        onClick={open}
        disabled={disabled}
        title="Cancelar venda (até 24h; estorna o estoque)"
      >
        Cancelar
      </button>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Cancelar venda #{saleNumber}</div>
            <div className="modal-subtitle">
              Isso vai estornar o estoque dos itens (entrada automática).
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={close} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Motivo *</span>
            <textarea
              className="textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: cliente desistiu, erro de lançamento, etc."
              autoFocus
            />
          </label>
          {error ? <div className="text-sm text-danger">{error}</div> : null}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={close} disabled={isPending}>
              Voltar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={onConfirm}
              disabled={isPending || reason.trim().length < 3}
            >
              Confirmar cancelamento
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
