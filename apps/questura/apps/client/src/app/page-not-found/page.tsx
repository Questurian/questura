import { notFound } from 'next/navigation'

/**
 * Where the middleware sends a page that is switched off (lib/routing/
 * peruLaunch.ts) or mistyped. It used to answer those with a bare
 * plain-text "Not Found" on a white page; a rewrite here renders the site's
 * own 404 (app/not-found.tsx) with its navbar and footer, still as a 404.
 */
export default function PageNotFound(): never {
  notFound()
}
