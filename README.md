# iTrack mo yarn – AI Financial Tracker (Next.js + Supabase + Vercel)

1. Supabase: run `supabase/schema.sql` in the SQL editor.
2. Supabase > Authentication > Providers > Google: enable it, paste your Google OAuth client ID/secret.
   In Google Cloud, add the redirect URI shown by Supabase (https://YOUR-PROJECT.supabase.co/auth/v1/callback).
3. Supabase > Authentication > URL Configuration: set Site URL to your Vercel domain and add http://localhost:3000 to Redirect URLs.
4. Copy `.env.example` to `.env.local` and fill it in. `npm install && npm run dev`.
5. Vercel: import the repo and add the same 3 env vars (GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY). Deploy.
