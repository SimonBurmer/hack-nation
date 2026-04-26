"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  Database,
  Settings2,
  Sparkles,
} from "lucide-react";

const navItems = [
  {
    href: "/",
    label: "Profile Builder",
    description: "SkillRoute workspace",
    icon: BriefcaseBusiness,
  },
  {
    href: "/admin",
    label: "Admin Setup",
    description: "Protocol controls",
    icon: Settings2,
  },
  {
    href: "/tools",
    label: "ESCO Tools",
    description: "Search and labor signals",
    icon: Database,
  },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cyan-700/25"
          aria-label="SkillRoute home"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-white shadow-sm transition group-hover:bg-cyan-800">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold leading-5 text-zinc-950">
              SkillRoute
            </span>
            <span className="block truncate text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              Unmapped Skill Engine
            </span>
          </span>
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <nav
            className="flex w-full gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-1 sm:w-auto"
            aria-label="Primary navigation"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded px-3 py-2 text-left text-sm transition sm:flex-none ${
                    isActive
                      ? "bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-200"
                      : "text-zinc-600 hover:bg-white hover:text-cyan-800"
                  }`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {item.label}
                    </span>
                    <span className="hidden text-xs text-zinc-500 md:block">
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
