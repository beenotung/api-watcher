import { o } from '../jsx/jsx.js'
import type { ServerMessage } from '../../../client/types'
import { Routes } from '../routes.js'
import { apiEndpointTitle, title } from '../../config.js'
import Style from '../components/style.js'
import {
  Context,
  DynamicContext,
  getContextFormBody,
  throwIfInAPI,
  WsContext,
} from '../context.js'
import { mapArray } from '../components/fragment.js'
import { object, string } from 'cast.ts'
import { Link, Redirect } from '../components/router.js'
import { renderError, showError } from '../components/error.js'
import { EarlyTerminate, MessageException } from '../../exception.js'
import { Locale, makeThrows, Title } from '../components/locale.js'
import { Endpoint, proxy } from '../../../db/proxy.js'
import Script from '../components/script.js'
import { BackToLink } from '../components/back-to-link.js'
import { sweetAlertPlugin } from '../../client-plugins.js'
import { getAuthUser } from '../auth/user.js'
import { emptyObject, parseCode } from '../api/parse.js'
import { formatInterval, parseInterval } from '../format/interval.js'
import { pick, update } from 'better-sqlite3-proxy'
import {
  resetSchedule,
  checkSchedule,
  getLastWatchLog,
  getSchedule,
} from '../api/schedule.js'
import {
  getLastPayload,
  getNumericHistory,
  getVersionHistory,
} from '../api/extract.js'
import { forecastToTarget, type Forecast } from '../api/forecast.js'
import { Chart, ChartScript } from '../components/chart.js'
import {
  formatDateTimeText,
  toLocaleDateTimeString,
} from '../components/datetime.js'

let pageTitle = <Locale en="Endpoints" zh_hk="Endpoints" zh_cn="Endpoints" />
let addPageTitle = (
  <Locale en="Add Endpoint" zh_hk="添加Endpoint" zh_cn="添加Endpoint" />
)

const DAY = 24 * 60 * 60 * 1000

function addMonths(time: number, months: number): number {
  let date = new Date(time)
  date.setMonth(date.getMonth() + months)
  return date.getTime()
}

let forecastHorizons = [
  {
    label: <Locale en="1 day" zh_hk="1 天" zh_cn="1 天" />,
    add: (time: number) => time + DAY,
  },
  {
    label: <Locale en="1 week" zh_hk="1 週" zh_cn="1 周" />,
    add: (time: number) => time + 7 * DAY,
  },
  {
    label: <Locale en="1 month" zh_hk="1 個月" zh_cn="1 个月" />,
    add: (time: number) => addMonths(time, 1),
  },
  {
    label: <Locale en="3 months" zh_hk="3 個月" zh_cn="3 个月" />,
    add: (time: number) => addMonths(time, 3),
  },
  {
    label: <Locale en="6 months" zh_hk="6 個月" zh_cn="6 个月" />,
    add: (time: number) => addMonths(time, 6),
  },
  {
    label: <Locale en="1 year" zh_hk="1 年" zh_cn="1 年" />,
    add: (time: number) => addMonths(time, 12),
  },
]

let style = Style(/* css */ `
#Endpoint {
}
.api--title {
  font-weight: bold;
}
.api--desc {
  font-style: italic;
}
.payload-body {
  font-weight: bold;
}
.poll-time {
  color: #666;
}
`)

let script = Script(/* js */ `
`)

