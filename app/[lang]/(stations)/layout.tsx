import Link from "next/link";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { notFound } from "next/navigation";

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function StationsLayout({ children, params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 h-14 border-b bg-background/95 backdrop-blur justify-between">
        <div className="flex h-full w-full items-center justify-between px-6">
          <Link href={`/${lang}`} className="flex items-center gap-2">
            <h1 className="text-heading font-semibold tracking-tight text-xl">
              {dict.nav.title}
            </h1>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      {children}
    </div>
  );
}
