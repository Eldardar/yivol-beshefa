"use client";
import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "./icons";

const noSubscribe = () => () => {};

// Lets a form inside the modal close it once its save succeeds (see ActionForm).
const ModalCloseContext = createContext<(() => void) | null>(null);
export const useModalClose = () => useContext(ModalCloseContext);

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // document.body doesn't exist on the server; a modal open on first render (e.g. the admin game gate) mounts right after hydration.
  const isClient = useSyncExternalStore(noSubscribe, () => true, () => false);
  if (!isClient) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal${wide ? " modal--wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="modal-close" aria-label="סגירה" onClick={onClose}><XIcon size={20} /></button>
        </div>
        <ModalCloseContext.Provider value={onClose}>{children}</ModalCloseContext.Provider>
      </div>
    </div>,
    document.body
  );
}
