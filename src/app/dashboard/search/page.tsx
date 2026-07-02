"use client";

import { useState } from "react";
import {
  Search,
  Shield,
  User,
  Phone,
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  formatCurrency,
  formatDate,
  maskMobile,
  maskAadhaar,
} from "@/lib/utils";
import type { Customer, ConsentRequest } from "@/lib/types";

interface SearchResponse {
  found: boolean;
  requiresConsent: boolean;
  isOwnSociety: boolean;
  customer?: Customer;
  consentRequest?: ConsentRequest;
  message: string;
}

export default function SearchPage() {
  const [searchType, setSearchType] = useState<"mobile" | "saathi_id">("mobile");
  const [searchValue, setSearchValue] = useState("");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);

  const [consentId, setConsentId] = useState("");
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verifiedCustomer, setVerifiedCustomer] = useState<Customer | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setVerifiedCustomer(null);
    setOtpSent(false);
    setOtp("");

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchType, searchValue, purpose }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Search failed.");
        return;
      }

      setResult(data);

      if (data.requiresConsent && data.consentRequest) {
        setConsentId(data.consentRequest.id);
        setOtpSent(data.consentRequest.status === "sent");
      }

      if (data.isOwnSociety && data.customer) {
        setVerifiedCustomer(data.customer);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpLoading(true);
    setError("");

    try {
      const response = await fetch("/api/consent/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentId, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "OTP verification failed.");
        return;
      }

      setVerifiedCustomer(data.customer);
      setResult(null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }

  function resetSearch() {
    setSearchValue("");
    setPurpose("");
    setResult(null);
    setVerifiedCustomer(null);
    setError("");
    setOtp("");
    setConsentId("");
    setOtpSent(false);
  }

  return (
    <>
      <Header
        title="Customer Search & Consent"
        subtitle="Cross-society search with RBI/CIC compliant OTP consent"
      />
      <div className="p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-xl border border-saathi-blue-200 bg-saathi-blue-50/50 p-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-saathi-blue-600" />
              <div>
                <p className="text-sm font-medium text-saathi-blue-800">
                  RBI/CIC Compliance Notice
                </p>
                <p className="mt-1 text-xs text-saathi-blue-700">
                  Cross-society customer searches require explicit OTP consent from the
                  customer. All search and consent activities are logged for audit purposes.
                  Consent is valid for 24 hours after verification.
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Search className="h-5 w-5 text-saathi-blue-500" />
                Search Customer
              </h3>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Search By"
                  value={searchType}
                  onChange={(e) =>
                    setSearchType(e.target.value as "mobile" | "saathi_id")
                  }
                  options={[
                    { value: "mobile", label: "Mobile Number" },
                    { value: "saathi_id", label: "SAATHI ID" },
                  ]}
                />
                <Input
                  label={searchType === "mobile" ? "Mobile Number" : "SAATHI ID"}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={
                    searchType === "mobile" ? "9876543210" : "SAATHI-MH-400001-ABC123"
                  }
                  required
                />
              </div>

              <Input
                label="Purpose of Search"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Loan eligibility verification for member transfer"
                required
              />

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" loading={loading}>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
                <Button type="button" variant="secondary" onClick={resetSearch}>
                  Reset
                </Button>
              </div>
            </form>
          </div>

          {result && !result.isOwnSociety && result.requiresConsent && (
            <div className="card border-yellow-200 bg-yellow-50/30">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-yellow-600" />
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900">
                    Consent Required
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">{result.message}</p>

                  {otpSent && (
                    <form onSubmit={handleVerifyOtp} className="mt-4 space-y-4">
                      <div className="rounded-lg bg-white p-4">
                        <p className="mb-3 text-sm text-gray-600">
                          An OTP has been sent to the customer&apos;s registered mobile
                          number ending in{" "}
                          <strong>
                            {result.customer
                              ? maskMobile(result.customer.mobile)
                              : "****"}
                          </strong>
                          . Enter the 6-digit OTP below.
                        </p>
                        <Input
                          label="OTP Code"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="000000"
                          maxLength={6}
                          required
                        />
                        <Button
                          type="submit"
                          variant="success"
                          loading={otpLoading}
                          className="mt-3"
                        >
                          Verify OTP & View Customer
                        </Button>
                      </div>
                    </form>
                  )}

                  {!otpSent && result.consentRequest?.status === "pending" && (
                    <p className="mt-2 text-sm text-yellow-700">
                      Consent request initiated. OTP delivery is being processed...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {result && !result.found && (
            <div className="card text-center">
              <User className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">{result.message}</p>
            </div>
          )}

          {verifiedCustomer && (
            <CustomerDetailCard customer={verifiedCustomer} />
          )}
        </div>
      </div>
    </>
  );
}

function CustomerDetailCard({ customer }: { customer: Customer }) {
  return (
    <div className="card">
      <div className="card-header flex items-center gap-3">
        <CheckCircle className="h-6 w-6 text-saathi-green-500" />
        <div>
          <h3 className="text-base font-semibold text-gray-900">Customer Details</h3>
          <p className="text-sm text-gray-500">
            {customer.societies?.name ?? "Society information"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <DetailItem icon={User} label="Full Name" value={customer.full_name} />
        <DetailItem
          icon={CreditCard}
          label="SAATHI ID"
          value={customer.saathi_id}
          highlight
        />
        <DetailItem icon={Phone} label="Mobile" value={maskMobile(customer.mobile)} />
        <DetailItem label="Email" value={customer.email ?? "—"} />
        <DetailItem label="City" value={customer.city ?? "—"} />
        <DetailItem label="State" value={customer.state_code} />
        <DetailItem
          label="Aadhaar"
          value={maskAadhaar(customer.aadhaar_last4)}
        />
        <DetailItem label="KYC Status">
          <span className="badge-green">{customer.kyc_status}</span>
        </DetailItem>
        <DetailItem label="Date of Birth" value={formatDate(customer.date_of_birth)} />
      </div>

      {customer.loans && customer.loans.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-6">
          <h4 className="mb-3 text-sm font-semibold text-gray-900">Loan Accounts</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <th className="px-3 py-2">Account</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Principal</th>
                  <th className="px-3 py-2">Outstanding</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {customer.loans.map((loan) => (
                  <tr key={loan.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium">{loan.loan_account_number}</td>
                    <td className="px-3 py-2">{loan.loan_type}</td>
                    <td className="px-3 py-2">{formatCurrency(loan.principal_amount)}</td>
                    <td className="px-3 py-2">{formatCurrency(loan.outstanding_amount)}</td>
                    <td className="px-3 py-2">
                      <span className="badge-blue">{loan.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
  highlight,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  highlight?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="mt-0.5 h-4 w-4 text-gray-400" />}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        {children ?? (
          <p
            className={`text-sm font-medium ${
              highlight ? "text-saathi-blue-600" : "text-gray-900"
            }`}
          >
            {value}
          </p>
        )}
      </div>
    </div>
  );
}
