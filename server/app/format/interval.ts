let intervalUnits: [string, number][] = [
  ['mo', 30 * 24 * 60 * 60 * 1000],
  ['w', 7 * 24 * 60 * 60 * 1000],
  ['d', 24 * 60 * 60 * 1000],
  ['h', 60 * 60 * 1000],
  ['m', 60 * 1000],
  ['s', 1000],
]

export function parseInterval(text: string): number {
  text = text.trim().toLowerCase()
  for (let [unit, unit_ms] of intervalUnits) {
    if (text.endsWith(unit)) {
      let num = Number(text.slice(0, -unit.length).trim())
      if (isNaN(num)) throw `Invalid interval: ${text}`
      return num * unit_ms
    }
  }
  let num = Number(text)
  if (isNaN(num)) throw `Invalid interval: ${text}`
  return num
}

export function formatInterval(duration_ms: number): string {
  for (let [unit, unit_ms] of intervalUnits) {
    if (duration_ms >= unit_ms && duration_ms % unit_ms === 0) {
      return duration_ms / unit_ms + unit
    }
  }
  return duration_ms + 'ms'
}
