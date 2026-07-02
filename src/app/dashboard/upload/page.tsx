"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { UploadError } from "@/lib/types";

interface UploadResult {
  batchId: string;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: UploadError[];
}

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<"customers" | "loans">("customers");
  const [fileName, setFileName] = useState("");
  const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);
    setError("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        if (json.length === 0) {
          setError("The uploaded file contains no data rows.");
          setParsedData([]);
          return;
        }

        setParsedData(json);
      } catch {
        setError("Failed to parse the Excel file. Please upload a valid .xlsx or .xls file.");
        setParsedData([]);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleUpload() {
    if (parsedData.length === 0) {
      setError("Please select and parse a file first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const endpoint =
        uploadType === "customers"
          ? "/api/upload-customers"
          : "/api/upload-loans";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: parsedData }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Upload failed.");
        if (data.errors) {
          setResult({
            batchId: "",
            totalRecords: parsedData.length,
            successCount: 0,
            errorCount: data.errors.length,
            errors: data.errors,
          });
        }
        return;
      }

      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFileName("");
    setParsedData([]);
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <>
      <Header
        title="Bulk Upload"
        subtitle="Import customers and loan data from Excel files"
      />
      <div className="p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-base font-semibold text-gray-900">Upload Configuration</h3>
            </div>

            <div className="space-y-5">
              <Select
                label="Upload Type"
                value={uploadType}
                onChange={(e) => {
                  setUploadType(e.target.value as "customers" | "loans");
                  resetForm();
                }}
                options={[
                  { value: "customers", label: "Customer Data" },
                  { value: "loans", label: "Loan Data" },
                ]}
              />

              <div>
                <label className="label-text">Excel File (.xlsx, .xls)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 transition-colors hover:border-saathi-blue-400 hover:bg-saathi-blue-50/50"
                >
                  {fileName ? (
                    <>
                      <FileSpreadsheet className="mb-3 h-10 w-10 text-saathi-green-500" />
                      <p className="text-sm font-medium text-gray-900">{fileName}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {parsedData.length} rows detected — click to change file
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="mb-3 h-10 w-10 text-gray-400" />
                      <p className="text-sm font-medium text-gray-700">
                        Click to select an Excel file
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Supports .xlsx and .xls formats
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleUpload} loading={loading} disabled={parsedData.length === 0}>
                  <Upload className="mr-2 h-4 w-4" />
                  Validate & Upload
                </Button>
                <Button variant="secondary" onClick={resetForm}>
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {parsedData.length > 0 && !result && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-base font-semibold text-gray-900">Preview (first 5 rows)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                      {Object.keys(parsedData[0]).map((key) => (
                        <th key={key} className="px-3 py-2 font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-3 py-2 text-gray-700">
                            {String(val ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result && (
            <div className="card">
              <div className="card-header flex items-center gap-3">
                {result.errorCount === 0 ? (
                  <CheckCircle className="h-6 w-6 text-saathi-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-yellow-500" />
                )}
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Upload Results</h3>
                  <p className="text-sm text-gray-500">
                    {result.successCount} of {result.totalRecords} records imported successfully
                  </p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{result.totalRecords}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div className="rounded-lg bg-saathi-green-50 p-3 text-center">
                  <p className="text-2xl font-bold text-saathi-green-600">{result.successCount}</p>
                  <p className="text-xs text-gray-500">Success</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{result.errorCount}</p>
                  <p className="text-xs text-gray-500">Errors</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="max-h-60 overflow-y-auto rounded-lg border border-red-100 bg-red-50 p-4">
                  <p className="mb-2 text-sm font-medium text-red-800">Validation Errors:</p>
                  <ul className="space-y-1 text-xs text-red-700">
                    {result.errors.map((err, i) => (
                      <li key={i}>
                        Row {err.row}{err.field ? ` (${err.field})` : ""}: {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="card bg-saathi-blue-50/50">
            <h3 className="mb-2 text-sm font-semibold text-saathi-blue-800">
              Expected Column Headers
            </h3>
            {uploadType === "customers" ? (
              <p className="text-xs text-saathi-blue-700">
                full_name, mobile, email, aadhaar_last4, pan_number, address, city, state_code, zip_code, date_of_birth
              </p>
            ) : (
              <p className="text-xs text-saathi-blue-700">
                saathi_id (or mobile), loan_account_number, loan_type, principal_amount, outstanding_amount, interest_rate, disbursement_date, maturity_date, status
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
