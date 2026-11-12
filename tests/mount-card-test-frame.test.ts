// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Araute } from '../src/index'

const CLIENT_SECRET = 'pi_123_secret_abc'
const FORM_URL = 'https://api.araute.dev/test/card_form/sbxform_one'
const FORM_ORIGIN = 'https://api.araute.dev'

function view(nextAction: Record<string, unknown>) {
  return {
    id: 'pi_123',
    object: 'payment_intent',
    status: 'requires_action',
    amount: 1000,
    currency: 'BRL',
    payment_method_types: ['card'],
    next_action: nextAction,
    last_payment_error: null,
    livemode: false,
  }
}

function stubApi(replies: Record<string, unknown>[]) {
  const calls: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      calls.push(input)
      const next = replies.shift()
      return new Response(JSON.stringify(view(next ?? {})), { status: 200 })
    }),
  )
  return calls
}

function sendFromFrame(frame: HTMLIFrameElement, origin: string, data: unknown) {
  window.dispatchEvent(
    new MessageEvent('message', { origin, data, source: frame.contentWindow }),
  )
}

describe('mountCard with a test card form url', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
  })

  afterEach(() => {
    container.remove()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('mounts an iframe on the form url instead of loading Krypton', async () => {
    stubApi([{ type: 'smartform', public_key: 'araute_test', form_token: 't', form_url: FORM_URL }])

    await Araute(CLIENT_SECRET).mountCard(container)

    const frame = container.querySelector('iframe')
    expect(frame?.getAttribute('src')).toBe(FORM_URL)
    expect(document.querySelector('script[src*="payzen"]')).toBeNull()
  })

  it('reports the paid result from the frame origin', async () => {
    stubApi([{ type: 'smartform', public_key: 'araute_test', form_token: 't', form_url: FORM_URL }])
    const onResult = vi.fn()
    await Araute(CLIENT_SECRET).mountCard(container, { onResult })
    const frame = container.querySelector('iframe')
    if (!frame) throw new Error('no iframe')

    sendFromFrame(frame, FORM_ORIGIN, {
      type: 'araute.card_form.result',
      paid: true,
      orderStatus: 'PAID',
      answer: { orderStatus: 'PAID' },
    })

    expect(onResult).toHaveBeenCalledWith({
      paid: true,
      orderStatus: 'PAID',
      answer: { orderStatus: 'PAID' },
    })
  })

  it('ignores a message from another origin or of another type', async () => {
    stubApi([{ type: 'smartform', public_key: 'araute_test', form_token: 't', form_url: FORM_URL }])
    const onResult = vi.fn()
    await Araute(CLIENT_SECRET).mountCard(container, { onResult })
    const frame = container.querySelector('iframe')
    if (!frame) throw new Error('no iframe')

    sendFromFrame(frame, 'https://evil.example', { type: 'araute.card_form.result', paid: true })
    sendFromFrame(frame, FORM_ORIGIN, { type: 'something.else', paid: true })

    expect(onResult).not.toHaveBeenCalled()
  })

  it('never turns a non-true paid into true', async () => {
    stubApi([{ type: 'smartform', public_key: 'araute_test', form_token: 't', form_url: FORM_URL }])
    const onResult = vi.fn()
    await Araute(CLIENT_SECRET).mountCard(container, { onResult })
    const frame = container.querySelector('iframe')
    if (!frame) throw new Error('no iframe')

    sendFromFrame(frame, FORM_ORIGIN, {
      type: 'araute.card_form.result',
      paid: 'true',
      orderStatus: 'UNPAID',
    })
    sendFromFrame(frame, FORM_ORIGIN, { type: 'araute.card_form.result', paid: false })

    expect(onResult.mock.calls.map((call) => call[0].paid)).toEqual([false, false])
  })

  it('swaps the frame src on refresh when nothing was submitted', async () => {
    vi.useFakeTimers()
    const secondUrl = 'https://api.araute.dev/test/card_form/sbxform_two'
    const calls = stubApi([
      {
        type: 'smartform',
        public_key: 'araute_test',
        form_token: 't1',
        form_url: FORM_URL,
        expires_at: new Date(Date.now() + 130_000).toISOString(),
      },
      { type: 'smartform', public_key: 'araute_test', form_token: 't2', form_url: secondUrl },
    ])
    await Araute(CLIENT_SECRET).mountCard(container)

    await vi.advanceTimersByTimeAsync(20_000)

    expect(calls[1]).toContain('/refresh_card_token')
    expect(container.querySelector('iframe')?.getAttribute('src')).toBe(secondUrl)
  })

  it('unmount removes the iframe and the message listener', async () => {
    stubApi([{ type: 'smartform', public_key: 'araute_test', form_token: 't', form_url: FORM_URL }])
    const onResult = vi.fn()
    const mounted = await Araute(CLIENT_SECRET).mountCard(container, { onResult })
    const frame = container.querySelector('iframe')
    if (!frame) throw new Error('no iframe')

    mounted.unmount()
    sendFromFrame(frame, FORM_ORIGIN, { type: 'araute.card_form.result', paid: true })

    expect(container.querySelector('iframe')).toBeNull()
    expect(onResult).not.toHaveBeenCalled()
  })

  it('keeps the Krypton path when the smartform carries no form url', async () => {
    stubApi([{ type: 'smartform', public_key: 'pk_live', form_token: 'tok' }])
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tag)
      if (tag === 'script') queueMicrotask(() => element.dispatchEvent(new Event('load')))
      return element
    })

    await Araute(CLIENT_SECRET).mountCard(container).catch(() => undefined)

    expect(container.querySelector('iframe')).toBeNull()
    expect(container.getAttribute('kr-form-token')).toBe('tok')
  })
})
