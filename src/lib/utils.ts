import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function maskMobile(mobile: string): string {
  if (mobile.length < 4) return mobile;
  return "XXXXXX" + mobile.slice(-4);
}

export function maskAadhaar(last4: string | null): string {
  if (!last4) return "—";
  return "XXXX-XXXX-" + last4;
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateRbiComplianceRef(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RBI-CIC-${timestamp}-${random}`;
}

export function generateSaathiId(stateCode: string, zipCode: string): string {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SAATHI-${stateCode.toUpperCase()}-${zipCode}-${random}`;
}

export function validateMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile.replace(/\s/g, ""));
}

export function validatePan(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
}

export function validateStateCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code.toUpperCase());
}

export function validateSaathiId(id: string): boolean {
  return /^SAATHI-[A-Z]{2}-\d{5,6}-[A-Z0-9]{6}$/.test(id.toUpperCase());
}
