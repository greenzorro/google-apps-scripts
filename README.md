# Google Apps Scripts 谷歌应用脚本工具集

## 1. 目的

这是一套自用的 Google Workspace 自动化脚本（日历、Gmail、Drive、Sheets、RSS+AI 等）。本机到 Apps Script 的部署交给 Agent；你确认要开哪些能力，在浏览器里完成 Google 授权，按需把 API Key 填进脚本属性，并决定要不要开定时触发器。

能力细节见下方清单（改代码时也当作速查；维护约定仍以仓库内其它说明为准）。

## 2. 功能特性

### 🚀 强大的自动化能力

提供完整的Google Workspace自动化解决方案：

- 📅 **日历监控**：智能监测日历事件变化，自动响应最新更新
- 📧 **邮件管理**：智能归档系统，保持收件箱整洁有序
- 📁 **文件清理**：Google Drive自动清理，释放存储空间
- 📊 **表格操作**：Google Sheets数据读取、更新和自动化处理
- ⏰ **定时执行**：支持时间触发器和事件触发器
- 📊 **日志记录**：标准化的执行日志和操作摘要
- 🔧 **命名空间模式**：采用Utils对象封装，避免全局污染

## 3. 项目结构

### 文件组织

```
projects/google-apps-scripts/
├── utils.js              # 核心工具函数库 (必需依赖)
├── utils_google_drive.js # Google Drive操作工具库
├── utils_google_sheets.js# Google Sheets操作工具库
├── utils_ai.js           # AI服务工具库
├── utils_network.js      # 网络请求工具库
├── calendar.js           # 日历变更监控脚本
├── gmail.js              # 智能邮件管理脚本（归档+删除）
├── google_drive.js       # Google Drive文件清理脚本
├── google_sheets.js      # Google Sheets数据操作脚本
├── demo_models.js        # AI模型调用演示脚本
├── news_feed.js          # RSS新闻AI过滤系统脚本
├── news_feed.md          # RSS新闻系统详细文档
└── README.md             # 项目文档
```

### 脚本分类

**核心工具库：**
- `utils.js` - 所有业务脚本的必需依赖，提供核心工具函数（数学计算、时间处理、文本处理、HTML处理、日志记录）
- `utils_google_drive.js` - Google Drive操作工具库（文件夹、文件管理、清理功能）
- `utils_google_sheets.js` - Google Sheets操作工具库（数据读取、更新、查找功能）
- `utils_ai.js` - AI服务工具库（支持多种AI服务API调用）
- `utils_network.js` - 网络请求工具库（HTTP 请求、User-Agent、重定向跟随）

**业务功能脚本：**
- `calendar.js` - 日历事件监控和变更检测
- `gmail.js` - 邮件自动归档和删除（包含归档3天前和删除1年前功能）
- `google_drive.js` - Google Drive文件清理脚本，支持多种清理场景
- `google_sheets.js` - Google Sheets数据操作和微信公众号数据更新
- `demo_models.js` - AI模型调用演示脚本
- `news_feed.js` - RSS新闻AI过滤系统，从RSS源获取新闻，通过AI模型链分类过滤并保存到Drive（详细文档参见 [news_feed.md](news_feed.md)）


## 4. 工具清单

### 4.1 `utils.js` - 核心工具函数库
**功能：** 提供通用的工具函数，采用命名空间模式封装在Utils对象中
- **设计模式：** 命名空间封装，避免全局作用域污染

#### 核心工具函数
**数学计算工具：**
- `Utils.calculatePercentage(part, total)` - 计算百分比，自动处理除零
- `Utils.safeParseInt(value, defaultValue)` - 安全解析整数，处理NaN情况
- `Utils.validateNumberRange(value, min, max, paramName)` - 验证数字参数是否在有效范围内

