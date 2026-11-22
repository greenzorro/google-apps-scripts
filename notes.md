# Google Apps Scripts 项目备忘录

给维护者与 Agent 看的内部备忘，记录仓库架构、工具库接口、业务脚本约定与不变量。面向使用者的能力介绍与部署流程见 [README.md](README.md) / [README_ZH_CN.md](README_ZH_CN.md)，RSS 新闻 AI 过滤系统的完整设计见 [news_feed.md](news_feed.md)。

**维护约定：** 修改脚本逻辑、模型配置、脚本属性或目录结构后，同步更新本文档（以及关联的 `README.md` / `README_ZH_CN.md` / `news_feed.md`），使其始终准确描述当前实现。

---

## 1. 项目概览与运行环境

本项目是一套运行于 Google Apps Script（GAS）的个人工作区自动化脚本集合，覆盖日历监控、Gmail 整理、Google Drive 清理、Google Sheets 同步、AI 多模型调用、RSS 新闻收集与过滤，以及 Colab 旁路 TTS 增量合成。

- **运行时与 Web App**：Google Apps Script V8（`src/appsscript.json`，含 `webapp` 配置：`executeAs: "USER_DEPLOYING"`、`access: "ANYONE_ANONYMOUS"`，供 Colab 无登录态回调 `doPost(e)`）
- **时区与异常日志**：`Asia/Shanghai`、`STACKDRIVER`
- **部署方式**：通过 `@google/clasp` 与线上脚本项目绑定（`.clasp.json`，`rootDir: "src"`，`projectId: apps-scripts-automation`）；`colab/` 目录由 GitHub `main` 分支 Raw 地址托管，不推入 GAS
- **外部依赖**：无构建步骤与第三方 npm 包，全部基于 GAS 内置服务（`DriveApp`、`GmailApp`、`CalendarApp`、`SpreadsheetApp`、`PropertiesService`、`CacheService`、`ContentService`、`Utilities`、`UrlFetchApp`）

---

## 2. 目录结构与文件依赖

### 2.1 文件清单

```text
google-apps-scripts/
├── .clasp.json                      # clasp 绑定配置（目标 scriptId，rootDir: "src"）
├── .gitignore
├── LICENSE                          # MIT
├── README.md                        # 仓库介绍（英文）与 # For Agent 部署入口
├── README_ZH_CN.md                  # 仓库介绍（中文）
├── notes.md                         # 本文档（面向维护者与 Agent 的技术备忘）
├── news_feed.md                     # RSS 新闻 AI 过滤系统专项文档
├── colab/                           # Colab GPU 无状态 TTS 执行侧资产（不推往 GAS）
│   ├── tts_worker.py                # IndexTTS 2.5 推理与 MP3 批次回传脚本
│   └── ref_serena.wav               # 7 秒冷静中性参考声纹母版
└── src/
    ├── appsscript.json              # GAS 运行时与 Web App 配置（V8、Asia/Shanghai、STACKDRIVER、ANYONE_ANONYMOUS）
    ├── utils/
    │   ├── utils.js                 # 核心工具库（Utils）
    │   ├── utils_google_drive.js    # Google Drive 工具库（UtilsGoogleDrive）
    │   ├── utils_google_sheets.js   # Google Sheets / CSV 工具库（UtilsGoogleSheets）
    │   ├── utils_ai.js              # 多服务商 AI 工具库（UtilsAI）
    │   └── utils_network.js         # HTTP 网络请求工具库（UtilsNetwork）
    └── scripts/
        ├── authorization.js         # 项目级 OAuth 授权与基础服务可用性自检
        ├── calendar.js              # 日历变更监控脚本
        ├── gmail.js                 # Gmail 自动归档与删除脚本
        ├── google_drive.js          # Google Drive 定时清理脚本
        ├── google_sheets.js         # 微信公众号 CSV → Google Sheets 同步脚本
        ├── demo_models.js           # AI 模型连通性测试脚本
        ├── news_feed.js             # RSS 新闻 AI 过滤与摘要脚本
        └── news_tts_colab.js        # 新闻旁路 TTS 点火与 Web App doPost 守门模块
```

### 2.2 模块依赖关系

GAS 同一项目中的所有 `.js` 文件共享全局作用域。按能力拆分部署时，业务脚本依赖对应工具库：

