// ─── XSS defense helpers ────────────────────────────────────────────────────
// Any user-supplied value (artisan name/description, review comment, request
// details, ...) that gets interpolated into innerHTML MUST go through escapeHTML
// first. Without it, a malicious artisan/customer submission (e.g. a name of
// `<img src=x onerror=...>`) would execute for every visitor viewing that card.
function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// For values placed inside an HTML attribute delimited by double quotes.
function escapeAttr(value) {
  return escapeHTML(value);
}
