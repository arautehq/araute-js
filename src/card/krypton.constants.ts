export const KRYPTON_STATIC_BASE = 'https://static.payzen.eu/static/js/krypton-client/V4.0'
export const KRYPTON_SCRIPT_SRC = `${KRYPTON_STATIC_BASE}/stable/kr-payment-form.min.js`
export const KRYPTON_THEME_RESET_CSS = `${KRYPTON_STATIC_BASE}/ext/classic-reset.css`
export const KRYPTON_THEME_SCRIPT_SRC = `${KRYPTON_STATIC_BASE}/ext/classic.js`

export const KRYPTON_DEFAULT_PAYMENT_BUTTON_LABEL = 'Confirmar pagamento'
export const KRYPTON_DEFAULT_PLACEHOLDERS = {
  pan: '1234 1234 1234 1234',
  expiryDate: 'MM/AA',
  securityCode: 'CVC',
} as const

export const KRYPTON_EXPIRED_TOKEN_ERROR_CODE = 'PSP_108'

export const SMARTFORM_REFRESH_MARGIN_MS = 120_000
export const SMARTFORM_REFRESH_FALLBACK_MS = 12 * 60_000
export const SMARTFORM_REFRESH_MIN_DELAY_MS = 1_000