| 业务脚本 | 必需工具库 | 说明 |
| :--- | :--- | :--- |
| `src/scripts/authorization.js` | `src/utils/utils.js` | 只读/探测检查，用于一次触发所需 OAuth 授权 |
| `src/scripts/calendar.js` | `src/utils/utils.js` | 依赖时间范围与日志工具 |
| `src/scripts/gmail.js` | `src/utils/utils.js` | 依赖日期计算与日志工具 |
| `src/scripts/google_drive.js` | `src/utils/utils.js`、`src/utils/utils_google_drive.js` | 所有清理函数均委托给 `UtilsGoogleDrive.cleanFilesInFolder()` |
| `src/scripts/google_sheets.js` | `src/utils/utils.js`、`src/utils/utils_google_drive.js`、`src/utils/utils_google_sheets.js` | 通过 Drive 定位当日文件后写入指定表格 |
| `src/scripts/demo_models.js` | `src/utils/utils.js`、`src/utils/utils_ai.js` | 依次调用 Gemini / DeepSeek / Groq 验证可用性 |
| `src/scripts/news_feed.js` | `src/utils/utils.js`、`src/utils/utils_google_drive.js`、`src/utils/utils_ai.js`、`src/utils/utils_network.js` | 自身内部另以 `NewsUtils` 分模块封装 |
| `src/scripts/news_tts_colab.js` | `src/utils/utils.js`、`src/utils/utils_google_drive.js` | 内部以 `NewsTtsColab` 封装纯 HTTP Colab 点火与 `doPost` 守门接口 |

---

## 3. 架构设计与核心约定

### 3.1 命名空间封装

由于 GAS 不支持原生 ES Module 且所有顶层标识符共用全局命名空间，项目通过对象字面量做命名空间隔离：

- `Utils`（`src/utils/utils.js`）
- `UtilsGoogleDrive`（`src/utils/utils_google_drive.js`）
- `UtilsGoogleSheets`（`src/utils/utils_google_sheets.js`）
- `UtilsAI`（`src/utils/utils_ai.js`）
- `UtilsNetwork`（`src/utils/utils_network.js`）
- `NewsUtils`（`src/scripts/news_feed.js` 内部模块：`RSS`、`Content`、`AI`、`Storage`）
- `NewsTtsColab`（`src/scripts/news_tts_colab.js` 内部模块）

新增通用能力优先放入对应 `Utils*` 命名空间，业务脚本保持薄层配置与流程编排。

### 3.2 标准化日志协议

所有脚本统一使用 `Utils` 日志方法输出结构化运行轨迹：

- `Utils.logStart(scriptName)`：脚本入口日志
- `Utils.logScanRange(itemType, totalCount, range)`：扫描规模与范围日志
- `Utils.logAction(action, details)`：单条处理动作日志
- `Utils.logError(error, context)`：异常与上下文日志
- `Utils.logEnd(scriptName, summary)`：执行汇总日志（接受 `{ count, message, ... }`）

### 3.3 密钥与配置隔离

- 第三方 API Key 统一存放在 Apps Script 的脚本属性（`PropertiesService.getScriptProperties()`），源码与仓库文件不保留任何密钥。
- 脚本属性键名：
  - `GEMINI_API_KEY`（Gemini 生成模型与 Gemini Decisions 共用）
  - `DEEPSEEK_API_KEY`
  - `GROQ_API_KEY`
  - `COLAB_CLIENT_ID`、`COLAB_CLIENT_SECRET`、`COLAB_REFRESH_TOKEN`、`NEWS_TTS_WEBAPP_URL`（Colab 旁路 TTS 触发与回调鉴权）
- 业务参数（保留天数、批处理上限、目录路径、RSS 源配置、模型链）集中定义在各业务文件顶部常量中。

---

## 4. 核心工具库参考

### 4.1 `src/utils/utils.js`（`Utils`）

- **数值与校验**：`calculatePercentage(part, total)`（自动处理除零）、`safeParseInt(value, defaultValue)`、`validateNumberRange(value, min, max, paramName)`
- **时间处理**：`getDateDaysAgo(days)`、`getDateMinutesAgo(minutes)`、`getMonthRange(monthsBack, monthsForward)`、`isTimeDifferenceValid(targetTime, maxDifferenceMinutes)`
- **文本与文件名**：`hasExcludedChars(text, excludedArray)`、`safeFileName(text, maxLength = 100)`、`cleanHtmlContent(html, options = {})`（将 HTML 转为纯文本，支持保留段落换行与移除图片）
- **HTML 提取与清洗**：`removeHtmlElementsBySelector(html, selectors)`、`extractElement(html, selector, options = {})`（支持类/属性/标签选择器与嵌套元素匹配）
- **日志**：`logStart`、`logEnd`、`logAction`、`logError`、`logScanRange`

