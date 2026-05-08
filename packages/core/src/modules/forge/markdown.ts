const CODE_BLOCK_REGEX = /```[\s\S]*?```/g
const INLINE_CODE_REGEX = /`[^`]+`/g
const URL_REGEX = /https?:\/\/[^\s)]+/g
const HEADING_REGEX = /^#{1,6}\s+.+$/gm

interface PreservedContent {
  placeholder: string
  original: string
}

function extractPreserved(
  text: string,
  regex: RegExp,
  prefix: string,
): { text: string; preserved: PreservedContent[] } {
  const preserved: PreservedContent[] = []
  let index = 0

  const replaced = text.replace(regex, (match) => {
    const placeholder = `__${prefix}_${index}__`
    preserved.push({ placeholder, original: match })
    index++
    return placeholder
  })

  return { text: replaced, preserved }
}

function restorePreserved(text: string, preserved: PreservedContent[]): string {
  let result = text

  for (const item of preserved) {
    result = result.replace(item.placeholder, item.original)
  }

  return result
}

// Pre-compiled filler word patterns — avoids regex recompilation per call
const FILLER_PATTERNS: RegExp[] = [
  'just', 'really', 'actually', 'basically', 'simply',
  'however', 'therefore', 'furthermore', 'additionally',
  'moreover', 'nevertheless', 'consequently', 'accordingly',
  'indeed', 'certainly', 'obviously', 'clearly',
  'essentially', 'effectively', 'practically', 'virtually',
].map(word => new RegExp(`\\b${word}\\b`, 'gi'))

const FILLER_PHRASE_PATTERNS: RegExp[] = [
  'in fact', 'of course', 'as well', 'as such',
].map(phrase => new RegExp(`\\b${phrase}\\b`, 'gi'))

// Pre-compiled verbose phrase compressions
const PROSE_COMPRESSIONS: Array<[RegExp, string]> = [
  [/\bin order to\b/gi, 'to'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bat this point in time\b/gi, 'now'],
  [/\bfor the purpose of\b/gi, 'for'],
  [/\bin the event that\b/gi, 'if'],
  [/\bwith regard to\b/gi, 'about'],
  [/\bit is important to note that\b/gi, ''],
  [/\bit should be noted that\b/gi, ''],
  [/\bplease note that\b/gi, ''],
  [/\bas mentioned above\b/gi, ''],
  [/\bas we can see\b/gi, ''],
  [/\bthis means that\b/gi, '→'],
  [/\bwhich means\b/gi, '→'],
  [/\bfor example\b/gi, 'e.g.'],
  [/\bthat is to say\b/gi, 'i.e.'],
]

const ARTICLE_THE = /\bthe\b/gi
const ARTICLE_A = /\ba\b/gi
const ARTICLE_AN = /\ban\b/gi
const PARENS_ASIDE = /\s*\([^)]{0,80}\)/g
const TECH_PATTERN = /[{}[\]<>=/]|`|function|class|const|let|var|import|export|return/
const MULTI_SPACE = /\s{2,}/g
const LEADING_SPACE = /^\s+/gm

function compressProse(text: string): string {
  let result = text

  // Remove articles
  result = result.replace(ARTICLE_THE, '')
  result = result.replace(ARTICLE_A, '')
  result = result.replace(ARTICLE_AN, '')

  // Remove filler words
  for (const pattern of FILLER_PATTERNS) {
    result = result.replace(pattern, '')
  }
  for (const pattern of FILLER_PHRASE_PATTERNS) {
    result = result.replace(pattern, '')
  }

  // Remove parenthetical asides that don't contain technical content
  result = result.replace(
    PARENS_ASIDE,
    (match) => {
      if (TECH_PATTERN.test(match)) {
        return match
      }
      return ''
    },
  )

  // Compress verbose phrases to shorter equivalents
  for (const [pattern, replacement] of PROSE_COMPRESSIONS) {
    result = result.replace(pattern, replacement)
  }

  // Collapse excessive whitespace
  result = result.replace(MULTI_SPACE, ' ')
  result = result.replace(LEADING_SPACE, '')

  return result
}

export function compressMarkdown(text: string): string {
  const codeBlocks = extractPreserved(text, CODE_BLOCK_REGEX, 'CB')
  let working = codeBlocks.text

  const inlineCode = extractPreserved(working, INLINE_CODE_REGEX, 'IC')
  working = inlineCode.text

  const urls = extractPreserved(working, URL_REGEX, 'URL')
  working = urls.text

  const headings = extractPreserved(working, HEADING_REGEX, 'HD')
  working = headings.text

  working = compressProse(working)

  working = restorePreserved(working, headings.preserved)
  working = restorePreserved(working, urls.preserved)
  working = restorePreserved(working, inlineCode.preserved)
  working = restorePreserved(working, codeBlocks.preserved)

  return working.trim()
}
