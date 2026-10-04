# Microsoft SSO setup (Entra ID / Azure AD)

Xtreme PDF Studio can sign users in with their Microsoft **organizational** account
(single tenant — only accounts in your Xtreme Media directory). Sign-in runs
entirely in the browser via MSAL (`@azure/msal-browser`), so **no backend and no
client secret are required**.

## 1. Register the app in Azure

1. Go to the [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** →
   **App registrations** → **New registration**.
2. **Name:** `Xtreme PDF Studio`.
3. **Supported account types:** choose
   **Accounts in this organizational directory only (Xtreme Media only – Single tenant)**.
4. **Redirect URI:** platform **Single-page application (SPA)**, value =
   the URL the app runs on:
   - Local dev: `http://localhost:3000`
   - Production: `https://your-domain.com`
   You can add more than one later under **Authentication → Single-page application**.
5. Click **Register**.

## 2. Copy the IDs

On the app's **Overview** page copy:

- **Application (client) ID**
- **Directory (tenant) ID**

## 3. Configure the app

Create a file called **`.env.local`** in the project root (copy from
`.env.local.example`) and paste the two IDs:

```
NEXT_PUBLIC_AZURE_CLIENT_ID=<Application (client) ID>
NEXT_PUBLIC_AZURE_TENANT_ID=<Directory (tenant) ID>
```

Restart `npm run dev` after changing env values.

## 4. API permissions (default is enough)

The app requests the delegated **`User.Read`** scope (Microsoft Graph), which is
included by default and only reads the signed-in user's basic profile. No admin
consent is normally needed. Add more scopes in `lib/authConfig.ts` if you later
call other Graph endpoints.

## How it works

- `lib/authConfig.ts` — MSAL configuration built from the env vars. Authority is
  `https://login.microsoftonline.com/<tenant-id>` so only your org can sign in.
- `components/AuthProvider.tsx` — creates the MSAL instance, initializes it, and
  completes redirect sign-ins. Wraps the whole app.
- `components/UserMenu.tsx` — the **Sign in with Microsoft** button in the header;
  shows the user's name and a **Sign out** action once authenticated.

Sign-in is **optional** — all tools work without logging in. To *require* sign-in,
wrap a page (or the whole app) with MSAL's `MsalAuthenticationTemplate`, e.g.:

```tsx
import { MsalAuthenticationTemplate } from "@azure/msal-react";
import { InteractionType } from "@azure/msal-browser";
import { loginRequest } from "@/lib/authConfig";

<MsalAuthenticationTemplate interactionType={InteractionType.Redirect} authenticationRequest={loginRequest}>
  {/* protected content */}
</MsalAuthenticationTemplate>
```

## Deploying

Add the production URL as an extra **SPA redirect URI** in the Azure app
registration, and set the same two `NEXT_PUBLIC_AZURE_*` env vars in your host
(Vercel/Netlify/etc.).

## Troubleshooting

### `BrowserAuthError: crypto_nonexistent — The crypto object or function is not available.`

MSAL needs the Web Crypto API (`window.crypto.subtle`), and browsers only expose
it in a **secure context**: `https://…`, `http://localhost` or `http://127.0.0.1`.

Open the app on a plain-http address that is *not* localhost — e.g.
`http://192.168.1.20:3000` or `http://shrini-pc:3000` — and `crypto.subtle` is
`undefined`, so creating the MSAL instance throws.

Fixes, in order of preference:

1. Use `http://localhost:3000` on the dev machine.
2. Testing from another device on the LAN? Put the dev server behind HTTPS —
   e.g. `npx local-ssl-proxy --source 3001 --target 3000`, or a tunnel such as
   `ngrok http 3000` — and add that origin as an extra **SPA redirect URI** in
   the Azure app registration.
3. In production, always serve over HTTPS.

`components/AuthProvider.tsx` now detects this case up front: the PDF tools keep
working and the **Sign in with Microsoft** button explains why it is unavailable,
instead of the whole page dying with an unhandled runtime error.
