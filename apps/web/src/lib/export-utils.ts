/**
 * Utility functions for exporting data in various formats
 */

export function exportToCSV(
  data: Array<Record<string, any>>,
  filename: string,
  columns?: string[],
) {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Determine columns to export
  const headers = columns || Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Handle special characters and quotes in CSV
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(','),
    ),
  ].join('\n');

  // Create blob and download
  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

export function exportToJSON(data: any, filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, 'application/json;charset=utf-8;');
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const element = document.createElement('a');
  element.setAttribute('href', `data:${mimeType}base64,${btoa(unescape(encodeURIComponent(content)))}`);
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

export function downloadBlobFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const element = document.createElement('a');
  element.setAttribute('href', url);
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  window.URL.revokeObjectURL(url);
}
