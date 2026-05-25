import { db } from '../../../db/db.js'
import { Endpoint, proxy, WatchSchedule } from '../../../db/proxy.js'
import { update } from 'better-sqlite3-proxy'
import { parseCode } from './parse.js'

let select_next_schedule = db
  .prepare<{ endpoint_id: number }, number>(
    /* sql */ `
select id
from watch_schedule
where endpoint_id = :endpoint_id
  and id not in (
    select watch_schedule_id from watch_log
  )
`,
  )
  .pluck()

export function checkSchedule(endpoint: Endpoint) {
  let endpoint_id = endpoint.id!

  var { min_interval, max_interval } = endpoint
  if (min_interval > max_interval) {
    var { min_interval, max_interval } = {
      min_interval: max_interval,
      max_interval: min_interval,
    }
    update(proxy.endpoint, { id: endpoint_id }, { min_interval, max_interval })
  }

  let now = Date.now()

  let schedule_id = select_next_schedule.get({ endpoint_id })
  if (!schedule_id) {
    // not scheduled yet, create a new schedule
    schedule_id = proxy.watch_schedule.push({
      endpoint_id,
      schedule_time: now,
      poll_time: now + min_interval,
      delta_duration: min_interval,
      expected_version: 1,
    })
  }

  let schedule = proxy.watch_schedule[schedule_id]
  let poll_time = schedule.poll_time
  let time_to_wait = poll_time - now

  if (time_to_wait > max_interval) {
    // we reduced the max interval, need to bring forward (advance) the poll
    time_to_wait = max_interval
    update(
      proxy.watch_schedule,
      { id: schedule_id },
      { schedule_time: now, poll_time: now + time_to_wait },
    )
  }

  if (time_to_wait > 0) {
    // not yet time to poll
    setTimeout(() => {
      checkSchedule(endpoint)
    }, time_to_wait)
    return
  }

  // time to poll
  poll(schedule)
}

let select_last_version = db.prepare<
  { endpoint_id: number; body: string },
  { version: number; body: string }
>(/* sql */ `
select
  version
, body
from watch_log
inner join watch_schedule on watch_schedule.id = watch_log.watch_schedule_id
where watch_schedule.endpoint_id = :endpoint_id
  and version is not null
order by version desc
limit 1
`)

async function poll(schedule: WatchSchedule) {
  let endpoint = schedule.endpoint!
  let poll_time = Date.now()
  try {
    let code = endpoint.code
    let { url, init } = parseCode(code)
    let res = await fetch(url, init)
    let body = await res.text()
    let last_version = select_last_version.get({
      endpoint_id: endpoint.id!,
      body,
    })
    let version = !last_version
      ? 1
      : last_version.body === body
        ? last_version.version
        : last_version.version + 1
    let is_new_version = version !== last_version?.version
    proxy.watch_log.push({
      watch_schedule_id: schedule.id!,
      poll_time,
      status_code: res.status,
      content_type: res.headers.get('content-type'),
      body,
      version,
      is_new_version,
      error: null,
    })
  } catch (error) {
    proxy.watch_log.push({
      watch_schedule_id: schedule.id!,
      poll_time,
      status_code: null,
      content_type: null,
      body: null,
      version: null,
      is_new_version: false,
      error: String(error),
    })
  } finally {
    checkSchedule(endpoint)
  }
}
