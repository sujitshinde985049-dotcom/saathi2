"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Users, Search, FileSpreadsheet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      <Input
        label="Email Address"
        type="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@society.coop"
        required
      />
      <Input
        label="Password"
        type="password"
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        required
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {searchParams.get("error") === "auth_callback_failed" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Authentication failed. Please try signing in again.
        </div>
      )}

      <Button type="submit" loading={loading} className="w-full">
        Sign In
      </Button>
    </form>
  );
}

export default function LandingPage() {
  const features = [
    {
      icon: Shield,
      title: "RBI/CIC Compliant",
      description: "Built-in OTP consent flow for cross-society customer searches.",
    },
    {
      icon: Users,
      title: "Multi-Tenant RLS",
      description: "Strict row-level security isolates every society's data.",
    },
    {
      icon: Search,
      title: "SAATHI ID Search",
      description: "Unified customer identity across cooperative credit societies.",
    },
    {
      icon: FileSpreadsheet,
      title: "Bulk Upload",
      description: "Validate and import customers and loans from Excel files.",
    },
  ];

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-saathi-blue-800 via-saathi-blue-600 to-saathi-green-600 p-12 text-white lg:flex">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <span className="text-xl font-bold">S</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">SAATHI</h1>
              <p className="text-sm font-medium text-white/80">by MAHACRED</p>
            </div>
          </div>
          <p className="mt-8 max-w-md text-lg leading-relaxed text-white/90">
            The trusted platform for cooperative credit societies to manage
            members, loans, and compliant cross-society customer verification.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl bg-white/10 p-4 backdrop-blur-sm"
            >
              <feature.icon className="mb-2 h-6 w-6 text-saathi-green-300" />
              <h3 className="text-sm font-semibold">{feature.title}</h3>
              <p className="mt-1 text-xs text-white/70">{feature.description}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-white/50">
          &copy; {new Date().getFullYear()} MAHACRED. All rights reserved.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-4 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-saathi-blue-500 to-saathi-green-500">
                <span className="font-bold text-white">S</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-saathi-blue-800">SAATHI</h1>
                <p className="text-xs font-medium text-saathi-green-600">by MAHACRED</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-1 text-sm text-gray-500">
              Sign in to your society dashboard
            </p>
          </div>

          <Suspense fallback={<div className="py-8 text-center text-sm text-gray-400">Loading...</div>}>
            <LoginForm />
          </Suspense>

          <p className="mt-8 text-center text-xs text-gray-400">
            Secure access for registered cooperative credit society members only.
          </p>
        </div>
      </div>
    </div>
  );
}
