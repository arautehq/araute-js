import { ArauteErrorCode } from '../errors/araute-error.constants'
import { ArauteError } from '../errors/araute-error'
import {
  CLIENT_SECRET_TOKEN_MARKER,
  CONFIRM_IDEMPOTENCY_SCOPE,
  DEFAULT_API_BASE,
  PAYMENT_INTENTS_PATH,
  PAYMENT_INTENT_ID_PREFIX,
} from './api-client.constants'
import type {
  ConfirmPaymentMethodData,
  PaymentIntentPublicView,
  ProblemJson,
} from './api-client.types'

type HttpMethod = 'GET' | 'POST'

export class ApiClient {
  readonly #apiBase: string
  readonly #clientSecret: string
  readonly #intentId: string
  readonly #idempotencyKeys = new Map<string, string>()

  constructor(clientSecret: string, apiBase: string = DEFAULT_API_BASE) {
    this.#clientSecret = clientSecret
    this.#apiBase = apiBase.replace(/\/+$/, '')
    this.#intentId = ApiClient.parseIntentId(clientSecret)
  }

  async confirm(
    paymentMethodData: ConfirmPaymentMethodData,
  ): Promise<PaymentIntentPublicView> {
    return this.request(
      'POST',
      `${PAYMENT_INTENTS_PATH}/${this.#intentId}/confirm`,
      { payment_method_data: paymentMethodData },
      { idempotencyScope: `${CONFIRM_IDEMPOTENCY_SCOPE}:${paymentMethodData.type}` },
    )
  }

  async refreshCardToken(): Promise<PaymentIntentPublicView> {
    return this.request(
      'POST',
      `${PAYMENT_INTENTS_PATH}/${this.#intentId}/refresh_card_token`,
      undefined,
      { idempotencyScope: null },
    )
  }

  private async request(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options: { idempotencyScope?: string | null } = {},
  ): Promise<PaymentIntentPublicView> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.#clientSecret}`,
    }
    if (body !== undefined) headers['content-type'] = 'application/json'
    if (options.idempotencyScope !== undefined) {
      headers['Idempotency-Key'] = this.idempotencyKeyFor(options.idempotencyScope)
    }

    let response: Response
    try {
      response = await fetch(`${this.#apiBase}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      })
    } catch (cause) {
      throw new ArauteError({
        code: ArauteErrorCode.NetworkError,
        message: 'Falha de rede ao falar com a Araute.',
        cause,
      })
    }

    if (!response.ok) throw await ApiClient.toArauteError(response)
    return (await response.json()) as PaymentIntentPublicView
  }

  private idempotencyKeyFor(scope: string | null): string {
    if (scope === null) return ApiClient.generateIdempotencyKey()
    const cached = this.#idempotencyKeys.get(scope)
    if (cached !== undefined) return cached
    const key = ApiClient.generateIdempotencyKey()
    this.#idempotencyKeys.set(scope, key)
    return key
  }

  private static parseIntentId(clientSecret: string): string {
    const markerIndex = clientSecret.indexOf(CLIENT_SECRET_TOKEN_MARKER)
    const id = markerIndex > 0 ? clientSecret.slice(0, markerIndex) : ''
    if (!id.startsWith(PAYMENT_INTENT_ID_PREFIX)) {
      throw new ArauteError({
        code: ArauteErrorCode.InvalidClientSecret,
        message:
          'client_secret inválido: formato esperado pi_<id>_secret_<token>.',
      })
    }
    return id
  }

  private static async toArauteError(response: Response): Promise<ArauteError> {
    const problem = (await response.json().catch(() => null)) as ProblemJson | null
    return new ArauteError({
      code: ArauteErrorCode.ApiError,
      message: problem?.detail ?? problem?.title ?? `Erro ${response.status} na Araute.`,
      status: response.status,
      traceId: problem?.trace_id,
    })
  }

  private static generateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = (Math.random() * 16) | 0
      const value = char === 'x' ? random : (random & 0x3) | 0x8
      return value.toString(16)
    })
  }
}
