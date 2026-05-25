export const emptyObject = {}

export function parseCode(code: string): { url: string; init: RequestInit } {
  let original_code = code

  code = code.trim()

  // remove await prefix
  if (code.startsWith('await')) {
    code = code.slice(5).trim()
  }

  // remove tail semicolon
  if (code.endsWith(';')) {
    code = code.slice(0, -1).trim()
  }

  // check for fetch(...) pattern
  if (!code.startsWith('fetch(') || !code.endsWith(')')) {
    throw new Error('Invalid code, expected fetch(...)')
  }
  code = code.slice(6, -1).trim()

  // parse url (string expression)
  if (!(code.startsWith('"') || code.startsWith("'"))) {
    throw new Error('Invalid code, expected string expression for url')
  }
  let string_quote = code[0]
  let start_index = 1
  let end_index = code.indexOf(string_quote, start_index)
  let url = code.slice(start_index, end_index)
  code = code.slice(end_index + 1).trim()

  // parse init option object (optional)
  let init: RequestInit = emptyObject
  if (code.startsWith(',')) {
    code = code.slice(1).trim()
    if (code !== '{}' && code !== '') {
      init = JSON.parse(code)
    }
    code = ''
  }

  if (code.length !== 0) {
    let error = new Error('Invalid code, unexpected end of string')
    Object.assign(error, {
      details: {
        url,
        init,
        code: original_code,
        rest: code,
      },
    })
    throw error
  }

  return { url, init }
}
