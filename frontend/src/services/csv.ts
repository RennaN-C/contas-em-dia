export function csvCell(value: string) {
  const safe = /^[\s]*[=+@\-]/.test(value) || /^[\t\r\n]/.test(value) ? "'" + value : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function downloadCsv(contents: string, filename: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
