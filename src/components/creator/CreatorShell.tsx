"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppearanceScope } from "@/components/AppearanceProvider";
import { Wordmark } from "@/components/brand";

const NAV = [
  { href: "/today", label: "Today", icon: TodayIcon },
  { href: "/keepsakes", label: "Keepsakes", icon: BoxIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

export function CreatorShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const path = usePathname();
  const active = (href: string) => path === href || (href === "/today" && path.startsWith("/postcards"));
  return (
    <div className="flex min-h-dvh flex-col">
      <AppearanceScope scope="creator" />
      <a href="#main" className="sr-only-focusable btn btn-primary absolute left-3 top-3 z-50">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-[2px]">
        <div className={`mx-auto flex items-center justify-between gap-4 px-4 py-2.5 ${wide ? "max-w-[76rem]" : "max-w-[46rem]"}`}>
          <Link href="/today" className="rounded-[6px] no-underline" aria-label="snailpost, go to Today">
            <Wordmark />
          </Link>
          <nav aria-label="Main" className="hidden sm:block">
            <ul className="m-0 flex list-none gap-1 p-0">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active(n.href) ? "page" : undefined}
                    className={`inline-flex min-h-[var(--target)] items-center rounded-full px-4 font-bold no-underline ${
                      active(n.href) ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"
                    }`}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" className={`mx-auto w-full flex-1 px-4 pb-28 pt-5 sm:pb-16 ${wide ? "max-w-[76rem]" : "max-w-[46rem]"}`}>
        {children}
      </main>

      {/* phone navigation: three clear destinations */}
      <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface sm:hidden">
        <ul className="m-0 grid list-none grid-cols-3 p-0">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active(n.href) ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[0.82rem] font-bold no-underline ${
                  active(n.href) ? "text-clay-deep" : "text-ink-soft"
                }`}
              >
                <n.icon active={active(n.href)} />
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function TodayIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function BoxIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 8.5h18V20H3z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M2 5h20v3.5H2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9.5 12.5h5" stroke={active ? "var(--surface)" : "currentColor"} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function GearIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="7" r="2.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="17" r="2.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
