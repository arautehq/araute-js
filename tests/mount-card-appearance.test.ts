// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Araute } from '../src/index'

const CLIENT_SECRET = 'pi_123_secret_abc'
const FORM_URL = 'https://api.araute.dev/test/card_form/sbxform_one'
const FORM_ORIGIN = 'https://api.araute.dev'

type MountOptions = Parameters<ReturnType<typeof Araute>['mountCard']>[1]

function stubApi(nextAction: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'pi_123',
            object: 'payment_intent',
            status: 'requires_action',
            amount: 1000,
            currency: 'BRL',
            payment_method_types: ['card'],
            next_action: nextAction,
            last_payment_error: null,
            livemode: false,
          }),
          { status: 200 },
        ),
    ),
  )
}

function sendFromFrame(frame: HTMLIFrameElement, origin: string, data: unknown) {
  window.dispatchEvent(new MessageEvent('message', { origin, data, source: frame.contentWindow }))
}

describe('mountCard appearance with the test card frame', () => {
  let container: HTMLElement
  let frame: HTMLIFrameElement
  let posted: ReturnType<typeof vi.fn>

  async function mount(options: MountOptions = {}) {
    stubApi({ type: 'smartform', public_key: 'k', form_token: 't', form_url: FORM_URL })
    const card = await Araute(CLIENT_SECRET).mountCard(container, options)
    const mounted = container.querySelector('iframe')
    if (!mounted) throw new Error('no iframe')
    frame = mounted
    posted = vi.fn()
    Object.defineProperty(frame, 'contentWindow', { value: { postMessage: posted }, configurable: true })
    return card
  }

  beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
  })

  afterEach(() => {
    container.remove()
    vi.unstubAllGlobals()
  })

  it('answers the ready handshake with the configuration and reports readiness', async () => {
    const onReady = vi.fn()
    await mount({
      hidePaymentButton: true,
      appearance: { variables: { colorBorder: '#e8e8e8' } },
      placeholders: { pan: '0000' },
      onReady,
    })

    sendFromFrame(frame, FORM_ORIGIN, { type: 'araute.card_form.ready' })

    expect(posted).toHaveBeenCalledWith(
      {
        type: 'araute.card_form.configure',
        appearance: { variables: { colorBorder: '#e8e8e8' } },
        hidePaymentButton: true,
        placeholders: { pan: '0000' },
      },
      FORM_ORIGIN,
    )
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it('sets the frame height from the page and ignores unusable heights', async () => {
    await mount()

    sendFromFrame(frame, FORM_ORIGIN, { type: 'araute.card_form.resize', height: 281.4 })
    expect(frame.getAttribute('height')).toBe('282')

    sendFromFrame(frame, FORM_ORIGIN, { type: 'araute.card_form.resize', height: -5 })
    sendFromFrame(frame, FORM_ORIGIN, { type: 'araute.card_form.resize', height: '900' })
    sendFromFrame(frame, 'https://evil.example', { type: 'araute.card_form.resize', height: 900 })
    expect(frame.getAttribute('height')).toBe('282')
  })

  it('submit posts to the frame and settles once the payment result arrives', async () => {
    const onResult = vi.fn()
    const card = await mount({ onResult })
    let settled = false

    const pending = card.submit().then(() => {
      settled = true
    })
    expect(posted).toHaveBeenCalledWith({ type: 'araute.card_form.submit' }, FORM_ORIGIN)
    await Promise.resolve()
    expect(settled).toBe(false)

    sendFromFrame(frame, FORM_ORIGIN, { type: 'araute.card_form.result', paid: false })
    await pending

    expect(onResult).toHaveBeenCalledWith({ paid: false, orderStatus: undefined, answer: undefined })
  })

  it('submit settles when the form reports an invalid attempt', async () => {
    const card = await mount()
    const pending = card.submit()

    sendFromFrame(frame, FORM_ORIGIN, { type: 'araute.card_form.invalid' })

    await expect(pending).resolves.toBeUndefined()
  })

  it('submit settles when the page reloads after the attempt', async () => {
    const card = await mount()
    const pending = card.submit()

    sendFromFrame(frame, FORM_ORIGIN, { type: 'araute.card_form.ready' })

    await expect(pending).resolves.toBeUndefined()
  })

  it('submit settles when the payer enters a 3DS challenge', async () => {
    const card = await mount()
    const pending = card.submit()

    sendFromFrame(frame, FORM_ORIGIN, { type: 'araute.card_form.challenge' })

    await expect(pending).resolves.toBeUndefined()
  })

  it('unmount settles a pending submit', async () => {
    const card = await mount()
    const pending = card.submit()

    card.unmount()

    await expect(pending).resolves.toBeUndefined()
  })
})

