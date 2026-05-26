# Auth

Goal: integrate token refresh handling into api-watcher, so each endpoint can manage its own OAuth refresh automatically instead of creating a separate local Express wrapper.

- [ ] use refresh token to update the access token in header