**时间处理工具：**
- `Utils.getDateDaysAgo(days)` - 获取X天前的日期
- `Utils.getDateMinutesAgo(minutes)` - 获取X分钟前的日期时间
- `Utils.getMonthRange(monthsBack, monthsForward)` - 获取月份范围
- `Utils.isTimeDifferenceValid(targetTime, maxDifferenceMinutes)` - 检查时间差有效性

**文本处理工具：**
- `Utils.hasExcludedChars(text, excludedArray)` - 检查文本是否包含排除字符
- `Utils.safeFileName(text, maxLength)` - 生成安全的文件名，移除非法字符并限制长度
- `Utils.cleanHtmlContent(html, options)` - 将 HTML 清理为纯文本；可选保留段落换行、移除图片

**HTML处理工具：**
- `Utils.removeHtmlElementsBySelector(html, selectors)` - 从HTML内容中移除指定选择器匹配的元素，支持CSS类、属性、标签选择器
- `Utils.extractElement(html, selector, options)` - 增强版HTML元素提取，支持嵌套元素处理

**日志记录工具：**
- `Utils.logStart(scriptName)` - 标准化脚本开始日志
- `Utils.logEnd(scriptName, summary)` - 标准化脚本结束日志
- `Utils.logAction(action, details)` - 标准化操作日志
- `Utils.logError(error, context)` - 标准化错误日志
- `Utils.logScanRange(itemType, totalCount, range)` - 标准化扫描范围日志


#### 设计优势
- **无冲突**：采用多个命名空间对象（Utils、UtilsGoogleDrive、UtilsGoogleSheets、UtilsAI、UtilsNetwork），完全避免命名冲突
- **高可读性**：`Utils.cleanHtmlContent()`等函数让代码自解释
- **智能提示友好**：编辑器支持`Utils.`、`UtilsGoogleDrive.`、`UtilsGoogleSheets.`、`UtilsAI.`、`UtilsNetwork.`后的自动补全
- **模块化组织**：函数按功能域分类，便于维护和扩展
- **AI能力集成**：内置多个AI服务API，支持智能化扩展

### 4.2 `utils_google_drive.js` - Google Drive操作工具库
**功能：** 提供Google Drive的自动化操作功能，采用命名空间模式封装在UtilsGoogleDrive对象中
- **设计模式：** 命名空间封装，避免全局作用域污染

#### Google Drive操作工具
- `UtilsGoogleDrive.getFolderByName(folderName)` - 按名称获取Drive文件夹
- `UtilsGoogleDrive.getFolderByPath(folderPath)` - 按路径获取Drive文件夹
- `UtilsGoogleDrive.findFileInFolder(folder, fileName)` - 在文件夹中查找文件
- `UtilsGoogleDrive.findFileWithExtensions(folder, baseName)` - 查找带扩展名的文件
- `UtilsGoogleDrive.ensureNestedFolderExists(folderPath)` - 确保嵌套文件夹路径存在，如果不存在则创建
- `UtilsGoogleDrive.saveOrUpdateFile(folder, fileName, content)` - 保存或更新文件到指定文件夹

- `UtilsGoogleDrive.cleanFilesInFolder(target, options)` - 通用文件处理引擎，支持多种过滤条件和操作，返回处理统计结果。当target是路径字符串时，使用`getFolderByPath()`获取文件夹。支持`returnFileList: true`选项返回符合条件的文件列表。
- `UtilsGoogleDrive.isFileOlderThan(file, timeThreshold, timeField)` - 判断文件是否早于指定时间，支持字符串格式（如"7d"、"18h"）
- **过滤条件类型**：
  - `time` - 时间过滤（支持`olderThan`参数和`field`字段）
  - `filename_pattern` - 文件名正则匹配
  - `exclude_chars` - 排除特定字符
  - `no_extension` - 无扩展名文件
  - `has_extension` - 指定扩展名文件
  - `min_size`/`max_size` - 文件大小范围过滤

### 4.3 `utils_google_sheets.js` - Google Sheets操作工具库
**功能：** 提供Google Sheets的自动化操作功能，采用命名空间模式封装在UtilsGoogleSheets对象中
- **设计模式：** 命名空间封装，避免全局作用域污染

