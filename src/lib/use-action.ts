"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/toaster";

// Submitting to /api/actions in the background, then refreshing the page's data in place.
// A full reload (native form POST → redirect) would throw the user back to the top of the
// table and lose search, filters and expanded rows; router.refresh() keeps all of that.

type Router = ReturnType<typeof useRouter>;
export type ActionResult = { ok: true; url: URL } | { ok: false; error: string; url: URL | null };

// Query params the server adds only to report the outcome; shown as a toast instead.
const FEEDBACK_PARAMS = ["saved", "warning", "error", "sent"];

export const NETWORK_ERROR = "שגיאת תקשורת, נסו שוב";

/** POST the form to /api/actions and read the outcome from the redirect it answers with. */
export async function postAction(formData: FormData): Promise<ActionResult> {
  try {
    const res = await fetch("/api/actions", { method: "POST", body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null;
      return { ok: false, error: body?.error ?? "הפעולה נכשלה", url: null };
    }
    const url = new URL(res.url);
    const error = url.searchParams.get("error");
    return error ? { ok: false, error, url } : { ok: true, url };
  } catch {
    return { ok: false, error: NETWORK_ERROR, url: null };
  }
}

function feedbackMessage(params: URLSearchParams): string {
  const sent = params.get("sent");
  return sent ? `ההודעה נשלחה ל-${sent} עובדים` : "הפעולה הושלמה";
}

/**
 * After a successful action: refresh the current page's data without scrolling or remounting.
 * If the server sent the user to another page (e.g. the session expired), go there instead.
 */
export function finishAction(router: Router, url: URL) {
  const current = new URL(window.location.href);
  if (url.pathname !== current.pathname) {
    router.push(url.pathname + url.search);
    return;
  }

  toast(feedbackMessage(url.searchParams));
  const warning = url.searchParams.get("warning");
  if (warning) toast(`אזהרה: ${warning}`, "warning");

  // Drop stale ?saved=… banners from an earlier full navigation.
  const params = new URLSearchParams(current.search);
  let stale = false;
  for (const key of FEEDBACK_PARAMS) if (params.has(key)) { params.delete(key); stale = true; }
  // Params that pick what the page shows (e.g. the calendar month of a saved event).
  let viewChanged = false;
  url.searchParams.forEach((value, key) => {
    if (FEEDBACK_PARAMS.includes(key) || params.get(key) === value) return;
    params.set(key, value);
    viewChanged = true;
  });
  const next = params.size ? `${current.pathname}?${params}` : current.pathname;

  if (viewChanged) {
    router.replace(next, { scroll: false });
  } else {
    if (stale) window.history.replaceState(window.history.state, "", next + current.hash);
    router.refresh();
  }
}

/** Run an /api/actions request and refresh the page in place on success. */
export function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (formData: FormData): Promise<ActionResult> => {
    setBusy(true);
    try {
      const result = await postAction(formData);
      if (result.ok) finishAction(router, result.url);
      return result;
    } finally {
      setBusy(false);
    }
  }, [router]);
  return { run, busy, router };
}
