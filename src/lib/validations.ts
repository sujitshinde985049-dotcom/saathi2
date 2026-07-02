import { z } from "zod";

export const customerUploadSchema = z.object({
  full_name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters"),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Mobile must be a valid 10-digit Indian number"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  aadhaar_last4: z
    .string()
    .regex(/^\d{4}$/, "Aadhaar last 4 must be exactly 4 digits")
    .optional()
    .or(z.literal("")),
  pan_number: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format (e.g. ABCDE1234F)")
    .optional()
    .or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state_code: z
    .string()
    .regex(/^[A-Z]{2}$/, "State code must be 2 uppercase letters (e.g. MH)"),
  zip_code: z
    .string()
    .regex(/^\d{5,6}$/, "ZIP/PIN code must be 5-6 digits"),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
});

export const loanUploadSchema = z.object({
  saathi_id: z
    .string()
    .regex(/^SAATHI-[A-Z]{2}-\d{5,6}-[A-Z0-9]{6}$/, "Invalid SAATHI ID format")
    .optional()
    .or(z.literal("")),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Mobile must be a valid 10-digit Indian number")
    .optional()
    .or(z.literal("")),
  loan_account_number: z
    .string()
    .min(3, "Loan account number is required")
    .max(50),
  loan_type: z.string().min(2, "Loan type is required"),
  principal_amount: z
    .number({ invalid_type_error: "Principal amount must be a number" })
    .positive("Principal amount must be positive"),
  outstanding_amount: z
    .number({ invalid_type_error: "Outstanding amount must be a number" })
    .min(0, "Outstanding amount cannot be negative")
    .optional(),
  interest_rate: z
    .number({ invalid_type_error: "Interest rate must be a number" })
    .min(0)
    .max(100)
    .optional(),
  disbursement_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Disbursement date must be YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  maturity_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Maturity date must be YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  status: z.enum(["active", "closed", "npa", "written_off"]).optional(),
}).refine(
  (data) => data.saathi_id || data.mobile,
  { message: "Either SAATHI ID or mobile number is required", path: ["saathi_id"] }
);

export const societySchema = z.object({
  name: z.string().min(3, "Society name is required"),
  registration_number: z.string().min(3, "Registration number is required"),
  state_code: z
    .string()
    .regex(/^[A-Z]{2}$/, "State code must be 2 uppercase letters"),
  zip_code: z.string().regex(/^\d{5,6}$/, "ZIP code must be 5-6 digits"),
  address: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
});

export const searchSchema = z.object({
  searchType: z.enum(["mobile", "saathi_id"]),
  searchValue: z.string().min(1, "Search value is required"),
  purpose: z.string().min(10, "Purpose must be at least 10 characters"),
});

export const consentVerifySchema = z.object({
  consentId: z.string().uuid("Invalid consent request ID"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type CustomerUploadInput = z.infer<typeof customerUploadSchema>;
export type LoanUploadInput = z.infer<typeof loanUploadSchema>;
export type SocietyInput = z.infer<typeof societySchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type ConsentVerifyInput = z.infer<typeof consentVerifySchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export function normalizeCustomerRow(
  row: Record<string, unknown>,
  rowIndex: number
): { data: CustomerUploadInput | null; errors: string[] } {
  const errors: string[] = [];

  const normalized = {
    full_name: String(row.full_name ?? row["Full Name"] ?? row.name ?? "").trim(),
    mobile: String(row.mobile ?? row["Mobile"] ?? row.phone ?? "")
      .replace(/\s/g, "")
      .trim(),
    email: String(row.email ?? row["Email"] ?? "").trim() || undefined,
    aadhaar_last4: String(row.aadhaar_last4 ?? row["Aadhaar Last 4"] ?? "").trim() || undefined,
    pan_number: String(row.pan_number ?? row["PAN"] ?? row.pan ?? "")
      .toUpperCase()
      .trim() || undefined,
    address: String(row.address ?? row["Address"] ?? "").trim() || undefined,
    city: String(row.city ?? row["City"] ?? "").trim() || undefined,
    state_code: String(row.state_code ?? row["State Code"] ?? row.state ?? "")
      .toUpperCase()
      .trim(),
    zip_code: String(row.zip_code ?? row["ZIP Code"] ?? row.pincode ?? row.pin ?? "").trim(),
    date_of_birth: String(row.date_of_birth ?? row["Date of Birth"] ?? row.dob ?? "").trim() || undefined,
  };

  const result = customerUploadSchema.safeParse(normalized);
  if (!result.success) {
    result.error.errors.forEach((err) => {
      errors.push(`Row ${rowIndex}: ${err.path.join(".")} — ${err.message}`);
    });
    return { data: null, errors };
  }

  return { data: result.data, errors: [] };
}

export function normalizeLoanRow(
  row: Record<string, unknown>,
  rowIndex: number
): { data: LoanUploadInput | null; errors: string[] } {
  const errors: string[] = [];

  const principalRaw = row.principal_amount ?? row["Principal Amount"] ?? row.principal;
  const outstandingRaw = row.outstanding_amount ?? row["Outstanding Amount"] ?? row.outstanding;
  const interestRaw = row.interest_rate ?? row["Interest Rate"] ?? row.interest;

  const normalized = {
    saathi_id: String(row.saathi_id ?? row["SAATHI ID"] ?? "").trim().toUpperCase() || undefined,
    mobile: String(row.mobile ?? row["Mobile"] ?? "")
      .replace(/\s/g, "")
      .trim() || undefined,
    loan_account_number: String(
      row.loan_account_number ?? row["Loan Account Number"] ?? row.account_number ?? ""
    ).trim(),
    loan_type: String(row.loan_type ?? row["Loan Type"] ?? "").trim(),
    principal_amount: principalRaw !== undefined && principalRaw !== "" ? Number(principalRaw) : NaN,
    outstanding_amount:
      outstandingRaw !== undefined && outstandingRaw !== ""
        ? Number(outstandingRaw)
        : undefined,
    interest_rate:
      interestRaw !== undefined && interestRaw !== "" ? Number(interestRaw) : undefined,
    disbursement_date:
      String(row.disbursement_date ?? row["Disbursement Date"] ?? "").trim() || undefined,
    maturity_date:
      String(row.maturity_date ?? row["Maturity Date"] ?? "").trim() || undefined,
    status: String(row.status ?? row["Status"] ?? "active").trim().toLowerCase() as
      | "active"
      | "closed"
      | "npa"
      | "written_off",
  };

  const result = loanUploadSchema.safeParse(normalized);
  if (!result.success) {
    result.error.errors.forEach((err) => {
      errors.push(`Row ${rowIndex}: ${err.path.join(".")} — ${err.message}`);
    });
    return { data: null, errors };
  }

  return { data: result.data, errors: [] };
}
