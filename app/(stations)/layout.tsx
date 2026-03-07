import ThemeToggle from "@/components/ThemeToggle";

export default function StationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        {children}
      </main>
    </>
  );
}
