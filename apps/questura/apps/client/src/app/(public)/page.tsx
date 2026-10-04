import { SuspenseBoundary } from '@/components/shared/SuspenseBoundary'
import { SignInPromptFromLink } from '@/features/Auth/components/SignInPromptFromLink'

/**
 * The homepage. It used to redirect every visitor to /peru/lima (and the
 * middleware sent returning readers to the last city they opened). The
 * homepage is its own page now; its content comes later.
 */
export default function HomePage() {
  return (
    <section aria-label="Questurian" className="min-h-[70vh] bg-background">
      {/* Members' pages send a signed-out reader here to sign in. */}
      <SuspenseBoundary fallback={null}>
        <SignInPromptFromLink />
      </SuspenseBoundary>
    </section>
  )
}
