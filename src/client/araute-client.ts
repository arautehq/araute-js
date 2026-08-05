import { MountCardService } from '../card/mount-card.service'
import type { MountCardOptions, MountCardTarget, MountedCard } from '../card/mount-card.types'
import { ApiClient } from '../http/api-client'
import type { ArauteInstance, ArauteOptions } from './araute-client.types'

export class ArauteClient implements ArauteInstance {
  readonly #apiClient: ApiClient
  readonly #mountedCards: MountedCard[] = []

  constructor(clientSecret: string, options: ArauteOptions = {}) {
    this.#apiClient = new ApiClient(clientSecret, options.apiBase)
  }

  mountCard = async (
    target: MountCardTarget,
    options: MountCardOptions = {},
  ): Promise<MountedCard> => {
    const apiClient = this.#apiClient
    const mountCardService = new MountCardService(apiClient)
    const mounted = await mountCardService.mount(target, options)
    this.#mountedCards.push(mounted)
    return mounted
  }

  unmount = (): void => {
    for (const mounted of this.#mountedCards) mounted.unmount()
    this.#mountedCards.length = 0
  }
}
