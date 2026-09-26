"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { SearchIcon, XIcon } from "./icons";
import { BANKS, findBank, searchBanks, searchBranches, type Bank, type Branch } from "@/lib/israeli-banks";
import type { BankDetails } from "@/lib/services/picker";

type Option = { key: string; title: string; subtitle?: string };

/** Autocomplete input: type a number or a name, pick from the list; a bare number with no match can be kept as-is. */
function Combobox({
  label,
  placeholder,
  selected,
  disabled,
  options,
  query,
  onQuery,
  onPick,
  onClear,
  onCommitRaw,
  emptyText
}: {
  label: string;
  placeholder: string;
  selected: Option | null;
  disabled?: boolean;
  options: Option[];
  query: string;
  onQuery: (q: string) => void;
  onPick: (key: string) => void;
  onClear: () => void;
  onCommitRaw?: (q: string) => void;
  emptyText: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) commit();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  });

  // Leaving the field with an exact number typed selects it automatically.
  function commit() {
    setOpen(false);
    const q = query.trim();
    if (!/^\d+$/.test(q)) return;
    const exact = options.find(o => o.key === String(Number(q)));
    if (exact) onPick(exact.key);
    else onCommitRaw?.(q);
  }

  function pick(key: string) {
    onPick(key);
    setOpen(false);
  }

  if (selected) {
    return (
      <div className="field">
        <span>{label}</span>
        <div className="worker-search-selected bank-selected">
          <span className="worker-search-result-body" style={{ flex: 1 }}>
            <span className="worker-search-selected-name">{selected.title}</span>
            {selected.subtitle && <span className="muted worker-search-result-phone">{selected.subtitle}</span>}
          </span>
          {!disabled && (
            <button
              type="button"
              className="icon-btn"
              aria-label={`שינוי ${label}`}
              onClick={() => { onClear(); setOpen(true); requestAnimationFrame(() => inputRef.current?.focus()); }}
            >
              <XIcon size={18} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="worker-search bank-search" ref={boxRef}>
        <div className="input worker-search-input-wrap">
          <SearchIcon size={18} className="worker-search-icon" />
          <input
            ref={inputRef}
            id={id}
            type="text"
            className="worker-search-input"
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-list`}
            disabled={disabled}
            value={query}
            onChange={e => { onQuery(e.target.value); setActive(0); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={e => { if (!boxRef.current?.contains(e.relatedTarget as Node)) commit(); }}
            onKeyDown={e => {
              if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, options.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
              else if (e.key === "Enter" && open && options[active]) { e.preventDefault(); pick(options[active].key); }
              else if (e.key === "Escape") setOpen(false);
            }}
          />
        </div>
        {open && !disabled && (
          <div className="worker-search-results" role="listbox" id={`${id}-list`}>
            {options.length === 0 && <p className="muted worker-search-empty">{emptyText}</p>}
            {options.map((o, i) => (
              <button
                type="button"
                key={o.key}
                className={`worker-search-result${i === active ? " is-active" : ""}`}
                role="option"
                tabIndex={-1}
                aria-selected={i === active}
                onMouseDown={e => e.preventDefault()}
                onClick={() => pick(o.key)}
              >
                <span className="worker-search-result-body">
                  <span className="worker-search-result-name">{o.title}</span>
                  {o.subtitle && <span className="muted worker-search-result-phone">{o.subtitle}</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const bankOption = (b: Bank): Option => ({ key: String(b.code), title: `${b.code} · ${b.name}` });
const branchOption = (b: Branch): Option => ({ key: String(b.number), title: `${b.number} · ${b.name}`, subtitle: b.city && b.city !== b.name ? b.city : undefined });

export function BankDetailsFields({ initial }: { initial: BankDetails | undefined }) {
  const [bank, setBank] = useState<Bank | null>(() => (initial?.bankNumber ? findBank(initial.bankNumber) ?? null : null));
  const [bankQuery, setBankQuery] = useState("");
  const [branch, setBranch] = useState<{ number: string; name: string; city: string } | null>(() =>
    initial?.branchNumber ? { number: initial.branchNumber, name: initial.branchName, city: "" } : null
  );
  const [branchQuery, setBranchQuery] = useState("");

  const bankOptions = useMemo(() => searchBanks(bankQuery).map(bankOption), [bankQuery]);
  const branchOptions = useMemo(() => (bank ? searchBranches(bank, branchQuery).map(branchOption) : []), [bank, branchQuery]);

  function pickBank(key: string) {
    const next = BANKS.find(b => String(b.code) === key) ?? null;
    if (next?.code !== bank?.code) { setBranch(null); setBranchQuery(""); }
    setBank(next);
    setBankQuery("");
  }

  function pickBranch(key: string) {
    const hit = bank?.branches.find(b => String(b[0]) === key);
    if (hit) setBranch({ number: String(hit[0]), name: hit[1], city: hit[2] });
    setBranchQuery("");
  }

  return (
    <>
      <div className="field">
        <label htmlFor="accountHolder">שם בעל החשבון</label>
        <input className="input" id="accountHolder" type="text" name="accountHolder" maxLength={100} autoComplete="name" defaultValue={initial?.accountHolder ?? ""} />
      </div>

      <Combobox
        label="בנק"
        placeholder="מספר או שם הבנק, למשל 12 או הפועלים"
        selected={bank && bankOption(bank)}
        options={bankOptions}
        query={bankQuery}
        onQuery={setBankQuery}
        onPick={pickBank}
        onClear={() => { setBank(null); setBranch(null); setBranchQuery(""); }}
        emptyText="לא נמצא בנק מתאים"
      />
      <input type="hidden" name="bankNumber" value={bank ? String(bank.code) : ""} />
      <input type="hidden" name="bankName" value={bank?.name ?? ""} />

      <Combobox
        label="סניף"
        placeholder={bank ? "מספר, שם או עיר של הסניף" : "יש לבחור בנק תחילה"}
        disabled={!bank}
        selected={branch && {
          key: branch.number,
          title: branch.name ? `${branch.number} · ${branch.name}` : `סניף ${branch.number}`,
          subtitle: branch.name ? (branch.city && branch.city !== branch.name ? branch.city : undefined) : "הסניף לא נמצא ברשימת בנק ישראל"
        }}
        options={branchOptions}
        query={branchQuery}
        onQuery={setBranchQuery}
        onPick={pickBranch}
        onClear={() => setBranch(null)}
        onCommitRaw={q => { if (q.length <= 4) { setBranch({ number: q, name: "", city: "" }); setBranchQuery(""); } }}
        emptyText="לא נמצא סניף מתאים — אפשר להקליד את מספר הסניף"
      />
      <input type="hidden" name="branchNumber" value={branch?.number ?? ""} />
      <input type="hidden" name="branchName" value={branch ? [...new Set([branch.name, branch.city].filter(Boolean))].join(", ") : ""} />

      <div className="field">
        <label htmlFor="accountNumber">מספר חשבון</label>
        <input className="input" id="accountNumber" type="text" name="accountNumber" inputMode="numeric" pattern="[\d\s\-]*" maxLength={20} dir="ltr" autoComplete="off" defaultValue={initial?.accountNumber ?? ""} />
      </div>
    </>
  );
}