#### Google Sheets操作工具
- `UtilsGoogleSheets.readSheetData(file, rangeA1)` - 读取表格文件指定范围（Google Sheets 取首表；CSV 经 `Utilities.parseCsv` 解析后按 A1 范围切片，支持引号字段内换行/逗号）
- `UtilsGoogleSheets.readSheetByFileName(fileName, sheetName, rangeA1)` - 通过文件名与工作表名读取指定区域
- `UtilsGoogleSheets.updateSheetByFileName(fileName, sheetName, rangeA1, data)` - 通过文件名更新Google Sheets数据
- `UtilsGoogleSheets.clearSheetByFileName(fileName, sheetName, rangeA1)` - 通过文件名清空Google Sheets数据
- `UtilsGoogleSheets.findTextInColumn(fileName, sheetName, column, searchText)` - 在Google Sheets列中查找文本内容
- `UtilsGoogleSheets.columnToNumber(column)` - 将列字母转换为列号
- `UtilsGoogleSheets.numberToColumn(columnNumber)` - 将列号转换为列字母
- `UtilsGoogleSheets.updateSheetWithAutoRange(fileName, sheetName, targetRangeStart, sourceData)` - 智能更新数据：将源数据规整为等宽矩形后，按起始单元格自动计算目标范围并写入
- `UtilsGoogleSheets.updateSheetByContentMatchOrAppend(targetFileName, targetSheetName, searchColumn, sourceFile, dataRange, headerRows, options)` - 基于内容匹配的批量更新：遍历所有行，找到的更新，未匹配的可选追加（options.appendIfNotFound 控制是否追加，默认true）

### 4.4 `utils_ai.js` - AI服务工具库
**功能：** 提供多模型AI服务调用功能（支持多种AI服务），采用命名空间模式封装在UtilsAI对象中
- **设计模式：** 命名空间封装，避免全局作用域污染

#### AI服务调用工具
- `UtilsAI.withRetry(operation, options)` - 对AI调用执行有限重试，支持自定义重试间隔和`shouldRetry`停止策略
- `UtilsAI.askGemini(options)` - 使用对象参数调用Gemini，支持 `prompt` / `messages` / `model` / `temperature` / `maxTokens` 等配置
- `UtilsAI.askDeepseek(options)` - 使用对象参数调用DeepSeek，支持通用生成参数与 `deepseek.thinking` 等专有配置
- `UtilsAI.askGroq(options)` - 使用对象参数调用Groq，支持通用生成参数与 `groq.reasoningEffort` 等专有配置
- `UtilsAI.askCerebras(options)` - 使用对象参数调用Cerebras，支持通用生成参数与 `cerebras.reasoningEffort` 等专有配置

#### 设计特点
- **统一参数接口**：所有AI服务均使用对象参数，支持`prompt`、`messages`、`systemPrompt`等通用字段
- **可控重试**：`withRetry()`支持最大尝试次数、重试间隔和按错误类型停止当前重试链
- **多服务商支持**：Gemini、DeepSeek、Groq、Cerebras共用工具层，业务脚本可按模型链组合使用
- **错误透传**：API错误包含服务商、HTTP状态码和响应摘要，便于业务层进行模型切换和熔断

### 4.5 `utils_network.js` - 网络请求工具库
**功能：** 封装 UrlFetchApp 的通用 HTTP 请求，采用命名空间模式封装在 UtilsNetwork 对象中
- **设计模式：** 命名空间封装，避免全局作用域污染

#### 网络请求工具
- `UtilsNetwork.fetchWithRetry(url, options)` - 通用 HTTP 请求；默认由平台跟随重定向，也可关闭后手动跟随
- `UtilsNetwork.fetchXml(url, options)` - 获取 XML 文本（RSS/Atom 等）
- `UtilsNetwork.fetchHtml(url, options)` - 获取 HTML 文本
- `UtilsNetwork.fetchText(url, options)` - GET 请求并返回文本
- `UtilsNetwork.checkUrlAccessible(url, options)` - HEAD 探测 URL 是否可访问
- `UtilsNetwork.fetchHeaders(url, options)` - 获取响应头

