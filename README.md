# Google Apps Scripts

一套运行在 Google Apps Script 上的个人工作区自动化脚本集，覆盖日历变更监控、Gmail 整理、Google Drive 定时清理、Google Sheets 数据同步以及 RSS 新闻 AI 过滤与摘要。

代码推送与部署由本机 Agent 通过 `clasp` 完成；你负责决定启用哪些能力、在浏览器里完成 Google OAuth 授权、将所需 API Key 填入脚本属性，并在 Apps Script 编辑器中设置定时触发器。

## 包含的能力

| 能力 | 主要脚本 | 入口函数 | 你需要准备的前提 |
| :--- | :--- | :--- | :--- |
| **项目授权自检** | `authorization.js` | `authorizeProject` | 浏览器完成 Google 账号授权 |
| **日历变更监控** | `calendar.js` | `monitorCalendarChanges` | 默认 Google 日历 |
| **Gmail 自动整理** | `gmail.js` | `gmailAutoArchive`、`gmailAutoTrash` | Gmail 收件箱（依赖星标保留重要会话） |
| **Google Drive 清理** | `google_drive.js` | `gdriveCleanScreenshots`、`gdriveCleanAiStudio`、`gdriveCleanWechatMpData`、`gdriveCleanNewsFeed` | Drive 对应目标文件夹 |
| **微信公众号数据同步** | `google_sheets.js` | `mpWechatDataUpdate` | Drive `app_data/Backup/mp_wechat` 当日数据文件、表格「微信公众号数据」 |
| **RSS 新闻 AI 过滤** | `news_feed.js` | `processNewsFeedGroup1` – `processNewsFeedGroup4` | `GEMINI_API_KEY`（可选 `GROQ_API_KEY` / `DEEPSEEK_API_KEY`）、Drive `app_data/news_feed/text` |
| **AI 连通性测试** | `demo_models.js` | `testAllAIServices` | 已配置的 AI 服务 API Key |

## 日常使用与配置

完成部署后，日常配置都在 Google Apps Script 编辑器与 Google Workspace 内进行：

- **OAuth 授权**：首次运行任意脚本或运行 `authorizeProject()` 时，在弹窗中允许所需 Google 服务权限（敏感范围需在提示页点击继续授权）。
- **脚本属性（API Key）**：使用 AI 相关能力时，前往 Apps Script 编辑器的「项目设置 → 脚本属性」，按需配置 `GEMINI_API_KEY`、`GROQ_API_KEY`、`DEEPSEEK_API_KEY`。
- **定时触发器**：在编辑器左侧「触发器」中为需要周期执行的入口函数添加时间驱动触发器（例如按小时运行新闻收集、按天运行邮件归档与 Drive 清理）。
- **RSS 新闻规则**：数据源、分类过滤规则、内容长度阈值与存储路径说明见 [news_feed.md](news_feed.md)。
- **清理安全建议**：`gmail.js` 与 `google_drive.js` 会将符合条件的内容移入垃圾桶/回收站；启用自动触发前，建议先结合个人目录习惯确认筛选条件。

## 相关文档

- [news_feed.md](news_feed.md)：RSS 新闻 AI 过滤系统的完整规则与配置说明
- [notes.md](notes.md)：面向开发与维护者的架构说明、工具库接口速查与维护约定

---

Created by [Victor42](https://victor42.work/) & [Agent Vik](https://github.com/agent-vik/about-me)

---

# For Agent

Deploy selected scripts from this repo to the bound Google Apps Script project via `clasp`, then hand OAuth authorization, Script Properties, and trigger setup to the human in a single batch.

## Prerequisites

- Node.js with `@google/clasp` available (`npm i -g @google/clasp` if missing)
- A Google account the human can authorize in a browser
- `.clasp.json` in this repo already targets the bound `scriptId`

## Deploy

Confirm which capabilities the human wants enabled. Keep only the matching dependency set when deploying selectively:

- Authorization check: `utils.js`, `authorization.js`
- Calendar: `utils.js`, `calendar.js`
- Gmail: `utils.js`, `gmail.js`
- Drive cleanup: `utils.js`, `utils_google_drive.js`, `google_drive.js`
- Sheets sync: `utils.js`, `utils_google_drive.js`, `utils_google_sheets.js`, `google_sheets.js`
- AI smoke test: `utils.js`, `utils_ai.js`, `demo_models.js`
- RSS news feed: `utils.js`, `utils_google_drive.js`, `utils_ai.js`, `utils_network.js`, `news_feed.js`

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

## One batched human gate

Present these human-only steps once together:

- Complete Google OAuth and sensitive-scope prompts in the browser
- Run `authorizeProject` (or the target entry function) once in the Apps Script editor so permissions stick
- If AI features are enabled, add the needed keys under Project Settings → Script Properties: `GEMINI_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`
- Add time-driven triggers for recurring tasks and confirm Drive/Gmail cleanup rules before enabling live schedules

## Verify

Check the Apps Script Executions log after the first manual run: confirm there are no OAuth or missing Script Property errors and that the expected side effect (log summary, Drive output, sheet rows, or archived threads) appears.

## Hand off to the human

- Browser Google login, 2FA, and OAuth consent
- Script Property API keys
- Time-driven trigger creation and ongoing schedule ownership

## Red lines

- Never overwrite `.clasp.json` `scriptId` with an arbitrary project unless explicitly asked
- Never commit API keys or credentials to source files or git
- Never enable destructive Drive/Gmail cleanup schedules on production data without explicit human confirmation (prefer `dryRun: true` checks for Drive cleanup rules first)
