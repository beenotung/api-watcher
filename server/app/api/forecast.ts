import type { NumericPoint } from './extract.js'

const DAY = 24 * 60 * 60 * 1000

export type Forecast = {
  /** steepest decline in the window, in value change per day (worst case) */
  rate_per_day: number
  /** latest known value */
  value: number
  /** poll time of the latest known value */
  poll_time: number
  /** projected value at `next_time`, null when no next sample time is known */
  next_value: number | null
  /** time of the next expected sample, when known */
  next_time: number | null
  /** estimated time (ms) when the value reaches the target, null if it is flat or rising */
  eta: number | null
  /** the target value the forecast extrapolates to (default 0) */
  target: number
  /** number of points used in the fit */
  sample_size: number
  /** project the fitted line to any time (ms since epoch) */
  project: (time: number) => number
}

/**
 * Forecast a numeric series from its last `samples` points (default 2).
 *
 * The rate is the steepest decline between consecutive readings in that
 * window, so the zero-crossing is a worst-case (earliest) estimate that
 * leaves time to react. With a single segment (two points) that segment is
 * used as-is; with only one point there is nothing to extrapolate.
 *
 * The x axis is the real time in days, so irregular sampling gaps are
 * handled correctly (a long gap is a long Δt, not "one step").
 */
export function forecastToTarget(
  points: NumericPoint[],
  options: { target?: number; samples?: number; next_time?: number } = {},
): Forecast | null {
  let target = options.target ?? 0
  let sample_count = Math.max(2, Math.floor(options.samples ?? 2))
  if (points.length < 2) return null

  let samples = points.slice(-sample_count)

  // worst case: the steepest decline between consecutive readings
  let worst_rate = 0
  for (let i = 1; i < samples.length; i++) {
    let days = (samples[i].poll_time - samples[i - 1].poll_time) / DAY
    if (days <= 0) continue
    let rate = (samples[i].value - samples[i - 1].value) / days
    if (rate < worst_rate) worst_rate = rate
  }

  let last = samples[samples.length - 1]
  let project = (time: number) =>
    last.value + worst_rate * ((time - last.poll_time) / DAY)

  let eta: number | null = null
  if (worst_rate < 0 && last.value > target) {
    eta = last.poll_time + ((last.value - target) / -worst_rate) * DAY
  }

  let next_time = options.next_time ?? null
  let next_value: number | null = null
  if (next_time != null) {
    next_value = Math.max(project(next_time), target)
  }

  return {
    rate_per_day: worst_rate,
    value: last.value,
    poll_time: last.poll_time,
    next_value,
    next_time,
    eta,
    target,
    sample_size: samples.length,
    project,
  }
}
