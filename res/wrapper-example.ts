// Copy this file to wrapper.ts and customize for your project
// wrapper.ts is gitignored

import type { Server } from 'http'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import express from 'express'
import { print } from 'listening-on'
import { chromium } from 'playwright'

function get_json(filename: string) {
  let file = join('res', filename)
  let text = readFileSync(file, 'utf-8')
  let json = JSON.parse(text)
  return json
}

function save_json(filename: string, json: object) {
  let file = join('res', filename)
  writeFileSync(file, JSON.stringify(json, null, 2) + '\n')
}

class File<T extends object> {
  private _json: T
  constructor(public filename: string) {
    this._json = get_json(this.filename)
  }
  get json() {
    return this._json
  }
  set json(json: T) {
    this._json = json
    save_json(this.filename, json)
  }
}

let browserP = chromium.launch({ headless: false })

async function create_session(options: { username: string; password: string }) {
  let browser = await browserP
  let page = await browser.newPage()
  await page.goto('login-url')
  await page.fill('#username-field', options.username)
  await page.fill('#password-field', options.password)
  await page.click('#login-button')
  async function get_data() {
    return { data: 'custom logics' }
  }
  return { page, get_data }
}

let company_a_session_p = create_session({
  username: 'company-a',
  password: 'password',
})
let company_b_session_p = create_session({
  username: 'company-b',
  password: 'password',
})

async function get_credit() {
  return { credit: 'custom logics' }
}

// 8x8 Connect SMS API (also used for sending in server/sms.ts).
// Account balance is available for prepaid accounts only.
// API key: https://connect.8x8.com -> API keys
async function get_8x8_balance() {
  let account = process.env.SMS_8x8_ACCOUNT_KEY
  let api_key = process.env.SMS_8x8_API_KEY
  if (!account || account === 'skip' || !api_key || api_key === 'skip') {
    throw new Error('SMS_8x8_ACCOUNT_KEY / SMS_8x8_API_KEY not set in .env')
  }
  let res = await fetch(
    `https://sms.8x8.com/api/v1/accounts/${account}/balance`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer ' + api_key,
      },
    },
  )
  let json = await res.json()
  if (!res.ok) {
    throw new Error('8x8 balance failed: ' + JSON.stringify(json))
  }
  return json
}

let app = express()

function wrap_api(path: string, fn: () => Promise<object>) {
  app.get(path, async (req, res) => {
    try {
      let result = await fn()
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}

wrap_api('/cloud-a/credit', get_credit)

wrap_api('/8x8/balance', get_8x8_balance)

wrap_api('/sms-credit/company-a', async () => {
  let session = await company_a_session_p
  let result = await session.get_data()
  return result
})

wrap_api('/sms-credit/company-b', async () => {
  let session = await company_b_session_p
  let result = await session.get_data()
  return result
})

let port = 8282
export let serverP = new Promise<Server>((resolve, reject) => {
  let server = app
    .listen(port, () => {
      console.log('wrapper server for api endpoints')
      print(port)
      resolve(server)
    })
    .on('error', error => {
      console.error('wrapper server error:', error)
      reject(error)
    })
})
