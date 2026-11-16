import type { ArauteError } from '../errors/araute-error'

export type MountCardTarget = string | HTMLElement

export type CardPaymentResult = {
  paid: boolean
  orderStatus: string | undefined
  answer: unknown
}

export type CardAppearanceVariableName =
  | 'fontFamily'
  | 'fontSize'
  | 'colorText'
  | 'colorTextPlaceholder'
  | 'colorBackground'
  | 'colorBorder'
  | 'colorBorderFocus'
  | 'colorDanger'
  | 'borderRadius'
  | 'inputHeight'
  | 'colorPrimary'
  | 'colorPrimaryText'

export type CardAppearance = {
  variables?: Partial<Record<CardAppearanceVariableName, string>>
}

export type MountCardCallbacks = {
  onResult?: (result: CardPaymentResult) => void
  onError?: (error: ArauteError) => void
  onReady?: () => void
}

export type MountCardOptions = MountCardCallbacks & {
  scriptSrc?: string
  paymentButtonLabel?: string
  placeholders?: Partial<{ pan: string; expiryDate: string; securityCode: string }>
  theme?: 'classic' | 'none'
  hidePaymentButton?: boolean
  appearance?: CardAppearance
}

export type MountedCard = {
  unmount: () => void
  submit: () => Promise<void>
}
