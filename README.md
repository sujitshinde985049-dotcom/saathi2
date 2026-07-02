# SAATHI by MAHACRED

Multi-tenant SaaS platform for cooperative credit societies.

## Quick Start

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** and run the entire script from:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. Go to **Authentication > Users** and create your first admin user
4. Run this SQL to promote them to Super Admin:
   ```sql
   UPDATE profiles SET role = 'super_admin', society_id = NULL
   WHERE email = 'your-admin@email.com';
   ```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Find these in Supabase under **Project Settings > API**.

### 3. Install & Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

1. Push code to GitHub
2. Import project at [vercel.com](https://vercel.com)
3. Add the three environment variables from step 2
4. Deploy

## Project Structure

```
saathi-by-mahacred/
├── supabase/migrations/     # Database schema & RLS
├── src/
│   ├── app/
│   │   ├── page.tsx          # Login / Landing
│   │   ├── dashboard/        # Protected dashboard pages
│   │   └── api/              # API routes
│   ├── components/           # UI & layout components
│   └── lib/                  # Supabase, validation, audit
├── package.json
├── tailwind.config.ts
└── .env.example
```

## Features

- Multi-tenant RLS via `society_id`
- Super Admin dashboard (society registration, user management)
- Role-based access (Super Admin, Society Admin, Society Staff)
- Bulk customer/loan upload with Excel validation
- SAATHI ID generation (`SAATHI-[STATE]-[ZIP]-[RANDOM]`)
- Cross-society search with OTP consent flow
- Complete audit logging
