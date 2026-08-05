import type { ArauteError } from '../errors/araute-error'

export type MountCardTarget = string | HTMLElement

export type CardPaymentResult = {
  paid: boolean
  orderStatus: string | undefined
  answer: unknown
}

export type MountCardCallbacks = {
  onResult?: (result: CardPaymentResult) => void
  onError?: (error: ArauteError) => void
}

export type MountCardOptions = MountCardCallbacks & {
  scriptSrc?: string
  paymentButtonLabel?: string
  placeholders?: Partial<{ pan: string; expiryDate: string; securityCode: string }>
  theme?: 'classic' | 'none'
}

export type MountedCard = {
  unmount: () => void
}
