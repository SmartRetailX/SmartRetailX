// Number formatters
export function formatNumber(value: number = 0): string {
  return new Intl.NumberFormat().format(value);
}
