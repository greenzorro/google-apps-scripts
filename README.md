# google-apps-scripts

[🇬🇧 EN](https://github.com/greenzorro/google-apps-scripts/blob/main/README.md) | [🇨🇳 中文](https://github.com/greenzorro/google-apps-scripts/blob/main/README_ZH_CN.md)

Personal Google Workspace automation scripts running on Google Apps Script: calendar change monitoring, Gmail cleanup, Google Drive scheduled housekeeping, Google Sheets sync, AI-filtered RSS news digests, and Colab GPU bypass TTS audio synthesis.

Your local agent pushes and deploys the scripts with `clasp`; you decide which capabilities to enable, complete Google OAuth consent in the browser, deploy the Web App (when using Colab TTS), add required API keys to Script Properties, and configure time-driven triggers in the Apps Script editor.

## Capabilities

| Capability | Script | Entrypoint(s) | What you need |
| :--- | :--- | :--- | :--- |
| **Authorization Check** | `src/scripts/authorization.js` | `authorizeProject` | Browser OAuth approval |
| **Calendar Monitor** | `src/scripts/calendar.js` | `monitorCalendarChanges` | Default Google Calendar |
| **Gmail Management** | `src/scripts/gmail.js` | `gmailAutoArchive`, `gmailAutoTrash` | Gmail inbox (starred threads are preserved) |
| **Google Drive Cleanup** | `src/scripts/google_drive.js` | `gdriveCleanScreenshots`, `gdriveCleanAiStudio`, `gdriveCleanWechatMpData`, `gdriveCleanNewsFeed` | Target folders in Google Drive |
| **WeChat MP Sheet Sync** | `src/scripts/google_sheets.js` | `mpWechatDataUpdate` | Daily files under `app_data/Backup/mp_wechat` and spreadsheet `微信公众号数据` |
| **RSS News AI Filter** | `src/scripts/news_feed.js` | `processNewsFeedGroup1` – `processNewsFeedGroup4` | `GEMINI_API_KEY` (optional `GROQ_API_KEY` / `DEEPSEEK_API_KEY`) and Drive folder `app_data/news_feed/text` |
| **Colab Bypass News TTS** | `src/scripts/news_tts_colab.js` | `triggerNewsTtsColab`, `doPost` | Web App deployment + `COLAB_CLIENT_ID`, `COLAB_CLIENT_SECRET`, `COLAB_REFRESH_TOKEN`, `NEWS_TTS_WEBAPP_URL` |
| **AI Smoke Test** | `src/scripts/demo_models.js` | `testAllAIServices` | Configured AI API keys |

## Day-to-day configuration

Once deployed, day-to-day setup happens inside the Apps Script editor and Google Workspace:

- **OAuth consent**: On first manual execution of `authorizeProject()` or a target entrypoint, approve the requested Google Workspace scopes in the browser.
- **Script Properties (API keys & Colab credentials)**: For AI features, open Project Settings → Script Properties and set `GEMINI_API_KEY`, `GROQ_API_KEY`, or `DEEPSEEK_API_KEY` as needed. For Colab bypass TTS, deploy the project as a Web App (`Execute as: Me`, `Who has access: Anyone`) and set `COLAB_CLIENT_ID`, `COLAB_CLIENT_SECRET`, `COLAB_REFRESH_TOKEN`, and `NEWS_TTS_WEBAPP_URL`.
- **Time-driven triggers**: Under Triggers in the Apps Script editor, schedule recurring entrypoints (such as staggered RSS news groups, `triggerNewsTtsColab` in the hour after the last RSS group, and daily Gmail/Drive cleanup).
- **RSS news & dual-track TTS**: Feed definitions, AI classification criteria, content thresholds, `text/` vs `audio/` dual-track playback fallback, and output paths are documented in [news_feed.md](news_feed.md).
- **Cleanup safety**: `gmail.js` and `google_drive.js` move matching items to Trash; verify target folders and filter rules against your own data before turning on recurring cleanup triggers.

## Further reading

- [news_feed.md](news_feed.md) — RSS news AI filtering and summarization details
- [notes.md](notes.md) — Maintainer notes, shared utility APIs, and internal conventions

---

Created by [Victor42](https://victor42.work/) & [Agent Vik](https://github.com/agent-vik/about-me)

---

# For Agent

Deploy selected scripts from this repo to the bound Google Apps Script project via `clasp`, then hand OAuth authorization, Script Properties, and trigger setup to the human in a single batch.

## Prerequisites

- Node.js with `@google/clasp` available (`npm i -g @google/clasp` if missing)
- A Google account the human can authorize in a browser
- `.clasp.json` in this repo already targets the bound `scriptId`
- For Colab bypass TTS: `colab/tts_worker.py` and `colab/ref_serena.wav` hosted publicly on GitHub `main` at the URL configured in `NEWS_TTS_COLAB_CONFIG.rawBaseUrl`, plus an active Colab Compute Units balance (e.g. Google AI Pro)

## Deploy

Confirm which capabilities the human wants enabled. Keep only the matching dependency set when deploying selectively:

- Authorization check: `src/utils/utils.js`, `src/scripts/authorization.js`
- Calendar: `src/utils/utils.js`, `src/scripts/calendar.js`
- Gmail: `src/utils/utils.js`, `src/scripts/gmail.js`
- Drive cleanup: `src/utils/utils.js`, `src/utils/utils_google_drive.js`, `src/scripts/google_drive.js`
- Sheets sync: `src/utils/utils.js`, `src/utils/utils_google_drive.js`, `src/utils/utils_google_sheets.js`, `src/scripts/google_sheets.js`
- AI smoke test: `src/utils/utils.js`, `src/utils/utils_ai.js`, `src/scripts/demo_models.js`
- RSS news feed: `src/utils/utils.js`, `src/utils/utils_google_drive.js`, `src/utils/utils_ai.js`, `src/utils/utils_network.js`, `src/scripts/news_feed.js`
- Colab bypass news TTS: `src/utils/utils.js`, `src/utils/utils_google_drive.js`, `src/scripts/news_tts_colab.js`, and `src/appsscript.json` (`webapp` `USER_DEPLOYING` / `ANYONE_ANONYMOUS` for unauthenticated `doPost` callbacks)

Note on capability boundary: `clasp push` syncs only `src/` (`rootDir: "src"`). `colab/` executes remotely inside Colab and is fetched via `raw.githubusercontent.com`, so any change to `colab/` must be pushed to GitHub `main`. When `doPost` in `src/scripts/news_tts_colab.js` changes, redeploy the pinned Web App deployment (`clasp deploy -i <deploymentId>`) rather than only running `clasp push`.

From the repo root, log in (if needed), push scripts, and open the Apps Script editor:

```bash
clasp login
clasp push
clasp open
```

## Usage

Entry functions executed in the Apps Script editor (or via `clasp run` when configured):

- `authorizeProject` — read-only OAuth scope and service availability check
- `monitorCalendarChanges` — inspect recent updates across a 13-month calendar window
- `gmailAutoArchive` / `gmailAutoTrash` — archive threads older than 3 days / trash threads older than 365 days (unstarred only)
- `gdriveCleanScreenshots` / `gdriveCleanAiStudio` / `gdriveCleanWechatMpData` / `gdriveCleanNewsFeed` — Drive folder cleanup tasks
- `mpWechatDataUpdate` — import daily WeChat MP files into spreadsheet `微信公众号数据`
- `testAllAIServices` — verify Gemini, DeepSeek, and Groq connectivity
- `processNewsFeedGroup1` to `processNewsFeedGroup4` — run RSS news collection and AI filtering by feed group
- `triggerNewsTtsColab` — incrementally synthesize pending `text/*.txt` articles into `audio/*.mp3` via Colab L4 GPU with time-budgeted auto-handoff across chunks
- `testNewsTtsColabSingle` — single-article end-to-end Colab L4 synthesis smoke test (auto-handoff disabled)
- `testColabDoorbellProtocol` — GitHub-free CPU (`NONE`) protocol smoke test generating a 1-second silent MP3 callback
- `checkColabCcuBalance` — inspect Colab CCU balance and available accelerators
- `doPost` — Web App gatekeeper callback endpoint invoked by Colab (not executed manually)

## One batched human gate

Present these human-only steps once together:

- Complete Google OAuth and sensitive-scope prompts in the browser
- Run `authorizeProject` (or the target entry function) once in the Apps Script editor so permissions stick
- If AI features are enabled, add the needed keys under Project Settings → Script Properties: `GEMINI_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`
- If Colab bypass TTS (`src/scripts/news_tts_colab.js`) is enabled, deploy as a Web App (`Execute as: Me`, `Who has access: Anyone`) and set Script Properties: `COLAB_CLIENT_ID`, `COLAB_CLIENT_SECRET`, `COLAB_REFRESH_TOKEN` (minted strictly with minimal `openid` and `userinfo.email` scopes, zero Drive scopes), `NEWS_TTS_WEBAPP_URL`
- Add time-driven triggers for recurring tasks (scheduling `triggerNewsTtsColab` in the hour immediately after the last RSS news group) and confirm Drive/Gmail cleanup rules before enabling live schedules

## Verify

- Standard scripts: check the Apps Script Executions log after the first manual run to confirm there are no OAuth or missing Script Property errors and that the expected side effect (log summary, Drive output, sheet rows, or archived threads) appears.
- Colab bypass TTS: run `testColabDoorbellProtocol` first, then `testNewsTtsColabSingle`; confirm in Executions that `doPost` logs `接收Colab音频批次` and `ColabTTS合成完成` with `unassigned: true`, and verify the resulting `.mp3` appears in `app_data/news_feed/audio/`.

## Hand off to the human

- Browser Google login, 2FA, and OAuth consent
- Script Property API keys and minimal-scope Colab OAuth credentials
- Web App deployment URL confirmation (`NEWS_TTS_WEBAPP_URL`)
- Time-driven trigger creation and ongoing schedule ownership

## Red lines

- Never overwrite `.clasp.json` `scriptId` with an arbitrary project unless explicitly asked
- Never commit API keys, OAuth refresh tokens, or `.clasp.json` / `.clasprc*` credentials to source files or git
- Never grant Google Drive OAuth scopes to the Colab refresh token
- Never redeploy a new Web App deployment ID without updating `NEWS_TTS_WEBAPP_URL` (prefer `clasp deploy -i <deploymentId>`)
- Never enable destructive Drive/Gmail cleanup schedules on production data without explicit human confirmation (prefer `dryRun: true` checks for Drive cleanup rules first)
