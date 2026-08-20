"use client";
import { useRef } from "react";
import type { ManagedEntity } from "@/lib/services/admin";

export function ActiveSwitch({
  csrf,
  entity,
  id,
  active,
  disabled,
  disabledTitle,
}: {
  csrf: string;
  entity: ManagedEntity;
  id: number;
  active: boolean;
  disabled?: boolean;
  disabledTitle?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action="/api/actions" method="post" className="switch-row">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value="setActive" />
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="entityId" value={id} />
      <input type="hidden" name="active" value={active ? "0" : "1"} />
      <label className="switch" title={disabled ? disabledTitle : undefined}>
        <input
          type="checkbox"
          checked={active}
          disabled={disabled}
          onChange={() => formRef.current?.requestSubmit()}
          aria-label={active ? "פעיל — לחיצה להעברה למצב לא פעיל" : "לא פעיל — לחיצה להפעלה"}
        />
        <span className="switch-track" aria-hidden="true" />
      </label>
      <span className="muted switch-status">{active ? "פעיל" : "לא פעיל"}</span>
    </form>
  );
}
