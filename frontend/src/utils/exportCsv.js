const normalizeCellValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeCellValue(entry)).filter(Boolean).join(' | ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const escapeCsvCell = (value) => {
  const normalizedValue = normalizeCellValue(value);
  const escapedValue = normalizedValue.replace(/"/g, '""');

  return /[",\r\n]/.test(escapedValue) ? `"${escapedValue}"` : escapedValue;
};

export const formatDateForExport = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

export const formatYesNo = (value) => (value ? 'Yes' : 'No');

export const joinExportList = (values = []) =>
  values
    .map((value) => normalizeCellValue(value).trim())
    .filter(Boolean)
    .join(' | ');

export const downloadCsv = ({ columns, filename, rows }) => {
  const headerRow = columns.map((column) => escapeCsvCell(column.header)).join(',');
  const dataRows = rows.map((row) =>
    columns
      .map((column) => {
        const value = typeof column.accessor === 'function' ? column.accessor(row) : row[column.accessor];
        return escapeCsvCell(value);
      })
      .join(',')
  );
  const csvContent = ['\uFEFF' + headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
