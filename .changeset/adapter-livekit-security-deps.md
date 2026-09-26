---
"@owllayer/adapter-livekit": patch
---

Security: the LiveKit adapter no longer installs vulnerable `sharp`, OpenTelemetry and `protobufjs` versions (#138).

- `@livekit/agents` and `@livekit/agents-plugin-google` 1.9.0 (were 1.5.0), `@livekit/rtc-node` 0.13.35.
- Brings `sharp` 0.35.4 (libvips and libheif fixes) and OpenTelemetry 2.8+.
