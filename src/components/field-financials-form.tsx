"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UNITS, UNIT_LABEL, type Unit } from "@/lib/units";
import { priceDrops, unitAmount, type PriceTier } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";
import { AlertTriangleIcon, PlusIcon, TrashIcon } from "./icons";

type TierDraft = { aboveQuantity: string; rateNis: string; appliesToAll: boolean };

const emptyTier = (): TierDraft => ({ aboveQuantity: "", rateNis: "", appliesToAll: false });

export function FieldFinancialsForm({ fieldId, csrf, onClose }: { fieldId: number; csrf: string; onClose: () => void }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState<Set<Unit>>(new Set());
  const [amounts, setAmounts] = useState<Partial<Record<Unit, string>>>({});
  const [tiered, setTiered] = useState<Set<Unit>>(new Set());
  const [tiers, setTiers] = useState<Partial<Record<Unit, TierDraft[]>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/fields/${fieldId}/rates`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.error) { setError(data.error); return; }
        const rates = data.rates as Array<{ unit: Unit; rateNis: number; tiers: PriceTier[] }>;
        setEnabled(new Set(rates.map(r => r.unit)));
        setAmounts(Object.fromEntries(rates.map(r => [r.unit, String(r.rateNis)])));
        setTiered(new Set(rates.filter(r => r.tiers.length > 0).map(r => r.unit)));
        setTiers(Object.fromEntries(rates.map(r => [r.unit, r.tiers.map(t => ({ aboveQuantity: String(t.aboveQuantity), rateNis: String(t.rateNis), appliesToAll: t.appliesToAll }))])));
      })
      .catch(() => { if (!cancelled) setError("לא ניתן לטעון תעריפים"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fieldId]);

  function toggle(unit: Unit) {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(unit)) next.delete(unit); else next.add(unit);
      return next;
    });
  }

  function toggleTiered(unit: Unit) {
    setTiered(prev => {
      const next = new Set(prev);
      if (next.has(unit)) next.delete(unit); else next.add(unit);
      return next;
    });
    if (!(tiers[unit]?.length)) setTiers(prev => ({ ...prev, [unit]: [emptyTier()] }));
  }

  function updateTier(unit: Unit, index: number, patch: Partial<TierDraft>) {
    setTiers(prev => ({ ...prev, [unit]: (prev[unit] ?? []).map((t, i) => (i === index ? { ...t, ...patch } : t)) }));
  }

  function addTier(unit: Unit, tier: TierDraft = emptyTier()) {
    setTiers(prev => ({ ...prev, [unit]: [...(prev[unit] ?? []), tier] }));
  }

  function removeTier(unit: Unit, index: number) {
    setTiers(prev => ({ ...prev, [unit]: (prev[unit] ?? []).filter((_, i) => i !== index) }));
  }

  async function submit() {
    setBusy(true); setError("");
    try {
      const rates = [...enabled].map(unit => ({
        unit,
        rateNis: Number(amounts[unit]),
        tiers: tiered.has(unit)
          ? (tiers[unit] ?? []).map(t => ({ aboveQuantity: Number(t.aboveQuantity), rateNis: Number(t.rateNis), appliesToAll: t.appliesToAll }))
          : []
      }));
      if (rates.some(r => !(r.rateNis > 0))) throw new Error("יש להזין סכום תקין בש\"ח עבור כל יחידה מסומנת");
      for (const r of rates) {
        if (r.tiers.some(t => !(t.aboveQuantity > 0) || !(t.rateNis > 0))) throw new Error(`יש להזין כמות ומחיר חיוביים בכל מדרגה (${UNIT_LABEL[r.unit]})`);
        if (r.tiers.some((t, i) => i > 0 && t.aboveQuantity <= (r.tiers[i - 1]?.aboveQuantity ?? 0))) throw new Error(`כמויות המדרגות חייבות לעלות מדרגה לדרגה (${UNIT_LABEL[r.unit]})`);
      }
      const res = await fetch(`/api/admin/fields/${fieldId}/rates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rates, csrf })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "הפעולה נכשלה");
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      {loading && <p className="muted">טוען תעריפים…</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      {!loading && (
        <ul className="checkbox-list rates-list">
          {UNITS.map(unit => (
            <li key={unit}>
              <label className="checkbox-row">
                <input type="checkbox" checked={enabled.has(unit)} onChange={() => toggle(unit)} />
                <span>{UNIT_LABEL[unit]}</span>
              </label>
              {enabled.has(unit) && (
                <div className="stack tier-unit">
                  <div className="line-row">
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={amounts[unit] ?? ""}
                      onChange={e => setAmounts(prev => ({ ...prev, [unit]: e.target.value }))}
                      placeholder="סכום"
                      aria-label={`סכום בש"ח ליחידת ${UNIT_LABEL[unit]}`}
                    />
                    <span className="muted">₪ ליחידה</span>
                  </div>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={tiered.has(unit)} onChange={() => toggleTiered(unit)} aria-expanded={tiered.has(unit)} />
                    <span>תמחור מותנה לפי כמות</span>
                  </label>
                  {tiered.has(unit) && (
                    <TierEditor
                      unit={unit}
                      baseRate={amounts[unit] ?? ""}
                      tiers={tiers[unit] ?? []}
                      onChange={(index, patch) => updateTier(unit, index, patch)}
                      onAdd={tier => addTier(unit, tier)}
                      onRemove={index => removeTier(unit, index)}
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="actions">
        <button type="button" className="btn" onClick={submit} disabled={busy || loading}>{busy ? "שומר…" : "שמירה"}</button>
        <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>ביטול</button>
      </div>
    </div>
  );
}

function TierEditor({ unit, baseRate, tiers, onChange, onAdd, onRemove }: {
  unit: Unit;
  baseRate: string;
  tiers: TierDraft[];
  onChange: (index: number, patch: Partial<TierDraft>) => void;
  onAdd: (tier?: TierDraft) => void;
  onRemove: (index: number) => void;
}) {
  const [sample, setSample] = useState("");
  const base = Number(baseRate);
  const sampleQuantity = Number(sample);
  const pricing = {
    rateNis: base,
    tiers: tiers
      .map(t => ({ aboveQuantity: Number(t.aboveQuantity), rateNis: Number(t.rateNis), appliesToAll: t.appliesToAll }))
      .filter(t => t.aboveQuantity > 0 && t.rateNis > 0)
      .sort((a, b) => a.aboveQuantity - b.aboveQuantity)
  };
  const unitLabel = UNIT_LABEL[unit];
  const drops = base > 0 ? priceDrops(pricing) : [];
  const qty = (value: number) => value.toLocaleString("he-IL", { maximumFractionDigits: 2 });

  return (
    <div className="tier-panel">
      <p className="muted tier-help">
        כל מדרגה חלה על הכמות שמעל הסף שלה ועד הכמות שב&quot;עד&quot; (ריק — ∞, ללא הגבלה). כברירת מחדל המחיר חל רק על היחידות שבטווח (תמחור מדורג);
        סימון &quot;על כל הכמות&quot; — כשהכמות מגיעה למדרגה, המחיר שלה חל על כל היחידות מ־0 ועד סוף הטווח שלה (במקום המדרגות שלפניה),
        ומדרגות שאחריה מוסיפות רק את היחידות שבטווח שלהן. החישוב נעשה לכל עובד בכל משמרת.
      </p>
      <div className="tier-grid" role="table" aria-label={`מדרגות תמחור — ${unitLabel}`}>
        <div className="tier-row tier-head" role="row">
          <span role="columnheader">טווח כמות</span>
          <span role="columnheader">₪ ליחידה</span>
          <span role="columnheader">על כל הכמות<span className="tier-head-sub">מ־0 עד סוף הטווח</span></span>
          <span role="columnheader" className="sr-only">פעולות</span>
        </div>
        <div className="tier-row tier-base" role="row">
          <span role="cell" className="tier-range">
            <span dir="ltr">0</span> – <span dir="ltr">{tiers[0]?.aboveQuantity || "…"}</span>
          </span>
          <span role="cell" dir="ltr" className="tier-static">{baseRate || "—"}</span>
          <span role="cell" className="tier-static">—</span>
          <span role="cell" />
        </div>
        {tiers.map((tier, i) => (
          <div className="tier-row" role="row" key={i}>
            <span role="cell" className="tier-range">
              <span>מעל</span>
              <input
                className="input"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={tier.aboveQuantity}
                onChange={e => onChange(i, { aboveQuantity: e.target.value })}
                aria-label={`מדרגה ${i + 1}: מעל כמות`}
              />
              <span>עד</span>
              <input
                className="input"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={tiers[i + 1]?.aboveQuantity ?? ""}
                placeholder="∞"
                onChange={e => {
                  // סוף הטווח הוא תחילת המדרגה הבאה; בשורה האחרונה הוא פותח מדרגה חדשה (∞) שממשיכה באותו מחיר
                  if (i + 1 < tiers.length) onChange(i + 1, { aboveQuantity: e.target.value });
                  else if (e.target.value) onAdd({ aboveQuantity: e.target.value, rateNis: tier.rateNis, appliesToAll: tier.appliesToAll });
                }}
                aria-label={`מדרגה ${i + 1}: עד כמות`}
              />
            </span>
            <span role="cell">
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={tier.rateNis}
                onChange={e => onChange(i, { rateNis: e.target.value })}
                aria-label={`מדרגה ${i + 1}: ₪ ליחידה`}
              />
            </span>
            <label role="cell">
              <input
                type="checkbox"
                className="tier-check"
                checked={tier.appliesToAll}
                onChange={e => onChange(i, { appliesToAll: e.target.checked })}
                aria-label={`מדרגה ${i + 1}: המחיר חל על כל הכמות`}
                title="המחיר חל על כל היחידות מ־0 ועד סוף הטווח של המדרגה (ולא רק על היחידות שבטווח)"
              />
            </label>
            <span role="cell">
              <button type="button" className="icon-btn" title="הסרת מדרגה" aria-label={`הסרת מדרגה ${i + 1}`} onClick={() => onRemove(i)}><TrashIcon size={16} /></button>
            </span>
          </div>
        ))}
      </div>
      <div className="tier-footer">
        <button type="button" className="btn secondary" onClick={() => onAdd()}><PlusIcon size={16} /> הוספת מדרגה</button>
        <label className="line-row tier-sample">
          <span className="muted">בדיקה:</span>
          <input
            className="input"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={sample}
            onChange={e => setSample(e.target.value)}
            placeholder="כמות"
            aria-label={`כמות לבדיקה (${unitLabel})`}
          />
          <span className="muted">{unitLabel} =</span>
          <strong>{base > 0 && sampleQuantity > 0 ? formatMoney(unitAmount(pricing, sampleQuantity)) : "—"}</strong>
        </label>
      </div>
      {drops.map(drop => (
        <div key={drop.aboveQuantity} className="alert tier-warning" aria-live="polite">
          <strong><AlertTriangleIcon size={16} /> ירידה בשכר מעל {qty(drop.aboveQuantity)} {unitLabel}</strong>
          <span>
            עובד שעשה {qty(drop.aboveQuantity)} {unitLabel} מקבל {formatMoney(drop.amountAt)}, אבל מיד מעל הסף הסכום יורד ל־{formatMoney(drop.amountJustAbove)}
            {drop.recoversAt === Infinity
              ? " ולא חוזר לגובה הזה — עובד שעושה יותר ירוויח פחות."
              : ` וחוזר לגובה הזה רק ב־${qty(drop.recoversAt)} ${unitLabel} — עובד שעושה כמות בטווח הזה ירוויח פחות ממי שעשה פחות.`}
          </span>
        </div>
      ))}
    </div>
  );
}
