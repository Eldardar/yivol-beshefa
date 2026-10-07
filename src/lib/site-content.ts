// תוכן האתר: גלריית העובדים בדף הבית וציטוטי מסך הכניסה — משותף לדפדפן ולשרת
export type GalleryPhotoRow = { id: number; created_at: string };
export type QuoteRow = { id: number; text: string; cite: string };

// התמונות מוגשות מאחורי הרשאה
export function galleryPhotoUrl(photo: Pick<GalleryPhotoRow, "id">): string {
  return `/api/gallery/${photo.id}/image`;
}

// ציטוט עם אותיות עבריות מוצג מימין לשמאל
export function quoteDir(text: string): "rtl" | "ltr" {
  return /[֐-׿]/.test(text) ? "rtl" : "ltr";
}
