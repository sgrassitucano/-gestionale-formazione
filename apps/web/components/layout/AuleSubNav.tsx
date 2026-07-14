"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const TABS = [
  { href: "/modulo-3/aule", label: "Lista Aule" },
  { href: "/modulo-3/corsi", label: "Anagrafica Corsi" },
  { href: "/modulo-3/docenti", label: "Anagrafica Docenti" },
  { href: "/modulo-3/luoghi", label: "Anagrafica Luoghi" },
  { href: "/modulo-3/ricerca", label: "Ricerca" },
];

export function AuleSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 mb-6 bg-secondary/60 p-1 rounded-lg w-fit">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href}>
          <Button size="sm" variant={pathname === tab.href ? "default" : "ghost"}>
            {tab.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}
