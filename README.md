# Google Apps Scripts 谷歌应用脚本工具集

## 1. 目的

本文档旨在详细记录 `routine/google-apps-scripts` 目录下的所有Google Apps Script工具，为本项目的未来开发提供便利，核心目的是**复用现有能力，避免重复造轮子**。

**重要提示：** `google-apps-scripts` 目录工具变更后，请及时更新此备忘录，确保文档的准确性和时效性。

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
routine/google_apps_scripts/
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
- `utils_network.js` - 网络请求工具库（HTTP请求、重定向处理、超时控制）

**业务功能脚本：**
- `calendar.js` - 日历事件监控和变更检测
- `gmail.js` - 邮件自动归档和删除（包含归档3天前和删除1年前功能）
- `google_drive.js` - Google Drive文件清理脚本，支持多种清理场景
- `google_sheets.js` - Google Sheets数据操作和微信公众号数据更新
- `demo_models.js` - AI模型调用演示脚本
- `news_feed.js` - RSS新闻AI过滤系统，从RSS源获取新闻并通过AI分类过滤（详细文档参见 [news_feed.md](news_feed.md)）

### 部署建议

**模块化部署原则：**
1. **核心依赖**：`utils.js`是所有业务脚本的必需依赖
2. **功能模块**：根据业务脚本功能选择对应的工具库
   - `utils_google_drive.js`：使用Google Drive功能的脚本（如`google_drive.js`、`news_feed.js`）
   - `utils_google_sheets.js`：使用Google Sheets功能的脚本（如`google_sheets.js`）
   - `utils_ai.js`：使用AI服务功能的脚本（如`demo_models.js`）
3. **按需部署**：根据实际需求选择业务脚本
4. **统一配置**：API密钥存储在Google Apps Script脚本属性中

**部署示例：**
- **日历/邮件脚本**：只需部署 `utils.js` + `calendar.js`/`gmail.js`
- **Drive清理脚本**：需部署 `utils.js` + `utils_google_drive.js` + `google_drive.js`
- **Sheets脚本**：需部署 `utils.js` + `utils_google_drive.js` + `utils_google_sheets.js` + `google_sheets.js`
- **AI演示脚本**：需部署 `utils.js` + `utils_ai.js` + `demo_models.js`
- **RSS新闻脚本**：需部署 `utils.js` + `utils_google_drive.js` + `utils_ai.js` + `utils_network.js` + `news_feed.js`

## 4. 使用说明

