import type { CompactingContext } from '@/types'
import type { AtlasConfig } from '@/config/schema'
import { handleCompaction, buildCompactionContextParts } from '@/modules/vault/compaction'

export function handleCompacting(
  ctx: CompactingContext,
  config: AtlasConfig,
): string {
  if (!config.vault.enabled) {
    return ctx.summary
  }

  return handleCompaction(ctx, config.vault)
}

export function buildCompactionContext(
  sessionId: string,
  config: AtlasConfig,
): string[] {
  if (!config.vault.enabled) {
    return []
  }

  return buildCompactionContextParts(sessionId, config.vault)
}
