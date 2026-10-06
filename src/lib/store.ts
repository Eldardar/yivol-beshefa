// מגבלות תמונת מוצר — משותף לטופס בדפדפן ולשרת
export const STORE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
export type StoreImageType = (typeof STORE_IMAGE_TYPES)[number];
export const MAX_STORE_IMAGE_BYTES = 5 * 1024 * 1024;

export type StoreProductRow = { id: number; name: string; description: string; price: number; has_image: number; updated_at: string };

export function isStoreImageType(value: string): value is StoreImageType {
  return (STORE_IMAGE_TYPES as readonly string[]).includes(value);
}

// כתובת התמונה כוללת את מועד העדכון כדי שהדפדפן לא יציג תמונה ישנה אחרי החלפה
export function storeImageUrl(product: Pick<StoreProductRow, "id" | "updated_at">): string {
  return `/api/store/products/${product.id}/image?v=${encodeURIComponent(product.updated_at)}`;
}