### 4.2 `src/utils/utils_google_drive.js`（`UtilsGoogleDrive`）

- **目录与文件定位**：
  - `getFolderByName(folderName)`：按名称获取根目录或全局匹配的文件夹
  - `getFolderByPath(folderPath)`：按 `/` 分隔路径逐级查找（仅查找不创建）
  - `ensureNestedFolderExists(folderPath)`：按 `/` 分隔路径查找或创建嵌套目录
  - `findFileInFolder(folder, fileName)`：精确查找文件夹内文件
  - `findFileWithExtensions(folder, baseName)`：按顺序 `''`、`'.xlsx'`、`'.csv'`、`'.gsheet'`、`'.xls'` 探测文件
  - `saveOrUpdateFile(folder, fileName, content)`：存在则覆盖内容，否则创建新文件
- **通用文件清理引擎**：`cleanFilesInFolder(target, options)`
  - `target` 支持 `Folder` 对象、单层文件夹名或含 `/` 的路径字符串
  - 默认选项：`filters: []`、`action: 'trash'`、`maxFiles: 0`（不限）、`dryRun: false`、`returnFileList: false`
  - 已在回收站中的文件会自动跳过
  - 过滤器类型（`_applyFileFilter`）：`time`（配合 `olderThan` 如 `'7d'`/`'18h'` 与 `field`: `'lastUpdated'`/`'dateCreated'`）、`filename_pattern`、`exclude_chars`、`no_extension`、`has_extension`、`min_size`、`max_size`
  - 辅助方法：`isFileOlderThan(file, timeThreshold, timeField = 'lastUpdated')`

### 4.3 `src/utils/utils_google_sheets.js`（`UtilsGoogleSheets`）

- **列坐标转换**：`columnToNumber(column)`、`numberToColumn(columnNumber)`
- **读取与解析**：
  - `readSheetByFileName(fileName, sheetName, rangeA1)`：按文件名打开 Google Sheets 并读取指定工作表
  - `readSheetData(file, rangeA1)`：Google Sheets 读取首个工作表；CSV 走 `readCSVData`；`.xlsx`/`.xls` 不直接解析（记录转换提示并返回 `null`）
  - `readCSVData(file, rangeA1)`：按 UTF-8 读取并剥离可选 BOM（`0xFEFF`），通过 `Utilities.parseCsv` 解析（支持引号内换行与逗号），过滤全空行后按 A1 范围切片并补齐等宽矩形数组
- **查找与写入**：
  - `findTextInColumn(fileName, sheetName, column, searchText)`
  - `updateSheetByFileName(fileName, sheetName, rangeA1, data)`
  - `clearSheetByFileName(fileName, sheetName, rangeA1)`
  - `updateSheetWithAutoRange(fileName, sheetName, targetRangeStart, sourceData)`：将 `sourceData` 规整为等宽矩形后按起始单元格自动计算写入范围
  - `updateSheetByContentMatchOrAppend(targetFileName, targetSheetName, searchColumn, sourceFile, dataRange, headerRows, options)`：按指定列内容匹配更新已有行，未匹配行默认追加（可通过 `options.appendIfNotFound: false` 关闭追加）

### 4.4 `src/utils/utils_ai.js`（`UtilsAI`）

- **重试与请求辅助**：
  - `withRetry(operation, options)`：支持重试次数、间隔与 `shouldRetry` 停止条件
  - `normalizeOptions`、`buildOpenAIMessages`、`buildGeminiContents`、`buildGeminiResponseFormatConfig`、`fetchJson`、`buildApiError`（透传服务商名称、HTTP 状态码与响应摘要）
- **生成式调用接口**（统一接收对象参数，支持 `prompt` / `messages` / `systemPrompt` / `model` / `temperature` / `maxTokens` / `delaySeconds` 等）：
  - `askGemini(options)`：默认模型 `gemini-flash-lite-latest`
  - `askDeepseek(options)`：默认模型 `deepseek-flash`
  - `askGroq(options)`：默认模型 `openai/gpt-oss-120b`
- **闭合集判定接口**：
  - `askGeminiDecision(options)`：请求 `v1beta/decisions` 端点（默认模型 `gemini-decision-1`），对同一段 `input` 批量回答 `noul` / `choice` / `score` 问题，返回 `{ answers, usage }`（输出 token 恒为 0）。
  - **关键约束**：该端点仅接受 `model`、`input`、`questions`；携带 `safetySettings` 或 `generationConfig` 会触发 `400 unknown parameter`。

