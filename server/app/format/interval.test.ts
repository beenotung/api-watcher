import { expect } from 'chai'
import { formatInterval, parseInterval } from './interval.js'

describe('parseInterval', () => {
  it('should treat unitless input as milliseconds', () => {
    expect(parseInterval('1500')).to.equal(1500)
    expect(parseInterval('250')).to.equal(250)
  })

  it('should parse all supported units', () => {
    expect(parseInterval('500ms')).to.equal(500)
    expect(parseInterval('45s')).to.equal(45 * 1000)
    expect(parseInterval('30m')).to.equal(30 * 60 * 1000)
    expect(parseInterval('1.5h')).to.equal(1.5 * 60 * 60 * 1000)
    expect(parseInterval('2d')).to.equal(2 * 24 * 60 * 60 * 1000)
    expect(parseInterval('1w')).to.equal(7 * 24 * 60 * 60 * 1000)
    expect(parseInterval('1mo')).to.equal(30 * 24 * 60 * 60 * 1000)
  })

  it('should be case-insensitive and trim spaces', () => {
    expect(parseInterval(' 30M ')).to.equal(30 * 60 * 1000)
    expect(parseInterval('10 Mo')).to.equal(300 * 24 * 60 * 60 * 1000)
    expect(parseInterval('500 MS')).to.equal(500)
  })

  it('should reject invalid or non-positive values', () => {
    for (let text of [
      '',
      '   ',
      'abc',
      '30x',
      '0',
      '0s',
      '-5m',
      '-300000',
      'Infinity',
      'NaN',
    ]) {
      expect(() => parseInterval(text), JSON.stringify(text)).to.throw()
    }
  })
})

describe('formatInterval', () => {
  it('should format with the largest fitting unit', () => {
    expect(formatInterval(500)).to.equal('500ms')
    expect(formatInterval(45 * 1000)).to.equal('45s')
    expect(formatInterval(30 * 60 * 1000)).to.equal('30m')
    expect(formatInterval(90 * 60 * 1000)).to.equal('1.5h')
    expect(formatInterval(2 * 24 * 60 * 60 * 1000)).to.equal('2d')
  })

  it('should round-trip through parseInterval', () => {
    for (let duration_ms of [
      500,
      1500,
      45 * 1000,
      30 * 60 * 1000,
      90 * 60 * 1000,
      2 * 24 * 60 * 60 * 1000,
      7 * 24 * 60 * 60 * 1000,
      30 * 24 * 60 * 60 * 1000,
    ]) {
      expect(parseInterval(formatInterval(duration_ms))).to.equal(duration_ms)
    }
  })
})
