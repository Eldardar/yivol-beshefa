"use client";
import { useRef, useState } from "react";
import { useAction } from "@/lib/use-action";
import { useModalClose } from "./modal";
import { toast } from "./toaster";

// Drop-in for <form method="post" action="/api/actions">: saves in the background and
// refreshes the page's data in place, so tables keep their scroll, search and expanded rows.
// Inside a Modal it closes the modal on success and shows errors at the top of the form;
// elsewhere errors appear as a toast.
export function ActionForm({ className, children, resetOnSuccess = false, ...rest }: Omit<React.ComponentProps<"form">, "action" | "method" | "onSubmit"> & { resetOnSuccess?: boolean }) {
  const { run, busy } = useAction();
  const closeModal = useModalClose();
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const formData = new FormData(form, (e.nativeEvent as SubmitEvent).submitter);
    setError("");
    const result = await run(formData);
    if (result.ok) {
      if (resetOnSuccess) form.reset();
      closeModal?.();
    } else if (closeModal) {
      setError(result.error);
      formRef.current?.closest(".modal")?.scrollTo(0, 0);
    } else {
      toast(result.error, "error");
    }
  }

  return (
    // action/method stay so the form still works before hydration.
    <form ref={formRef} {...rest} className={className} method="post" action="/api/actions" onSubmit={onSubmit} aria-busy={busy}>
      {error && <p className="alert" role="alert">{error}</p>}
      {children}
    </form>
  );
}
