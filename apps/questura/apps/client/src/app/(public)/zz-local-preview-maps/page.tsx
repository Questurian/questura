// TEMPORARY local preview (not for commit): renders live's Eat page blocks
// through this branch's components, because the local DB has no Eat page.
import { CityHomepageContent } from '@/features/CityDashboard'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const res = await fetch('https://api.questurian.com/api/public/section-pages/eat', { cache: 'no-store' })
  const data = await res.json()
  return <CityHomepageContent pageBlocks={data.pageBlocks} />
}
