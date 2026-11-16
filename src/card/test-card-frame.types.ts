import type { CardAppearance, CardPaymentResult } from './mount-card.types'

export type TestCardFrameConfig = {
  appearance: CardAppearance | undefined
  hidePaymentButton: boolean
  placeholders: Partial<{ pan: string; expiryDate: string; securityCode: string }> | undefined
}

export type TestCardFrameHandlers = {
  onResult: (result: CardPaymentResult) => void
  onChallenge: () => void
  onReady: () => void
}