#### 设计特点
- **重定向**：默认 `followRedirects=true` 交给 UrlFetchApp；关闭后可按 `maxRedirects` 手动跟随
- **用户代理**：默认浏览器形态 User-Agent，降低被简单拦截的概率
- **异常处理**：默认 `muteHttpExceptions`，便于调用方按状态码处理

### 4.6 `calendar.js` - 日历变更监控脚本
**功能：** 在13个月时间范围内监控Google日历的最新更新事件
- **支持平台：** Google Calendar

#### 核心功能
- **📅 大范围监控**：覆盖过去6个月、当月和未来6个月的日历事件
- **⏱️ 智能时间窗**：15分钟有效性检查，避免误报陈旧更新
- **📋 详细报告**：输出完整的事件信息（标题、时间、参与者、描述等）
- **🎯 精准识别**：区分有效的新建/更新事件和因删除导致的陈旧更新
- **📝 标准化日志**：使用Utils.logStart()、Utils.logEnd()等工具函数

#### 核心规则
只有在事件的"最后更新时间"与脚本运行时间的差值在15分钟以内时，才视为有效的新创建或更新。

#### 使用示例
```javascript
// 调用方式
monitorCalendarChanges();

// 使用工具函数
const { startTime, endTime } = Utils.getMonthRange(6, 6);
const isValid = Utils.isTimeDifferenceValid(lastUpdatedTime, 15);
Utils.logScanRange("日历事件", events.length);
```

### 4.7 `gmail.js` - 智能邮件管理脚本
**功能：** 提供 Gmail 收件箱的自动化管理，包括归档和删除功能
- **支持平台：** Gmail

#### 核心功能
- **📧 智能筛选**：基于时间、星标状态的综合筛选机制
- **🔄 批量处理**：单次运行可处理最多400个邮件会话
- **⚙️ 参数灵活**：可配置的延迟天数和批处理大小
- **📊 执行报告**：详细的归档统计和执行摘要
- **📝 标准化日志**：使用Utils.logStart()、Utils.logAction()等工具函数

#### 主要函数
- `gmailAutoArchive()` - 自动归档3天前的未加星标邮件会话
- `gmailAutoTrash()` - 自动删除1年前的未加星标邮件会话到垃圾桶

#### 使用示例
```javascript
// 调用方式
gmailAutoArchive();      // 归档老邮件
gmailAutoTrash();        // 删除老邮件到垃圾桶

// 使用工具函数
const cutoffDate = Utils.getDateDaysAgo(DELAY_DAYS);
Utils.logAction("归档", {subject: subject, extra: "详细信息"});
Utils.logEnd("Gmail 自动归档", summary);
```

### 4.8 `google_drive.js` - 文件自动清理脚本
**功能：** 提供Google Drive文件清理功能，基于`UtilsGoogleDrive.cleanFilesInFolder()`通用清理引擎实现，支持多种清理场景的配置化执行。
- **支持平台：** Google Drive
- **设计模式：** 配置驱动，使用通用清理引擎，统一错误处理和日志记录

#### 主要函数
- `gdriveCleanScreenshots()` - 清理screenshots目录中创建时间超过7天的所有文件
- `gdriveCleanAiStudio()` - 清理"Google AI Studio"文件夹中符合条件的文件（无扩展名、不含排除字符、最后更新时间超过7天）
- `gdriveCleanWechatMpData()` - 清理微信公众号数据目录中早于当天的日期文件（基于文件名日期前缀和创建时间）
- `gdriveCleanNewsFeed()` - 清理app_data/news_feed/text和app_data/news_feed/audio目录中创建时间早于18小时的新闻文件