### 4.5 `src/utils/utils_network.js`（`UtilsNetwork`）

- `fetchWithRetry(url, options = {})`：封装 `UrlFetchApp.fetch`，默认 `muteHttpExceptions: true`、`followRedirects: true`，并附带桌面 Chrome User-Agent。将 `followRedirects` 设为 `false` 时，由 `_handleRedirects` 对 `301/302/307/308` 按 `maxRedirects`（默认 5）手动跟随。
- 便捷封装：`fetchXml`、`fetchHtml`、`fetchText`、`checkUrlAccessible`（HEAD 请求）、`fetchHeaders`。

---

## 5. 业务脚本与内部不变量

### 5.1 `src/scripts/authorization.js`

- 入口函数：`authorizeProject()`
- 对脚本属性、Google Drive（检查根目录与 `app_data` 是否存在）、Gmail（收件箱未读数）、Google Calendar（默认日历名）、UrlFetch（`https://www.google.com/generate_204`）、Google Sheets（若存在「微信公众号数据」则尝试打开）依次执行低副作用只读检查，用于集中触发 OAuth 授权。

### 5.2 `src/scripts/calendar.js`

- 入口函数：`monitorCalendarChanges()`
- 扫描默认日历前后各 6 个月（共 13 个月）内所有事件，取 `lastUpdated` 最新的一条；仅当其更新时间距当前运行时间不超过 15 分钟时输出完整事件档案，否则归为陈旧更新（例如删除旧日程引发的时间戳变动）并仅作简略记录。

### 5.3 `src/scripts/gmail.js`

- `gmailAutoArchive()`：检查主收件箱前 `BATCH_SIZE = 400` 个会话，归档最后消息时间早于 `DELAY_DAYS = 3` 天且整串无星标的会话。
- `gmailAutoTrash()`：检索 `-in:trash -in:spam older_than:365d` 前 `BATCH_SIZE = 400` 个会话，二次核对最后消息时间早于 365 天且整串无星标后移入垃圾桶。

### 5.4 `src/scripts/google_drive.js`

四个预设清理函数均调用 `UtilsGoogleDrive.cleanFilesInFolder(..., { action: 'trash' })`：

- `gdriveCleanScreenshots()`：目录 `screenshots`，创建时间早于 `7d`。
- `gdriveCleanAiStudio()`：目录 `Google AI Studio`，无扩展名、文件名不含 `📌` 或 `🗄️`、最后更新时间早于 `7d`。
- `gdriveCleanWechatMpData()`：目录 `app_data/Backup/mp_wechat`，文件名匹配 `^\d{4}-\d{2}-\d{2}` 且创建时间早于 `1d`。
- `gdriveCleanNewsFeed()`：分别清理 `app_data/news_feed/text` 与 `app_data/news_feed/audio`，创建时间早于 `18h`。

### 5.5 `src/scripts/google_sheets.js`

- 入口函数：`mpWechatDataUpdate()`
- 在 `app_data/Backup/mp_wechat` 中按 `GMT+8` 当日日期查找：
  - `{yyyy-MM-dd}_wechat_traffic` → 写入「微信公众号数据」工作表 `traffic`（`updateSheetWithAutoRange`）
  - `{yyyy-MM-dd}_wechat_content_sorted` → 写入工作表 `content`（`updateSheetByContentMatchOrAppend`，按 A 列匹配并默认追加）
  - `{yyyy-MM-dd}_wechat_user` → 写入工作表 `user`（`updateSheetWithAutoRange`）
- 任一当日文件缺失时记录警告/信息并跳过对应工作表，不阻断其余表更新。

### 5.6 `src/scripts/demo_models.js`

- 入口函数：`testAllAIServices()`
- 依次用 `gemini-flash-lite-latest`、`deepseek-flash`、`openai/gpt-oss-120b` 发送单句测试提示词，用于验证脚本属性中的三套 API Key 与网络连通性。

### 5.7 `src/scripts/news_feed.js`

