import { ArauteClient } from './client/araute-client'
import type { ArauteInstance, ArauteOptions } from './client/araute-client.types'

export function Araute(clientSecret: string, options?: ArauteOptions): ArauteInstance {
  return new ArauteClient(clientSecret, options)
}

export type { ArauteInstance, ArauteOptions } from './client/araute-client.types'

export type {
  CardPaymentResult,
  MountCardCallbacks,
  MountCardOptions,
  MountCardTarget,
  MountedCard,
} from './card/mount-card.types'

export { ArauteError } from './errors/araute-error'
export { ArauteErrorCode } from './errors/araute-error.constants'
export type { ArauteErrorInit } from './errors/araute-error.types'
