import type { ImageAttributionData } from '@/features/articles/types'

export function ImageAttribution({ image }: { image: ImageAttributionData }) {
  const sources = image.sources ?? []
  const names = [...new Set(sources.map((source) => source.credit.trim()).filter(Boolean))]
  const credit = names.length ? `Photos: ${names.join(', ')}` : image.photographer_credit
  if (!credit && !image.edit_credit && !sources.length) return null
  return (
    <div className="mt-2 font-mono text-[11px] leading-relaxed text-foreground/60">
      <p>{credit}{credit && image.edit_credit ? ' · ' : ''}{image.edit_credit ? `Composite / edit: ${image.edit_credit}` : ''}</p>
      {sources.length ? <details className="mt-1">
        <summary>Photo sources</summary>
        <ul className="mt-1 space-y-1">
          {sources.map((source, index) => {
            let safeUrl: string | null = null
            try {
              const url = new URL(source.url ?? '')
              if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) safeUrl = url.href
            } catch { /* Plain text attribution when no valid source link exists. */ }
            return <li key={index}>
              {source.position ? `${source.position}: ` : ''}
              {safeUrl ? <a className="text-accent underline underline-offset-2" href={safeUrl} target="_blank" rel="noopener noreferrer">{source.credit}</a> : source.credit}
              {source.title ? ` — ${source.title}` : ''}
            </li>
          })}
        </ul>
      </details> : null}
    </div>
  )
}
