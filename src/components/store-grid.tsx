"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { storeImageUrl, type StoreProductRow } from "@/lib/store";
import { Modal } from "./modal";
import { StoreProductForm } from "./store-product-form";
import { PencilIcon, PlusIcon, ShoppingBagIcon, TrashIcon } from "./icons";

function AddProductButton({ csrf }: { csrf: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-icon-leading" onClick={() => setOpen(true)}><PlusIcon size={18} /><span>הוספת מוצר</span></button>
      {open && <Modal title="הוספת מוצר" onClose={() => setOpen(false)}><StoreProductForm csrf={csrf} onSaved={() => { setOpen(false); router.refresh(); }} /></Modal>}
    </>
  );
}

function EditProductButton({ csrf, product }: { csrf: string; product: StoreProductRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" title="עריכה" aria-label={`עריכת ${product.name}`} onClick={() => setOpen(true)}><PencilIcon size={18} /></button>
      {open && <Modal title={`עריכת ${product.name}`} onClose={() => setOpen(false)}><StoreProductForm csrf={csrf} product={product} onSaved={() => { setOpen(false); router.refresh(); }} /></Modal>}
    </>
  );
}

function DeleteProductButton({ csrf, product }: { csrf: string; product: StoreProductRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirmDelete() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/store/products/${product.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csrf }) });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "המחיקה נכשלה");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "המחיקה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="icon-btn danger" title="מחיקה" aria-label={`מחיקת ${product.name}`} onClick={() => setOpen(true)}><TrashIcon size={18} /></button>
      {open && (
        <Modal title="מחיקת מוצר" onClose={() => (busy ? null : setOpen(false))}>
          <div className="stack">
            <p>האם למחוק את &quot;{product.name}&quot; מהחנות לצמיתות? הפעולה אינה הפיכה.</p>
            {error && <p className="alert" role="alert">{error}</p>}
            <div className="actions">
              <button type="button" className="btn danger" disabled={busy} onClick={confirmDelete}>{busy ? "מוחק…" : "מחיקה לצמיתות"}</button>
              <button type="button" className="btn secondary" disabled={busy} onClick={() => setOpen(false)}>ביטול</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export function StoreGrid({ products, csrf, canManage }: { products: StoreProductRow[]; csrf: string; canManage: boolean }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filtered = query ? products.filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query)) : products;

  return (
    <div className="stack">
      <div className="table-toolbar">
        <input className="input search-input" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש מוצר" aria-label="חיפוש מוצרים" />
        {canManage && <AddProductButton csrf={csrf} />}
      </div>

      {filtered.length === 0 && <p className="muted">{products.length === 0 ? "אין עדיין מוצרים בחנות" : "לא נמצאו מוצרים"}</p>}

      <div className="store-grid">
        {filtered.map(product => (
          <article className="store-card" key={product.id}>
            <div className="store-card-image">
              {/* eslint-disable-next-line @next/next/no-img-element -- תמונה פרטית מאחורי הרשאה, לא מתאימה לאופטימיזציית next/image */}
              {product.has_image ? <img src={storeImageUrl(product)} alt={product.name} loading="lazy" /> : <ShoppingBagIcon size={40} />}
            </div>
            <div className="store-card-body">
              <h3>{product.name}</h3>
              <span className="store-card-price">{formatMoney(product.price)}</span>
              {product.description && <p className="muted store-card-description">{product.description}</p>}
            </div>
            {canManage && (
              <div className="store-card-actions">
                <EditProductButton csrf={csrf} product={product} />
                <DeleteProductButton csrf={csrf} product={product} />
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
