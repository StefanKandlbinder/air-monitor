export default function StationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-6 pt-[calc(3.5rem+2rem)] pb-24">
      {children}
    </main>
  );
}
