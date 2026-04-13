const SECURITY_KEYWORDS = [
  'security',
  'vulnerability',
  'exploit',
  'injection',
  'xss',
  'csrf',
  'authentication bypass',
  'privilege escalation',
  'data breach',
  'encryption',
  'certificate',
  'ssl',
  'tls',
  'password',
  'secret',
  'token leak',
]

const IRREVERSIBLE_KEYWORDS = [
  'delete',
  'drop table',
  'rm -rf',
  'format',
  'destroy',
  'purge',
  'wipe',
  'truncate',
  'force push',
  'reset --hard',
  'irreversible',
  'cannot undo',
  'permanent',
  'production deploy',
  'migration',
]

const WARNING_PATTERNS = [
  /\bWARNING\b/i,
  /\bCAUTION\b/i,
  /\bDANGER\b/i,
  /\bCRITICAL\b/i,
  /\bBREAKING CHANGE\b/i,
  /\bDESTRUCTIVE\b/i,
]

function containsKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some(keyword => lower.includes(keyword))
}

function containsPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(text))
}

export function shouldDisableEcho(content: string): boolean {
  if (containsKeyword(content, SECURITY_KEYWORDS)) {
    return true
  }

  if (containsKeyword(content, IRREVERSIBLE_KEYWORDS)) {
    return true
  }

  if (containsPattern(content, WARNING_PATTERNS)) {
    return true
  }

  return false
}

export function getDisableReason(content: string): string | null {
  if (containsKeyword(content, SECURITY_KEYWORDS)) {
    return 'security-context'
  }

  if (containsKeyword(content, IRREVERSIBLE_KEYWORDS)) {
    return 'irreversible-action'
  }

  if (containsPattern(content, WARNING_PATTERNS)) {
    return 'warning-detected'
  }

  return null
}
