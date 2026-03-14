import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "../globals.css";
import { notFound } from "next/navigation";
import { GlobalLoadingBar } from "@/components/layout/GlobalLoadingBar";
import { GlobalToastListener } from "@/components/layout/GlobalToastListener";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { DictionaryProvider } from "@/components/providers/DictionaryProvider";
import { Toaster } from "@/components/ui/sonner";
import { getDictionary, hasLocale } from "@/lib/dictionaries";

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const { title, titleTemplate, description, keywords } = dict.metadata;
  return {
    title: {
      default: title,
      template: titleTemplate,
    },
    description,
    keywords,
    openGraph: {
      title,
      description,
      locale: lang === "de" ? "de_AT" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      languages: {
        de: "/de",
        en: "/en",
      },
    },
  };
}

export async function generateStaticParams() {
  return [{ lang: "de" }, { lang: "en" }];
}

export default async function LangLayout({ children, params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <html lang={lang} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <DictionaryProvider dict={dict}>
            <GlobalToastListener />
            <QueryProvider>
              <GlobalLoadingBar />
              {children}
            </QueryProvider>
            <Toaster position="bottom-left" />
          </DictionaryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
