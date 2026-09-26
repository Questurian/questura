import { redirect } from 'next/navigation'

import { APP_URLS } from '@/shared/config'

// The API host has no home page of its own. This used to be Payload's starter
// template, which greeted strangers with "Welcome to your new project" and a
// `vscode://` link carrying the server's build path. Anyone who lands here
// (a mistyped address, an old bookmark) wants the site.
export default function HomePage() {
  redirect(APP_URLS.frontend)
}
