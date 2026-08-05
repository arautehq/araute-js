import type { ArauteErrorCode } from './araute-error.constants'

export type ArauteErrorInit = {
  code: ArauteErrorCode
  message: string
  status?: number
  traceId?: string
  cause?: unknown
}
