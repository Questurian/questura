import type { GlobalConfig } from 'payload'
import { staffUser } from '@/features/auth/lib/staff-user'
import { signedInRead } from '@/features/auth/lib/signed-in-read'
import { revalidateEveryLocationHomepageAfterChange } from '@/features/public-revalidation/revalidate-client'
import {
  DEFAULT_DESTINATION_HEADER_STYLE,
  DESTINATION_HEADER_STYLE_SLUG,
  DESTINATION_HEADER_TEXT_ALIGNS,
  DESTINATION_HEADER_TEXT_FONTS,
  DESTINATION_HEADER_TEXT_SIZES,
  DESTINATION_HEADER_TEXT_TONES,
  DESTINATION_HEADER_TEXT_WEIGHTS,
} from './style'

const FONT_LABELS: Record<(typeof DESTINATION_HEADER_TEXT_FONTS)[number], string> = {
  jost: 'Jost',
  lato: 'Lato',
  raleway: 'Raleway',
  manrope: 'Manrope',
  dmsans: 'DM Sans',
  worksans: 'Work Sans',
  serif: 'Cormorant Garamond (serif)',
}

/**
 * One shared look for every city's Destination Header description. Edited in
 * ABW's Homepage Manager; the website reads it with each header block, and a
 * save refreshes every city page.
 */
export const DestinationHeaderStyleGlobal: GlobalConfig = {
  slug: DESTINATION_HEADER_STYLE_SLUG,
  label: 'Destination Header style',
  admin: {
    group: 'Content',
    description: 'How every city header shows its description. Managed by the ABW homepage tool.',
  },
  access: {
    read: signedInRead,
    update: ({ req }) => {
      const role = staffUser(req.user)?.role
      return role === 'admin' || role === 'editor'
    },
  },
  hooks: {
    afterChange: [revalidateEveryLocationHomepageAfterChange],
  },
  fields: [
    {
      name: 'textFont',
      type: 'select',
      required: true,
      defaultValue: DEFAULT_DESTINATION_HEADER_STYLE.textFont,
      options: DESTINATION_HEADER_TEXT_FONTS.map((value) => ({ value, label: FONT_LABELS[value] })),
    },
    {
      name: 'textWeight',
      type: 'select',
      required: true,
      defaultValue: DEFAULT_DESTINATION_HEADER_STYLE.textWeight,
      options: DESTINATION_HEADER_TEXT_WEIGHTS.map((value) => ({
        value,
        label: value === '300' ? 'Light' : 'Regular',
      })),
    },
    {
      name: 'textSize',
      type: 'select',
      required: true,
      defaultValue: DEFAULT_DESTINATION_HEADER_STYLE.textSize,
      options: DESTINATION_HEADER_TEXT_SIZES.map((value) => ({ value, label: `${value}px` })),
    },
    {
      name: 'textTone',
      type: 'select',
      required: true,
      defaultValue: DEFAULT_DESTINATION_HEADER_STYLE.textTone,
      options: DESTINATION_HEADER_TEXT_TONES.map((value) => ({
        value,
        label: value === 'grey' ? 'Grey' : 'Black',
      })),
    },
    {
      name: 'textAlign',
      type: 'select',
      required: true,
      defaultValue: DEFAULT_DESTINATION_HEADER_STYLE.textAlign,
      admin: { description: 'Band and full-width layouts only.' },
      options: DESTINATION_HEADER_TEXT_ALIGNS.map((value) => ({
        value,
        label: value === 'top' ? 'Level with the name' : 'Centred on the name',
      })),
    },
  ],
}
