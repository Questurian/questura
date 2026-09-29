/**
 * A navbar section's page (Eat, Stay, Itineraries, Newsletters). Each is a
 * real route with its heading and nothing under it yet; the content comes
 * later.
 */
export function SectionPage({ title }: { title: string }) {
  return (
    <section className="min-h-[70vh] bg-background px-5 py-16 text-foreground 768:px-10 1024:px-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-[48px] font-medium leading-[0.95] text-foreground 480:text-[64px] 768:text-[84px]">
          {title}
        </h1>
      </div>
    </section>
  )
}
