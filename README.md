# Arion AI OS — Optical Business Workspace

React + Vite frontend using the existing Supabase project. This package intentionally excludes secrets, `.env.local`, `node_modules`, and nested archives.

## Requirements
- Node.js 20.19+ or 22.12+ (use a current supported LTS release)
- npm
- Your existing Supabase project URL and publishable/anon key

## Setup
1. Extract this folder.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the existing Supabase project values. Never use a service-role key in the browser.
5. Run `npm run dev` and open the local URL shown in the terminal.
6. For a production build, run `npm run build`.

## Dashboard update
- Updated to a light, modern workspace layout.
- Overview cards show active orders, outstanding balance, tasks to do, and open leads.
- Sales activity chart uses dated order records; it does not invent sample sales when records are missing.
- Priority alerts and quick actions link to the existing workspace modules.
- Existing Supabase auth, workspace data, and module workflows are retained.

## Important
- Use only the existing Supabase project and keep Row Level Security enabled.
- Validate order and payment totals against your books before relying on reports.
- WhatsApp messages are not sent unless a secure server-side WhatsApp Business integration is configured.
