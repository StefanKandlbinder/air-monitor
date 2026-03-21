import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { NavLinks } from "@/components/layout/NavLinks";
import { OpenAQIcon } from "@/lib/icons/OpenAQIcon";
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
    <>
      <header className="fixed top-0 inset-x-0 z-50 h-14 bg-background/20 backdrop-blur-md justify-between">
        <div className="flex h-full w-full items-center px-6 gap-4">
          <Link href={`/${lang}`} className="flex items-center gap-2 grow">
            <Image
              src="/icons/icon-mark.svg"
              alt=""
              width={40}
              height={26.66}
              priority
            />
            <h1 className="text-heading font-semibold tracking-tight text-2xl bg-linear-to-r from-[#00e400] via-[#ff7e00] to-[#7e0023] bg-clip-text text-transparent">
              {dict.nav.title}
            </h1>
          </Link>
          <NavLinks lang={lang} exploreLabel={dict.nav.explore} />
          <ThemeToggle />
        </div>
      </header>
      <div
        className="grid min-h-dvh"
        style={{ gridTemplateRows: "1fr auto" }}
      >
        {children}
        <footer className="text-xs text-muted-foreground overflow-x-auto scrollbar-none">
        <ul className="flex items-center justify-center gap-3 whitespace-nowrap px-6 py-4 min-w-max mx-auto">
          <li>© {new Date().getFullYear()} {dict.nav.title}</li>
          <li className="opacity-30" aria-hidden>·</li>
          <li className="inline-flex items-center gap-1.5">
            {dict.home.poweredBy}
            <Link
              href="https://openaq.org"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-50 transition-opacity hover:opacity-90 inline-flex items-center"
              aria-label="OpenAQ"
            >
              <OpenAQIcon className="dark:invert" />
            </Link>
          </li>
          <li className="opacity-30" aria-hidden>·</li>
          <li>
            <Link href={`/${lang}/impressum`} className="hover:text-foreground transition-colors">
              {dict.footer.impressum}
            </Link>
          </li>
          <li className="opacity-30" aria-hidden>·</li>
          <li>
            <Link href={`/${lang}/datenschutz`} className="hover:text-foreground transition-colors">
              {dict.footer.privacy}
            </Link>
          </li>
        </ul>
        </footer>
      </div>
    </>
  );
}
