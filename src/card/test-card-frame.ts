import {
  TEST_CARD_FRAME_CHALLENGE_MESSAGE_TYPE,
  TEST_CARD_FRAME_CONFIGURE_MESSAGE_TYPE,
  TEST_CARD_FRAME_INITIAL_HEIGHT,
  TEST_CARD_FRAME_INVALID_MESSAGE_TYPE,
  TEST_CARD_FRAME_READY_MESSAGE_TYPE,
  TEST_CARD_FRAME_RESIZE_MESSAGE_TYPE,
  TEST_CARD_FRAME_RESULT_MESSAGE_TYPE,
  TEST_CARD_FRAME_SUBMIT_MESSAGE_TYPE,
  TEST_CARD_FRAME_TITLE,
} from './test-card-frame.constants'
import type { TestCardFrameConfig, TestCardFrameHandlers } from './test-card-frame.types'

// Test-mode replacement for the Krypton form: the Araute API serves its own card form at form_url,
// and reports the outcome back by postMessage. `paid` is UX only; the truth is the webhook / the
// PaymentIntent GET. A refused card is reported as a result too, but the form stays open for another try.
export class TestCardFrame {
  private readonly iframe: HTMLIFrameElement
  private readonly listener: (event: MessageEvent) => void
  private expectedOrigin: string
  private settleSubmit: (() => void) | undefined

  constructor(
    container: HTMLElement,
    formUrl: string,
    config: TestCardFrameConfig,
    handlers: TestCardFrameHandlers,
  ) {
    this.expectedOrigin = new URL(formUrl).origin
    this.iframe = document.createElement('iframe')
    this.iframe.title = TEST_CARD_FRAME_TITLE
    this.iframe.src = formUrl
    this.iframe.width = '100%'
    this.iframe.height = TEST_CARD_FRAME_INITIAL_HEIGHT
    this.iframe.style.border = '0'
    container.innerHTML = ''
    container.append(this.iframe)

    this.listener = (event) => {
      if (event.origin !== this.expectedOrigin) return
      if (event.source !== this.iframe.contentWindow) return
      const data: unknown = event.data
      if (typeof data !== 'object' || data === null) return
      const type = Reflect.get(data, 'type')
      if (type === TEST_CARD_FRAME_READY_MESSAGE_TYPE) {
        this.post({ type: TEST_CARD_FRAME_CONFIGURE_MESSAGE_TYPE, ...config })
        // A page that reloads after a submit has ended that attempt (invalid card or next step).
        this.finishSubmit()
        handlers.onReady()
        return
      }
      if (type === TEST_CARD_FRAME_RESIZE_MESSAGE_TYPE) {
        const height = Reflect.get(data, 'height')
        if (typeof height === 'number' && Number.isFinite(height) && height > 0) {
          this.iframe.height = String(Math.ceil(height))
        }
        return
      }
      if (type === TEST_CARD_FRAME_INVALID_MESSAGE_TYPE) {
        this.finishSubmit()
        return
      }
      if (type === TEST_CARD_FRAME_CHALLENGE_MESSAGE_TYPE) {
        this.finishSubmit()
        handlers.onChallenge()
        return
      }
      if (type !== TEST_CARD_FRAME_RESULT_MESSAGE_TYPE) return
      const orderStatus = Reflect.get(data, 'orderStatus')
      this.finishSubmit()
      handlers.onResult({
        paid: Reflect.get(data, 'paid') === true,
        orderStatus: typeof orderStatus === 'string' ? orderStatus : undefined,
        answer: Reflect.get(data, 'answer'),
      })
    }
    window.addEventListener('message', this.listener)
  }

  submit(): Promise<void> {
    this.finishSubmit()
    return new Promise((resolve) => {
      this.settleSubmit = resolve
      this.post({ type: TEST_CARD_FRAME_SUBMIT_MESSAGE_TYPE })
    })
  }

  setUrl(formUrl: string): void {
    this.expectedOrigin = new URL(formUrl).origin
    this.iframe.src = formUrl
  }

  destroy(): void {
    window.removeEventListener('message', this.listener)
    this.finishSubmit()
    this.iframe.remove()
  }

  private post(message: Record<string, unknown>): void {
    this.iframe.contentWindow?.postMessage(message, this.expectedOrigin)
  }

  private finishSubmit(): void {
    this.settleSubmit?.()
    this.settleSubmit = undefined
  }
}
