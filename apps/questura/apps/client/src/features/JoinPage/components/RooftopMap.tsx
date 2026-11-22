import { layoutSnapshot } from '@/features/articles/lib/mapSnapshot'
import { ROOFTOP_MAP, ROOFTOP_POINTS } from '../data/rooftopMap'
import MapPicture from './MapPicture'

/**
 * The rooftop guide's saved OpenStreetMap picture with its 18 dots, drawn at
 * the picture's own shape so a dot sits where the server's rough position
 * puts it at every width. The dots are percentages of the picture, worked out
 * once here with the same maths the guide's own teaser uses.
 */
const layout = layoutSnapshot(ROOFTOP_MAP, ROOFTOP_POINTS, {
  width: ROOFTOP_MAP.width,
  height: ROOFTOP_MAP.height,
})

export default function RooftopMap({ sizes }: { sizes: string }) {
  const pins = (layout?.pins ?? []).map((pin) => ({
    id: pin.id,
    x: (pin.x / ROOFTOP_MAP.width) * 100,
    y: (pin.y / ROOFTOP_MAP.height) * 100,
  }))

  return (
    <figure className="jp-map" data-photo-frame>
      <MapPicture
        srcSmall={ROOFTOP_MAP.srcSmall}
        src={ROOFTOP_MAP.src}
        smallWidth={ROOFTOP_MAP.width}
        width={ROOFTOP_MAP.width}
        height={ROOFTOP_MAP.height}
        sizes={sizes}
        alt="Map of Lima with a dot for each of 18 rooftop bars, from the old center to Barranco"
      />
      <span className="jp-map-dots" data-photo-overlay aria-hidden="true">
        {pins.map((pin) => (
          <span key={pin.id} className="jp-map-dot" style={{ left: `${pin.x}%`, top: `${pin.y}%` }} />
        ))}
      </span>
      <figcaption className="jp-map-credit" data-photo-overlay>
        © OpenStreetMap
      </figcaption>
    </figure>
  )
}
