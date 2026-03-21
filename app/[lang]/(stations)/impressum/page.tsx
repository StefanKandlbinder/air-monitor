import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/lib/dictionaries";
import type { Metadata } from "next";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.impressum.title };
}

export default async function ImpressumPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const d = dict.impressum;

  return (
    <main className="mx-auto max-w-2xl px-6 pt-[calc(3.5rem+4rem)] pb-16 flex-1">
      <h1 className="text-3xl font-bold tracking-tight mb-8">{d.title}</h1>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {d.infoHeading}
        </h2>
        <div className="space-y-1 text-sm">
          <p className="font-medium">{d.name}</p>
          <p className="text-muted-foreground">{d.address}</p>
          <p className="text-muted-foreground">{d.city}</p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {d.contactHeading}
        </h2>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            {d.emailLabel}:{" "}
            <a
              href={`mailto:${d.email}`}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {d.email}
            </a>
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {d.purposeHeading}
        </h2>
        <p className="text-sm text-muted-foreground">{d.purpose}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {d.liabilityHeading}
        </h2>
        <p className="text-sm text-muted-foreground">{d.liability}</p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {d.privacyHeading}
        </h2>
        <p className="text-sm text-muted-foreground">
          {d.privacyText}{" "}
          <Link href={`/${lang}/datenschutz`} className="text-foreground underline-offset-4 hover:underline">
            {d.privacyLink}
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