#### 技术特点
- **配置驱动**：所有清理函数使用`UtilsGoogleDrive.cleanFilesInFolder()`通用引擎，通过配置对象定义过滤条件
- **统一管道**：文件遍历、过滤、操作、日志记录、错误处理通过统一管道执行
- **标准化输出**：返回标准化的清理统计结果，包含处理数量、成功数量、错误详情等
- **可复用性**：过滤条件可任意组合，支持时间、文件名模式、扩展名、排除字符等多种过滤类型

#### 配置示例
```javascript
// gdriveCleanAiStudio() 的实际配置
return UtilsGoogleDrive.cleanFilesInFolder("Google AI Studio", {
  filters: [
    { type: 'no_extension' },
    { type: 'exclude_chars', chars: ['📌', '🗄️'] },
    { type: 'time', olderThan: '7d', field: 'lastUpdated' }
  ],
  action: 'trash'
});

// 新增清理任务的配置模式
function newCleanTask() {
  return UtilsGoogleDrive.cleanFilesInFolder("目标文件夹", {
    filters: [
      { type: 'filename_pattern', pattern: '^report_' },
      { type: 'time', olderThan: '30d', field: 'lastUpdated' }
    ],
    action: 'trash',
    dryRun: true  // 试运行模式，不实际执行操作
  });
}
```

#### 使用示例
```javascript
// 调用现有清理函数
gdriveCleanScreenshots();
gdriveCleanAiStudio();
gdriveCleanWechatMpData();
gdriveCleanNewsFeed();

// 查看清理结果（cleanFilesInFolder返回详细统计）
const result = gdriveCleanScreenshots();
console.log(`处理了 ${result.processed} 个文件，移动了 ${result.actioned} 个文件到回收站`);
```

### 4.9 `google_sheets.js` - Google Sheets数据操作脚本
**功能：** 提供Google Sheets数据自动化操作功能，支持微信公众号数据更新
- **支持平台：** Google Sheets

#### 核心功能
- **📊 智能数据更新**：自动计算数据范围，写入前规整为矩形数组
- **🔍 内容匹配更新**：基于内容查找定位，智能更新对应行数据
- **🔄 批量处理**：支持多文件、多工作表的批量数据同步
- **🤖 自动化流程**：从 Drive `app_data/Backup/mp_wechat` 读取当日 traffic / content / user CSV，写入「微信公众号数据」表格
- **📝 标准化日志**：使用Utils工具函数进行日志记录

#### 主要函数
- `mpWechatDataUpdate()` - 微信公众号数据自动更新主函数（缺文件时跳过对应表并记日志；CSV 经 UtilsGoogleSheets 解析，支持「内容标题」等字段内换行）

#### 技术特点
- **复用工具函数**：充分利用UtilsGoogleSheets.js中的智能更新函数
- **动态范围计算**：根据数据大小自动匹配更新范围
- **错误处理完善**：完善的异常捕获和日志记录
- **代码简洁**：业务逻辑清晰，技术细节封装

#### 使用示例
```javascript
// 调用微信公众号数据更新
mpWechatDataUpdate();

// 智能范围更新
const success1 = UtilsGoogleSheets.updateSheetWithAutoRange("目标表格", "工作表名", "A1", data);
// 批量更新：匹配的更新，未匹配的追加
const success2 = UtilsGoogleSheets.updateSheetByContentMatchOrAppend("目标表格", "工作表名", "A", sourceFile, "A1:I1000", 1);
// 批量更新：只更新已存在的，不追加新内容
const success3 = UtilsGoogleSheets.updateSheetByContentMatchOrAppend("目标表格", "工作表名", "A", sourceFile, "A1:I1000", 1, { appendIfNotFound: false });
```

### 4.10 `demo_models.js` - AI模型调用演示脚本
**功能：** 演示如何使用UtilsAI对象中的AI服务工具函数进行各种AI模型的调用测试
- **支持平台：** 多AI服务集成（支持多种AI服务）

