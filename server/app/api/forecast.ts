import type { NumericPoint } from './extract.js'

const DAY = 24 * 60 * 60 * 1000

export type Forecast = {
  /** slope of the fitted line, in value change per day (negative means decreasing) */
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
 * Fit a straight line to the given points and return a projector.
 *
 * The x axis is the real time in days, so irregular sampling gaps are
 * handled correctly (a long gap is a long Δt, not "one step").
 */
function fitLine(samples: NumericPoint[]) {
  let n = samples.length
  let t0 = samples[0].poll_time
  let sum_x = 0
  let sum_y = 0
  let sum_xx = 0
  let sum_xy = 0
  for (let { poll_time, value } of samples) {
    let x = (poll_time - t0) / DAY
    sum_x += x
    sum_y += value
    sum_xx += x * x
    sum_xy += x * value
  }
  let denominator = n * sum_xx - sum_x * sum_x
  if (denominator === 0) return null
  let slope = (n * sum_xy - sum_x * sum_y) / denominator // per day
  let intercept = (sum_y - slope * sum_x) / n
  function project(time: number): number {
    return intercept + slope * ((time - t0) / DAY)
  }
  return { slope, project }
}

/**
 * Forecast a numeric series from its last `samples` points (default 2).
 *
 * This is direction-agnostic: it reports the current rate and the projected
 * value at the next sample, and only computes an `eta` when the series is
 * actually decreasing towards the target (default 0).
 */
export function forecastToTarget(
  points: NumericPoint[],
  options: { target?: number; samples?: number; next_time?: number } = {},
): Forecast | null {
  let target = options.target ?? 0
  let sample_count = Math.max(2, Math.floor(options.samples ?? 2))
  if (points.length < 2) return null

  let samples = points.slice(-sample_count)
  let fitted = fitLine(samples)
  if (!fitted) return null

  let last = samples[samples.length - 1]
  let fitted_value = fitted.project(last.poll_time)

  let eta: number | null = null
  if (fitted.slope < 0 && fitted_value > target) {
    let days_to_target = (fitted_value - target) / -fitted.slope
    eta = last.poll_time + days_to_target * DAY
  }

  let next_time = options.next_time ?? null
  let next_value = next_time == null ? null : fitted.project(next_time)

  return {
    rate_per_day: fitted.slope,
    value: last.value,
    poll_time: last.poll_time,
    next_value,
    next_time,
    eta,
    target,
    sample_size: samples.length,
    project: fitted.project,
  }
}
