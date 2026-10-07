# 08 — Auth Setup: owning the Google and Supabase credentials

Written for whoever on the team holds the accounts. Follow it top to bottom once;
after that it only matters when a credential has to be replaced.

## Why this document exists

The original Google Cloud project and the first two Supabase projects were created
by a team member who has since left. Those credentials cannot be rotated, audited,
or recovered by anyone still on the project, and an OAuth client can be deleted by
its owner at any time. This walks through creating replacements the current team
controls.

Current state, verified 2026-10-06:

| Credential | Project | State |
| --- | --- | --- |
| Supabase (original) | `hlanjunsrwxslfmubpcx` | deleted — DNS does not resolve |
| Supabase (second) | `qpccngednlsanaujrftx` | deleted — DNS does not resolve |
| Supabase (current) | `glmouztenswmwohnoarf` | **live**, tables present, RLS enforced |
| Google OAuth client | unknown | assumed held by the departed member — replace |
| Gemini API key | unknown | still answers, but on an account we do not control |

## The shape of the OAuth round trip

Google never redirects to this app. It redirects to Supabase, which then redirects
to the app. Two different allowlists, in two different consoles, both have to be
right:

```
app  →  glmouztenswmwohnoarf.supabase.co/auth/v1/authorize
     →  accounts.google.com            (Google checks Authorized redirect URIs)
     →  glmouztenswmwohnoarf.supabase.co/auth/v1/callback
     →  https://akshara-tau.vercel.app (Supabase checks Redirect URLs)
```

Most sign-in failures are one of those two lists missing an entry. The symptom
differs: a Google mismatch shows Google's own `redirect_uri_mismatch` error page,
while a Supabase mismatch completes sign-in but lands the child on the Site URL
instead of where they were.

## 1. Create the Google Cloud project

<https://console.cloud.google.com/projectcreate>

- **Project name**: `akshara-flow`
- **Organisation**: leave as-is unless your institute has one you must use

Note the project ID it generates; nothing later depends on it, but support
requests do. Use an account the team will still hold after graduation — a shared
project account is better than a personal one, for exactly the reason this
document exists.

## 2. Configure the consent screen

<https://console.cloud.google.com/auth/overview>

- **User type**: External
- **App name**: `Akshara`
- **User support email**: a team address
- **Developer contact**: same

Scopes — add only these three. They are what Supabase needs to populate a user
record, and nothing more:

- `openid`
- `.../auth/userinfo.email`
- `.../auth/userinfo.profile`

Leave the app in **Testing** while validating. In Testing, only accounts listed
under **Test users** can sign in, capped at 100 — add every team member and every
evaluator's address, or their sign-in will be refused with no useful message.

Publishing to Production removes that cap. With only these three non-sensitive
scopes, no Google verification review is required.

## 3. Create the OAuth client

<https://console.cloud.google.com/auth/clients> → **Create client**

- **Application type**: Web application
- **Name**: `akshara-web`

**Authorized JavaScript origins** — where the app is served from:

```
https://akshara-tau.vercel.app
http://localhost:5173
```

**Authorized redirect URIs** — where Google is allowed to send the response.
This is Supabase, never the app:

```
https://glmouztenswmwohnoarf.supabase.co/auth/v1/callback
```

Copy the **Client ID** and **Client secret** from the dialog. The secret is
shown again later, but copy it now.

The redirect URI embeds the Supabase project ref, so **it has to be reissued
whenever the Supabase project changes.** That coupling is what broke sign-in
twice already.

## 4. Enable the provider in Supabase

<https://supabase.com/dashboard/project/glmouztenswmwohnoarf/auth/providers>
→ **Google** → enable, paste the Client ID and Client secret.

Provider configuration does not transfer between Supabase projects; a new project
starts with every provider off. This page also prints the exact callback URL —
trust that string over the one above if they ever disagree.

## 5. Set the Supabase redirect allowlist

<https://supabase.com/dashboard/project/glmouztenswmwohnoarf/auth/url-configuration>

- **Site URL**: `https://akshara-tau.vercel.app`
- **Redirect URLs**:

```
https://akshara-tau.vercel.app
https://akshara-tau.vercel.app/**
https://akshara-tau-*.vercel.app/**
http://localhost:5173
http://localhost:5173/**
```

`AuthContext.signInWithGoogle` passes `redirectTo: window.location.origin`, which
has no trailing path — hence both the bare origin and the `/**` form. The third
line covers Vercel preview deployments, which get a different hostname per build.

