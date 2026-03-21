import { notFound } from "next/navigation";
import { GaugeAnimationCanvas } from "@/components/gauge/GaugeAnimationCanvas";
import { Zap, Globe2, Activity, BarChart3 } from "lucide-react";
import { ExploreLinkButton } from "@/components/layout/ExploreLinkButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { AQI_COLORS } from "@/lib/aqiColors";

type Props = { params: Promise<{ lang: string }> };

const AQI_SCALE = [
  { key: "good" as const, range: "0–50" },
  { key: "moderate" as const, range: "51–100" },
  { key: "unhealthySensitive" as const, range: "101–150" },
  { key: "unhealthy" as const, range: "151–200" },
  { key: "veryUnhealthy" as const, range: "201–300" },
  { key: "hazardous" as const, range: "301+" },
] as const;

export default async function HomePage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const h = dict.home;

  return (
    <main className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative flex min-h-svh items-center overflow-hidden px-6 py-24">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-[#00e400]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-[500px] w-[500px] rounded-full bg-[#7e0023]/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 right-1/4 h-[300px] w-[400px] -translate-y-1/2 rounded-full bg-[#ff7e00]/8 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-16 lg:flex-row lg:items-center">
          {/* Text */}
          <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">

            <h1 className="mb-6 whitespace-pre-line text-5xl font-bold tracking-tight leading-[1.1] sm:text-6xl lg:text-7xl bg-linear-to-r from-[#00e400] via-[#ff7e00] to-[#7e0023] bg-clip-text text-transparent">
              {h.headline}
            </h1>

            <p className="mb-10 max-w-lg text-lg leading-relaxed bg-linear-to-r from-[#00e400] via-[#ff7e00] to-[#7e0023] bg-clip-text text-transparent">
              {h.subheadline}
            </p>

            <ExploreLinkButton lang={lang} label={h.cta} />
          </div>

          {/* Gauge visual */}
          <div className="relative w-88 sm:w-96 lg:w-[420px] shrink-0">
            <div className="absolute inset-0 rounded-full bg-[#00e400]/10 blur-3xl scale-110" />
            <GaugeAnimationCanvas className="relative drop-shadow-2xl" />
          </div>
        </div>
      </section>

      {/* ── Bento features ── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
            {/* Real-time — wide */}
            <Card className="border border-border/50 bg-gradient-to-br from-emerald-500/5 to-transparent lg:col-span-2">
              <CardHeader>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Zap className="h-5 w-5 text-emerald-500" />
                </div>
                <CardTitle className="text-lg">{h.realtimeTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{h.realtimeDesc}</p>
              </CardContent>
            </Card>

            {/* AQI — tall */}
            <Card className="border border-border/50 bg-gradient-to-br from-red-500/5 to-transparent lg:row-span-2">
              <CardHeader>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                  <Activity className="h-5 w-5 text-red-500" />
                </div>
                <CardTitle className="text-lg">{h.aqiTitle}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-muted-foreground">{h.aqiDesc}</p>
                <div className="mt-4 flex flex-col gap-2">
                  {AQI_SCALE.map(({ key, range }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: AQI_COLORS[key] }}
                        />
                        <span>{dict.aqi[key]}</span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{range}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Global */}
            <Card className="border border-border/50 bg-gradient-to-br from-blue-500/5 to-transparent">
              <CardHeader>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <Globe2 className="h-5 w-5 text-blue-500" />
                </div>
                <CardTitle className="text-lg">{h.globalTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{h.globalDesc}</p>
              </CardContent>
            </Card>

            {/* History */}
            <Card className="border border-border/50 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardHeader>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <BarChart3 className="h-5 w-5 text-amber-500" />
                </div>
                <CardTitle className="text-lg">{h.historyTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{h.historyDesc}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

    </main>
  );
}
