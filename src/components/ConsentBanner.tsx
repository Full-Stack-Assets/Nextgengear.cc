'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Lightweight cookie-consent banner wired to Google Consent Mode v2.
//
// Consent *defaults* (everything denied) are set in a beforeInteractive script
// in layout.tsx, BEFORE the AdSense/analytics scripts load, so no ad or
// analytics storage is written until the visitor chooses. This component only
// records the visitor's choice and fires the corresponding `consent: update`.
//
// NOTE: for full EEA/UK GDPR compliance Google requires a *certified* CMP. This
// is a sensible, transparent default — not a substitute for a certified CMP.

const STORAGE_KEY = 'consent-v1';

type GtagArgs =
  | ['consent', 'update', Record<string, 'granted' | 'denied'>]
  | unknown[];

function pushConsent(granted: boolean) {
  const value = granted ? 'granted' : 'denied';
  const w = window as unknown as { dataLayer?: GtagArgs[] };
  w.dataLayer = w.dataLayer || [];
  // Push the raw `arguments`-shaped tuple the same way gtag() does, so this
  // works even if the gtag shim hasn't initialized yet.
  w.dataLayer.push([
    'consent',
    'update',
    {
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
      analytics_storage: value,
    },
  ]);
}

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage blocked (private mode / strict settings) — show the banner.
    }
    if (stored !== 'granted' && stored !== 'denied') setVisible(true);
  }, []);

  function choose(granted: boolean) {
    try {
      localStorage.setItem(STORAGE_KEY, granted ? 'granted' : 'denied');
    } catch {
      // ignore — the consent update below still applies for this page view.
    }
    pushConsent(granted);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-white px-6 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-ink/80">
          We use cookies for ads and analytics. You can accept or reject
          non-essential cookies.{' '}
          <Link href="/about" className="underline hover:text-accent">
            Learn more
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose(false)}
            className="rounded-lg border border-rule px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink/40"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => choose(true)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-deep"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
