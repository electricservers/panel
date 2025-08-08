import type { mgemod_duels } from '@prisma-arg/client';

export interface MgeDuel extends mgemod_duels {
  winnername: string;
  losername: string;
  arenanameCanonical?: string;
}
