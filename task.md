# Implementation Task Checklist - Vercel White Screen Fix

- [x] Create `vercel.json` with SPA rewrite rules (`/index.html`)
- [x] Safeguard `src/app/lib/supabase.ts` against missing/invalid Supabase environment variables
- [x] Run build check (`npm run build`)
- [x] Redeploy to Vercel and verify live production URL
