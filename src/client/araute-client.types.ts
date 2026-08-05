import type { MountCardOptions, MountCardTarget, MountedCard } from '../card/mount-card.types'

export type ArauteOptions = {
  apiBase?: string
}

export type ArauteInstance = {
  mountCard: (target: MountCardTarget, options?: MountCardOptions) => Promise<MountedCard>
  unmount: () => void
}
