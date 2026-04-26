"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  Database,
  Settings2,
} from "lucide-react";

const navItems = [
  {
    href: "/",
    label: "SkillRoute",
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
    <header className="sticky top-0 z-40 border-b border-stone-300 bg-[#fffaf4]/95 backdrop-blur supports-[backdrop-filter]:bg-[#fffaf4]/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-orange-700/25"
          aria-label="SkillRoute home"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md transition">
            <svg
              viewBox="0 0 64 64"
              className="size-11"
              aria-hidden="true"
            >
              <path
                d="M18 46 L32 32 L46 18"
                fill="none"
                stroke="#2b241e"
                strokeLinecap="round"
                strokeWidth="6"
              />
              <rect
                x="5"
                y="41"
                width="20"
                height="20"
                rx="6"
                fill="#d9e7d3"
                stroke="#2b241e"
                strokeWidth="5"
              />
              <rect
                x="22"
                y="24"
                width="20"
                height="20"
                rx="6"
                fill="#dcedf2"
                stroke="#2b241e"
                strokeWidth="5"
              />
              <rect
                x="39"
                y="7"
                width="20"
                height="20"
                rx="6"
                fill="#a44e3b"
                stroke="#2b241e"
                strokeWidth="5"
              />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold leading-5 text-stone-950">
              SkillRoute
            </span>
            <span className="block truncate text-xs font-medium uppercase tracking-[0.16em] text-stone-500">
              Unmapped Skill Engine
            </span>
          </span>
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <nav
            className="flex w-full gap-1 rounded-md border border-stone-300 bg-[#f0e4d8] p-1 sm:w-auto"
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
                      ? "bg-[#fffaf4] text-stone-950 shadow-sm ring-1 ring-stone-300"
                      : "text-stone-600 hover:bg-[#fffaf4] hover:text-orange-800"
                  }`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {item.label}
                    </span>
                    <span className="hidden text-xs text-stone-500 md:block">
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
