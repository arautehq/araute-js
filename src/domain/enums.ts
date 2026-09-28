export const PaymentIntentStatus = {
  RequiresPaymentMethod: 'requires_payment_method',
  RequiresConfirmation: 'requires_confirmation',
  RequiresAction: 'requires_action',
  RequiresCapture: 'requires_capture',
  Processing: 'processing',
  Succeeded: 'succeeded',
  Cancelled: 'cancelled',
  Expired: 'expired',
} as const
export type PaymentIntentStatus =
  (typeof PaymentIntentStatus)[keyof typeof PaymentIntentStatus]

export const NextActionType = {
  PixDisplayQrCode: 'pix_display_qr_code',
  Smartform: 'smartform',
  ThreeDSecure: 'three_d_secure',
  RedirectToUrl: 'redirect_to_url',
  BoletoDisplayDetails: 'boleto_display_details',
} as const
export type NextActionType = (typeof NextActionType)[keyof typeof NextActionType]

export const PaymentMethodType = {
  Pix: 'pix',
  Card: 'card',
  Boleto: 'boleto',
} as const
export type PaymentMethodType =
  (typeof PaymentMethodType)[keyof typeof PaymentMethodType]
