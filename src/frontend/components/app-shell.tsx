import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, ReceiptText, Upload, BookOpenCheck, ChartNoAxesCombined } from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/import", label: "Importar Excel", icon: Upload },
  { href: "/cheques", label: "Cheques", icon: ReceiptText },
  { href: "/descuentos", label: "Reporte descuentos", icon: ChartNoAxesCombined },
  { href: "/catalogos", label: "Catalogos", icon: BookOpenCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16">
      <header className="w-full px-4 pt-6 xl:px-6">
        <div className="card flex flex-col gap-6 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <Image
                src="/logo-tiarg-celeste.png"
                alt="TIARG"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
                priority
              />
            </div>
            <div>
              <p className="eyebrow">Railway + estados automaticos</p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight md:text-3xl">
                Seguimiento integral de cheques
              </h1>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="button button-secondary inline-flex items-center gap-2"
                >
                  <Icon size={16} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mt-8 w-full px-4 xl:px-6">{children}</main>
    </div>
  );
}
