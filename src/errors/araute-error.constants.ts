export const ArauteErrorCode = {
  InvalidClientSecret: 'invalid_client_secret',
  MountTargetNotFound: 'mount_target_not_found',
  NetworkError: 'network_error',
  ApiError: 'api_error',
  KryptonLoadFailed: 'krypton_load_failed',
  KryptonUnavailable: 'krypton_unavailable',
  RefreshFailed: 'refresh_failed',
  UnexpectedNextAction: 'unexpected_next_action',
  PaymentFailed: 'payment_failed',
} as const
export type ArauteErrorCode =
  (typeof ArauteErrorCode)[keyof typeof ArauteErrorCode]
