# google-apps-scripts

[🇬🇧 EN](https://github.com/greenzorro/google-apps-scripts/blob/main/README.md) | [🇨🇳 中文](https://github.com/greenzorro/google-apps-scripts/blob/main/README_ZH_CN.md)

一套运行在 Google Apps Script 上的个人工作区自动化脚本集，覆盖日历变更监控、Gmail 整理、Google Drive 定时清理、Google Sheets 数据同步、RSS 新闻 AI 过滤与摘要，以及基于 Colab GPU 的旁路新闻语音合成。

代码推送与部署由本机 Agent 通过 `clasp` 完成；你负责决定启用哪些能力、在浏览器里完成 Google OAuth 授权、部署 Web App（若启用 Colab TTS）、将所需 API Key 填入脚本属性，并在 Apps Script 编辑器中设置定时触发器。

## 包含的能力

| 能力 | 主要脚本 | 入口函数 | 你需要准备的前提 |
| :--- | :--- | :--- | :--- |
| **项目授权自检** | `src/scripts/authorization.js` | `authorizeProject` | 浏览器完成 Google 账号授权 |
| **日历变更监控** | `src/scripts/calendar.js` | `monitorCalendarChanges` | 默认 Google 日历 |
| **Gmail 自动整理** | `src/scripts/gmail.js` | `gmailAutoArchive`、`gmailAutoTrash` | Gmail 收件箱（依赖星标保留重要会话） |
| **Google Drive 清理** | `src/scripts/google_drive.js` | `gdriveCleanScreenshots`、`gdriveCleanAiStudio`、`gdriveCleanWechatMpData`、`gdriveCleanNewsFeed` | Drive 对应目标文件夹 |
| **微信公众号数据同步** | `src/scripts/google_sheets.js` | `mpWechatDataUpdate` | Drive `app_data/Backup/mp_wechat` 当日数据文件、表格「微信公众号数据」 |
| **RSS 新闻 AI 过滤** | `src/scripts/news_feed.js` | `processNewsFeedGroup1` – `processNewsFeedGroup4` | `GEMINI_API_KEY`（可选 `GROQ_API_KEY` / `OPENCODE_API_KEY`）、Drive `app_data/news_feed/text` |
| **Colab 旁路新闻 TTS** | `src/scripts/news_tts_colab.js` | `triggerNewsTtsColab`、`doPost` | 部署为 Web App，并配置 `COLAB_CLIENT_ID`、`COLAB_CLIENT_SECRET`、`COLAB_REFRESH_TOKEN`、`NEWS_TTS_WEBAPP_URL` |
| **AI 连通性测试** | `src/scripts/demo_models.js` | `testAllAIServices` | 已配置的 AI 服务 API Key |

## 日常使用与配置

完成部署后，日常配置都在 Google Apps Script 编辑器与 Google Workspace 内进行：

- **OAuth 授权**：首次运行 `authorizeProject()` 或目标入口函数时，在浏览器弹窗中允许所需 Google 服务权限（敏感范围需在提示页继续授权）。
- **脚本属性（API Key 与 Colab 凭证）**：使用 AI 能力时，前往 Apps Script 编辑器的「项目设置 → 脚本属性」配置 `GEMINI_API_KEY`、`GROQ_API_KEY`、`OPENCODE_API_KEY`（若使用 `demo_models.js` 测试官方 DeepSeek 另加 `DEEPSEEK_API_KEY`）。使用 Colab 旁路 TTS 时，需将项目部署为 Web App（执行身份「我」、访问权限「任何人」），并配置 `COLAB_CLIENT_ID`、`COLAB_CLIENT_SECRET`、`COLAB_REFRESH_TOKEN` 与 `NEWS_TTS_WEBAPP_URL`。
- **定时触发器**：在编辑器左侧「触发器」中为周期任务添加时间驱动触发器（例如错峰新闻收集、紧接最后一组新闻之后的 `triggerNewsTtsColab`，以及每日邮件归档与 Drive 清理）。
- **RSS 新闻与双轨 TTS**：数据源、分类过滤规则、内容长度阈值、`text/` 与 `audio/` 双轨收听降级及存储路径说明见 [news_feed.md](news_feed.md)。
- **清理安全建议**：`gmail.js` 与 `google_drive.js` 会将符合条件的内容移入垃圾桶/回收站；启用自动触发前，建议先结合个人目录习惯确认筛选条件。

## 延伸阅读

- [news_feed.md](news_feed.md)：RSS 新闻 AI 过滤与摘要系统的完整规则说明
- [notes.md](notes.md)：面向开发与维护者的架构说明、工具库接口速查与维护约定

---

Created by [Victor42](https://victor42.work/) & [Agent Vik](https://github.com/agent-vik/about-me)
