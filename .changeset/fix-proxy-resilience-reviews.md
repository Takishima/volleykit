---
'volleykit-web': patch
---

Fix proxy resilience review issues: revert to NetworkFirst caching strategy with 3s timeout, add TTL-based rotation back to primary proxy, call reportProxySuccess on failover retry, remove opaque response caching, migrate all consumers to dynamic getApiBaseUrl()
