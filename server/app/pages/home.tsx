import { Link } from '../components/router.js'
import { o } from '../jsx/jsx.js'
import { prerender } from '../jsx/html.js'
import SourceCode from '../components/source-code.js'
import { ResolvedPageRoute, Routes } from '../routes.js'
import { title } from '../../config.js'
import Style from '../components/style.js'
import { Locale, LocaleVariants } from '../components/locale.js'

let style = Style(/* css */ `
`)

let content = (
  <div id="home">
    <h1>
      <Locale en="API Watcher" zh_hk="API 監控器" zh_cn="API 监控器" />
    </h1>

    <p>
      <Locale
        en="Monitor API changes in real-time. Poll endpoints, track responses, and get alerted when things change."
        zh_hk="即時監控 API 變化。輪詢端點，追蹤回應，變化時自動提醒。"
        zh_cn="实时监控 API 变化。轮询端点，追踪回应，变化时自动提醒。"
      />
    </p>

    <h2>
      <Locale en="Features" zh_hk="功能" zh_cn="功能" />
    </h2>
    <ul>
      <li>
        <Locale
          en="Poll APIs at adjustable intervals"
          zh_hk="可調整間隔輪詢 API"
          zh_cn="可调整间隔轮询 API"
        />
      </li>
      <li>
        <Locale
          en="Save and compare responses"
          zh_hk="儲存並比較回應"
          zh_cn="储存并比较回应"
        />
      </li>
      <li>
        <Locale
          en="Highlight changes with diff view"
          zh_hk="用差異視圖突出顯示變化"
          zh_cn="用差异视图突出显示变化"
        />
      </li>
      <li>
        <Locale
          en="Adaptive polling based on change frequency"
          zh_hk="根據變化頻率自動調整輪詢間隔"
          zh_cn="根据变化频率自动调整轮询间隔"
        />
      </li>
    </ul>

    <p>
      <Locale
        en="Add your first API endpoint to start monitoring."
        zh_hk="新增你的第一個 API 端點來開始監控。"
        zh_cn="新增你的第一个 API 端点来开始监控。"
      />
    </p>

    <SourceCode page="home.tsx" />
  </div>
)

let home = (
  <>
    {style}
    {content}
  </>
)

let route: LocaleVariants<ResolvedPageRoute> = {
  en: {
    title: title('API Watcher'),
    description: 'Monitor API changes in real-time with adaptive polling',
    node: prerender(home, { language: 'en' }),
  },
  zh_hk: {
    title: title('API 監控器'),
    description: '用自適應輪詢即時監控 API 變化',
    node: prerender(home, { language: 'zh_hk' }),
  },
  zh_cn: {
    title: title('API 监控器'),
    description: '用自适应轮询实时监控 API 变化',
    node: prerender(home, { language: 'zh_cn' }),
  },
}

let routes = {
  '/': {
    menuText: <Locale en="Home" zh_hk="主頁" zh_cn="主页" />,
    resolve(context) {
      return Locale(route, context)
    },
  },
} satisfies Routes

export default { routes }
