"use client";
import { useState } from "react";
import { HEBREW_MONTHS } from "@/lib/dates";
import { PlusIcon, XIcon } from "./icons";

export type EditableSleepingOption = { id: number; name: string; description: string; cost_per_day: number };
export type EditableVillage = { id: number; name: string; description: string; location: string; sleepingOptions: EditableSleepingOption[]; months: number[] };

type OptionLine = { key: number; id: number | null; name: string; description: string; cost: string };
let nextKey = 0;
const makeLine = (option?: EditableSleepingOption): OptionLine => ({ key: nextKey++, id: option?.id ?? null, name: option?.name ?? "", description: option?.description ?? "", cost: option ? String(option.cost_per_day) : "" });

export function VillageForm({ csrf, village }: { csrf: string; village?: EditableVillage }) {
  const [options, setOptions] = useState<OptionLine[]>(() => village?.sleepingOptions.map(makeLine) ?? []);
  const update = (key: number, patch: Partial<OptionLine>) => setOptions(list => list.map(line => (line.key === key ? { ...line, ...patch } : line)));
  const months = new Set(village?.months ?? []);

  return (
    <form className="stack" method="post" action="/api/actions">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value={village ? "villageUpdate" : "villageCreate"} />
      {village && <input type="hidden" name="villageId" value={village.id} />}
      <div className="field"><label>שם הכפר<input className="input" name="name" required maxLength={150} defaultValue={village?.name} /></label></div>
      <div className="field"><label>מיקום<input className="input" name="location" maxLength={300} defaultValue={village?.location} /></label></div>
      <div className="field"><label>תיאור<textarea className="input" name="description" maxLength={2000} defaultValue={village?.description} /></label></div>

      <fieldset className="field village-fieldset">
        <legend>חודשים פתוחים להזמנה</legend>
        <div className="village-months">
          {HEBREW_MONTHS.map((label, i) => (
            <label className="checkbox-row" key={label}>
              <input type="checkbox" name="months" value={i + 1} defaultChecked={months.has(i + 1)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field village-fieldset">
        <legend>אפשרויות לינה</legend>
        {options.length === 0 && <p className="muted">לא הוגדרו אפשרויות לינה</p>}
        {options.map((line, i) => (
          <div className="village-option" key={line.key}>
            <input type="hidden" name="optionId" value={line.id ?? ""} />
            <div className="village-option-row">
              <input className="input" name="optionName" required maxLength={150} placeholder="שם האפשרות" aria-label={`שם אפשרות לינה ${i + 1}`} value={line.name} onChange={e => update(line.key, { name: e.target.value })} />
              <input className="input" name="optionCost" type="number" required min="0" step="0.01" placeholder="עלות ליום (₪)" aria-label={`עלות ליום לאפשרות ${i + 1}`} value={line.cost} onChange={e => update(line.key, { cost: e.target.value })} />
              <button type="button" className="icon-btn" aria-label={`הסרת אפשרות לינה ${i + 1}`} onClick={() => setOptions(list => list.filter(x => x.key !== line.key))}><XIcon size={18} /></button>
            </div>
            <textarea className="input" name="optionDescription" maxLength={2000} placeholder="תיאור האפשרות" aria-label={`תיאור אפשרות לינה ${i + 1}`} value={line.description} onChange={e => update(line.key, { description: e.target.value })} />
          </div>
        ))}
        <div>
          <button type="button" className="btn secondary btn-sm btn-icon-leading" onClick={() => setOptions(list => [...list, makeLine()])}><PlusIcon size={16} /><span>הוספת אפשרות לינה</span></button>
        </div>
      </fieldset>

      <button className="btn">{village ? "שמירת שינויים" : "הוספת כפר"}</button>
    </form>
  );
}
