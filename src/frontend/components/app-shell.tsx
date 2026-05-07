import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, ReceiptText, Upload, BookOpenCheck, ChartNoAxesCombined } from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/import", label: "Importar", icon: Upload },
  { href: "/cheques", label: "Cheques", icon: ReceiptText },
  { href: "/descuentos", label: "Descuentos", icon: ChartNoAxesCombined },
  { href: "/catalogos", label: "Catalogos", icon: BookOpenCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16">
      <header className="w-full px-4 pt-6 xl:px-6">
        <div className="card flex items-center justify-between gap-4 px-5 py-3.5">
          {/* Marca */}
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
              <Image
                src="/logo-tiarg-celeste.png"
                alt="TIARG"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-[family-name:var(--font-display)] text-base font-semibold leading-tight tracking-tight text-[var(--foreground)]">
                Cheques
              </p>
              <p className="truncate text-xs text-[var(--muted)]">TIARG · Seguimiento integral</p>
            </div>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="nav-link"
                >
                  <Icon size={15} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mt-6 w-full px-4 xl:px-6">{children}</main>
    </div>
  );
}
