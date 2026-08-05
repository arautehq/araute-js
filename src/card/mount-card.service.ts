import { NextActionType, PaymentMethodType } from '../domain/enums'
import { ArauteErrorCode } from '../errors/araute-error.constants'
import { ArauteError } from '../errors/araute-error'
import type { ApiClient } from '../http/api-client'
import { KryptonLoader } from './krypton-loader'
import {
  KRYPTON_EXPIRED_TOKEN_ERROR_CODE,
  SMARTFORM_REFRESH_FALLBACK_MS,
  SMARTFORM_REFRESH_MARGIN_MS,
  SMARTFORM_REFRESH_MIN_DELAY_MS,
} from './krypton.constants'
import {
  KRYPTON_FIELD_CLASS_NAMES,
  PAID_ORDER_STATUS,
  KR_CLEAR_ON_ERROR_ATTRIBUTE,
  KR_CLEAR_ON_ERROR_VALUE,
  KR_FORM_TOKEN_ATTRIBUTE,
  PAYMENT_BUTTON_ARIA_LABEL,
} from './mount-card.constants'
import type {
  CardPaymentResult,
  MountCardOptions,
  MountCardTarget,
  MountedCard,
} from './mount-card.types'

export class MountCardService {
  private readonly apiClient: ApiClient
  private readonly kryptonLoader: KryptonLoader
  private refreshTimeoutId: ReturnType<typeof setTimeout> | undefined
  private visibilityHandler: (() => void) | undefined
  private refreshInFlight = false
  private unmounted = false
  private submitted = false

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient
    this.kryptonLoader = new KryptonLoader()
  }

  async mount(target: MountCardTarget, options: MountCardOptions = {}): Promise<MountedCard> {
    const container = MountCardService.resolveTarget(target)

    const confirmedView = await this.apiClient.confirm({ type: PaymentMethodType.Card })
    const nextAction = confirmedView.next_action
    if (!nextAction || nextAction.type !== NextActionType.Smartform) {
      throw new ArauteError({
        code: ArauteErrorCode.UnexpectedNextAction,
        message: 'A Araute não devolveu um formulário de cartão para este pagamento.',
      })
    }

    MountCardService.renderFields(container, nextAction.form_token)

    const { reused } = await this.kryptonLoader.load(nextAction.public_key, options)
    if (reused) await window.KR?.renderElements?.()

    this.registerSubmitHook(options)
    this.scheduleRefresh(nextAction.expires_at, options)
    this.registerExpiredTokenFallback(options)

    return { unmount: () => this.unmount() }
  }

  private static resolveTarget(target: MountCardTarget): HTMLElement {
    if (typeof document === 'undefined') {
      throw new ArauteError({
        code: ArauteErrorCode.KryptonUnavailable,
        message: 'mountCard requer um navegador (document indisponível).',
      })
    }
    const element = typeof target === 'string' ? document.querySelector(target) : target
    if (!(element instanceof HTMLElement)) {
      throw new ArauteError({
        code: ArauteErrorCode.MountTargetNotFound,
        message: `mountCard: elemento não encontrado (${
          typeof target === 'string' ? target : 'elemento inválido'
        }).`,
      })
    }
    return element
  }

  private static renderFields(container: HTMLElement, formToken: string): void {
    container.innerHTML = ''
    container.classList.add(KRYPTON_FIELD_CLASS_NAMES.container)
    container.setAttribute(KR_FORM_TOKEN_ATTRIBUTE, formToken)
    container.setAttribute(KR_CLEAR_ON_ERROR_ATTRIBUTE, KR_CLEAR_ON_ERROR_VALUE)

    const pan = document.createElement('div')
    pan.className = KRYPTON_FIELD_CLASS_NAMES.pan

    const expiry = document.createElement('div')
    expiry.className = KRYPTON_FIELD_CLASS_NAMES.expiry

    const securityCode = document.createElement('div')
    securityCode.className = KRYPTON_FIELD_CLASS_NAMES.securityCode

    const paymentButton = document.createElement('button')
    paymentButton.type = 'button'
    paymentButton.className = KRYPTON_FIELD_CLASS_NAMES.paymentButton
    paymentButton.setAttribute('aria-label', PAYMENT_BUTTON_ARIA_LABEL)

    const formError = document.createElement('div')
    formError.className = KRYPTON_FIELD_CLASS_NAMES.formError

    container.append(pan, expiry, securityCode, paymentButton, formError)
  }

  private scheduleRefresh(expiresAt: string | undefined, options: MountCardOptions): void {
    if (this.unmounted || this.submitted) return
    const dueMs = expiresAt
      ? new Date(expiresAt).getTime() - Date.now() - SMARTFORM_REFRESH_MARGIN_MS
      : SMARTFORM_REFRESH_FALLBACK_MS
    this.refreshTimeoutId = setTimeout(
      () => this.fireRefresh(options),
      Math.max(dueMs, SMARTFORM_REFRESH_MIN_DELAY_MS),
    )
  }

  private fireRefresh(options: MountCardOptions): void {
    if (this.unmounted || this.submitted) return
    if (document.visibilityState !== 'visible') {
      this.clearVisibilityHandler()
      this.visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          this.clearVisibilityHandler()
          void this.runRefresh(options)
        }
      }
      document.addEventListener('visibilitychange', this.visibilityHandler)
      return
    }
    void this.runRefresh(options)
  }

  private clearVisibilityHandler(): void {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = undefined
    }
  }

  private registerSubmitHook(options: MountCardOptions): void {
    window.KR?.onSubmit?.((event) => {
      this.markSubmitted()
      options.onResult?.(MountCardService.toResult(event))
      return false
    })
  }

  private static toResult(event: unknown): CardPaymentResult {
    const answer =
      typeof event === 'object' && event !== null
        ? (event as { clientAnswer?: { orderStatus?: unknown } }).clientAnswer
        : undefined
    const orderStatus = typeof answer?.orderStatus === 'string' ? answer.orderStatus : undefined
    return { paid: orderStatus === PAID_ORDER_STATUS, orderStatus, answer: event }
  }

  private markSubmitted(): void {
    this.submitted = true
    clearTimeout(this.refreshTimeoutId)
    this.refreshTimeoutId = undefined
    this.clearVisibilityHandler()
  }

  private async runRefresh(options: MountCardOptions): Promise<void> {
    if (this.refreshInFlight || this.unmounted || this.submitted) return
    this.refreshInFlight = true
    try {
      const view = await this.apiClient.refreshCardToken()
      const nextAction = view.next_action
      if (!nextAction || nextAction.type !== NextActionType.Smartform) return
      await window.KR?.setFormToken?.(nextAction.form_token)
      if (this.unmounted) return
      this.scheduleRefresh(nextAction.expires_at, options)
    } catch (error) {
      options.onError?.(
        error instanceof ArauteError
          ? error
          : new ArauteError({
              code: ArauteErrorCode.RefreshFailed,
              message: 'Falha ao renovar o formulário de pagamento.',
              cause: error,
            }),
      )
    } finally {
      this.refreshInFlight = false
    }
  }

  private registerExpiredTokenFallback(options: MountCardOptions): void {
    window.KR?.onError?.((error) => {
      if (error?.errorCode !== KRYPTON_EXPIRED_TOKEN_ERROR_CODE) return
      this.submitted = false
      void this.runRefresh(options)
    })
  }

  private unmount(): void {
    this.unmounted = true
    clearTimeout(this.refreshTimeoutId)
    this.clearVisibilityHandler()
    this.kryptonLoader.removeForms()
  }
}
