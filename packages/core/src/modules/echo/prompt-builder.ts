import type { EchoLevel } from '@/types'
import { getLevelDefinition } from '@/modules/echo/levels'

function buildRulesBlock(rules: string[]): string {
  return rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')
}

function buildAbbreviationsBlock(abbreviations: string[]): string {
  if (abbreviations.length === 0) {
    return ''
  }
  const abbrs = abbreviations.map(a => `- ${a}`).join('\n')
  return `\nAbbreviations:\n${abbrs}`
}

export function buildEchoPrompt(level: EchoLevel): string {
  const definition = getLevelDefinition(level)

  const rules = buildRulesBlock(definition.compressionRules)
  const abbreviations = buildAbbreviationsBlock(definition.abbreviations)

  return [
    `Echo Mode: ${definition.name.toUpperCase()} — ${definition.description}`,
    '',
    'Rules:',
    rules,
    abbreviations,
    '',
    `Response pattern: ${definition.responsePattern}`,
    '',
    'CRITICAL: These rules apply to OUTPUT only.',
    'Reasoning/thinking remains full and uncompressed.',
    'Technical accuracy must be 100% — never sacrifice correctness for brevity.',
  ].filter(line => line !== undefined).join('\n')
}

export function buildAgentEchoPrompt(level: EchoLevel, agentName: string): string {
  const base = buildEchoPrompt(level)
  return `[${agentName}] ${base}`
}

export function buildDisabledPrompt(): string {
  return 'Echo Mode: DISABLED — respond normally with full prose.'
}
