---
"@owllayer/server": patch
---

Security: approvals and tool results are now accepted only from the session that received the request, and `untrusted` plugins are really confined (#169).

- An approval response, a tool result or an approval timeout extension from another session or connection is ignored. Tool call ids are full UUIDs, and pending approvals are purged when their session closes.
- `untrusted` plugin tool handlers run in a separate Node.js process with the Node permission model: no filesystem, child process, worker or native addon access unless declared in the plugin capabilities. Network is not restricted yet, and the plugin module and its `setup()` still run in the server process.
- WebRTC signaling ignores connection ids sent by the client, caps the request body at 64 KB and checks the origin and API key before creating a peer connection.
