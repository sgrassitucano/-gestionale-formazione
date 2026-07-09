"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type SessionUser } from "@gestionale/types";
import { LogoWithText } from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Upload,
  School,
  FileText,
  Receipt,
  BarChart3,
  Landmark,
  ShieldCheck,
  ScrollText,
  Users,
  Settings,
} from "lucide-react";

interface SidebarProps {
  user: SessionUser;
  modules: Array<{ id: number; name: string; visible: boolean; route: string }>;
}

const MODULE_ICONS: Record<number, any> = {
  1: ShieldCheck,
  2: Upload,
  3: School,
  4: FileText,
  5: Receipt,
  6: BarChart3,
  7: Landmark,
};

export function Sidebar({ user, modules }: SidebarProps) {
  const pathname = usePathname();
  const visibleModules = modules.filter((m) => m.visible);

  const isActive = (route: string, moduleId?: number) =>
    pathname === route || (moduleId ? pathname.includes(`modulo-${moduleId}`) : false);

  const NavLink = ({
    href,
    icon: Icon,
    children,
    active,
  }: {
    href: string;
    icon: any;
    children: React.ReactNode;
    active: boolean;
  }) => (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm mb-0.5 transition-colors ${
        active
          ? "bg-primary text-primary-foreground font-medium"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {children}
    </Link>
  );

  return (
    <aside className="w-64 bg-slate-900 h-screen flex flex-col shrink-0">
      <div className="p-4 border-b border-white/10">
        <LogoWithText className="[&_p:first-child]:text-white [&_p:last-child]:text-slate-400" />
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <NavLink href="/dashboard" icon={LayoutDashboard} active={pathname === "/dashboard"}>
          Dashboard
        </NavLink>

        <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Moduli
        </p>

        {visibleModules.map((mod) => {
          const Icon = MODULE_ICONS[mod.id] || FileText;
          return (
            <NavLink key={mod.id} href={mod.route} icon={Icon} active={isActive(mod.route, mod.id)}>
              {mod.name}
            </NavLink>
          );
        })}

        {user.ruolo === "SUPERADMIN" && (
          <>
            <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Admin
            </p>
            <NavLink href="/admin/audit-log" icon={ScrollText} active={isActive("/admin/audit-log")}>
              Audit Log
            </NavLink>
            <NavLink href="/admin/utenti" icon={Users} active={isActive("/admin/utenti")}>
              Utenti
            </NavLink>
            <NavLink href="/admin/impostazioni" icon={Settings} active={isActive("/admin/impostazioni")}>
              Impostazioni
            </NavLink>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-white/10">
        <p className="text-sm text-white font-medium truncate">
          {user.nome} {user.cognome}
        </p>
        <p className="text-xs text-slate-400 truncate">{user.email}</p>
        <Badge variant="default" className="mt-2 bg-white/10 text-white">
          {user.ruolo}
        </Badge>
      </div>
    </aside>
  );
}
