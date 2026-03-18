import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { NavLinks } from "@/components/layout/NavLinks";
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
        <div className="flex h-full w-full items-center px-6 gap-4">
          <Link href={`/${lang}`} className="flex items-center gap-2 grow">
            <Image
              src="/icons/icon-mark.svg"
              alt=""
              width={40}
              height={26.66}
              priority
            />
            <h1 className="text-heading font-semibold tracking-tight text-2xl bg-linear-to-r from-[#39b54a] via-[#f2c318] to-[#e53935] bg-clip-text text-transparent">
              {dict.nav.title}
            </h1>
          </Link>
          <NavLinks lang={lang} exploreLabel={dict.nav.explore} />
          <ThemeToggle />
        </div>
      </header>
      {children}
      <footer className="border-t px-6 py-4 flex items-center justify-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span>© {new Date().getFullYear()} {dict.nav.title}</span>
        <span className="opacity-30">·</span>
        <span className="flex items-center gap-1.5">
          {dict.home.poweredBy}
          <Link href="https://openaq.org" target="_blank" rel="noopener noreferrer">
            <Image
              src="/openaq-logo.svg"
              alt="OpenAQ"
              width={48}
              height={14}
              className="opacity-50 transition-opacity hover:opacity-90 dark:invert"
            />
          </Link>
        </span>
        <span className="opacity-30">·</span>
        <Link href={`/${lang}/impressum`} className="hover:text-foreground transition-colors">
          {dict.footer.impressum}
        </Link>
        <span className="opacity-30">·</span>
        <Link href={`/${lang}/datenschutz`} className="hover:text-foreground transition-colors">
          {dict.footer.privacy}
        </Link>
      </footer>
    </div>
  );
}
