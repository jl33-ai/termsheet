// Simple, safe-ish linkifier: escapes text, then converts URLs to anchors
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function linkify(text: string | null | undefined): string {
  if (!text) return '';
  const escaped = escapeHtml(String(text));
  const urlRe = /\b((?:https?:\/\/|www\.)[^\s<]+)/gi;
  return escaped.replace(urlRe, (match) => {
    const href = match.startsWith('http') ? match : `http://${match}`;
    const label = match;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-accent underline">${label}</a>`;
  });
}

