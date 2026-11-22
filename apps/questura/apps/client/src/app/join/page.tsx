import JoinPage from '@/features/JoinPage/JoinPage';
import { joinDesign } from '@/lib/experiments/joinTest';
import { joinMetadata } from './joinMetadata';

export const metadata = joinMetadata;

/**
 * /join: the design the switch picks (lib/experiments/joinTest.ts), with no
 * test marker, so none of it is counted as the test.
 */
export default function JoinRoute() {
  return <JoinPage design={joinDesign()} />;
}
