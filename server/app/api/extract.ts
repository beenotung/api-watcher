import { db } from '../../../db/db.js'
import { Endpoint } from '../../../db/proxy.js'

db.function(
  'extract_field',
  function (
    content_type: string | null,
    body: string | null,
    extract_field: string | null,
  ): string | null {
    if (
      content_type?.includes('application/json') &&
      typeof body === 'string' &&
      typeof extract_field === 'string'
    ) {
      return json_extract(body, extract_field)
    }
    if (
      content_type?.includes('text/html') &&
      typeof body === 'string' &&
      typeof extract_field === 'string'
    ) {
      return html_extract(body, extract_field)
    }
    return body
  },
)

// support nested fields
function json_extract(body: string, extract_field: string): string | null {
  if (extract_field === '$' || extract_field === '$.') {
    return body
  }
  let json = JSON.parse(body)
  let fields = extract_field.replace('$.', '').split('.')
  let value = json
  for (let field of fields) {
    value = value[field]
  }
  return value
}

// TODO support query selector
function html_extract(body: string, extract_field: string): string | null {
  return 'todo: ' + body.slice(0, 20) + '...'
}

export type VersionHistory = {
  first_poll_time: number
  last_poll_time: number
  version: number
  body: string | null
}

let select_version_history = db.prepare<
  { endpoint_id: number; path: string },
  VersionHistory
>(/* sql */ `
select
  min(watch_log.poll_time) first_poll_time
, max(watch_log.poll_time) last_poll_time
, watch_log.version
, extract_field(watch_log.content_type, watch_log.body, :path) body
from watch_log
inner join watch_schedule on watch_schedule.id = watch_log.watch_schedule_id
where watch_schedule.endpoint_id = :endpoint_id
  and watch_log.version is not null
group by watch_log.version
`)

export function getVersionHistory(endpoint: Endpoint): VersionHistory[] {
  let path = endpoint.extract_field || '$'
  return select_version_history.all({
    endpoint_id: endpoint.id!,
    path,
  })
}

let select_last_payload = db.prepare<
  {
    endpoint_id: number
    path: string
  },
  {
    body: string | null
    poll_time: number
    id: number
  }
>(/* sql */ `
select
  extract_field(watch_log.content_type, watch_log.body, :path) body
, watch_log.poll_time
, watch_log.id
from watch_log
inner join watch_schedule on watch_schedule.id = watch_log.watch_schedule_id
where watch_schedule.endpoint_id = :endpoint_id
  and watch_log.version is not null
order by watch_log.version desc
limit 1
`)

export function getLastPayload(
  endpoint: Endpoint | { id?: number | null; extract_field: string | null },
) {
  let path = endpoint.extract_field || '$'
  return select_last_payload.get({
    endpoint_id: endpoint.id!,
    path,
  })
}
