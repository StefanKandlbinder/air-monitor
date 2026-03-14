export default function StationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-6 py-8">{children}</main>
  );
}
