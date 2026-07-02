import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import type { Profile } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, societies(*)")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    redirect("/?error=account_inactive");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar profile={profile as Profile} />
      <main className="lg:pl-64">{children}</main>
    </div>
  );
}
