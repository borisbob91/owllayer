---
"@owllayer/server": patch
---

Fixed: the admin dashboard counts a page view only when the URL changes (#129).

- Opening a modal, switching a tab or updating the context on the same page no longer adds a page view to the session history.
- The tools sent to the agent are unchanged: components still register their tools when they mount, with or without a URL change.
