import type { NextActionType, PaymentIntentStatus, PaymentMethodType } from '../domain/enums'

export type PaymentIntentLastPaymentError = {
  code: string
  decline_code?: string
  message: string
} | null

export type PixDisplayQrCodeNextAction = {
  type: typeof NextActionType.PixDisplayQrCode
  qr_code: string
  qr_code_url?: string
  expires_at?: string
}

export type SmartformNextAction = {
  type: typeof NextActionType.Smartform
  public_key: string
  form_token: string
  expires_at?: string
}

export type ThreeDSecureNextAction = {
  type: typeof NextActionType.ThreeDSecure
  operation_session_id: string
  operation_url: string
  public_key: string
}

export type RedirectToUrlNextAction = {
  type: typeof NextActionType.RedirectToUrl
  url: string
}

export type PaymentIntentNextAction =
  | PixDisplayQrCodeNextAction
  | SmartformNextAction
  | ThreeDSecureNextAction
  | RedirectToUrlNextAction
  | null

export type PaymentIntentPublicView = {
  id: string
  object: 'payment_intent'
  status: PaymentIntentStatus
  amount: number
  currency: string
  payment_method_types: PaymentMethodType[]
  next_action: PaymentIntentNextAction
  last_payment_error: PaymentIntentLastPaymentError
  livemode: boolean
}

export type ConfirmPaymentMethodData =
  | { type: typeof PaymentMethodType.Pix }
  | { type: typeof PaymentMethodType.Card }

export type ProblemJson = {
  code?: string
  detail?: string
  title?: string
  trace_id?: string
}
