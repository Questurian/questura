/** Error routes stay usable without loading the site's interactive chrome. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <div className="w-full max-w-md border-t border-accent py-8">
        <p className="text-[13px] font-medium text-accent">Questurian</p>
        <h1 className="mt-4 font-display text-[36px] leading-tight">404</h1>
        <p className="mt-2 font-display text-[22px]">Page Not Found</p>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/70">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        {/* A fresh document also recovers a failed client navigation. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="mt-7 inline-flex min-h-11 items-center bg-accent px-5 text-[14px] font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">Return to Home</a>
      </div>
    </main>
  );
}
