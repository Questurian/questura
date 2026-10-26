'use client';

import { useEffect } from 'react';
import { reportBrowserError } from '@/lib/observability/reportBrowserError';

/** Next 16 can recover an on-demand server-render failure through this boundary. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.error('Application error:', error);
    reportBrowserError(error, 'error');
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <div className="w-full max-w-md border-t border-accent py-8">
        <h1 className="font-display text-[26px] leading-tight">Something went wrong</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/70">
          This page could not be shown just now. Please try again in a moment.
        </p>
        {error.digest ? <p className="mt-3 text-[12px] text-foreground/60">Reference {error.digest}</p> : null}
        <div className="mt-7 flex flex-wrap items-center gap-5">
          <button type="button" onClick={retry} className="min-h-11 bg-accent px-5 text-[14px] font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
            Try again
          </button>
          {/* Recover with a fresh document even if the client router failed. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="text-[14px] text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
            Go to the homepage
          </a>
        </div>
      </div>
    </main>
  );
}
