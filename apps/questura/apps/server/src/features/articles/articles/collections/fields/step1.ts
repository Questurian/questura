import { Field } from 'payload'
import {
  createLocationRefField,
  createSharedNeighborhoodsField,
} from '@/shared/location/server/fields'

export const location: Field = {
  name: 'location',
  label: 'Location',
  type: 'text',
  required: false,
  admin: {
    description:
      'Select the location this article is about. Leave empty for a worldwide article (multi-country, general travel, news); it lives at /articles/<slug>.',
    components: {
      Field: 'src/shared/location/LocationPickerField.tsx',
    },
  },
}

export const locationRef: Field = createLocationRefField()

export const sharedNeighborhoods: Field = createSharedNeighborhoodsField()

export const title: Field = {
  name: 'title',
  label: 'Title',
  type: 'text',
  required: true,
  unique: true,
  admin: {
    description: 'Article headline',
    components: {
      Field: 'src/features/articles/articles/components/field-components/SmartField.tsx',
    },
  },
}

export const step1UiWrapper: Field = {
  type: 'text',
  name: 'step1_ui_wrapper',
  label: false,
  admin: {
    hidden: false,
    components: {
      Field: 'src/features/articles/articles/components/layout/Step1Wrapper.tsx',
    },
  },
}