- 入口函数：`processNewsFeedGroup1()`、`processNewsFeedGroup2()`、`processNewsFeedGroup3()`、`processNewsFeedGroup4()`（均委托给 `processNewsFeedsByGroup(groupNumber)`）。
- 分类采用两层架构：`AI_DECISION_CONFIG.mode === 'primary'` 时优先走 `gemini-decision-1` 闭合集一次判定类别（9 类，定义于 `AI_CATEGORY_CRITERIA`）与保存标记；不可用或报错时回落生成链 `AI_CLASSIFICATION_MODELS`（`gemini-4-hydrogen` → `gemini-flash-latest` → `qwen/qwen3.8-27b` → `deepseek-flash`）。
- 长文（> 500 字符）总结链为 `AI_SUMMARIZATION_MODELS`（`gemini-flash-lite-latest` → `openai/gpt-oss-120b` → `deepseek-flash`）；< 30 字符丢弃；30–500 字符直接保留原文。
- 运行内熔断状态保存在 `AI_MODEL_CIRCUIT_BREAKER`（单次执行期内对 429、502/503/504、401/403/400/404 做分级跳过或禁用）。详细规则与 XML/内容解析细节见 [news_feed.md](news_feed.md)。

### 5.8 `src/scripts/news_tts_colab.js` 与 `colab/`

- **入口函数**：`triggerNewsTtsColab()`（生产批处理，支持时间预算自动接力）、`testNewsTtsColabSingle()`（单篇冒烟测试，禁用接力）、`testColabDoorbellProtocol()`（无 GitHub 依赖的 CPU 门铃协议测试）、`checkColabCcuBalance()`（查询 CCU 余额与可用加速器）以及 Web App `doPost(e)`。
- **双轨解耦与增量过滤**：`news_feed.js` 仅写 `app_data/news_feed/text/*.txt`；`collectPendingArticles()` 比对 `text/*.txt` 与 `app_data/news_feed/audio/*.mp3`，按更新时间倒序选取尚无同名音频的文章（单次上限 `maxArticlesPerRun: 60`）。全量命中时跳过 Colab 唤醒（0 CCU 消耗）。
- **零信任与最小权限边界**：
  - Colab OAuth Refresh Token 基于 `google-colab-cli` 公开 OAuth 客户端配置，仅申请 `openid` 与 `userinfo.email` 最小作用域，彻底剥离 Google Drive 与 GCP 权限。
  - Colab 容器内不挂载 Google Drive、不持有任何网盘凭证；输入文本由 GAS 点火时通过 JSON 随任务下发，输出音频只能携带 `CacheService` 签发的 2 小时一次性随机 Token（`TTS_JOB_<jobId>`，`cacheTtlSeconds: 7200`）向 `doPost(e)` 回传，由 GAS 校验后写入硬编码目录 `app_data/news_feed/audio/`（强制 `.mp3` 扩展名并用 `Utils.safeFileName(..., 100)` 清洗文件名）。
- **纯 HTTP 借壳点火协议（0 WebSocket）**：
  1. `getAccessToken()` 用 `COLAB_REFRESH_TOKEN` 换取短期 `access_token`；
  2. `assignRuntime()` 对 `https://colab.research.google.com/tun/m/assign` 先 `GET` 获取 `X-Goog-Colab-Token`（剥离 XSSI 前缀 `)]}'\n`），再 `POST` 分配实例（默认 `accelerator: 'L4'` 支持原生 `bf16`；支持 `'T4'` 或 CPU 测试 `'NONE'`），拿到 `endpoint`、`proxyUrl` 与 `proxyToken`；
  3. `putRemoteTextFile()` 利用 `<proxyUrl>/api/contents/` 挂载于 Linux 根目录 `/` 的特性，先后写入 `/content/tts_job.json` 与 `/root/.ipython/profile_default/startup/00_tts.py`；
  4. `startKernel()` 调用 `POST <proxyUrl>/api/kernels`（`{"name": "python3", "path": "content"}`）拉起内核，触发 IPython 启动钩子下载 `tts_worker.py` 并以 `start_new_session=True` 派生独立后台进程，GAS 随即结束退出；若点火任一步异常，GAS 立即调用 `unassignRuntime()` 退租并清缓存。
- **时间预算与 `doPost` 自动接力**：
  - Colab 对无浏览器/无 WebSocket 附着的纯 HTTP 后端实例会在约 18–21 分钟触发空闲回收。为此 `tts_worker.py` 在每篇起跑前检查总运行时长 `TTS_BOOT_TS` 是否达到 `max_wall_seconds`（默认 `780` 秒 / 13 分钟），达到预算即主动停止并上报 `stopped_early: true`。
  - `doPost(e)` 在收到 `complete` 或 `error` 时销毁缓存条目并调用 `GET` + `POST /tun/m/unassign/<endpoint>` 退租实例；若 `complete` 携带 `stopped_early: true` 且启用 `autoContinue`（`triggerNewsTtsColab` 开启，单篇冒烟关闭），在未超过 `maxChainDepth: 10` 防护上限时自动调用 `triggerSynthesis()` 拉起下一台实例接续剩余篇目。
