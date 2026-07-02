"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Search,
  Shield,
  Users,
  Building2,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

interface SidebarProps {
  profile: Profile;
}

const navItems = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    roles: ["super_admin", "society_admin", "society_staff"],
  },
  {
    href: "/dashboard/upload",
    label: "Bulk Upload",
    icon: Upload,
    roles: ["society_admin", "society_staff"],
  },
  {
    href: "/dashboard/search",
    label: "Customer Search",
    icon: Search,
    roles: ["society_admin", "society_staff"],
  },
  {
    href: "/dashboard/admin",
    label: "Super Admin",
    icon: Shield,
    roles: ["super_admin"],
  },
  {
    href: "/dashboard/users",
    label: "User Management",
    icon: Users,
    roles: ["super_admin", "society_admin"],
  },
  {
    href: "/dashboard/societies",
    label: "Societies",
    icon: Building2,
    roles: ["super_admin"],
  },
];

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const filteredNav = navItems.filter((item) =>
    item.roles.includes(profile.role)
  );

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    society_admin: "Society Admin",
    society_staff: "Society Staff",
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-saathi-blue-500 to-saathi-green-500">
          <span className="text-sm font-bold text-white">S</span>
        </div>
        <div>
          <h1 className="text-sm font-bold text-saathi-blue-800">SAATHI</h1>
          <p className="text-[10px] font-medium uppercase tracking-wider text-saathi-green-600">
            by MAHACRED
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-saathi-blue-50 text-saathi-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isActive ? "text-saathi-blue-500" : "text-gray-400 group-hover:text-gray-600"
                )}
              />
              {item.label}
              {isActive && (
                <ChevronRight className="ml-auto h-4 w-4 text-saathi-blue-400" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 p-4">
        <div className="mb-3 rounded-lg bg-gray-50 p-3">
          <p className="truncate text-sm font-semibold text-gray-900">
            {profile.full_name}
          </p>
          <p className="truncate text-xs text-gray-500">{profile.email}</p>
          <span className="badge-blue mt-2">{roleLabels[profile.role]}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
