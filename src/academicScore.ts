export function academicScore(value: number | null | undefined): string {
  if (value == null) return '—'
  const rounded = Number(value).toFixed(2)
  return value < 5 && Number(rounded) >= 5 ? String(value) : rounded
}

if (import.meta.env.DEV && ([[null, '—'], [0, '0.00'], [5, '5.00'], [4.9975, '4.9975'], [7.126, '7.13']] as const).some(([value, expected]) => academicScore(value) !== expected)) throw new Error('Academic score display check failed')
