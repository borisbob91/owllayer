# @owllayer/core

The canonical core package for OwlLayer AI. It provides the shared client,
tool, security, voice, widget, and protocol contracts used by the Agentic UI
SDK.

## Migration from `@owllayer/core`

Install the canonical package for new integrations:

```bash
pnpm add @owllayer/core
```

The former `@owllayer/core` package remains available temporarily as a public
compatibility bridge. It is published from `packages/core-legacy` and
re-exports `@owllayer/core`; it does not contain a second protocol or runtime
implementation.

## Media audio

Audio encoding, decoding, format detection, and MIME helpers are exposed from
the isolated media subpath. They are not loaded by the root Core entrypoint:

```ts
import {
  base64EncodeAudio,
  decodeAudioToFloat32,
  detectFormatFromBase64,
  getMimeType,
} from '@owllayer/core/media/audio';
```

The local `@owllayer/audio` shim was never published and has been retired. Use
this canonical subpath for maintained integrations.

## Protocol

AITP (*Agent-to-Interface Transfer Protocol*) is the canonical public protocol used across the SDK:

```ts
import {
  AITP_VERSION,
  type AITPMessage,
  type AITPMessageMeta,
} from '@owllayer/core';
```
