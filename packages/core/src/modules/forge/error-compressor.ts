// Forge Error Compressor — Groups repetitive TS/ESLint/build errors
// into compact summaries to reduce token waste

interface ErrorGroup {
  code: string
  message: string
  files: Map<string, number[]>
}

const TS_ERROR_REGEX = /^(.+?)\((\d+),\d+\):\s*error\s+(TS\d+):\s*(.+)$/
const ESLINT_ERROR_REGEX = /^\s*(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(\S+)$/
const GENERIC_ERROR_REGEX = /^(ERROR|Error|error)\s*:?\s*(.+)/

function groupTypeScriptErrors(lines: string[]): ErrorGroup[] {
  const groups = new Map<string, ErrorGroup>()

  for (const line of lines) {
    const match = TS_ERROR_REGEX.exec(line)
    if (!match) continue

    const [, filePath, lineNum, code, message] = match
    const key = `${code}:${message}`

    if (!groups.has(key)) {
      groups.set(key, { code, message, files: new Map() })
    }

    const group = groups.get(key)!
    const existingLines = group.files.get(filePath) ?? []
    existingLines.push(parseInt(lineNum, 10))
    group.files.set(filePath, existingLines)
  }

  return [...groups.values()]
}

function formatErrorGroups(groups: ErrorGroup[]): string {
  if (groups.length === 0) return ''

  const parts: string[] = []

  for (const group of groups) {
    let totalOccurrences = 0
    for (const lines of group.files.values()) {
      totalOccurrences += lines.length
    }

    parts.push(`${group.code} "${group.message}" ×${totalOccurrences}:`)

    for (const [file, lines] of group.files) {
      const lineStr = lines.slice(0, 10).join(',')
      const suffix = lines.length > 10 ? ` +${lines.length - 10} more` : ''
      parts.push(`  ${file}:${lineStr}${suffix}`)
    }
  }

  return parts.join('\n')
}

function isErrorHeavyOutput(text: string): boolean {
  const lines = text.split('\n')
  let errorLines = 0

  for (const line of lines) {
    if (TS_ERROR_REGEX.test(line) || ESLINT_ERROR_REGEX.test(line) || GENERIC_ERROR_REGEX.test(line)) {
      errorLines++
    }
  }

  // Only compress if >30% of lines are errors and at least 5 error lines
  return errorLines >= 5 && (errorLines / lines.length) > 0.3
}

export function compressErrors(text: string): string {
  if (!isErrorHeavyOutput(text)) {
    return text
  }

  const lines = text.split('\n')
  const tsGroups = groupTypeScriptErrors(lines)

  if (tsGroups.length > 0) {
    // Separate non-error lines (headers, summaries)
    const nonErrorLines = lines.filter(l => !TS_ERROR_REGEX.test(l)).filter(l => l.trim())
    const header = nonErrorLines.slice(0, 3)
    const footer = nonErrorLines.slice(-3)

    const parts: string[] = []

    if (header.length > 0) {
      parts.push(header.join('\n'))
    }

    parts.push(formatErrorGroups(tsGroups))

    if (footer.length > 0 && footer.join('') !== header.join('')) {
      parts.push(footer.join('\n'))
    }

    return parts.join('\n\n')
  }

  return text
}
