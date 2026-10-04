import type { Configuration, RedirectRequest } from "@azure/msal-browser";

// Microsoft Entra ID (Azure AD) — single tenant (Xtreme Media).
// Values come from environment variables so no secrets live in the repo.
const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ?? "";
const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID ?? "common";

export const msalConfig: Configuration = {
  auth: {
    clientId,
    // Single-tenant authority. For multi-tenant use "organizations",
    // for personal+work use "common".
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: typeof window !== "undefined" ? window.location.origin : undefined,
    postLogoutRedirectUri:
      typeof window !== "undefined" ? window.location.origin : undefined,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// Scopes requested at sign-in. User.Read lets us read the signed-in profile.
export const loginRequest: RedirectRequest = {
  scopes: ["User.Read"],
};

/** True when an Azure client id has been configured via env. */
export const isAuthConfigured = () => clientId.length > 0;