describe('mountCard appearance with the Krypton form', () => {
  let container: HTMLElement
  let kr: {
    submit: ReturnType<typeof vi.fn>
    onSubmit: ReturnType<typeof vi.fn>
    onError: ReturnType<typeof vi.fn>
    onFormReady: ReturnType<typeof vi.fn>
    setFormConfig: ReturnType<typeof vi.fn>
    removeForms: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
    kr = {
      submit: vi.fn(async () => undefined),
      onSubmit: vi.fn(),
      onError: vi.fn(),
      onFormReady: vi.fn(),
      setFormConfig: vi.fn(async () => undefined),
      removeForms: vi.fn(),
    }
    Object.defineProperty(window, 'KR', { value: kr, configurable: true, writable: true })
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = realCreate(tag)
      if (tag === 'script') queueMicrotask(() => element.dispatchEvent(new Event('load')))
      return element
    })
    stubApi({ type: 'smartform', public_key: 'pk_live', form_token: 'tok' })
  })

  afterEach(() => {
    container.remove()
    document.head.querySelectorAll('style, script, link').forEach((node) => node.remove())
    Reflect.deleteProperty(window, 'KR')
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('injects nothing when no appearance option is given', async () => {
    await Araute(CLIENT_SECRET).mountCard(container)

    expect(document.head.querySelector('style')).toBeNull()
    expect(container.hasAttribute('data-araute-card')).toBe(false)
  })

  it('hides the payment button and styles the fields from the variables', async () => {
    await Araute(CLIENT_SECRET).mountCard(container, {
      hidePaymentButton: true,
      appearance: { variables: { colorBorderFocus: '#0e7aff', inputHeight: '54px' } },
    })

    const scope = container.getAttribute('data-araute-card')
    const css = document.head.querySelector('style')?.textContent ?? ''
    expect(css).toContain(`[data-araute-card="${scope}"] .kr-payment-button{display:none !important}`)
    expect(css).toContain('input.kr-input-field')
    expect(container.style.getPropertyValue('--araute-color-border-focus')).toBe('#0e7aff')
    expect(container.style.getPropertyValue('--araute-input-height')).toBe('54px')
  })

  it('only hides the button when hidePaymentButton is the sole option', async () => {
    await Araute(CLIENT_SECRET).mountCard(container, { hidePaymentButton: true })

    const css = document.head.querySelector('style')?.textContent ?? ''
    expect(css).toContain('.kr-payment-button{display:none !important}')
    expect(css).not.toContain('input.kr-input-field')
  })

  it('removes the injected style on unmount', async () => {
    const card = await Araute(CLIENT_SECRET).mountCard(container, { hidePaymentButton: true })

    card.unmount()

    expect(document.head.querySelector('style')).toBeNull()
  })

  it('reports readiness through KR.onFormReady', async () => {
    const onReady = vi.fn()
    await Araute(CLIENT_SECRET).mountCard(container, { onReady })

    for (const call of kr.onFormReady.mock.calls) call[0]()

    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it('submit calls KR.submit and settles when the payment answer arrives', async () => {
    const onResult = vi.fn()
    const card = await Araute(CLIENT_SECRET).mountCard(container, { onResult })
    let settled = false

    const pending = card.submit().then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(kr.submit).toHaveBeenCalledTimes(1)
    expect(settled).toBe(false)

    await kr.onSubmit.mock.calls[0]?.[0]({ clientAnswer: { orderStatus: 'PAID' } })
    await pending

    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ paid: true, orderStatus: 'PAID' }))
  })

  it('submit settles on a validation error from KR.onError', async () => {
    const card = await Araute(CLIENT_SECRET).mountCard(container)
    const pending = card.submit()

    kr.onError.mock.calls[0]?.[0]({ errorCode: 'CLIENT_300' })

    await expect(pending).resolves.toBeUndefined()
  })

  it('submit settles when KR.submit rejects', async () => {
    const card = await Araute(CLIENT_SECRET).mountCard(container)
    kr.submit.mockRejectedValueOnce(new Error('boom'))

    await expect(card.submit()).resolves.toBeUndefined()
  })
})
