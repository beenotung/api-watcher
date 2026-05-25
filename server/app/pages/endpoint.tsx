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
import { env } from '../../env.js'
import Script from '../components/script.js'
import { BackToLink } from '../components/back-to-link.js'
import { sweetAlertPlugin } from '../../client-plugins.js'
import { getAuthUser } from '../auth/user.js'
import { emptyObject, parseCode } from '../api/parse.js'
import { pick, update } from 'better-sqlite3-proxy'
import { Node } from '../jsx/types.js'

let pageTitle = <Locale en="Endpoints" zh_hk="Endpoints" zh_cn="Endpoints" />
let addPageTitle = (
  <Locale en="Add Endpoint" zh_hk="添加Endpoint" zh_cn="添加Endpoint" />
)

let style = Style(/* css */ `
#Endpoint {
}
.api--title {
  font-weight: bold;
}
.api--desc {
}
`)

let script = Script(/* js */ `
`)

function ListPage(attrs: {}, context: Context) {
  let user = getAuthUser(context)
  let items = pick(proxy.endpoint, ['id', 'title', 'desc', 'code'])
  return (
    <>
      {style}
      <div id="Endpoint">
        <h1>{pageTitle}</h1>
        <ul>
          {mapArray(items, item => (
            <li>
              <Link href={`/endpoints/${item.id}`} class="api--title">
                {item.title}
              </Link>{' '}
              - <span class="api--desc">{item.desc}</span>
            </li>
          ))}
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
        <input
          type="submit"
          value={<Locale en="Submit" zh_hk="提交" zh_cn="提交" />}
        />
        <p>
          <Locale en="Remark:" zh_hk="備註：" zh_cn="备注：" />
          <br />
          <Locale
            en="* mandatory fields"
            zh_hk="* 必填欄位"
            zh_cn="* 必填字段"
          />
        </p>
        <p id="add-message"></p>
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
})

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
    })
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
        </dl>
        <BackToLink href="/endpoints" title={pageTitle} />
      </div>
      {sweetAlertPlugin.node}
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
      case 'code':
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
        throw EarlyTerminate
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
