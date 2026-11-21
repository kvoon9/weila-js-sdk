# SDK integration tests

These tests drive the built `dist/weilasdk.mjs` directly in headless Chromium, with no UI. They log in to the real backend with a test account, wait for the account data to sync, and exercise the public `WeilaCore` API.

The suite skips itself when the environment is not configured, so CI stays green. To run it, copy `.env.example` to `.env.integration` and fill in the values. `.env.integration` is ignored by git.

## Environment

| Variable                  | Meaning                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `WEILA_TEST_ACCOUNT`      | Test account number                                                                                            |
| `WEILA_TEST_PASSWORD`     | The password the SDK sends. This is the account's stored SDK password, not necessarily the web login password. |
| `WEILA_TEST_APP_ID`       | SDK application id                                                                                             |
| `WEILA_TEST_APP_KEY`      | SDK application key                                                                                            |
| `WEILA_TEST_WSS`          | WebSocket address, defaults to `wss://api.voischat.cn/voischat/bridge`                                         |
| `WEILA_TEST_COUNTRY_CODE` | Account country code, defaults to `0`                                                                          |
| `WEILA_TEST_MD5`          | `true` if the SDK should MD5 the password before sending, defaults to `false`                                  |
| `WEILA_TEST_SESSION_ID`   | Optional target session id. Defaults to the first session the account exposes.                                 |
| `WEILA_TEST_SESSION_TYPE` | Optional target session type, used with `WEILA_TEST_SESSION_ID`                                                |

### Where the SDK password comes from

The web console signs in through its own `/corp/auth/login` API. The response carries `data.account.password`, the stored SDK password, and `data.account.country_code`. The console then passes those values to `weila_login` with `{ md5: false }`. Use the same values here when the account's stored SDK password differs from the console login password.

## Run

```bash
pnpm -C packages/core test:integration
```

The script builds the package first, then runs Playwright with `playwright.integration.config.ts`. One worker runs the tests sequentially because they share one account.

## Scope in this first pass

- Login, user identity, token, session sync, and the data prepare and session update events.
- Text send, with the stored row at status `SENT` and the send event.
- Audio send by data, with the stored row's frame count and status.

Later passes add the receive side with a second account, the group, friend, and device domains, and the PTT and connection state machine regressions.
