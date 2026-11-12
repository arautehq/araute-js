import type { CardPaymentResult } from './mount-card.types'
import {
  TEST_CARD_FRAME_HEIGHT,
  TEST_CARD_FRAME_RESULT_MESSAGE_TYPE,
  TEST_CARD_FRAME_TITLE,
} from './test-card-frame.constants'

// Test-mode replacement for the Krypton form: the Araute API serves its own card form at form_url,
// and reports the outcome back by postMessage. `paid` is UX only; the truth is the webhook / the
// PaymentIntent GET.
export class TestCardFrame {
  private readonly iframe: HTMLIFrameElement
  private readonly listener: (event: MessageEvent) => void
  private expectedOrigin: string

  constructor(
    container: HTMLElement,
    formUrl: string,
    onResult: (result: CardPaymentResult) => void,
  ) {
    this.expectedOrigin = new URL(formUrl).origin
    this.iframe = document.createElement('iframe')
    this.iframe.title = TEST_CARD_FRAME_TITLE
    this.iframe.src = formUrl
    this.iframe.width = '100%'
    this.iframe.height = TEST_CARD_FRAME_HEIGHT
    this.iframe.style.border = '0'
    container.innerHTML = ''
    container.append(this.iframe)

    this.listener = (event) => {
      if (event.origin !== this.expectedOrigin) return
      if (event.source !== this.iframe.contentWindow) return
      const data: unknown = event.data
      if (typeof data !== 'object' || data === null) return
      if (Reflect.get(data, 'type') !== TEST_CARD_FRAME_RESULT_MESSAGE_TYPE) return
      const orderStatus = Reflect.get(data, 'orderStatus')
      onResult({
        paid: Reflect.get(data, 'paid') === true,
        orderStatus: typeof orderStatus === 'string' ? orderStatus : undefined,
        answer: Reflect.get(data, 'answer'),
      })
    }
    window.addEventListener('message', this.listener)
  }

  setUrl(formUrl: string): void {
    this.expectedOrigin = new URL(formUrl).origin
    this.iframe.src = formUrl
  }

  destroy(): void {
    window.removeEventListener('message', this.listener)
    this.iframe.remove()
  }
}
