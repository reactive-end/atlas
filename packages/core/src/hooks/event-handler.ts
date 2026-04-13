import type { EventContext, MessageContext } from '@/types'
import type { AtlasConfig } from '@/config/schema'
import type { EchoLevel, AgentMode, PluginState } from '@/types'
import { vaultDeleteSession, vaultSaveObservation } from '@/modules/vault/client'
import { stripPrivateTags } from '@/modules/vault/memory-protocol'
import { initializeVault, ensureSession, removeSession } from '@/modules/vault/session-manager'

export function handleEvent(
  ctx: EventContext,
  config: AtlasConfig,
): void {
  if (!config.vault.enabled) {
    return
  }

  const sessionId = ctx.session.id

  switch (ctx.event) {
    case 'session.created': {
      initializeVault()
      ensureSession(sessionId)
      break
    }
    case 'session.deleted': {
      vaultDeleteSession(sessionId)
      removeSession(sessionId)
      break
    }
  }
}

export function handleChatMessage(
  ctx: MessageContext,
  config: AtlasConfig,
): void {
  if (!config.vault.enabled) {
    return
  }

  if (ctx.role !== 'user') {
    return
  }

  const sessionId = ctx.session.id

  ensureSession(sessionId)

  const content = config.vault.stripPrivateTags
    ? stripPrivateTags(ctx.content)
    : ctx.content

  vaultSaveObservation(
    sessionId,
    `[User] ${content}`,
    'user-prompt',
  )
}

type RealEvent = {
  type: string
  properties: Record<string, unknown>
}

export function handleRealEvent(
  event: RealEvent,
  config: AtlasConfig,
  state: PluginState,
): PluginState | void {
  switch (event.type) {
    case 'session.created': {
      if (!config.vault.enabled) return
      const info = event.properties['info'] as { id: string } | undefined
      if (info?.id) {
        initializeVault()
        ensureSession(info.id)
      }
      break
    }

    case 'session.deleted': {
      if (!config.vault.enabled) return
      const info = event.properties['info'] as { id: string } | undefined
      if (info?.id) {
        vaultDeleteSession(info.id)
        removeSession(info.id)
      }
      break
    }

    case 'tui.command.execute': {
      const command = event.properties['command'] as string | undefined
      if (!command) return

      if (command === 'atlas-echo' || command.startsWith('atlas-echo ')) {
        const parts = command.split(' ')
        const levelArg = parts[1] as EchoLevel | undefined
        const validLevels: EchoLevel[] = ['lite', 'full', 'ultra']
        const newLevel: EchoLevel = levelArg && validLevels.includes(levelArg)
          ? levelArg
          : state.echoLevel
        return { ...state, agentMode: 'echo' as AgentMode, echoLevel: newLevel }
      }

      if (command === 'atlas-verbose') {
        return { ...state, agentMode: 'verbose' as AgentMode }
      }

      break
    }

    case 'message.updated': {
      if (!config.vault.enabled) return
      const message = event.properties['message'] as {
        role?: string
        parts?: Array<{ type: string; text?: string }>
      } | undefined
      if (!message || message.role !== 'user') return

      const sessionID = event.properties['sessionID'] as string | undefined
      if (!sessionID) return

      const textParts = message.parts
        ?.filter(p => p.type === 'text' && p.text)
        .map(p => p.text as string)

      if (!textParts || textParts.length === 0) return

      ensureSession(sessionID)
      const content = config.vault.stripPrivateTags
        ? stripPrivateTags(textParts.join('\n'))
        : textParts.join('\n')

      vaultSaveObservation(sessionID, `[User] ${content}`, 'user-prompt')
      break
    }
  }
}
