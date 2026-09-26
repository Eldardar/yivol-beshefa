"use client";
import { useEffect, useRef, useState } from "react";
import { Modal } from "./modal";
import { SearchIcon, XIcon } from "./icons";
import { initials } from "./worker-picker";

export type VehicleOption = { id: number; number: string; name: string; active: number };

export function VehiclePicker({
  vehicles,
  selected,
  onSelect
}: {
  vehicles: VehicleOption[];
  selected: VehicleOption | null;
  onSelect: (vehicle: VehicleOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const q = query.trim().toLowerCase();
  const results = q ? vehicles.filter(v => v.name.toLowerCase().includes(q) || v.number.toLowerCase().includes(q)) : vehicles;

  function select(vehicle: VehicleOption) {
    onSelect(vehicle);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="row worker-picker-row">
      <div className="worker-search" ref={boxRef}>
        {selected ? (
          <div className="worker-search-selected">
            <span className="avatar" aria-hidden="true">{initials(selected.name)}</span>
            <span className="worker-search-selected-name">{selected.name}</span>
            <button type="button" className="icon-btn" aria-label="בחירת רכב אחר" onClick={() => { onSelect(null); setOpen(false); }}>
              <XIcon size={18} />
            </button>
          </div>
        ) : (
          <>
            <div className="input worker-search-input-wrap">
              <SearchIcon size={18} className="worker-search-icon" />
              <input
                type="search"
                className="worker-search-input"
                placeholder="חיפוש רכב לפי שם או מספר"
                aria-label="חיפוש רכב"
                value={query}
                onChange={e => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
              />
            </div>
            {open && (
              <div className="worker-search-results" role="listbox">
                {results.length === 0 && <p className="muted worker-search-empty">לא נמצאו רכבים</p>}
                {results.map(vehicle => (
                  <button type="button" key={vehicle.id} className="worker-search-result" role="option" aria-selected={false} onClick={() => select(vehicle)}>
                    <span className="avatar" aria-hidden="true">{initials(vehicle.name)}</span>
                    <span className="worker-search-result-body">
                      <span className="worker-search-result-name">{vehicle.name}</span>
                      <span className="muted worker-search-result-phone"><span dir="ltr" className="ltr-field">{vehicle.number}</span></span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <button type="button" className="btn secondary" onClick={() => setListOpen(true)}>הצג את כל הרכבים</button>

      {listOpen && (
        <Modal title="כל הרכבים" onClose={() => setListOpen(false)}>
          <div className="worker-list" role="listbox">
            {vehicles.length === 0 && <p className="muted">אין רכבים</p>}
            {vehicles.map(vehicle => (
              <button
                type="button"
                key={vehicle.id}
                className="worker-search-result"
                role="option"
                aria-selected={false}
                onClick={() => { select(vehicle); setListOpen(false); }}
              >
                <span className="avatar" aria-hidden="true">{initials(vehicle.name)}</span>
                <span className="worker-search-result-body">
                  <span className="worker-search-result-name">{vehicle.name}</span>
                  <span className="muted worker-search-result-phone"><span dir="ltr" className="ltr-field">{vehicle.number}</span></span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