### 3.1 脚本部署
1. 打开 [Google Apps Script](https://script.google.com/)
2. 创建新项目或导入现有脚本
3. 复制对应脚本代码到编辑器
4. 配置必要权限
5. 设置触发器（定时或事件驱动）

### 3.2 脚本运行
```javascript
// 在Google Apps Script编辑器中运行
monitorCalendarChanges();     // 日历监控
gmailAutoArchive();          // 邮件归档
gdriveCleanAiStudio();           // Drive清理
```

### 3.3 依赖要求
所有脚本都依赖 `utils.js` 核心工具函数库，部分脚本还需依赖 `utils_google_drive.js`、`utils_google_sheets.js` 或 `utils_ai.js`，请根据脚本功能确保部署相应文件。

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
- `Utils.cleanHtmlContent(html, options)` - 通用HTML内容清理和格式化，保留基本段落格式

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
- **无冲突**：采用多个命名空间对象（Utils、UtilsGoogle、UtilsAI、UtilsNetwork），完全避免命名冲突
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
- `UtilsGoogleSheets.readSheetData(file, rangeA1)` - 读取Google Sheets文件指定范围数据
- `UtilsGoogleSheets.readSheetByFileName(fileName, sheetName, rangeA1)` - 通过文件名读取Google Sheets数据
- `UtilsGoogleSheets.updateSheetByFileName(fileName, sheetName, rangeA1, data)` - 通过文件名更新Google Sheets数据
- `UtilsGoogleSheets.clearSheetByFileName(fileName, sheetName, rangeA1)` - 通过文件名清空Google Sheets数据
- `UtilsGoogleSheets.findTextInColumn(fileName, sheetName, column, searchText)` - 在Google Sheets列中查找文本内容
- `UtilsGoogleSheets.columnToNumber(column)` - 将列字母转换为列号
- `UtilsGoogleSheets.numberToColumn(columnNumber)` - 将列号转换为列字母
- `UtilsGoogleSheets.updateSheetWithAutoRange(fileName, sheetName, targetRangeStart, sourceData)` - 智能更新数据，自动计算并匹配范围
- `UtilsGoogleSheets.updateSheetByContentMatch(targetFileName, targetSheetName, searchColumn, sourceFile, searchRange, dataRange, updateRangeStart)` - 基于内容匹配的智能数据更新

### 4.4 `utils_ai.js` - AI服务工具库
**功能：** 提供多模型AI服务调用功能（支持多种AI服务），采用命名空间模式封装在UtilsAI对象中
- **设计模式：** 命名空间封装，避免全局作用域污染

#### AI服务调用工具
- `UtilsAI.askGemini(prompt, model)` - 调用AI服务API获取AI回复
- `UtilsAI.askDeepseek(prompt, model)` - 调用AI服务API获取AI回复
- `UtilsAI.askGroq(prompt, model)` - 调用AI服务API获取AI回复

### 4.5 `utils_network.js` - 网络请求工具库
**功能：** 提供通用HTTP请求功能，支持重定向、超时、用户代理配置等，采用命名空间模式封装在UtilsNetwork对象中
- **设计模式：** 命名空间封装，避免全局作用域污染

#### 网络请求工具
- `UtilsNetwork.fetchWithRetry(url, options)` - 通用HTTP请求函数，支持重定向、超时和自定义配置
- `UtilsNetwork.fetchXml(url, options)` - 专门用于获取和解析XML内容的函数（RSS/Atom解析专用）
- `UtilsNetwork.fetchHtml(url, options)` - 获取HTML内容（专门用于网页抓取）
- `UtilsNetwork.fetchText(url, options)` - 简单的GET请求，返回文本内容
- `UtilsNetwork.checkUrlAccessible(url, options)` - 检查URL是否可访问（HEAD请求）
- `UtilsNetwork.fetchHeaders(url, options)` - 获取响应头信息

#### 设计特点
- **重定向处理**：支持自动跟随重定向，可配置最大重定向次数
- **超时控制**：可配置请求超时时间，避免长时间阻塞
- **用户代理伪装**：使用标准的浏览器User-Agent，避免被网站屏蔽
- **异常处理**：支持静默HTTP异常处理，便于错误恢复

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
- **📊 智能数据更新**：自动计算数据范围，避免截断问题
- **🔍 内容匹配更新**：基于内容查找定位，智能更新对应行数据
- **🔄 批量处理**：支持多文件、多工作表的批量数据同步
- **🤖 自动化流程**：微信公众号数据自动更新完整流程
- **📝 标准化日志**：使用Utils工具函数进行日志记录

#### 主要函数
- `mpWechatDataUpdate()` - 微信公众号数据自动更新主函数

#### 技术特点
- **复用工具函数**：充分利用UtilsGoogleSheets.js中的智能更新函数
- **动态范围计算**：根据数据大小自动匹配更新范围
- **错误处理完善**：完善的异常捕获和日志记录
- **代码简洁**：业务逻辑清晰，技术细节封装

#### 使用示例
```javascript
// 调用微信公众号数据更新
mpWechatDataUpdate();

// 使用新的智能工具函数
const success1 = UtilsGoogleSheets.updateSheetWithAutoRange("目标表格", "工作表名", "A1", data);
const success2 = UtilsGoogleSheets.updateSheetByContentMatch("目标表格", "工作表名", "A", sourceFile, "A2:A2", "A2:Z1000", "A");
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
const geminiResponse = UtilsAI.askGemini('你好，请用一句话介绍你自己。', 'model-name-1');
const deepseekResponse = UtilsAI.askDeepseek('你好，请用一句话介绍你自己。', 'model-name-2');
const groqResponse = UtilsAI.askGroq('你好，请用一句话介绍你自己。', 'model-name-3');
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

## 8. 触发器设置

### 8.1 时间触发器
```javascript
// 建议的触发器配置
// 邮件归档：每天凌晨2点
// Drive清理：每周日凌晨3点
// 日历监控：每15分钟一次
```

### 8.2 事件触发器
```javascript
// 可选的事件触发器
// 日历监控：日历变更事件触发
// 邮件归档：新邮件到达触发
```

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