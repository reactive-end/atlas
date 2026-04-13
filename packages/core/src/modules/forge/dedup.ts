export interface DedupResult {
  text: string
  linesRemoved: number
}

export function deduplicateLines(text: string, minCount: number): DedupResult {
  const lines = text.split('\n')
  const result: string[] = []
  let linesRemoved = 0

  let currentLine = ''
  let count = 0

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === currentLine && trimmed !== '') {
      count++
    } else {
      if (count >= minCount) {
        result.push(`${currentLine} [×${count}]`)
        linesRemoved += count - 1
      } else {
        for (let i = 0; i < count; i++) {
          result.push(currentLine)
        }
      }
      currentLine = trimmed
      count = 1
    }
  }

  if (count >= minCount) {
    result.push(`${currentLine} [×${count}]`)
    linesRemoved += count - 1
  } else {
    for (let i = 0; i < count; i++) {
      result.push(currentLine)
    }
  }

  return {
    text: result.join('\n'),
    linesRemoved,
  }
}
