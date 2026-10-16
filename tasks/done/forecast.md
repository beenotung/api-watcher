# Forecast

Goal: estimate where a watched numeric field (e.g. SMS credit left, API credit usage) is heading, based on its history in `watch_log`.

Example: watch a `credit` field on an SMS provider endpoint and answer "when will I run out of SMS credit?"

Implemented:

- [x] parse the extracted field as a numeric value per poll (`getNumericHistory` in `server/app/api/extract.ts`)
- [x] compute rate of change (delta per real time, in days) from the last N `watch_log` rows (`forecastToTarget` in `server/app/api/forecast.ts`)
- [x] extrapolate with a linear fit, time-based so irregular polling gaps are handled correctly
- [x] estimate when the value reaches the target (0) when the trend is decreasing
- [x] per-endpoint sample count `endpoint.forecast_samples` (default 2), editable in the UI
- [x] show a horizon table (1d / 7d / 1mo / 3mo / 6mo / 1y) and the zero-crossing date on the endpoint page
- [x] render a Chart.js value-history chart with a dashed forecast to the next sample
- [x] handle resets (e.g. credit top-up) by using only the most recent N samples

Open:

- [ ] flag low confidence / insufficient samples (needs a fit-quality measure, e.g. R²)
- [ ] (optional) alert when estimated time crosses a threshold
