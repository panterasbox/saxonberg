/**
 * Bucket resolver — looks up a stuff-id's social bucket (friend / foe
 * / neutral). v1 ships only the neutral stub; the real source lives
 * behind the social-graph slate. Swapping is one wiring change when
 * that lands.
 */

import type { BucketResolver, Bucket } from './types';

export const NEUTRAL_BUCKET_RESOLVER: BucketResolver = {
  resolveBucket(_stuffId: string): Bucket {
    return 'neutral';
  },
};
