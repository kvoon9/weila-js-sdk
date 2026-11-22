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
- Cross-account receive: one account sends a text and an audio message, the peer receives both and emits the new message event.
- Location send and receive.
- Session settings, read state, and the active session.
- PTT talk round trips (`weila_requestTalk` / `weila_releaseTalk`): the talk burst is recorded through the real recorder worklet, stored as a sent audio message, and delivered to the peer with a CDN audio URL.

Later passes add the group and friend domains and the connection state machine regressions.

## Running the PTT tests

The PTT specs need a working microphone. The `coreAudio` fixture launches Chromium with `--use-fake-device-for-media-stream` (a synthetic microphone), `--use-fake-ui-for-media-stream`, and `--autoplay-policy=no-user-gesture-required`. Each test probes `getUserMedia` first and skips with an explicit message when the machine cannot start a capture device, so the suite stays green on hosts without an audio stack.

On macOS this commonly happens when the process hosting Chromium has no microphone permission (System Settings -> Privacy & Security -> Microphone): `getUserMedia` then hangs or rejects with `NotReadableError` even with the fake device. Grant the terminal (or run on a Linux CI host) to execute these tests for real.

## Known limitations

- **Cross-enterprise messaging is server-restricted.** A friend relationship across enterprises can be created. Search, invite, and answer all succeed, and both accounts list each other as friends. Sending a message still returns `RESULT_REQUEST_LIMITED` (result code 22). Keep message tests inside one enterprise. Do not add a cross-enterprise send test until the platform changes this policy.
- **SDK group creation is blocked for the test account.** `weila_createGroup` returns `RESULT_CONTENT_AUDIT_BLOCK` (42) for every name, group type, and public type tried. Group messaging is deferred until the backend allows it. The console group page is a corp-level list and is not the SDK app group module.
- **Received audio is server-normalized.** The sender's local row keeps the frame count it sent. The receiver gets an `audioUrl` on the CDN and `frameCount` 0. Assert the URL and a recent `created` time, not the sent frame count.