#### 核心功能
- **多模型支持**：集成多种AI服务
- **统一接口**：通过UtilsAI对象统一调用不同AI服务
- **测试演示**：展示各种AI模型的调用方法和响应格式
- **标准化日志**：使用Utils.logStart()、Utils.logEnd()记录测试过程

#### 使用示例
```javascript
// 调用方式
testAllAIServices();

// 使用工具函数
const geminiResponse = UtilsAI.askGemini({
  prompt: '你好，请用一句话介绍你自己。',
  model: 'gemini-flash-lite-latest',
  maxTokens: 128
});
const deepseekResponse = UtilsAI.askDeepseek({
  prompt: '你好，请用一句话介绍你自己。',
  model: 'deepseek-v4-flash',
  maxTokens: 128
});
const groqResponse = UtilsAI.askGroq({
  prompt: '你好，请用一句话介绍你自己。',
  model: 'openai/gpt-oss-120b',
  maxTokens: 128
});
const cerebrasResponse = UtilsAI.askCerebras({
  prompt: '你好，请用一句话介绍你自己。',
  model: 'gemma-4-31b',
  maxTokens: 128
});
```

## 5. 使用场景

### 5.1 日常自动化维护
1. **日历同步**：监控重要日历变更，及时响应新事件
2. **邮件整理**：自动归档已处理的旧邮件（3天前），保持收件箱整洁
3. **邮件清理**：自动删除1年前的旧邮件到垃圾桶，释放存储空间
4. **存储管理**：定期清理无用的临时文件，释放Drive空间

### 5.2 工作效率提升
- **减少手动操作**：自动化重复性任务，节省时间和精力
- **智能决策**：基于预设规则进行判断，避免人工错误
- **实时监控**：及时发现和处理重要变更
- **命名空间模式**：Utils对象封装，代码更清晰专业

## 6. 技术特点

### 6.1 代码架构
- **模块化设计**：工具函数与业务逻辑分离
- **命名空间封装**：Utils对象避免全局污染
- **标准化接口**：统一的日志记录和操作接口
- **错误处理**：完善的异常捕获和错误日志记录
- **功能一致性**：所有脚本保持相同的代码风格和逻辑模式

### 6.2 命名空间优势
- **无冲突**：采用多个命名空间对象（Utils、UtilsGoogleDrive、UtilsGoogleSheets、UtilsAI），完全避免命名冲突
- **高可读性**：`Utils.formatDateForLogging()`让代码自解释
- **智能提示友好**：编辑器支持`Utils.`、`UtilsGoogleDrive.`、`UtilsGoogleSheets.`、`UtilsAI.`后的自动补全
- **模块化组织**：函数按功能域分类，便于维护和扩展

## 7. 权限要求

### 7.1 必要权限
- **Calendar.js**: `https://www.googleapis.com/auth/calendar`
- **Gmail.js**: `https://www.googleapis.com/auth/gmail.modify`
- **Google Drive.js**: `https://www.googleapis.com/auth/drive`

### 7.2 权限范围
所有脚本都遵循最小权限原则，只请求完成功能所必需的权限。


## 9. 错误处理

### 9.1 常见错误
- **权限不足**：确保脚本有正确的OAuth权限
- **配额限制**：注意Google Apps Script的执行时间和调用次数限制
- **API变更**：Google可能更新API，需要及时调整代码
- **工具函数缺失**：确保同时部署utils.js文件

### 9.2 调试建议
- 所有脚本都使用标准化的日志函数，便于问题定位
- 在Google Apps Script编辑器中进行测试
- 查看执行记录和错误日志
- 利用Utils对象的标准化格式快速识别问题

## 10. 维护指南

### 10.1 代码规范
- 所有业务脚本必须使用Utils对象进行工具函数调用
- 保持与现有脚本一致的代码风格和结构
- 新增功能时优先考虑复用现有工具函数
- 遵循统一的错误处理和日志记录模式

### 10.2 命名空间最佳实践
- 所有工具函数都封装在Utils对象中
- 使用`Utils.functionName()`格式调用工具函数
- 保持函数名的描述性和动词开头原则
- 按功能域分类组织工具函数

