export function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function formatNumber(value: number | null | undefined) {
  if (value == null) return '';
  return value.toLocaleString('ko-KR');
}

export function formatIntegerInput(value: number | null) {
  if (value == null) return '';
  return formatNumber(value);
}

export function formatDecimalInput(value: number | null) {
  if (value == null) return '';
  return value.toLocaleString('ko-KR', {
    maximumFractionDigits: 10,
  });
}

export function parseNullableInteger(value: string) {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseNullableDecimal(value: string) {
  if (!value) return null;
  const parsed = parseFloat(value.replace(/,/g, ''));
  return Number.isNaN(parsed) ? null : parsed;
}

export function stripNonNumeric(value: string) {
  return value.replace(/[^0-9]/g, '');
}
