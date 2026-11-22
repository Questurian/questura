import JoinPage from '@/features/JoinPage/JoinPage';
import { joinMetadata } from './joinMetadata';

export const metadata = joinMetadata;

/**
 * /join for everyone outside the test (handoff 02): readers the dashboard
 * cannot measure, bots and crawlers. Design A, with no test marker, so none
 * of it is counted as the test.
 */
export default function JoinRoute() {
  return <JoinPage design="A" />;
}
