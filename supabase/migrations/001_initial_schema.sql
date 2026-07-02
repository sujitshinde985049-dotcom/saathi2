-- SAATHI by MAHACRED - Complete Database Schema
-- Run this in Supabase SQL Editor or via CLI migrations

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('super_admin', 'society_admin', 'society_staff');
CREATE TYPE consent_status AS ENUM ('pending', 'sent', 'verified', 'expired', 'denied');
CREATE TYPE audit_action AS ENUM (
  'login', 'logout', 'upload_customers', 'upload_loans',
  'search_customer', 'consent_request', 'consent_verify',
  'consent_denied', 'user_create', 'user_update', 'society_create', 'society_update'
);

-- ============================================================
-- SOCIETIES (Tenants)
-- ============================================================
CREATE TABLE societies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  registration_number TEXT UNIQUE NOT NULL,
  state_code CHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  address TEXT,
  contact_email TEXT,
  contact_phone VARCHAR(15),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_societies_state_zip ON societies(state_code, zip_code);
CREATE INDEX idx_societies_active ON societies(is_active);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone VARCHAR(15),
  role user_role NOT NULL DEFAULT 'society_staff',
  society_id UUID REFERENCES societies(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT super_admin_no_society CHECK (
    (role = 'super_admin' AND society_id IS NULL) OR
    (role != 'super_admin' AND society_id IS NOT NULL)
  )
);

CREATE INDEX idx_profiles_society ON profiles(society_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  saathi_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  email TEXT,
  aadhaar_last4 CHAR(4),
  pan_number VARCHAR(10),
  address TEXT,
  city TEXT,
  state_code CHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  date_of_birth DATE,
  kyc_status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(society_id, mobile)
);

CREATE INDEX idx_customers_saathi_id ON customers(saathi_id);
CREATE INDEX idx_customers_mobile ON customers(mobile);
CREATE INDEX idx_customers_society ON customers(society_id);

-- ============================================================
-- LOANS
-- ============================================================
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  loan_account_number TEXT NOT NULL,
  loan_type TEXT NOT NULL,
  principal_amount NUMERIC(15, 2) NOT NULL,
  outstanding_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  interest_rate NUMERIC(5, 2),
  disbursement_date DATE,
  maturity_date DATE,
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(society_id, loan_account_number)
);

CREATE INDEX idx_loans_customer ON loans(customer_id);
CREATE INDEX idx_loans_society ON loans(society_id);

-- ============================================================
-- CONSENT REQUESTS (RBI/CIC Compliance)
-- ============================================================
CREATE TABLE consent_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requesting_society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  target_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  search_type TEXT NOT NULL CHECK (search_type IN ('mobile', 'saathi_id')),
  search_value TEXT NOT NULL,
  status consent_status DEFAULT 'pending',
  otp_hash TEXT,
  otp_expires_at TIMESTAMPTZ,
  otp_attempts INT DEFAULT 0,
  verified_at TIMESTAMPTZ,
  purpose TEXT NOT NULL,
  rbi_compliance_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consent_society ON consent_requests(requesting_society_id);
