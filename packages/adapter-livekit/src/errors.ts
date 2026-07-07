export type LiveKitAdapterErrorCode =
  | 'LIVEKIT_ADAPTER_ERROR'
  | 'LIVEKIT_CONFIGURATION_ERROR'
  | 'MISSING_LIVEKIT_URL'
  | 'MISSING_LIVEKIT_API_KEY'
  | 'MISSING_LIVEKIT_API_SECRET'
  | 'INVALID_LIVEKIT_URL'
  | 'LIVEKIT_RUNTIME_NOT_IMPLEMENTED';

export interface LiveKitAdapterErrorOptions {
  cause?: unknown;
  provider?: string;
  statusCode?: number;
}

export class LiveKitAdapterError extends Error {
  readonly code: LiveKitAdapterErrorCode;
  readonly provider?: string;
  readonly statusCode?: number;

  constructor(
    message: string,
    code: LiveKitAdapterErrorCode = 'LIVEKIT_ADAPTER_ERROR',
    options: LiveKitAdapterErrorOptions = {}
  ) {
    super(message);
    this.name = 'LiveKitAdapterError';
    this.code = code;
    this.provider = options.provider;
    this.statusCode = options.statusCode;

    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export class LiveKitConfigurationError extends LiveKitAdapterError {
  constructor(
    message: string,
    code: LiveKitAdapterErrorCode = 'LIVEKIT_CONFIGURATION_ERROR',
    options: LiveKitAdapterErrorOptions = {}
  ) {
    super(message, code, options);
    this.name = 'LiveKitConfigurationError';
  }
}
