import Link from "next/link";

export default function ShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="contract-container py-4 flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold text-neutral-900 hover:underline">
            SurfaceOps
          </Link>
          <nav className="flex gap-4">
            <Link href="/signals" className="text-sm text-neutral-600 hover:text-neutral-900">
              Signals
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 contract-container py-8">{children}</main>
    </div>
  );
}
