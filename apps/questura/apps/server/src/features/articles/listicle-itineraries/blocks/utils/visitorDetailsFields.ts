import type { Field } from 'payload'

export function createVisitorDetailsFields(): Field[] {
  return [
    {
      name: 'hideHours',
      label: 'Hide hours',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Hide opening hours on this stop only.' },
    },
    {
      name: 'hidePhone',
      label: 'Hide phone number',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Hide the phone number on this stop only.' },
    },
    {
      name: 'hideWebsite',
      label: 'Hide website',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Hide the website link on this stop only.' },
    },
  ]
}
