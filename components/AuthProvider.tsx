"use client";

import {
  EventType,
  PublicClientApplication,
  type AuthenticationResult,
} from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { createContext, useContext, useEffect, useState } from "react";
import { msalConfig } from "@/lib/authConfig";

/**
 * MSAL builds its crypto layer inside the PublicClientApplication constructor
 * and throws `BrowserAuthError: crypto_nonexistent` when the Web Crypto API is
 * missing. That happens whenever the page is served from a NON-SECURE origin —
 * e.g. http://192.168.x.x:3000 or http://my-pc:3000 — because browsers only
 * expose window.crypto.subtle on https:// or on localhost / 127.0.0.1.
 *
 * Constructing it at module scope therefore killed the whole page on those
 * origins. Instead we (a) build it lazily in the browser, (b) check that crypto
 * is actually there first, and (c) never let a sign-in failure take the PDF
 * tools down with it — they work fine without an account.
 */
let msalInstance: PublicClientApplication | null = null;

/** Why sign-in can't run here, or null when everything is fine. */
function detectAuthBlocker(): string | null {
  if (typeof window === "undefined") return null;
  if (!window.isSecureContext || !window.crypto || !window.crypto.subtle) {
    return "Microsoft sign-in needs a secure page. Open this app on http://localhost or over https:// — browsers hide the Web Crypto API on plain-http addresses like http://192.168.x.x.";
  }
  return null;
}

/** Returns the app-wide MSAL instance, or null when it can't be created. */
export function getMsalInstance(): PublicClientApplication | null {
  if (typeof window === "undefined") return null;
  if (detectAuthBlocker()) return null;
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }
  return msalInstance;
}

type AuthState = { ready: boolean; blockedReason: string | null };

const AuthStateContext = createContext<AuthState>({
  ready: false,
  blockedReason: null,
});

/** `ready` once MSAL is usable; `blockedReason` explains why it isn't. */
export const useAuthState = () => useContext(AuthStateContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [instance, setInstance] = useState<PublicClientApplication | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  useEffect(() => {
    const blocker = detectAuthBlocker();
    if (blocker) {
      console.warn("[auth] Microsoft sign-in disabled:", blocker);
      setBlockedReason(blocker);
      return;
    }

    let inst: PublicClientApplication | null = null;
    try {
      inst = getMsalInstance();
    } catch (e) {
      console.error("[auth] MSAL could not be created", e);
      setBlockedReason(
        e instanceof Error ? e.message : "Microsoft sign-in is unavailable."
      );
      return;
    }
    if (!inst) return;
    const msal = inst;

    // MsalProvider itself awaits initialize() and handleRedirectPromise();
    // all we add here is active-account bookkeeping.
    const callbackId = msal.addEventCallback((event) => {
      if (
        event.eventType === EventType.LOGIN_SUCCESS &&
        (event.payload as AuthenticationResult)?.account
      ) {
        msal.setActiveAccount((event.payload as AuthenticationResult).account);
      }
    });

    const accounts = msal.getAllAccounts();
    if (accounts.length > 0 && !msal.getActiveAccount()) {
      msal.setActiveAccount(accounts[0]);
    }

    setInstance(msal);

    return () => {
      if (callbackId) msal.removeEventCallback(callbackId);
    };
  }, []);

  // Server render and the first client paint produce identical markup (no MSAL
  // context yet), so hydration stays clean; the provider swaps in right after.
  if (!instance) {
    return (
      <AuthStateContext.Provider value={{ ready: false, blockedReason }}>
        {children}
      </AuthStateContext.Provider>
    );
  }

  return (
    <AuthStateContext.Provider value={{ ready: true, blockedReason: null }}>
      <MsalProvider instance={instance}>{children}</MsalProvider>
    </AuthStateContext.Provider>
  );
}
