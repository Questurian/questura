/**
 * The homepage. It used to redirect every visitor to /peru/lima (and the
 * middleware sent returning readers to the last city they opened). The
 * homepage is its own page now; its content comes later.
 */
export default function HomePage() {
  return <section aria-label="Questurian" className="min-h-[70vh] bg-background" />
}
