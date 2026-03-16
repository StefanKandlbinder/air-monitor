import Image from "next/image";
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
            <h1 className="text-heading font-semibold tracking-tight text-xl bg-linear-to-r from-[#39b54a] via-[#f2c318] to-[#e53935] bg-clip-text text-transparent">
              {dict.nav.title}
            </h1>
            <Image
              src="/icons/icon-mark.svg"
              alt=""
              width={40}
              height={26.66}
              priority
            />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      {children}
    </div>
  );
}
