const ANSI_REGEX = /\x1B\[[0-9;]*[a-zA-Z]/g
const PROGRESS_REGEX = /^.*\d+%[| \t#=\-\\/>]*.*$/gm
const TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\d]*Z?\s*/gm
const SPINNER_CHARS = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏|\\/-]/g
const BLANK_LINES_REGEX = /\n{3,}/g
const CURSOR_CONTROL_REGEX = /\x1B\[\d*[ABCDEFGJKST]/g

export function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, '').replace(CURSOR_CONTROL_REGEX, '')
}

export function stripProgressBars(text: string): string {
  return text.replace(PROGRESS_REGEX, '')
}

export function stripTimestamps(text: string): string {
  return text.replace(TIMESTAMP_REGEX, '')
}

export function stripSpinners(text: string): string {
  return text.replace(SPINNER_CHARS, '')
}

export function collapseBlankLines(text: string): string {
  return text.replace(BLANK_LINES_REGEX, '\n\n')
}

export function smartFilter(text: string): string {
  let result = text

  result = stripAnsi(result)
  result = stripProgressBars(result)
  result = stripTimestamps(result)
  result = stripSpinners(result)
  result = collapseBlankLines(result)

  return result.trim()
}
