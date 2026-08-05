import type { ArauteErrorCode } from './araute-error.constants'
import type { ArauteErrorInit } from './araute-error.types'

export class ArauteError extends Error {
  readonly code: ArauteErrorCode
  readonly status?: number
  readonly traceId?: string
  readonly cause?: unknown

  constructor(init: ArauteErrorInit) {
    super(init.message)
    this.name = 'ArauteError'
    this.code = init.code
    this.status = init.status
    this.traceId = init.traceId
    this.cause = init.cause
  }
}