- **Colab 无状态 Worker（`colab/tts_worker.py` + `colab/ref_serena.wav`）**：
  - 自动从 `rawBaseUrl` 拉取静态 7 秒冷静中性参考音频 `ref_serena.wav`（`328 KB`），浅克隆 `index-tts/index-tts` 并用 `uv` 建立 Python 3.11 独立虚拟环境 `/content/venv_idx`（规避 Colab 默认 Python 3.13 兼容冲突），从 Hugging Face 拉取 `IndexTeam/IndexTTS-2.5`（计算能力 `>= 8.0` 时自动启用 `use_bf16=True`）。
  - 结构化防漏读分句（`split_news_sentences`）：合并 `AI总结：` / `新闻原文：` 标识行，按 `。！？!?` 切分为短句（超过 150 字的长从句再按逗号/分号拆分），零正则读音补丁；句间插入 `0.18s` 静音。
  - 静态响度控制与编码：由 `NEWS_TTS_COLAB_CONFIG.volumeDb`（默认 `14` dB）随任务下发 `volume_db`；非零时在 `ffmpeg` 阶段插入线性静态前级增益与固定阈值限幅滤镜 `volume=<volume_db>dB,alimiter=limit=0.84:attack=5:release=50:level=false`（禁用 `alimiter` 默认的 `level=true` 自动补增益，同时禁用 `loudnorm` / `dynaudnorm` 动态增益滤镜以避免句尾衰减被拉高形成假回声），按原生采样率（`22050 Hz`）输出单声道 `128 kbps` MP3，将成品稳定在约 `-15 LUFS`、真峰值 `≤ -1.0 dBTP`。
  - 分批回传：每完成 `batchSize: 3` 篇通过 `upload_batch`（Base64 JSON POST，带 3 次重试）回传 GAS。
- **运行基线与可迁移性**：
  - L4 GPU 费率约 `1.94 CCU/h`；单台冷启动（`uv` 环境 + `IndexTTS 2.5` 加载）约 `3.5 min`，单篇合成约 `75–90s`；在 `maxWallSeconds: 780` 接力模式下单机约完成 8 篇（实际存活 ~14.5 分钟），53 篇日量约耗 ~3.0 CCUs（月度 ~90 CCUs，占 Google AI Pro 每月 200 CCUs 赠品额度的 ~45%）。
  - GAS 侧读取 50+ 篇 `.txt` 与纯 HTTP 点火共耗时 ~43–53 秒；Worker 脚本本身无状态，可在需要时平移至本地 GPU 或其他 Serverless GPU 运行。
  - 生命周期联动：`src/scripts/google_drive.js` 的 `gdriveCleanNewsFeed()` 统一清理 `text/` 与 `audio/` 中早于 18 小时的旧文件。

---

## 6. 权限与维护红线

- **OAuth 权限范围**：遵循最小权限原则，仅依赖实际启用脚本涉及的服务（Calendar `calendar`、Gmail `gmail.modify`、Drive `drive`、Sheets `spreadsheets`、外部网络 `script.external_request`）。Colab OAuth 凭证严格限定 `openid` 与 `userinfo.email`，禁止授予 Google Drive 权限。
- **`.clasp.json` 与 Web App 部署约定**：仓库已绑定目标 `scriptId`（`rootDir: "src"`），非明确要求不得改写为其它项目 ID；修改 `news_tts_colab.js` 的 `doPost` 回调逻辑后，必须执行 `clasp deploy -i <deploymentId>` 更新固定 Web App 部署（或同步更新脚本属性 `NEWS_TTS_WEBAPP_URL`），仅 `clasp push` 不会更新 Web App 版本。
- **破坏性操作**：调整 `gmail.js` 或 `google_drive.js` 的筛选规则后，先以 `dryRun: true`（Drive）或小批验证确认匹配范围再上线定时触发器。
- **安全约束**：禁止把 `GEMINI_API_KEY`、`DEEPSEEK_API_KEY`、`GROQ_API_KEY`、`COLAB_CLIENT_SECRET`、`COLAB_REFRESH_TOKEN` 或个人隐私凭证写入源码或提交进 Git。
