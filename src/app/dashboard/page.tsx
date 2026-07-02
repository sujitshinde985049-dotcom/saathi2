import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Users, FileText, Search, Building2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, societies(*)")
    .eq("id", user!.id)
    .single();

  const typedProfile = profile as Profile;
  const isSuperAdmin = typedProfile.role === "super_admin";
  const societyId = typedProfile.society_id;

  let stats = {
    customers: 0,
    loans: 0,
    consents: 0,
    societies: 0,
  };

  if (isSuperAdmin) {
    const [societiesRes, profilesRes, customersRes] = await Promise.all([
      supabase.from("societies").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("customers").select("id", { count: "exact", head: true }),
    ]);
    stats.societies = societiesRes.count ?? 0;
    stats.customers = customersRes.count ?? 0;
    stats.consents = profilesRes.count ?? 0;
  } else if (societyId) {
    const [customersRes, loansRes, consentsRes] = await Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("society_id", societyId),
      supabase.from("loans").select("id", { count: "exact", head: true }).eq("society_id", societyId),
      supabase.from("consent_requests").select("id", { count: "exact", head: true }).eq("requesting_society_id", societyId),
    ]);
    stats.customers = customersRes.count ?? 0;
    stats.loans = loansRes.count ?? 0;
    stats.consents = consentsRes.count ?? 0;
  }

  const { data: recentAudits } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  const statCards = isSuperAdmin
    ? [
        { label: "Active Societies", value: stats.societies, icon: Building2, color: "text-saathi-blue-500" },
        { label: "Total Customers", value: stats.customers, icon: Users, color: "text-saathi-green-500" },
        { label: "Active Users", value: stats.consents, icon: Users, color: "text-saathi-blue-500" },
      ]
    : [
        { label: "Customers", value: stats.customers, icon: Users, color: "text-saathi-blue-500" },
        { label: "Active Loans", value: stats.loans, icon: FileText, color: "text-saathi-green-500" },
        { label: "Consent Requests", value: stats.consents, icon: Search, color: "text-saathi-blue-500" },
      ];

  return (
    <>
      <Header
        title="Dashboard Overview"
        subtitle={
          isSuperAdmin
            ? "Super Admin — Platform Management"
            : typedProfile.societies?.name ?? "Society Dashboard"
        }
      />
      <div className="p-6">
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <div key={card.label} className="card flex items-center gap-4">
              <div className={`rounded-lg bg-gray-50 p-3 ${card.color}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
            <p className="text-sm text-gray-500">Latest audit log entries</p>
          </div>
          {recentAudits && recentAudits.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentAudits.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-3">
                  <div>
                    <span className="badge-blue">{log.action.replace(/_/g, " ")}</span>
                    {log.entity_type && (
                      <span className="ml-2 text-sm text-gray-600">{log.entity_type}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No activity recorded yet.</p>
          )}
        </div>
      </div>
    </>
  );
}
