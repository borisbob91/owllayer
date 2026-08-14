# @owllayer/core

The canonical core package for OwlLayer AI. It provides the shared client,
tool, security, voice, widget, and protocol contracts used by the Agentic UI
SDK.

## Migration from `@domos/core`

Install the canonical package for new integrations:

```bash
pnpm add @owllayer/core
```

The former `@domos/core` package remains available temporarily as a public
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

`@domos/audio` remains temporarily available as a compatibility shim that
re-exports this canonical subpath.

## Protocol compatibility

The existing ADTP protocol files, message semantics, wire behavior, and public
ADTP exports remain unchanged. AITP is the canonical public terminology, with
these additive aliases available from `@owllayer/core`:

```ts
import {
  ADTP_VERSION,
  AITP_VERSION,
  type ADTPMessage,
  type AITPMessage,
} from '@owllayer/core';
```

`AITP_VERSION`, `AITPMessage`, and `AITPMessageMeta` are compatible with their
ADTP counterparts. The ADTP names remain available during the migration.
