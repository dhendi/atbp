import { TopNav } from "@/components/layout/top-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileTopBar } from "@/components/layout/mobile-top-bar";
import { ConditionalFooter } from "@/components/layout/conditional-footer";
import { getSelectedArea } from "@/lib/services/local";
import { getCategoriesWithChildren } from "@/lib/categories";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const [area, categories] = await Promise.all([getSelectedArea(), getCategoriesWithChildren()]);
  return (
    <div className="flex min-h-full flex-col">
      <TopNav area={area} categories={categories} />
      <MobileTopBar categories={categories} />
      <main className="flex-1">{children}</main>
      <ConditionalFooter />
      <BottomNav />
    </div>
  );
}
