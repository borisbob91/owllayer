---
"@owllayer/adapter-google": patch
---

Security: the Google adapter no longer installs a vulnerable `protobufjs` (#137).

- `@google/genai` 1.52 minimum.
- Lockfile refresh: `protobufjs` 7.6.6 (fixes a critical arbitrary code execution), `minimatch` and `brace-expansion` patched versions.