CREATE INDEX idx_consent_customer ON consent_requests(target_customer_id);
CREATE INDEX idx_consent_status ON consent_requests(status);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id UUID REFERENCES societies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_society ON audit_logs(society_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================
-- BULK UPLOAD BATCHES
-- ============================================================
CREATE TABLE upload_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  upload_type TEXT NOT NULL CHECK (upload_type IN ('customers', 'loans')),
  total_records INT DEFAULT 0,
  success_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  errors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_upload_batches_society ON upload_batches(society_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's society_id
CREATE OR REPLACE FUNCTION get_user_society_id()
RETURNS UUID AS $$
  SELECT society_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user belongs to a society
CREATE OR REPLACE FUNCTION user_belongs_to_society(p_society_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND society_id = p_society_id
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- SAATHI ID Generation: SAATHI-[STATE]-[ZIP]-[RANDOM]
CREATE OR REPLACE FUNCTION generate_saathi_id(
  p_state_code CHAR(2),
  p_zip_code VARCHAR(10)
)
RETURNS TEXT AS $$
DECLARE
  v_random TEXT;
  v_saathi_id TEXT;
  v_attempts INT := 0;
BEGIN
  LOOP
    v_random := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
    v_saathi_id := 'SAATHI-' || UPPER(p_state_code) || '-' || p_zip_code || '-' || v_random;

    IF NOT EXISTS (SELECT 1 FROM customers WHERE saathi_id = v_saathi_id) THEN
      RETURN v_saathi_id;
    END IF;

    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Unable to generate unique SAATHI ID after 10 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'society_staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER societies_updated_at BEFORE UPDATE ON societies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER loans_updated_at BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER consent_requests_updated_at BEFORE UPDATE ON consent_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_batches ENABLE ROW LEVEL SECURITY;

-- SOCIETIES policies
CREATE POLICY societies_super_admin_all ON societies
  FOR ALL USING (is_super_admin());

CREATE POLICY societies_member_read ON societies
  FOR SELECT USING (id = get_user_society_id());

-- PROFILES policies
CREATE POLICY profiles_super_admin_all ON profiles
  FOR ALL USING (is_super_admin());

CREATE POLICY profiles_society_admin_manage ON profiles
  FOR ALL USING (
    get_user_role() = 'society_admin'
    AND society_id = get_user_society_id()
  );

CREATE POLICY profiles_self_read ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_society_members_read ON profiles
  FOR SELECT USING (society_id = get_user_society_id());

-- CUSTOMERS policies
CREATE POLICY customers_super_admin_all ON customers
  FOR ALL USING (is_super_admin());

CREATE POLICY customers_society_all ON customers
  FOR ALL USING (society_id = get_user_society_id());

CREATE POLICY customers_cross_society_search ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM consent_requests cr
      WHERE cr.target_customer_id = customers.id
        AND cr.requesting_society_id = get_user_society_id()
        AND cr.status = 'verified'
        AND cr.verified_at > NOW() - INTERVAL '24 hours'
    )
  );

-- LOANS policies
CREATE POLICY loans_super_admin_all ON loans
  FOR ALL USING (is_super_admin());

CREATE POLICY loans_society_all ON loans
  FOR ALL USING (society_id = get_user_society_id());

CREATE POLICY loans_consent_read ON loans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM consent_requests cr
      WHERE cr.target_customer_id = loans.customer_id
        AND cr.requesting_society_id = get_user_society_id()
        AND cr.status = 'verified'
        AND cr.verified_at > NOW() - INTERVAL '24 hours'
    )
  );

-- CONSENT REQUESTS policies
CREATE POLICY consent_super_admin_all ON consent_requests
  FOR ALL USING (is_super_admin());

CREATE POLICY consent_society_all ON consent_requests
  FOR ALL USING (requesting_society_id = get_user_society_id());

-- AUDIT LOGS policies
CREATE POLICY audit_super_admin_all ON audit_logs
  FOR ALL USING (is_super_admin());

CREATE POLICY audit_society_read ON audit_logs
  FOR SELECT USING (society_id = get_user_society_id());

CREATE POLICY audit_society_insert ON audit_logs
  FOR INSERT WITH CHECK (
    society_id = get_user_society_id() OR is_super_admin()
  );

-- UPLOAD BATCHES policies
CREATE POLICY upload_batches_super_admin_all ON upload_batches
  FOR ALL USING (is_super_admin());

CREATE POLICY upload_batches_society_all ON upload_batches
  FOR ALL USING (society_id = get_user_society_id());

-- ============================================================
-- SEED: Create first super admin (update email after deploy)
-- ============================================================
-- After creating a user via Supabase Auth, run:
-- UPDATE profiles SET role = 'super_admin', society_id = NULL WHERE email = 'admin@mahacred.com';
