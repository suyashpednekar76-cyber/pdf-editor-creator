"use client";

import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { useState } from "react";
import { loginRequest, isAuthConfigured } from "@/lib/authConfig";
import { useAuthState } from "@/components/AuthProvider";

function MicrosoftLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export default function UserMenu() {
  const { ready, blockedReason } = useAuthState();
  const { instance, accounts, inProgress } = useMsal();
  const isAuthed = useIsAuthenticated();
  const [busy, setBusy] = useState(false);
  const account = accounts[0];

  const signIn = async () => {
    if (!ready) {
      if (blockedReason) alert(blockedReason);
      return;
    }
    if (!isAuthConfigured()) {
      alert(
        "Microsoft sign-in isn't configured yet.\n\nSet NEXT_PUBLIC_AZURE_CLIENT_ID and NEXT_PUBLIC_AZURE_TENANT_ID in .env.local (see AUTH_SETUP.md)."
      );
      return;
    }
    try {
      setBusy(true);
      await instance.initialize();
      await instance.loginRedirect(loginRequest);
    } catch (e) {
      console.error(e);
      setBusy(false);
    }
  };

  const signOut = () => {
    if (!ready) return;
    void instance.logoutRedirect({
      account: instance.getActiveAccount() ?? undefined,
    });
  };

  if (ready && isAuthed && account) {
    const initial = (account.name || account.username || "?")
      .trim()
      .charAt(0)
      .toUpperCase();
    return (
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-sm font-semibold text-white">
          {initial}
        </span>
        <div className="hidden text-left sm:block">
          <p className="max-w-[140px] truncate text-sm font-medium leading-tight text-ink">
            {account.name || account.username}
          </p>
          <button onClick={signOut} className="text-xs text-ink-muted hover:text-brand-600">
            Sign out
          </button>
        </div>
        <button onClick={signOut} className="text-xs text-ink-muted hover:text-brand-600 sm:hidden">
          Sign out
        </button>
      </div>
    );
  }

  // Stays clickable when auth is blocked so the user gets told why;
  // only disabled while MSAL is mid-flight.
  const disabled = busy || (ready && inProgress !== InteractionStatus.None);
  return (
    <button
      onClick={signIn}
      disabled={disabled}
      title={blockedReason ?? undefined}
      className="inline-flex items-center gap-2 rounded-md border border-ink-line bg-white px-3 py-1.5 text-sm font-medium text-ink shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
    >
      <MicrosoftLogo />
      <span className="hidden sm:inline">Sign in with Microsoft</span>
      <span className="sm:hidden">Sign in</span>
    </button>
  );
}
