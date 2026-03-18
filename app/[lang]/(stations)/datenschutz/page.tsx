import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/lib/dictionaries";
import type { Metadata } from "next";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.privacy.title };
}

export default async function DatenschutzPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const d = dict.privacy;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 flex-1">
      <h1 className="text-3xl font-bold tracking-tight mb-2">{d.title}</h1>
      <p className="text-sm text-muted-foreground mb-10">{d.lastUpdated}</p>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {d.controllerHeading}
        </h2>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{d.controllerName}</p>
          <p>{d.controllerAddress}</p>
          <p>{d.controllerCity}</p>
          <p>
            {d.emailLabel}:{" "}
            <a
              href={`mailto:${d.controllerEmail}`}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {d.controllerEmail}
            </a>
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {d.hostingHeading}
        </h2>
        <p className="text-sm text-muted-foreground mb-2">{d.hostingText}</p>
        <p className="text-sm text-muted-foreground">{d.hostingLegalBasis}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {d.analyticsHeading}
        </h2>
        <p className="text-sm text-muted-foreground mb-2">{d.analyticsText}</p>
        <p className="text-sm text-muted-foreground">{d.analyticsLegalBasis}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {d.openaqHeading}
        </h2>
        <p className="text-sm text-muted-foreground">{d.openaqText}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {d.thirdCountryHeading}
        </h2>
        <p className="text-sm text-muted-foreground">{d.thirdCountryText}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {d.retentionHeading}
        </h2>
        <p className="text-sm text-muted-foreground">{d.retentionText}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {d.rightsHeading}
        </h2>
        <p className="text-sm text-muted-foreground mb-3">{d.rightsIntro}</p>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          {d.rightsList.map((right) => (
            <li key={right}>{right}</li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground mt-3">{d.rightsContact}</p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {d.authorityHeading}
        </h2>
        <p className="text-sm text-muted-foreground">{d.authorityText}</p>
        <p className="text-sm text-muted-foreground mt-1">{d.authorityContact}</p>
      </section>
    </main>
  );
}
