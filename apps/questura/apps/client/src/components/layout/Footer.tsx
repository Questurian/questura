import Link from '@/components/navigation/PublicLink';
import { FooterLayout } from './FooterLayout';
import type { LocationMenuResponse } from '@/features/Navigation/lib/fetchLocationMenu';

export default function Footer({ locationMenu = null }: { locationMenu?: LocationMenuResponse | null }) {
  return <FooterLayout locationMenu={locationMenu} Link={Link} />;
}