## 6. Environment variables

The app reads exactly two, and the names are not negotiable: **Vite only exposes
variables prefixed `VITE_` to client code.** The Supabase integration's
`SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` are invisible to the frontend no
matter what they are set to — that is why this app ran on local storage for months
while sixteen Supabase variables sat in Vercel.

```
VITE_SUPABASE_URL=https://glmouztenswmwohnoarf.supabase.co
VITE_SUPABASE_KEY=sb_publishable_…   (or the legacy anon JWT, eyJ…)
```

Set both in Vercel for **Production, Preview and Development**, then **redeploy** —
Vite inlines them at build time, so changing them in the dashboard does nothing
until the next build.

Never use `service_role` or `sb_secret_…` here. Those bypass Row Level Security
entirely; in a browser bundle they would expose every child's records to anyone
who opened devtools. The publishable/anon key is safe to ship: on its own it grants
nothing, because every policy is `auth.uid() = user_id`.

## 7. Database schema

In the Supabase SQL editor, in order:

1. `backend/migrations/000_init.sql` — tables, RLS policies, indexes
2. `backend/migrations/001_session_model.sql` — the session columns

Both are idempotent. On `glmouztenswmwohnoarf` as of 2026-10-06, step 1 has run
and step 2 has not: `learning_sessions.session_id` does not yet exist, so session
rows cannot be written.

## 8. Verify

Run from the repo root. Two things to know before pasting: the variables live in
`.env.local`, not in your shell, so load them first — and interactive zsh does
**not** treat `#` as a comment, so a trailing `# expect 200` is run as a command
and fails with `command not found: #`. Nothing below contains a comment.

**Load the two variables:**

```sh
export VITE_SUPABASE_URL=$(grep -E '^VITE_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')
export VITE_SUPABASE_KEY=$(grep -E '^VITE_SUPABASE_KEY=' .env.local | cut -d= -f2- | tr -d '"')
echo "$VITE_SUPABASE_URL"
```

That must print the project URL. If it prints an empty line, the variable is not
in `.env.local` under that exact name, and every curl below will return `000` —
curl's code for "could not resolve the host", because the host was blank.

**Are the tables reachable?** Expect `200`:

```sh
curl -s -o /dev/null -w '%{http_code}\n' \
  "$VITE_SUPABASE_URL/rest/v1/user_profiles?select=id&limit=1" \
  -H "apikey: $VITE_SUPABASE_KEY"
```

`200` with an empty array `[]` is correct on a project with no data. `401
Invalid API key` means the key belongs to a different project — the usual cause
is a key left over from a Supabase project that has since been replaced.

**Is RLS actually enforced?** Expect `42501`:

```sh
curl -s -X POST "$VITE_SUPABASE_URL/rest/v1/learning_sessions" \
  -H "apikey: $VITE_SUPABASE_KEY" -H 'Content-Type: application/json' \
  -d '{"user_id":"00000000-0000-0000-0000-0000000000ff","letter":"X","cognitive_state":"probe"}'
```

```json
{"code":"42501", ... "message":"new row violates row-level security policy for table \"learning_sessions\""}
```

That refusal is the result you want, and nothing is written. A success would mean
RLS is off and the table is world-writable with a key that ships in the browser
bundle — stop and run `migrations/000_init.sql` before going further.

**Has migration 001 been applied?** Expect `[]`:

```sh
curl -s "$VITE_SUPABASE_URL/rest/v1/learning_sessions?select=session_id,status,activities&limit=1" \
  -H "apikey: $VITE_SUPABASE_KEY"
```

`{"code":"42703" ... "column learning_sessions.session_id does not exist"}` means
step 7 has not run, and no session can be saved until it does.

**In the browser:** open the app and look at the console. A
`[Supabase] Not configured` warning means the `VITE_` variables did not reach the
build — they are inlined at build time, so this is almost always a missing
redeploy rather than a wrong value. Then sign in with Google and confirm a row
appears in `user_profiles`.

## The Gemini key

`backend/.env` holds a `GEMINI_API_KEY` that still works but belongs to an account
the team does not control. It is no longer on any critical path — the adaptive
engine and the progress report both run on-device (`src/app/lib/adaptiveEngine.ts`)
— so losing it degrades nothing the hosted app does. Replace it when convenient
at <https://aistudio.google.com/apikey> under the new project, and set it in
`backend/.env` and in the backend host's environment.
