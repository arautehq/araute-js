declare global {
  interface Window {
    KR?: {
      removeForms?: () => void
      onFormReady?: (cb: () => void) => void
      button?: { setLabel?: (label: string) => void }
      setFormConfig?: (config: Record<string, unknown>) => Promise<unknown>
      setFormToken?: (formToken: string) => Promise<unknown> | undefined
      renderElements?: (selector?: string) => Promise<unknown> | undefined
      onError?: (cb: (error: { errorCode?: string }) => void) => void
      onSubmit?: (cb: (event: unknown) => boolean | Promise<boolean>) => void
    }
  }
}

export type KryptonLoadOptions = {
  scriptSrc?: string
  paymentButtonLabel?: string
  placeholders?: Partial<{ pan: string; expiryDate: string; securityCode: string }>
  theme?: 'classic' | 'none'
}

export type KryptonLoadResult = {
  reused: boolean
}
