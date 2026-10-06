import { redirect } from "next/navigation";

// עמוד המגורים עבר ללשונית בתוך עמוד הזמינות
export default async function Housing({ searchParams }: { searchParams: Promise<{ y?: string; m?: string }> }) {
  const { y, m } = await searchParams;
  const params = new URLSearchParams({ tab: "housing" });
  if (y) params.set("y", y);
  if (m) params.set("m", m);
  redirect(`/availability?${params}`);
}