### 10.3 功能扩展
- 遵循现有架构，保持工具函数与业务逻辑分离
- 优先在Utils对象中添加新的通用工具函数
- 保持所有脚本的日志格式一致性
- 更新此备忘录以反映任何变更

## 使用上你需要关心的事

- **授权**：第一次跑某能力时，在 Apps Script 编辑器里点允许（含敏感权限）。
- **密钥**：AI 相关能力需要你在「项目设置 → 脚本属性」自行配置 `GEMINI_API_KEY` / `DEEPSEEK_API_KEY` / `GROQ_API_KEY` / `CEREBRAS_API_KEY`（不要写进仓库）。
- **定时**：需要周期性跑的，在编辑器里加时间触发器；清理类脚本先确认不会误删重要文件。
- **RSS 新闻**：行为与配置见 [news_feed.md](news_feed.md)。

---

Created by [Victor42](https://victor42.work/) & [Agent Vik](https://github.com/agent-vik/about-me)

---

# For Agent

Deploy selected scripts from this repo to the bound Google Apps Script project with `clasp`, then hand authorization and day-to-day trigger/use to the human. Batch human gates; do not turn setup into many back-and-forth rounds.

## Prerequisites

- Node.js + `@google/clasp` available (`npm i -g @google/clasp` if needed)
- A Google account the human can authorize in a browser
- This repo’s `.clasp.json` already points at the target `scriptId` (do not invent a new script id unless asked)

## Steps

1. Confirm which capability the human wants. Push only the matching file set:
   - Calendar / Gmail: `utils.js` + `calendar.js` / `gmail.js`
   - Drive cleanup: `utils.js` + `utils_google_drive.js` + `google_drive.js`
   - Sheets: `utils.js` + `utils_google_drive.js` + `utils_google_sheets.js` + `google_sheets.js`
   - AI demo: `utils.js` + `utils_ai.js` + `demo_models.js`
   - RSS news feed: `utils.js` + `utils_google_drive.js` + `utils_ai.js` + `utils_network.js` + `news_feed.js` (details in `news_feed.md`)
2. From the repo root:

```bash
clasp login    # if not already logged in — browser consent is a human gate
clasp push
clasp open     # opens the Apps Script editor for auth / manual Run
```

3. **Single handoff block for the human** (ask once, together):
   - Complete Google OAuth / sensitive-scope prompts
   - In the editor, run `authorizeProject` (from `authorization.js`) or the target entry function once so permissions stick
   - If AI features are needed, set Script Properties only as required: `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY` (never commit keys)
4. Entry functions (run in editor or via clasp run if configured):
   - `monitorCalendarChanges`, `gmailAutoArchive`, `gmailAutoTrash`
   - `gdriveCleanScreenshots`, `gdriveCleanAiStudio`, `gdriveCleanWechatMpData`, `gdriveCleanNewsFeed`
   - `mpWechatDataUpdate`, `testAllAIServices`
   - `processNewsFeedGroup1` … `processNewsFeedGroup4` (see `news_feed.js` / `news_feed.md`)
5. For schedules: after a successful manual run, guide the human to add time-driven triggers in the Apps Script UI (or equivalent). Prefer dry-run options where Drive cleanup APIs support `dryRun: true` before destructive runs.
6. Verify via Executions log: no auth errors; expected side effect visible (archived mail, cleaned Drive folder, sheet update, etc.). Then stop—ongoing monitoring is human/trigger-owned.

## Hand off to the human

- Browser Google login, 2FA, and first-time scope approval
- Script property secrets
- Trigger enablement and production dry-run vs live cleanup decisions

## Red lines

- Do not rewrite `.clasp.json` `scriptId` onto an arbitrary project
- Do not store API keys in source files or git
- Do not enable destructive Drive/Gmail cleanup on production data without an explicit human OK (prefer dry-run first)
- The Chinese body above is the capability catalog; deploy via the steps in this section
