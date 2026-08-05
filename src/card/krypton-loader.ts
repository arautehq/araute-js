import { ArauteErrorCode } from '../errors/araute-error.constants'
import { ArauteError } from '../errors/araute-error'
import {
  KRYPTON_DEFAULT_PAYMENT_BUTTON_LABEL,
  KRYPTON_DEFAULT_PLACEHOLDERS,
  KRYPTON_SCRIPT_SRC,
  KRYPTON_THEME_RESET_CSS,
  KRYPTON_THEME_SCRIPT_SRC,
} from './krypton.constants'
import type { KryptonLoadOptions, KryptonLoadResult } from './krypton-loader.types'

let shared: { publicKey: string; loading: Promise<void> } | null = null

export class KryptonLoader {
  async load(publicKey: string, options: KryptonLoadOptions = {}): Promise<KryptonLoadResult> {
    const current = shared
    if (current && current.publicKey === publicKey) {
      await current.loading
      return { reused: true }
    }

    if (current) {
      throw new ArauteError({
        code: ArauteErrorCode.KryptonUnavailable,
        message:
          'Já existe um formulário de cartão carregado nesta página para outra chave pública.',
      })
    }

    const loading = new Promise<void>((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(
          new ArauteError({
            code: ArauteErrorCode.KryptonUnavailable,
            message: 'mountCard requer um navegador (document indisponível).',
          }),
        )
        return
      }

      if (options.theme !== 'none') KryptonLoader.injectTheme()

      const script = document.createElement('script')
      script.src = options.scriptSrc ?? KRYPTON_SCRIPT_SRC
      script.async = false
      script.setAttribute('kr-public-key', publicKey)
      script.setAttribute('kr-hide-debug-toolbar', 'true')
      script.onload = () => {
        window.KR?.setFormConfig?.({
          placeholders: { ...KRYPTON_DEFAULT_PLACEHOLDERS, ...options.placeholders },
          clearOnError: false,
        })
        window.KR?.onFormReady?.(() => {
          window.KR?.button?.setLabel?.(
            options.paymentButtonLabel ?? KRYPTON_DEFAULT_PAYMENT_BUTTON_LABEL,
          )
        })
        resolve()
      }
      script.onerror = () => {
        shared = null
        reject(
          new ArauteError({
            code: ArauteErrorCode.KryptonLoadFailed,
            message: 'Falha ao carregar o formulário de cartão.',
          }),
        )
      }
      document.head.appendChild(script)
    })

    shared = { publicKey, loading }
    await loading
    return { reused: false }
  }

  removeForms(): void {
    window.KR?.removeForms?.()
  }

  private static injectTheme(): void {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = KRYPTON_THEME_RESET_CSS
    document.head.appendChild(link)

    const theme = document.createElement('script')
    theme.src = KRYPTON_THEME_SCRIPT_SRC
    theme.async = false
    document.head.appendChild(theme)
  }
}
