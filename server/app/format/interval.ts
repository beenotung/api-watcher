let intervalUnits: [string, number][] = [
  ['mo', 30 * 24 * 60 * 60 * 1000],
  ['w', 7 * 24 * 60 * 60 * 1000],
  ['d', 24 * 60 * 60 * 1000],
  ['h', 60 * 60 * 1000],
  ['m', 60 * 1000],
  ['s', 1000],
  ['ms', 1],
]

// longest suffix first, so 'ms' matches before 's' and 'mo' before 'm'
let parseUnits = [...intervalUnits].sort((a, b) => b[0].length - a[0].length)

export function parseInterval(text: string): number {
  let input = text.trim().toLowerCase()
  if (!input) throw `Invalid interval: empty value`

  let unit_ms = 1 // unitless input is treated as milliseconds
  let num_text = input

  for (let [unit, unit_ms_of_unit] of parseUnits) {
    if (input.endsWith(unit)) {
      unit_ms = unit_ms_of_unit
      num_text = input.slice(0, -unit.length).trim()
      break
    }
  }

  let num = Number(num_text)
  if (isNaN(num) || !Number.isFinite(num)) {
    throw `Invalid interval: ${text}`
  }

  let duration_ms = num * unit_ms
  if (!Number.isFinite(duration_ms) || duration_ms <= 0) {
    throw `Invalid interval: ${text} (must be a positive duration)`
  }

  return duration_ms
}

export function formatInterval(duration_ms: number): string {
  for (let [unit, unit_ms] of intervalUnits) {
    if (duration_ms >= unit_ms) {
      let value = duration_ms / unit_ms
      // keep up to 2 decimal places, without trailing zeros
      return Math.round(value * 100) / 100 + unit
    }
  }
  return duration_ms + 'ms'
}
