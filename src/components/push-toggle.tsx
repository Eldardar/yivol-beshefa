"use client";
import { useEffect, useState } from "react";
import { BellIcon } from "./icons";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Status = "checking" | "unsupported" | "off" | "on" | "denied";

export function PushToggle({ vapidPublicKey, csrf }: { vapidPublicKey: string; csrf: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setStatus("unsupported"); return; }
      if (Notification.permission === "denied") { setStatus("denied"); return; }
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) setStatus(subscription ? "on" : "off");
      } catch {
        if (!cancelled) setStatus("unsupported");
      }
    }
    void detect();
    return () => { cancelled = true; };
  }, []);

  async function enable() {
    setBusy(true); setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus(permission === "denied" ? "denied" : "off"); return; }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...subscription.toJSON(), csrf }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "הפעלת ההתראות נכשלה");
      setStatus("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "הפעלת ההתראות נכשלה");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true); setError("");
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint, csrf }),
        });
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ביטול ההתראות נכשל");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") return null;

  return (
    <article className="card">
      <div className="page-header">
        <h2><BellIcon size={18} /> התראות דחיפה</h2>
        {status === "on" && <span className="tag info">מופעל</span>}
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      {status === "unsupported" && (
        <p className="muted">הדפדפן הנוכחי אינו תומך בהתראות דחיפה. באייפון יש לפתוח את האפליקציה מהמסך הראשי (לאחר הוספה למסך הבית) כדי שהתראות יעבדו.</p>
      )}
      {status === "denied" && <p className="muted">ההתראות חסומות בהגדרות הדפדפן/המכשיר. יש לאפשר התראות עבור האפליקציה בהגדרות ולנסות שוב.</p>}
      {status === "off" && (
        <>
          <p className="muted">קבלו התראה במכשיר בכל פעם שאתם משובצים למשמרת.</p>
          <button className="btn btn-sm" type="button" onClick={enable} disabled={busy}>{busy ? "מפעיל…" : "הפעלת התראות"}</button>
        </>
      )}
      {status === "on" && (
        <>
          <p className="muted">תקבלו התראה במכשיר בכל פעם שתשובצו למשמרת.</p>
          <button className="btn secondary btn-sm" type="button" onClick={disable} disabled={busy}>{busy ? "מבטל…" : "ביטול התראות"}</button>
        </>
      )}
    </article>
  );
}
