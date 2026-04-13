import type { EchoLevel } from '@/types'

export interface LevelDefinition {
  name: EchoLevel
  description: string
  compressionRules: string[]
  abbreviations: string[]
  responsePattern: string
}

const LITE_LEVEL: LevelDefinition = {
  name: 'lite',
  description: 'Light compression — remove filler, keep structure',
  compressionRules: [
    'Drop filler words: just, really, actually, basically, simply',
    'Remove hedging: I think, perhaps, maybe, it seems',
    'Remove pleasantries: Sure!, Great idea!, Happy to help!',
    'Keep full technical terms',
    'Keep code examples intact',
  ],
  abbreviations: [],
  responsePattern: '[thing] [action] [reason]. [next step].',
}

const FULL_LEVEL: LevelDefinition = {
  name: 'full',
  description: 'Standard compression — terse fragments, drop articles',
  compressionRules: [
    ...LITE_LEVEL.compressionRules,
    'Drop articles: the, a, an',
    'Use fragments instead of full sentences',
    'No preambles or introductions',
    'No acknowledgment phrases',
    'Compress explanations to essentials',
  ],
  abbreviations: [
    'DB = database',
    'auth = authentication',
    'config = configuration',
    'req = request',
    'res = response',
    'fn = function',
    'impl = implementation',
  ],
  responsePattern: '[thing] [action] [reason]. [next step].',
}

const ULTRA_LEVEL: LevelDefinition = {
  name: 'ultra',
  description: 'Maximum compression — abbreviations, arrows, minimal prose',
  compressionRules: [
    ...FULL_LEVEL.compressionRules,
    'Use arrows for causality: X → Y',
    'Use abbreviations aggressively',
    'Single-word answers when possible',
    'Code-only responses when code is the answer',
    'No transition words',
  ],
  abbreviations: [
    ...FULL_LEVEL.abbreviations,
    'env = environment',
    'dep = dependency',
    'pkg = package',
    'dir = directory',
    'repo = repository',
    'msg = message',
    'ctx = context',
    'opts = options',
    'params = parameters',
    'cb = callback',
  ],
  responsePattern: '[thing] → [action]. [next].',
}

const LEVEL_MAP: Record<EchoLevel, LevelDefinition> = {
  lite: LITE_LEVEL,
  full: FULL_LEVEL,
  ultra: ULTRA_LEVEL,
}

export function getLevelDefinition(level: EchoLevel): LevelDefinition {
  return LEVEL_MAP[level]
}

export function getAllLevels(): LevelDefinition[] {
  return [LITE_LEVEL, FULL_LEVEL, ULTRA_LEVEL]
}
