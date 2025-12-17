# 📰 RSS新闻AI过滤系统

## 🎯 概述

基于Google Apps Scripts工具集实现的自动化新闻收集系统，从RSS源获取新闻、通过AI根据标题进行分类过滤、并按日期组织保存到Google Drive。

本系统起源于这个[Tasker程序](https://victor42.eth.limo/post/3652/)，用Google Apps Scripts重新实现了，在其基础上做了升级和扩展，功能更加强大。

## 🚀 核心功能

### 智能新闻收集
- **多RSS源支持**：可配置多个RSS/Atom源，支持中新网、cnbeta等主流新闻源
- **格式自适应**：自动检测和解析RSS 2.0和Atom 1.0格式
- **批量处理**：支持多个新闻条目的并行处理，可独立配置每个源的处理数量

### AI智能分类与总结
- **双AI服务架构**：分类使用Groq API (qwen/qwen3-32b)，总结使用Gemini API (gemini-flash-lite-latest)
- **多类别识别**：识别政治、财经、军事、科技、社会、娱乐、体育、天气、其他等9类新闻
- **精确过滤规则**：
  - 自动排除体育、军事、娱乐类新闻
  - 政治新闻中排除日本、韩国、台湾相关内容
  - 排除国家公职人员贪污腐败违纪相关处置报道
- **AI模型支持**：使用AI模型进行新闻分类和智能过滤
- **智能优化**：优化调用策略，确保在6分钟执行时限内高效完成

### 智能内容提取
- **双重内容源**：优先使用详情页抓取，RSS/Atom内容作为备用
- **可配置详情页抓取**：每个RSS源可独立配置内容选择器和排除选择器
- **HTML内容清理**：自动清理HTML标签，保留基本段落格式，移除图片和无关元素
- **记者信息过滤**：自动移除包含"记者"、"监制"、"作者"等关键词的末尾行

### AI智能总结
- **长内容处理**：当新闻内容超过500字符时，自动调用AI进行智能总结
- **长度控制**：AI总结后不进行强制截断，保持内容完整性
- **思考标签清理**：自动移除AI模型返回的思考标签（如<think>、</think>等）
- **内容标识**：AI总结内容添加"AI总结："前缀，原文添加"新闻原文："前缀
- **智能优化**：自动优化长文本内容，提升阅读体验

### 内容长度控制
- **三级过滤机制**：
  - **小于30字符**：直接丢弃，不保存到Drive（避免长图新闻等无文字内容）
  - **30-500字符**：保存新闻原文，保持内容完整性
  - **大于500字符**：自动调用AI总结，不进行长度限制
- **质量提升**：有效过滤无意义内容，节省存储空间，提高新闻可读性
- **智能判断**：在内容提取完成后进行长度检查，确保保存的新闻都有价值

### AI响应处理
- **思考标签清理**：AI模型返回的<think>和
</think>
思考标签会被自动清理，确保最终内容干净整洁
- **公共清理函数**：`NewsUtils.AI.cleanThinkingTags()`统一处理所有AI响应的思考标签
- **双重保护**：AI分类和AI总结都会自动清理思考标签

### 自动化存储管理
- **统一存储目录**：所有新闻文件保存在 `app_data/news_feed/text` 目录中
- **智能文件命名**：使用安全文件名规则，避免特殊字符冲突
- **文件更新机制**：相同标题的文件自动覆盖更新，无需人工干预
- **标准化内容格式**：文件包含来源、分类、标题、正文四个字段，并标注内容类型

## 🏗️ 系统架构

### 模块化设计
采用`NewsUtils`命名空间封装，包含4个专业模块：

| 模块 | 功能描述 | 主要函数 |
|------|---------|----------|
| **NewsUtils.RSS** | RSS处理模块 | `fetchAndParse()`, `parseRSS()`, `parseAtom()`, `getElementText()`, `getLink()` |
| **NewsUtils.Content** | 内容提取模块 | `extractNewsContent()`, `fetchDetailPageContent()`, `cleanFooterContent()`, `getContentSourceName()` |
| **NewsUtils.AI** | AI模块 | `classifyNewsByTitle()`, `summarizeContent()`, `cleanThinkingTags()` |
| **NewsUtils.Storage** | 存储管理模块 | `createNewsDateFolder()`(实际不按日期分文件夹), `formatNewsContent()`, `saveNewsToDrive()` |

## ⚙️ 配置说明

### RSS源配置 (`news_feed.js`)
```javascript
const RSS_FEEDS = [
  {
    url: 'https://www.chinanews.com.cn/rss/importnews.xml',
    name: '中新网',
    type: 'rss',
    processGroups: [1, 3],  // 对应 processNewsFeedGroup1() 和 processNewsFeedGroup3() 函数
    maxEntriesPerFeed: 20,  // 该源目标新新闻数量（真正通过去重过滤的新闻数），如果未设置则使用全局配置
    detailPageConfig: {
        enabled: true,  // 启用详情页抓取
        selectors: [    // 内容选择器（按优先级尝试）
            '.left_zw'
        ],
        excludeSelectors: [  // 排除选择器：从已选内容中移除匹配的元素
            '.adEditor',
            '.pictext'
        ],
        // timeout: 30000  // 可选：详情页请求超时（毫秒）
    }
  },
  {
    url: 'https://rss.cnbeta.com.tw',
    name: 'cnbeta',
    type: 'rss',
    processGroups: [2, 4],  // 对应 processNewsFeedGroup2() 和 processNewsFeedGroup4() 函数
    maxEntriesPerFeed: 20,  // 该源目标新新闻数量（真正通过去重过滤的新闻数），如果未设置则使用全局配置
    detailPageConfig: {
        enabled: true,  // 启用详情页抓取
        selectors: [    // 内容选择器（按优先级尝试）
            '#artibody'
        ],
        excludeSelectors: [  // 排除选择器：从已选内容中移除匹配的元素
            '.google-anno-skip',
            '.otherContent_01'
        ],
        // timeout: 30000  // 可选：详情页请求超时（毫秒）
    }
  }
];
```

### 存储配置
```javascript
const STORAGE_CONFIG = {
  rootFolder: 'app_data',
  subFolder: 'news_feed/text'
};
```

### 性能配置
```javascript
const PERFORMANCE_CONFIG = {
  maxEntriesPerFeed: 20,  // 每个RSS源目标新新闻数量（真正通过去重过滤的新闻数）
  requestTimeout: 30000,     // 网络请求超时（毫秒）
  aiRequestTimeout: 60000    // AI请求超时（毫秒）
};
```

### 内容提取配置
```javascript
const CONTENT_CONFIG = {
  minContentLength: 30,      // 最小内容长度阈值，低于此值丢弃不保存
  maxContentLength: 500,     // 最大内容长度阈值，超过此值使用AI总结
  detailPageTimeout: 30000,  // 详情页请求超时（毫秒）
  detailPageEnabled: true,   // 是否启用详情页抓取
};
```

### AI分类提示词
AI分类使用**Groq (qwen/qwen3-32b)模型**，通过if...else逻辑结构实现精确的分类判断：

```javascript
IF 分类是 体育新闻 OR 军事新闻 OR 娱乐新闻：
  保存标记 = 0
ELSE IF 分类是 政治新闻：
  // 特殊规则：日本、韩国、台湾内部政治或贪腐相关内容保存标记 = 0
  ...
ELSE：
  保存标记 = 1
```

最终输出格式：`保存标记,分类`（如：1,政治新闻 或 0,体育新闻）

### AI总结提示词
AI总结使用**Gemini (gemini-flash-lite-latest)模型**，自动提取核心信息并生成简洁版本：

```javascript
const AI_SUMMARIZATION_PROMPT = `请将以下新闻内容总结为不超过400字的简洁版本。要求：
1. 保留新闻的核心事实和关键信息
2. 保持逻辑清晰，语句通顺
3. 不要添加个人观点或评论
4. 不要使用"记者"、"监制"、"作者"等词汇
5. 直接输出总结内容，不要任何前缀或解释

新闻内容如下：`;
// 实际总结后会在内容前添加"AI总结："标识
// 总结后自动清理<think>等思考标签
```

## 📁 文件结构

### 存储结构
```
Google Drive/
└── app_data/                    # 已有目录
    └── news_feed/               # 新闻收集根目录
        └── text/                # 新闻文本存储目录
            ├── 中美贸易谈判取得新进展.txt
            ├── 央行降准释放流动性.txt
            └── 人工智能新突破.txt
```

### 文件内容格式

#### 新闻原文格式
```
来源: 中新网
分类: 财经新闻

中美贸易谈判取得新进展

新闻原文：
据最新消息，中美贸易谈判在华盛顿取得新进展。双方代表就关税问题进行了深入讨论...

双方就降低部分商品关税达成初步共识，预计将在下个月签署正式协议。此次谈判是今年以来中美两国最高级别的经贸对话...

[完整正文内容，保留基本段落格式]
```

#### AI总结格式
```
来源: cnbeta
分类: 科技新闻

苹果发布全新M3芯片

AI总结：
苹果公司今日发布了全新M3芯片，采用3纳米工艺制造，性能较上一代提升20%。该芯片内置神经网络引擎，支持机器学习任务加速。预计将首先应用于新款MacBook Pro和iMac产品线。

[AI总结后的简洁版本，去除思考标签，保持内容简洁]
```

## 🔧 依赖关系

### 必需依赖
| 文件 | 功能 | 是否必需 |
|------|------|----------|
| `news_feed.js` | 主脚本 | ✅ 必需 |
| `utils.js` | 核心工具库 | ✅ 必需 |
| `utils_ai.js` | AI服务工具库 | ✅ 必需 |
| `utils_google_drive.js` | Google Drive操作 | ✅ 必需 |
| `utils_network.js` | 网络请求工具 | ✅ 必需 |

### 部署建议
1. **基础部署**：`utils.js` + `utils_ai.js` + `utils_google_drive.js` + `utils_network.js` + `news_feed.js`
2. **权限要求**：`https://www.googleapis.com/auth/drive` + `https://www.googleapis.com/auth/script.external_request`
3. **API密钥配置**：在Google Apps Script编辑器中，通过"项目设置" → "脚本属性"配置以下密钥：
   - `GROQ_API_KEY`：Groq AI服务密钥（用于新闻分类）
   - `GEMINI_API_KEY`：Gemini AI服务密钥（用于新闻总结）
4. **触发器设置**：通过Google Apps Script编辑器图形界面配置每日定时执行

## 🚀 使用方法

### 1. 脚本部署
```javascript
// 在Google Apps Script编辑器中部署以下文件：
// 1. utils.js              (核心工具库)
// 2. utils_ai.js           (AI服务工具库)
// 3. utils_google_drive.js (Google Drive操作)
// 4. utils_network.js      (网络请求工具)
// 5. news_feed.js          (主脚本)
```

### 2. 配置RSS源
根据需要修改`news_feed.js`开头的`RSS_FEEDS`配置：
- 添加新的RSS源URL
- 配置`processGroups`指定在哪些入口函数中运行（数组格式，如[1, 3]）
- 配置`maxEntriesPerFeed`控制该源目标新新闻数量（真正通过去重过滤的新闻数）
- 配置详情页选择器（如果需要抓取详情页）
- 调整性能参数

### 3. 运行脚本
系统提供主函数和入口函数，支持错峰运行：

#### 方案一：多入口函数错峰运行（推荐）
```javascript
// 配置多个独立的定时触发器：

// 触发器1：每天运行 processNewsFeedGroup1()
// 例如：每天上午8:00执行，处理组1的RSS源

// 触发器2：每天运行 processNewsFeedGroup2()
// 例如：每天上午8:05执行，处理组2的RSS源

// 触发器3：每天运行 processNewsFeedGroup3()
// 例如：每天上午8:10执行，处理组3的RSS源

// 触发器4：每天运行 processNewsFeedGroup4()
// 例如：每天上午8:15执行，处理组4的RSS源

// 这样可以：
// 1. 分散AI API调用（分类用Groq，总结用Gemini），避免单点速率限制
// 2. 确保在6分钟时限内完成
// 3. 提高系统稳定性
// 4. 真正实现"处理N条全新新闻"，通过去重机制避免重复处理
```

#### 方案二：单入口函数（测试用）
```javascript
// 在Google Apps Script编辑器中手动运行
processNewsFeedGroup1();  // 只处理组1
processNewsFeedGroup2();  // 只处理组2
processNewsFeedGroup3();  // 只处理组3
processNewsFeedGroup4();  // 只处理组4

// 或创建临时触发器
// 建议：仅用于测试，生产环境使用方案一
```

### 4. 查看结果
- **执行日志**：在Google Apps Script日志中查看精简后的执行过程（保留核心信息）
- **保存的文件**：在Google Drive的`app_data/news_feed/text/`目录下查看
- **执行摘要**：脚本结束时显示处理的新闻数量、保存数量、跳过数量等统计信息

## ⚡ 性能优化

### 避免执行超时
- **分组处理**：系统提供主函数 processNewsFeedsByGroup() 和多个入口函数 processNewsFeedGroupN()，每个入口函数处理部分RSS源，避免单次执行时间过长
- **条目限制**：每个RSS源默认目标处理20个新新闻（真正通过去重过滤的新闻数，可独立配置）
- **超时设置**：网络请求30秒超时，AI请求60秒超时
- **错峰执行**：通过配置不同的触发时间，分散AI API调用（分类用Groq，总结用Gemini）
- **错误跳过**：所有错误类型均跳过当前条目，继续执行后续流程
- **去重机制**：在获取阶段检查已有文件，只处理真正全新的新闻，节省AI API调用

### 分组执行策略
- **分组配置**：通过RSS源的`processGroups`字段（数组格式，如[1, 3]）指定运行组别
- **时间间隔**：建议相邻触发器间隔5-10分钟执行
- **负载均衡**：每个RSS源可分配到多个组，实现负载分散
- **执行时间**：每个组预估执行时间约2-3分钟，完全在6分钟限制内

### 内存管理
- **分批处理**：限制单次处理的新闻条目数量
- **及时清理**：避免内存泄漏，使用局部变量
- **日志精简**：保留核心业务日志，删除冗余调试信息，日志量减少约70%

## 🔍 错误处理

### 错误类型及处理策略
| 错误类型 | 影响范围 | 处理策略 |
|----------|---------|----------|
| **网络错误** | 单个RSS源 | 跳过当前源，记录错误，继续处理其他源 |
| **解析错误** | 单个RSS源 | 跳过当前源，记录错误，继续处理其他源 |
| **AI API错误** | 单个新闻条目 | 跳过当前新闻，记录错误，继续处理其他新闻 |
| **保存错误** | 单个新闻条目 | 跳过当前新闻，记录错误，继续处理其他新闻 |
| **权限错误** | 整个脚本 | 停止执行，记录详细错误信息 |

### 日志记录
所有错误都使用标准化的`Utils.logError()`函数记录，包含：
- 错误类型和简要描述
- 错误发生的上下文信息
- 时间戳和脚本运行状态

## 📊 监控与维护

### 执行监控
- **日志分析**：定期检查执行日志，确保系统正常运行
- **成功率统计**：监控新闻保存成功率，识别异常模式
- **性能监控**：关注脚本执行时间，确保在限制内完成

### 定期维护
1. **RSS源检查**：定期验证RSS源的有效性和格式兼容性
2. **AI分类准确性**：抽样检查AI分类结果，确保过滤规则有效
3. **内容提取质量**：检查详情页抓取和内容处理效果
4. **存储空间管理**：监控Google Drive存储空间使用情况
5. **API服务管理**：确保各AI服务正常可用，配额充足

### 故障排查
| 问题现象 | 可能原因 | 解决方案 |
|----------|---------|----------|
| **脚本执行超时** | 处理新闻条目过多或分组不均衡 | 减少`maxEntriesPerFeed`配置值（目标新新闻数），调整`processGroups`分配 |
| **RSS源未被处理** | `processGroups`配置错误或触发器未配置 | 检查RSS源的`processGroups`数组值，确认触发器配置正确 |
| **AI服务异常** | 网络问题或服务不可用 | 检查网络连接，确认服务状态 |
| **文件保存失败** | Google Drive权限不足 | 检查脚本的Drive API权限配置 |
| **RSS获取失败** | RSS源URL变更或网络问题 | 验证RSS源URL有效性，检查网络连接 |
| **内容提取为空** | RSS格式变更或详情页结构变化 | 更新详情页选择器配置 |
| **触发器未执行** | 触发器配置错误或被禁用 | 检查Google Apps Script触发器配置，确保启用 |

## 🔄 扩展与定制

### 添加新的RSS源
1. 在`RSS_FEEDS`数组中添加新的配置对象
2. 配置`url`、`name`、`type`字段
3. 配置`processGroups`指定所属的入口函数（数组格式，如[1, 3]）
4. 配置`maxEntriesPerFeed`（可选，目标新新闻数量）
5. 如有需要，配置`detailPageConfig`选择器
6. 测试新源的获取和解析功能
7. 确保触发器配置正确，包含新的RSS源所在的所有组（1-4）

### 调整AI分类规则
1. 修改`AI_CLASSIFICATION_PROMPT`提示词
2. 调整新闻类别定义
3. 修改过滤条件和输出格式
4. 测试分类准确性和过滤效果

### 自定义存储结构
1. 修改`STORAGE_CONFIG`中的路径配置
2. 自定义文件名生成规则
3. 更新文件内容格式

### 性能调优
1. 调整`PERFORMANCE_CONFIG`中的超时和限制参数
2. 调整`CONTENT_CONFIG`中的内容长度阈值
3. 优化网络请求配置
4. 调整内容提取策略
5. 平衡处理速度和资源消耗

## ✅ 质量保证

### 测试覆盖
- **单元测试**：各模块功能的独立测试
- **集成测试**：端到端流程测试
- **边界测试**：异常情况和边界条件测试
- **性能测试**：执行时间和资源消耗测试
- **AI功能测试**：验证AI处理功能的准确性和稳定性

### 代码质量
- **命名空间封装**：使用`NewsUtils`命名空间，避免全局污染
- **模块化设计**：功能分离，高内聚低耦合
- **错误处理完善**：全面的异常捕获和处理机制
- **日志记录标准化**：统一使用`Utils.logStart/logEnd/logAction/logError`标准化函数，日志精简高效，保留核心信息
- **配置灵活性**：支持全局和局部配置参数
- **AI响应处理**：自动清理<think>思考标签，确保内容质量

### 可维护性
- **配置集中管理**：所有配置参数集中在脚本开头
- **代码注释完善**：关键函数和逻辑都有详细注释
- **文档完整**：本文档提供全面的使用和维护指导
- **向后兼容**：API设计和接口保持稳定，便于升级

---

**最后更新**：2025-12-17
**状态**：已实施完成，生产环境可用（双AI服务架构：分类用Groq (qwen3-32b)，总结用Gemini (gemini-flash-lite-latest)，支持4组触发器和去重机制）
**维护者**：Victor Cheng (hi@victor42.work)
