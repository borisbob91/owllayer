# @owllayer/adapter-livekit

## 0.3.1

### Patch Changes

- 604b211: Security: the LiveKit adapter no longer installs vulnerable `sharp`, OpenTelemetry and `protobufjs` versions (#138).

  - `@livekit/agents` and `@livekit/agents-plugin-google` 1.9.0 (were 1.5.0), `@livekit/rtc-node` 0.13.35.
  - Brings `sharp` 0.35.4 (libvips and libheif fixes) and OpenTelemetry 2.8+.

- Updated dependencies [6da45e1]
- Updated dependencies [3a3a4bc]
- Updated dependencies [5585c15]
- Updated dependencies [21f1410]
  - @owllayer/core@0.5.0

## 0.3.0

### Minor Changes

- d48199c: Restore i18n support for LiveKit adapter with complete translation catalog integration

### Patch Changes

- d5b4ecf: Exclure les source maps (`.map`) des tarballs npm publies via le champ `files`, et verifier l'absence de `.map` dans `verify-packages`.
- Updated dependencies [d5b4ecf]
- Updated dependencies [dc67452]
  - @owllayer/core@0.4.0

## 0.2.0

### Minor Changes

- 6a9a96b: Migrate adapters to the canonical `@owllayer/*` naming as part of the final pre-publication cutover.

### Patch Changes

- Updated dependencies [1ee6cff]
  - @owllayer/core@0.3.0

## 0.1.2

### Patch Changes

- 61238a9: Migrate the LiveKit adapter's internal PCM utility dependency from the standalone
  `@owllayer/audio` workspace to `@owllayer/core/media/audio`.

## 0.1.1

### Patch Changes

- Updated dependencies [c5a7134]
- Updated dependencies [17d76b3]
  - @owllayer/audio@0.1.1
  - @owllayer/core@0.1.1
