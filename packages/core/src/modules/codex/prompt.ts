export function buildCodexPrompt(): string {
  return `Codex: Repository index active at .atlas/index.md. Before exploring files manually, use codex_search(query) to locate files by exports, path, or description. Only fall back to file_read or directory listing if Codex yields no relevant results.`
}