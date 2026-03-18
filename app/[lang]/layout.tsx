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
import { Analytics } from "@vercel/analytics/next";

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
  const domain = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const siteUrl = domain ? `https://${domain}` : "http://localhost:3000";
  return {
    metadataBase: new URL(siteUrl),
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
      images: [{ url: `/${lang}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/${lang}/opengraph-image`],
    },
    alternates: {
      canonical: `/${lang}`,
      languages: {
        "de": "/de",
        "en": "/en",
        "x-default": "/de",
      },
    },
    icons: {
      apple: "/icons/icon-192x192.png",
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
      <head>
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#262626" media="(prefers-color-scheme: dark)" />
      </head>
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
        <Analytics />
      </body>
    </html>
  );
}
