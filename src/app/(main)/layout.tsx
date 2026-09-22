import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ConditionalFooter } from "@/components/layout/conditional-footer";
import { getSelectedArea } from "@/lib/services/local";
import { getCategoriesWithChildren } from "@/lib/categories";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const [area, categories] = await Promise.all([getSelectedArea(), getCategoriesWithChildren()]);
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader area={area} categories={categories} />
      <main className="flex-1">{children}</main>
      <ConditionalFooter />
      <BottomNav />
    </div>
  );
}
