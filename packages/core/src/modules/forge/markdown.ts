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

function compressProse(text: string): string {
  let result = text

  result = result.replace(/\bthe\b/gi, '')
  result = result.replace(/\ba\b/gi, '')
  result = result.replace(/\ban\b/gi, '')
  result = result.replace(/\bjust\b/gi, '')
  result = result.replace(/\breally\b/gi, '')
  result = result.replace(/\bactually\b/gi, '')
  result = result.replace(/\bbasically\b/gi, '')
  result = result.replace(/\bsimply\b/gi, '')
  result = result.replace(/\bhowever\b/gi, '')
  result = result.replace(/\btherefore\b/gi, '')
  result = result.replace(/\bfurthermore\b/gi, '')
  result = result.replace(/\badditionally\b/gi, '')

  result = result.replace(/\s{2,}/g, ' ')
  result = result.replace(/^\s+/gm, '')

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