function ListPage(attrs: {}, context: Context) {
  let user = getAuthUser(context)
  let items = pick(proxy.endpoint, [
    'id',
    'title',
    'desc',
    'code',
    'extract_field',
  ])
  return (
    <>
      {style}
      <div id="Endpoint">
        <h1>{pageTitle}</h1>
        <ul>
          {mapArray(items, item => {
            let last_payload = getLastPayload(item)
            return (
              <li>
                <Link href={`/endpoints/${item.id}`} class="api--title">
                  {item.title}
                </Link>{' '}
                - <span class="api--desc">{item.desc}</span>
                {last_payload ? (
                  <div class="last-payload">
                    <span class="payload-body">{last_payload.body}</span>
                    <span class="poll-time">
                      {' '}
                      |
                      {formatDateTimeText(
                        { time: last_payload.poll_time },
                        context,
                      )}
                    </span>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
        {user ? (
          <Link href="/endpoints/add">
            <button>{addPageTitle}</button>
          </Link>
        ) : (
          <p>
            You can add endpoint after <Link href="/register">register</Link>.
          </p>
        )}
      </div>
      {script}
    </>
  )
}

let addPageStyle = Style(/* css */ `
#AddEndpoint .field {
  margin-block-end: 1rem;
}
#AddEndpoint .field label input,
#AddEndpoint .field label textarea {
  display: block;
  margin-block-start: 0.25rem;
  width: 100%;
  box-sizing: border-box;
}
#AddEndpoint .field label .hint {
  display: block;
  margin-block-start: 0.25rem;
}
`)
let addPageScript = Script(/* js */ `
`)
let addPage = (
  <>
    {addPageStyle}
    <div id="AddEndpoint">
      <h1>{addPageTitle}</h1>
      <form
        id="addForm"
        method="POST"
        action="/endpoints/add/submit"
        onsubmit="emitForm(event)"
      >
        <div class="field">
          <label>
            <Locale en="Title" zh_hk="標題" zh_cn="標題" />
            *:
            <input name="title" required minlength="3" maxlength="50" />
            <p class="hint">
              <Locale
                en="(3 to 50 characters)"
                zh_hk="(3 至 50 個字元)"
                zh_cn="(3 至 50 个字元)"
              />
            </p>
          </label>
        </div>
        <div class="field">
          <label>
            <Locale en="Description" zh_hk="描述" zh_cn="描述" />:
            <textarea name="desc" rows="2" maxlength="200"></textarea>
            <p class="hint">
              <Locale
                en="(optional, max 200 characters)"
                zh_hk="(可選，最多 200 個字元)"
                zh_cn="(可选，最多 200 个字元)"
              />
            </p>
          </label>
        </div>
        <div class="field">
          <label>
            <Locale en="Fetch Code" zh_hk="Fetch 程式碼" zh_cn="Fetch 代码" />
            *:
            <textarea
              name="code"
              rows="8"
              placeholder={
                "fetch('https://api.example.com/endpoint', {\n  method: 'GET',\n  headers: { ... }\n})"
              }
            ></textarea>
            <p class="hint">
              <Locale
                en="(paste the fetch code from browser dev tools)"
                zh_hk="(貼上瀏覽器開發者工具中的 fetch 程式碼)"
                zh_cn="(粘贴浏览器开发者工具中的 fetch 代码)"
              />
            </p>
          </label>
        </div>
        <div class="field">
          <label>
            <Locale
              en="Min Poll Interval"
              zh_hk="最小輪詢間隔"
              zh_cn="最小轮询间隔"
            />
            *:
            <input
              name="min_interval"
              type="text"
              required
              placeholder="e.g. 30m"
            />
          </label>
        </div>
        <div class="field">
          <label>
            <Locale
              en="Max Poll Interval"
              zh_hk="最大輪詢間隔"
              zh_cn="最大轮询间隔"
            />
            *:
            <input
              name="max_interval"
              type="text"
              required
              placeholder="e.g. 24h"
            />
          </label>
        </div>
        <div class="field">
          <label>
            <Locale
              en="JSON Extract Path"
              zh_hk="JSON 提取路徑"
              zh_cn="JSON 提取路径"
            />
            :
            <input
              name="extract_field"
              type="text"
              placeholder="e.g. $.data.usage"
            />
          </label>
        </div>
        <div class="field">
          <label>
            <Locale
              en="Forecast Samples"
              zh_hk="預測樣本數"
              zh_cn="预测样本数"
            />
            :
            <input
              name="forecast_samples"
              type="number"
              min="2"
              step="1"
              placeholder="default: 2"
            />
            <p class="hint">
              <Locale
                en="(number of latest samples used to estimate the rate)"
                zh_hk="(用於估算速率的最新樣本數)"
                zh_cn="(用于估算速率的最新样本数)"
              />
            </p>
          </label>
        </div>
        <div class="hint-block">
          <Locale en="Interval format:" zh_hk="間隔格式：" zh_cn="間隔格式：" />
          <dl style="display: grid; grid-template-columns: auto auto; gap: 0 0.5rem; margin-block-start: 0">
            <dt>s</dt>
            <dd>
              <Locale en="second" zh_hk="秒" zh_cn="秒" />
            </dd>
            <dt>m</dt>
            <dd>
              <Locale en="minute" zh_hk="分鐘" zh_cn="分鐘" />
            </dd>
            <dt>h</dt>
            <dd>
              <Locale en="hour" zh_hk="小時" zh_cn="小時" />
            </dd>
            <dt>d</dt>
            <dd>
              <Locale en="day" zh_hk="天" zh_cn="天" />
            </dd>
            <dt>w</dt>
            <dd>
              <Locale en="week" zh_hk="週" zh_cn="週" />
            </dd>
            <dt>mo</dt>
            <dd>
              <Locale en="month" zh_hk="月" zh_cn="月" />
            </dd>
          </dl>
        </div>
        <p class="remark">
          <Locale
            en="* mandatory fields"
            zh_hk="* 必填欄位"
            zh_cn="* 必填字段"
          />
        </p>
        <input
          type="submit"
          value={<Locale en="Submit" zh_hk="提交" zh_cn="提交" />}
        />
      </form>
    </div>
    {addPageScript}
  </>
)

function AddPage(attrs: {}, context: DynamicContext) {
  let user = getAuthUser(context)
  if (!user) return <Redirect href="/login" />
  return addPage
}

let submitParser = object({
  title: string({ minLength: 3, maxLength: 50 }),
  desc: string({ maxLength: 200 }),
  code: string({ minLength: 1 }),
  min_interval: string(),
  max_interval: string(),
  extract_field: string(),
  forecast_samples: string(),
})

function parseForecastSamples(text: string): number | null {
  let samples = Math.floor(Number(text))
  return Number.isFinite(samples) && samples >= 2 ? samples : null
}

function Submit(attrs: {}, context: DynamicContext) {
  try {
    let throws = makeThrows(context)
    let user = getAuthUser(context)
    if (!user)
      throws({
        en: 'You must be logged in to submit ' + Locale(pageTitle, context),
        zh_hk: '您必須登入才能提交 ' + Locale(pageTitle, context),
        zh_cn: '您必須登入才能提交 ' + Locale(pageTitle, context),
      })
    let user_id = user!.id!
    let body = getContextFormBody(context)
    let input = submitParser.parse(body)
    let id = proxy.endpoint.push({
      title: input.title,
      desc: input.desc ?? '',
      code: input.code,
      user_id,
      min_interval: parseInterval(input.min_interval),
      max_interval: parseInterval(input.max_interval),
      extract_field: input.extract_field || '$',
      forecast_samples: parseForecastSamples(input.forecast_samples),
    })
    checkSchedule(proxy.endpoint[id])
    return <Redirect href={`/endpoints/result?id=${id}`} />
  } catch (error) {
    throwIfInAPI(error, '#add-message', context)
    return (
      <Redirect
        href={
          '/endpoints/result?' + new URLSearchParams({ error: String(error) })
        }
      />
    )
  }
}

let detailPageStyle = Style(/* css */ `
#DetailEndpoint input[name="title"] { min-width: 12.5rem; }
#DetailEndpoint dt > * { vertical-align: middle; }
#DetailEndpoint dt button { margin-inline-start: 0.5rem; }
#DetailEndpoint code {
  background-color: #f0f0f0;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-family: monospace monospace;
  display: inline-block;
  max-width: min(120ch, 90vw);
  overflow-wrap: break-word;
}
#value-history-chart {
  max-width: 640px;
}
#DetailEndpoint .num {
  text-align: right;
}
`)

let detailPageScript = Script(/* js */ `
function setEditMode(event, mode) {
  let target = event.target
  let field = target.closest('.field')
  if (!field) {
    // button might be in dt, find dd sibling
    let dt = target.closest('dt')
    if (dt) {
      field = dt.nextElementSibling
    }
  }

  if (mode === 'edit') {
    // Entering edit mode - copy view mode text to input
    let viewNode = field.querySelector('.view-mode')
    let value = viewNode.textContent.trim()
    let input = field.querySelector('input, textarea')
    if (input) {
      input.value = value
      if (input.tagName === 'TEXTAREA') {
        let rect = viewNode.getBoundingClientRect()
        input.style.height = rect.height + 'px'
        input.style.width = rect.width + 'px'
      }
    }
  }

  field.dataset.mode = mode
}
function saveField(button) {
  let field = button.closest('.field')
  let input = field.querySelector('input, textarea')
  if (!input.checkValidity()) {
    input.reportValidity()
    return
  }
  let value = input.value
  emit(button.dataset.url, value)
}
function handleFieldKeydown(event) {
  if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
    event.preventDefault()
    let field = event.target.closest('.field')
    let button = field.querySelector('.edit-mode button:first-child')
    button.click()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    setEditMode(event, 'view')
  }
}
`)

function buildForecastRows(forecast: Forecast) {
  return forecastHorizons.map(horizon => {
    let time = horizon.add(forecast.poll_time)
    return { label: horizon.label, time, value: forecast.project(time) }
  })
}

function DetailPage(attrs: { item: Endpoint }, context: DynamicContext) {
  let { item } = attrs
  let url: string = ''
  let init: RequestInit = emptyObject
  let error: string = ''
  try {
    let result = parseCode(item.code)
    url = result.url
    init = result.init
  } catch (e) {
    error = String(e)
  }

  let { schedule, time_to_wait } = getSchedule(item)
  let last_log = getLastWatchLog(item)
  let last_poll_time = last_log?.poll_time
  let version_history = getVersionHistory(item)
  let numeric_history = getNumericHistory(item)
  let forecast = forecastToTarget(numeric_history, {
    samples: item.forecast_samples ?? 2,
    // project up to the next scheduled poll (clamp in case it is overdue)
    next_time: Math.max(schedule.poll_time, Date.now()),
  })
  let forecast_rows = forecast ? buildForecastRows(forecast) : []

  let last_log_info = []
  if (last_log?.version) {
    last_log_info.push(
      <>
        <Locale en="Version:" zh_hk="版本：" zh_cn="版本：" />{' '}
        <span>{last_log.version ?? '-'}</span>
      </>,
    )
  }
  if (last_log?.status_code) {
    last_log_info.push(
      <>
        <Locale en="Status:" zh_hk="狀態：" zh_cn="状态：" />{' '}
        <span>{last_log.status_code ?? '-'}</span>
      </>,
    )
  }
  if (last_log?.error) {
    last_log_info.push(
      <>
        <Locale en="Error:" zh_hk="錯誤：" zh_cn="错误：" />{' '}
        <span>{last_log.error ?? '-'}</span>
      </>,
    )
  }
  if (last_log_info.length === 0) {
    last_log_info.push(<span>-</span>)
  }

  function formatDateTime(time: number) {
    return toLocaleDateTimeString(time, context, {
      dateStyle: 'medium',
      timeStyle: 'medium',
      hour12: false,
    })
  }

  // Build a time-proportional x-axis. Chart.js evenly spaces category labels,
  // so we insert blank filler slots between readings to reflect the real time
  // gaps. Labels include the year to avoid ambiguity.
  let chart_labels: string[] = []
  let chart_data: (number | null)[] = []
  let forecast_data: (number | null)[] = []
  if (numeric_history.length > 0) {
    function formatChartTime(time: number) {
      return toLocaleDateTimeString(time, context, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    }

    let last_point = numeric_history[numeric_history.length - 1]
    let next_time = forecast?.next_time
    let span =
      next_time != null
        ? next_time - numeric_history[0].poll_time
        : last_point.poll_time - numeric_history[0].poll_time
    let max_slots = 48
    let slot_duration = span > 0 ? span / max_slots : 0
    function pushFiller(from: number, to: number) {
      if (slot_duration <= 0) return
      let slots = Math.round((to - from) / slot_duration) - 1
      slots = Math.max(0, Math.min(slots, max_slots))
      for (let i = 0; i < slots; i++) {
        chart_labels.push('')
        chart_data.push(null)
        forecast_data.push(null)
      }
    }

    for (let i = 0; i < numeric_history.length; i++) {
      let point = numeric_history[i]
      if (i > 0) {
        pushFiller(numeric_history[i - 1].poll_time, point.poll_time)
      }
      chart_labels.push(formatChartTime(point.poll_time))
      chart_data.push(point.value)
      forecast_data.push(null)
    }
    if (next_time != null && forecast?.next_value != null) {
      let last_reading_index = forecast_data.length - 1
      pushFiller(last_point.poll_time, next_time)
      chart_labels.push(formatChartTime(next_time))
      chart_data.push(null)
      // connect the forecast line to the last known reading
      forecast_data[last_reading_index] = forecast.value
      forecast_data.push(forecast.next_value)
    }
  }

  let editButton = (
    <button
      type="button"
      onclick="setEditMode(event, 'edit')"
      class="view-mode"
    >
      <Locale en="Edit" zh_hk="編輯" zh_cn="编辑" />
    </button>
  )
  function EditControls(attrs: { field: string }) {
    return (
      <span class="edit-mode">
        <button
          type="button"
          data-url={`/endpoints/${item.id}/update/${attrs.field}`}
          onclick="saveField(this)"
        >
          <Locale en="Save" zh_hk="保存" zh_cn="保存" />
        </button>
        <button type="button" onclick="setEditMode(event, 'view')">
          <Locale en="Cancel" zh_hk="取消" zh_cn="取消" />
        </button>
      </span>
    )
  }
  return (
    <>
      {detailPageStyle}
      <div id="DetailEndpoint">
        <h1>{item.title}</h1>
        <dl>
          <dt>
            <Locale en="Title" zh_hk="標題" zh_cn="標題" />
          </dt>
          <dd
            class="field inline-edit-field"
            data-field="title"
            data-mode="view"
          >
            <span class="view-mode">{item.title}</span>
            <span class="edit-mode">
              <input
                name="title"
                required
                minlength="3"
                maxlength="50"
                onkeydown="handleFieldKeydown(event)"
              />
            </span>
            {editButton}
            {EditControls({ field: 'title' })}
          </dd>
          <dt>
            <Locale en="Description" zh_hk="描述" zh_cn="描述" />
          </dt>
          <dd
            class="field inline-edit-field"
            data-field="desc"
            data-mode="view"
          >
            <span class="view-mode">{item.desc}</span>
            <span class="edit-mode">
              <input
                name="desc"
                maxlength="200"
                onkeydown="handleFieldKeydown(event)"
              />
            </span>
            {editButton}
            {EditControls({ field: 'desc' })}
          </dd>
          <dt>
            <Locale en="Code" zh_hk="程式碼" zh_cn="代码" />
            {editButton}
          </dt>
          <dd
            class="field inline-edit-field"
            data-field="code"
            data-mode="view"
          >
            <code class="view-mode" style="white-space: pre-wrap">
              {item.code}
            </code>
            <span class="edit-mode" style="display: block">
              <textarea
                name="code"
                rows="8"
                onkeydown="handleFieldKeydown(event)"
              ></textarea>
            </span>
            {EditControls({ field: 'code' })}
          </dd>
          <details id="request-details" hidden={!url}>
            <summary>Request Details</summary>
            <dt>Request URL</dt>
            <dd>
              <code id="url-preview">{url}</code>
            </dd>
            <dt id="init-preview-label" hidden={init === emptyObject}>
              Request Init
            </dt>
            <dd id="init-preview-container" hidden={init === emptyObject}>
              <code style="white-space: pre-wrap" id="init-preview">
                {JSON.stringify(init, null, 2)}
              </code>
            </dd>
          </details>
          <dt id="error-preview-label" hidden={!error}>
            <Locale en="Error" zh_hk="Error" zh_cn="Error" />
          </dt>
          <dd id="error-preview-container" hidden={!error}>
            <code id="error-preview">{error}</code>
          </dd>
          <dt>
            <Locale
              en="Min Poll Interval"
              zh_hk="最小輪詢間隔"
              zh_cn="最小轮询间隔"
            />
          </dt>
          <dd
            class="field inline-edit-field"
            data-field="min_interval"
            data-mode="view"
          >
            <span class="view-mode">{formatInterval(item.min_interval)}</span>
            <span class="edit-mode">
              <input
                name="min_interval"
                type="text"
                placeholder="e.g. 30m"
                onkeydown="handleFieldKeydown(event)"
              />
            </span>
            {editButton}
            {EditControls({ field: 'min_interval' })}
          </dd>
          <dt>
            <Locale
              en="Max Poll Interval"
              zh_hk="最大輪詢間隔"
              zh_cn="最大轮询间隔"
            />
          </dt>
          <dd
            class="field inline-edit-field"
            data-field="max_interval"
            data-mode="view"
          >
            <span class="view-mode">{formatInterval(item.max_interval)}</span>
            <span class="edit-mode">
              <input
                name="max_interval"
                type="text"
                placeholder="e.g. 24h"
                onkeydown="handleFieldKeydown(event)"
              />
            </span>
            {editButton}
            {EditControls({ field: 'max_interval' })}
          </dd>
          <div class="hint-block">
            <Locale
              en="Interval format:"
              zh_hk="間隔格式："
              zh_cn="間隔格式："
            />
            <dl style="display: grid; grid-template-columns: auto auto; gap: 0 0.5rem; margin-block-start: 0">
              <dt>s</dt>
              <dd>
                <Locale en="second" zh_hk="秒" zh_cn="秒" />
              </dd>
              <dt>m</dt>
              <dd>
                <Locale en="minute" zh_hk="分鐘" zh_cn="分鐘" />
              </dd>
              <dt>h</dt>
              <dd>
                <Locale en="hour" zh_hk="小時" zh_cn="小時" />
              </dd>
              <dt>d</dt>
              <dd>
                <Locale en="day" zh_hk="天" zh_cn="天" />
              </dd>
              <dt>w</dt>
              <dd>
                <Locale en="week" zh_hk="週" zh_cn="週" />
              </dd>
              <dt>mo</dt>
              <dd>
                <Locale en="month" zh_hk="月" zh_cn="月" />
              </dd>
            </dl>
          </div>
          <dt>
            <Locale
              en="JSON Extract Path"
              zh_hk="JSON 提取路徑"
              zh_cn="JSON 提取路径"
            />
          </dt>
          <dd
            class="field inline-edit-field"
            data-field="extract_field"
            data-mode="view"
          >
            <span class="view-mode">{item.extract_field || '$'}</span>
            <span class="edit-mode">
              <input
                name="extract_field"
                type="text"
                placeholder="e.g. $.data.usage"
                onkeydown="handleFieldKeydown(event)"
              />
            </span>
            {editButton}
            {EditControls({ field: 'extract_field' })}
          </dd>
          <dt>
            <Locale
              en="Forecast Samples"
              zh_hk="預測樣本數"
              zh_cn="预测样本数"
            />
          </dt>
          <dd
            class="field inline-edit-field"
            data-field="forecast_samples"
            data-mode="view"
          >
            <span class="view-mode">{item.forecast_samples ?? 2}</span>
            <span class="edit-mode">
              <input
                name="forecast_samples"
                type="number"
                min="2"
                step="1"
                placeholder="default: 2"
                onkeydown="handleFieldKeydown(event)"
              />
            </span>
            {editButton}
            {EditControls({ field: 'forecast_samples' })}
            <p class="hint">
              <Locale
                en="(number of latest samples used to estimate the rate)"
                zh_hk="(用於估算速率的最新樣本數)"
                zh_cn="(用于估算速率的最新样本数)"
              />
            </p>
          </dd>
          <dt>
            <Locale en="Poll Schedule" zh_hk="輪詢排程" zh_cn="轮询排程" />
          </dt>
          <dd>
            <Locale en="Next poll:" zh_hk="下次輪詢：" zh_cn="下次轮询：" />{' '}
            <span>
              {formatDateTime(schedule.poll_time)} (in{' '}
              {formatInterval(time_to_wait)})
            </span>
            <br />
            <Locale
              en="Last poll:"
              zh_hk="上次輪詢："
              zh_cn="上次轮询："
            />{' '}
            <span>{last_poll_time ? formatDateTime(last_poll_time) : '-'}</span>
          </dd>
          <dt>
            <Locale en="Latest Response" zh_hk="最新回應" zh_cn="最新回应" />
          </dt>
          <dd>{mapArray(last_log_info, info => info, <br />)}</dd>
          {numeric_history.length > 0 ? (
            <>
              <dt>
                <Locale en="Forecast" zh_hk="預測" zh_cn="预测" />
              </dt>
              <dd>
                {forecast ? (
                  <>
                    <Locale en="Rate:" zh_hk="速率：" zh_cn="速率：" />{' '}
                    {forecast.rate_per_day.toFixed(2)}/
                    <Locale en="day" zh_hk="天" zh_cn="天" /> ·{' '}
                    {forecast.sample_size}{' '}
                    <Locale en="samples" zh_hk="個樣本" zh_cn="个样本" />
                    <table>
                      <thead>
                        <tr>
                          <th>
                            <Locale en="Horizon" zh_hk="時距" zh_cn="时距" />
                          </th>
                          <th class="num">
                            <Locale
                              en="Estimated Value"
                              zh_hk="估算數值"
                              zh_cn="估算数值"
                            />
                          </th>
                          <th>
                            <Locale
                              en="Estimated Date"
                              zh_hk="估算日期"
                              zh_cn="估算日期"
                            />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {mapArray(forecast_rows, row => (
                          <tr>
                            <td>{row.label}</td>
                            <td class="num">
                              <pre style="max-width: 400px; overflow: auto;">
                                {row.value.toFixed(2)}
                              </pre>
                            </td>
                            <td>{formatDateTime(row.time)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {forecast.eta ? (
                      <>
                        <Locale
                          en="Estimated to reach"
                          zh_hk="預計到達"
                          zh_cn="预计到达"
                        />{' '}
                        <span>{forecast.target}</span>{' '}
                        <Locale en="around" zh_hk="約在" zh_cn="约在" />{' '}
                        <span>{formatDateTime(forecast.eta)}</span> (in{' '}
                        {formatInterval(forecast.eta - Date.now())})
                      </>
                    ) : (
                      <>
                        <Locale
                          en="Not decreasing, no estimate to reach"
                          zh_hk="並非下降中，未能估算到達"
                          zh_cn="并非下降中，未能估算到达"
                        />{' '}
                        <span>{forecast.target}</span>
                      </>
                    )}
                  </>
                ) : (
                  <Locale
                    en="Not enough data (need at least 2 numeric samples)"
                    zh_hk="數據不足（需要至少 2 個數值樣本）"
                    zh_cn="数据不足（需要至少 2 个数值样本）"
                  />
                )}
              </dd>
              <dt>
                <Locale en="Value History" zh_hk="數值歷史" zh_cn="数值历史" />
              </dt>
              <dd>
                <div id="value-history-chart">
                  <Chart
                    canvas_id="value-history"
                    data_labels={chart_labels}
                    datasets={[
                      {
                        label: item.extract_field || '$',
                        data: chart_data,
                        borderColor: '#2b6cb0',
                      },
                      ...(forecast?.next_value != null
                        ? [
                            {
                              label: 'forecast',
                              data: forecast_data,
                              borderColor: '#dd6b20',
                              borderDash: [6, 6],
                            },
                          ]
                        : []),
                    ]}
                    borderWidth={2}
                    beginAtZero
                  />
                </div>
              </dd>
            </>
          ) : null}
          <dt>
            <Locale en="Version History" zh_hk="版本歷史" zh_cn="版本历史" />
          </dt>
          <dd>
            <table>
              <thead>
                <tr>
                  <th>
                    <Locale en="Version" zh_hk="版本" zh_cn="版本" />
                  </th>
                  <th>
                    <Locale en="Payload" zh_hk="有效載荷" zh_cn="有效载荷" />
                  </th>
                  <th>
                    <Locale en="Duration" zh_hk="時長" zh_cn="时长" />
                  </th>
                  <th>
                    <Locale en="First" zh_hk="首次" zh_cn="首次" />
                  </th>
                  <th>
                    <Locale en="Last" zh_hk="末次" zh_cn="末次" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {mapArray(version_history, row => (
                  <tr>
                    <td>{row.version}</td>
                    <td>
                      <pre style="max-width: 400px; overflow: auto;">
                        {row.body ?? '-'}
                      </pre>
                    </td>
                    <td>
                      {formatInterval(row.last_poll_time - row.first_poll_time)}
                    </td>
                    <td>{formatDateTime(row.first_poll_time)}</td>
                    <td>{formatDateTime(row.last_poll_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </dd>
        </dl>
        <BackToLink href="/endpoints" title={pageTitle} />
      </div>
      {sweetAlertPlugin.node}
      {ChartScript}
      {detailPageScript}
    </>
  )
}

function UpdateField(attrs: {}, context: WsContext) {
  if (context.type !== 'ws') {
    throw new Error('This endpoint only supports WebSocket')
  }
  try {
    let id = context.routerMatch?.params.id
    let field = context.routerMatch?.params.field
    let value = context.args?.[0] as string

    if (!field) throw `Missing field name`
    if (!value) throw `Missing value`

    if (!((+id) in proxy.endpoint)) throw `Item not found, id: ${id}`
    id = +id

    let container = `#DetailEndpoint`
    function commitField(extra?: ServerMessage[]) {
      let messages: ServerMessage[] = [
        [
          'update-text',
          `${container} .field[data-field="${field}"] .view-mode`,
          value,
        ],
        [
          'update-attrs',
          `${container} .field[data-field="${field}"]`,
          { 'data-mode': 'view' },
        ],
      ]
      if (extra) {
        messages.push(...extra)
      }
      context.ws.send(['batch', messages])
    }

    switch (field) {
      case 'title':
        value = value.trim()
        if (!value) {
          throw `validation error: title cannot be empty`
        }
        update(proxy.endpoint, { id }, { title: value })
        commitField([
          /* special case also update the page title */
          ['update-text', '#DetailEndpoint h1', value],
          ['set-title', 'Details of ' + value],
        ])
        throw EarlyTerminate
      case 'desc':
        update(proxy.endpoint, { id }, { desc: value })
        commitField()
        throw EarlyTerminate
      case 'code': {
        update(proxy.endpoint, { id }, { code: value })
        try {
          let result = parseCode(value)
          commitField([
            ['show', '#request-details'],
            ['update-text', '#url-preview', result.url],
            [
              result.init === emptyObject ? 'hide' : 'show',
              ['#init-preview-label', '#init-preview-container'],
            ],
            [
              'update-text',
              '#init-preview',
              JSON.stringify(result.init, null, 2),
            ],
            ['hide', ['#error-preview-label', '#error-preview-container']],
          ])
        } catch (error) {
          commitField([
            ['hide', '#request-details'],
            ['show', ['#error-preview-label', '#error-preview-container']],
            ['update-text', '#error-preview', String(error)],
          ])
        }
        let endpoint = proxy.endpoint[id]
        resetSchedule(endpoint)
        throw EarlyTerminate
      }
      case 'min_interval': {
        let interval = parseInterval(value)
        update(proxy.endpoint, { id }, { min_interval: interval })
        commitField([
          [
            'update-text',
            `${container} .field[data-field="min_interval"] .view-mode`,
            formatInterval(Number(value)),
          ],
        ])
        checkSchedule(proxy.endpoint[id])
        throw EarlyTerminate
      }
      case 'max_interval': {
        let interval = parseInterval(value)
        update(proxy.endpoint, { id }, { max_interval: interval })
        commitField([
          [
            'update-text',
            `${container} .field[data-field="max_interval"] .view-mode`,
            formatInterval(Number(value)),
          ],
        ])
        checkSchedule(proxy.endpoint[id])
        throw EarlyTerminate
      }
      case 'extract_field': {
        let field = value || '$'
        update(proxy.endpoint, { id }, { extract_field: field })
        commitField()
        throw EarlyTerminate
      }
      case 'forecast_samples': {
        let samples = Math.floor(Number(value))
        if (!Number.isFinite(samples) || samples < 2) {
          throw `validation error: forecast samples must be an integer >= 2`
        }
        update(proxy.endpoint, { id }, { forecast_samples: samples })
        commitField([
          [
            'update-text',
            `${container} .field[data-field="forecast_samples"] .view-mode`,
            String(samples),
          ],
        ])
        throw EarlyTerminate
      }
      default:
        throw `Unknown field: ${field}`
    }
  } catch (error) {
    if (error instanceof MessageException) {
      context.ws.send(error.message)
    } else if (error != EarlyTerminate) {
      context.ws.send(showError(error))
    }
    throw EarlyTerminate
  }
}

function SubmitResult(attrs: {}, context: DynamicContext) {
  let params = new URLSearchParams(context.routerMatch?.search)
  let error = params.get('error')
  let id = params.get('id')
  return (
    <div>
      {error ? (
        renderError(error, context)
      ) : (
        <>
          <p>
            <Locale
              en={`Your submission is received (#${id}).`}
              zh_hk={`你的提交已收到 (#${id})。`}
              zh_cn={`你的提交已收到 (#${id})。`}
            />
          </p>
          <BackToLink href="/endpoints" title={pageTitle} />
        </>
      )}
    </div>
  )
}

let routes = {
  '/endpoints': {
    menuText: pageTitle,
    title: <Title t={pageTitle} />,
    description: 'TODO',
    node: <ListPage />,
  },
  '/endpoints/:id': {
    resolve(context) {
      let id = context.routerMatch?.params.id
      let item = proxy.endpoint[+id]
      if (!item) {
        return {
          title: apiEndpointTitle,
          description: 'Endpoint item not found',
          node: renderError('Endpoint item not found, id: ' + id, context),
        }
      }
      return {
        title: title('Details of ' + item.title),
        description: 'Details of ' + item.title,
        node: DetailPage({ item }, context),
      }
    },
  },
  '/endpoints/:id/update/:field': {
    title: apiEndpointTitle,
    description: 'TODO',
    node: <UpdateField />,
    streaming: false,
  },
  '/endpoints/add': {
    title: <Title t={addPageTitle} />,
    description: 'TODO',
    node: <AddPage />,
    streaming: false,
  },
  '/endpoints/add/submit': {
    title: apiEndpointTitle,
    description: 'TODO',
    node: <Submit />,
    streaming: false,
  },
  '/endpoints/result': {
    title: apiEndpointTitle,
    description: 'TODO',
    node: <SubmitResult />,
    streaming: false,
  },
} satisfies Routes

export default { routes }
