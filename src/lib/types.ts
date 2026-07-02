export type UserRole = "super_admin" | "society_admin" | "society_staff";

export type ConsentStatus =
  | "pending"
  | "sent"
  | "verified"
  | "expired"
  | "denied";

export type AuditAction =
  | "login"
  | "logout"
  | "upload_customers"
  | "upload_loans"
  | "search_customer"
  | "consent_request"
  | "consent_verify"
  | "consent_denied"
  | "user_create"
  | "user_update"
  | "society_create"
  | "society_update";

export interface Society {
  id: string;
  name: string;
  registration_number: string;
  state_code: string;
  zip_code: string;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  society_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  societies?: Society;
}

export interface Customer {
  id: string;
  society_id: string;
  saathi_id: string;
  full_name: string;
  mobile: string;
  email: string | null;
  aadhaar_last4: string | null;
  pan_number: string | null;
  address: string | null;
  city: string | null;
  state_code: string;
  zip_code: string;
  date_of_birth: string | null;
  kyc_status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  societies?: Society;
  loans?: Loan[];
}

export interface Loan {
  id: string;
  society_id: string;
  customer_id: string;
  loan_account_number: string;
  loan_type: string;
  principal_amount: number;
  outstanding_amount: number;
  interest_rate: number | null;
  disbursement_date: string | null;
  maturity_date: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConsentRequest {
  id: string;
  requesting_society_id: string;
  target_customer_id: string;
  requested_by: string;
  search_type: "mobile" | "saathi_id";
  search_value: string;
  status: ConsentStatus;
  otp_expires_at: string | null;
  otp_attempts: number;
  verified_at: string | null;
  purpose: string;
  rbi_compliance_ref: string | null;
  created_at: string;
  updated_at: string;
  customers?: Customer;
}

export interface AuditLog {
  id: string;
  society_id: string | null;
  user_id: string | null;
  action: AuditAction;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface UploadBatch {
  id: string;
  society_id: string;
  uploaded_by: string;
  upload_type: "customers" | "loans";
  total_records: number;
  success_count: number;
  error_count: number;
  errors: UploadError[];
  created_at: string;
}

export interface UploadError {
  row: number;
  field?: string;
  message: string;
}

export interface CustomerUploadRow {
  full_name: string;
  mobile: string;
  email?: string;
  aadhaar_last4?: string;
  pan_number?: string;
  address?: string;
  city?: string;
  state_code: string;
  zip_code: string;
  date_of_birth?: string;
}

export interface LoanUploadRow {
  saathi_id?: string;
  mobile?: string;
  loan_account_number: string;
  loan_type: string;
  principal_amount: number;
  outstanding_amount?: number;
  interest_rate?: number;
  disbursement_date?: string;
  maturity_date?: string;
  status?: string;
}

export interface SearchResult {
  found: boolean;
  requiresConsent: boolean;
  customer?: Customer;
  consentRequest?: ConsentRequest;
  message: string;
}
