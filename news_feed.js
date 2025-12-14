/*
 * File: news_feed.js
 * Project: google_apps_scripts
 * Created: 2025-12-09 12:14:21
 * Author: Victor Cheng
 * Email: hi@victor42.work
 * Description: RSS新闻AI过滤系统，从RSS源获取新闻，通过Groq AI根据标题进行分类过滤，
 * 并保存到Google Drive的指定目录的自动化系统。
 */

// ==================== 配置部分 ====================

/**
 * RSS源配置列表
 * 每个源包含URL、名称、类型和可选的配置项
 *
 * 配置字段说明：
 * - url: RSS源URL
 * - name: 源名称
 * - type: 源类型 ('rss' 或 'atom')
 * - processGroup: 处理分组编号，指定在哪个入口函数中运行（1, 2, 3...）
 * - maxEntriesPerFeed: (可选) 该源最大处理条目数，未设置则使用全局配置
 * - detailPageConfig: (可选) 详情页抓取配置
 */
const RSS_FEEDS = [
  {
    url: 'https://www.chinanews.com.cn/rss/importnews.xml',
    name: '中新网',
    type: 'rss',
    processGroup: 1,  // 对应 processNewsFeedGroup1() 函数
    maxEntriesPerFeed: 50, // 该源最大处理条目数，如果未设置则使用全局配置
    detailPageConfig: {
        enabled: true,  // 详情页抓取
        selectors: [    // 内容选择器（按优先级尝试）
            '.left_zw'
        ],
        excludeSelectors: [  // 排除选择器：从已选内容中移除匹配的元素
            '.adEditor',
            '.pictext'
        ]
    }
  },
  {
    url: 'https://rss.cnbeta.com.tw',
    name: 'cnbeta',
    type: 'rss',
    processGroup: 2,  // 对应 processNewsFeedGroup2() 函数
    maxEntriesPerFeed: 50, // 该源最大处理条目数，如果未设置则使用全局配置
    detailPageConfig: {
        enabled: true,  // 详情页抓取
        selectors: [    // 内容选择器（按优先级尝试）
            '#artibody'
        ],
        excludeSelectors: [  // 排除选择器：从已选内容中移除匹配的元素
            '.google-anno-skip',
            '.otherContent_01'
        ]
    }
  }
];

/**
 * 存储配置
 */
const STORAGE_CONFIG = {
  rootFolder: 'app_data',
  subFolder: 'news_feed/text'
};

/**
 * 性能配置（全局默认值）
 * 当RSS源未配置特定值时使用这些默认值
 */
const PERFORMANCE_CONFIG = {
  maxEntriesPerFeed: 50, // 每个RSS源最大处理条目数（避免超时）
  requestTimeout: 30000, // 网络请求超时（毫秒）
  aiRequestTimeout: 60000 // AI请求超时（毫秒）
};

/**
 * 内容提取配置
 */
const CONTENT_CONFIG = {
  minContentLength: 30, // 最小内容长度阈值，低于此值丢弃不保存
  maxContentLength: 500, // 最大内容长度阈值，超过此值使用AI总结
  detailPageTimeout: 30000, // 详情页请求超时（毫秒）
  detailPageEnabled: true, // 是否启用详情页抓取
};

/**
 * AI分类提示词配置
 */
const AI_CLASSIFICATION_PROMPT = `给定一条新闻标题，判断它属于哪类新闻，并输出保存标记。

请严格按照以下if...else逻辑执行判断：

第一步：确定新闻分类
从以下类别中选择最匹配的一项：政治新闻、财经新闻、军事新闻、科技新闻、社会新闻、娱乐新闻、体育新闻、天气新闻、其他新闻

第二步：根据分类确定保存标记
IF 分类是 体育新闻 OR 军事新闻 OR 娱乐新闻：
  保存标记 = 0
ELSE IF 分类是 政治新闻：
  IF 标题涉及日本、韩国或台湾，且仅涉及这些国家或地区的内部政治，与其他国家无关联：
    保存标记 = 0
  ELSE IF 标题涉及国家公职人员或国企、事业单位高管贪污腐败违纪的相关处置：
    保存标记 = 0
  ELSE：
    保存标记 = 1
ELSE IF 分类是 科技新闻：
  IF 标题主要关于某款具体的电子产品发布或软件更新：
    保存标记 = 0
  ELSE：
    保存标记 = 1
ELSE：
  保存标记 = 1

最终输出格式：保存标记,分类
例如：1,政治新闻 或 0,体育新闻

新闻标题如下：`;

/**
 * AI总结提示词配置
 */
const AI_SUMMARIZATION_PROMPT = `请将以下新闻内容总结为不超过400字的简洁版本。要求：
1. 保留新闻的核心事实和关键信息
2. 保持逻辑清晰，语句通顺
3. 不要添加个人观点或评论
4. 不要使用"记者"、"监制"、"作者"等词汇
5. 直接输出总结内容，不要任何前缀或解释

新闻内容如下：`;

// ==================== NewsUtils 命名空间（新闻业务工具函数） ====================

/**
 * 新闻业务工具函数命名空间
 * 提供新闻处理、RSS解析、内容提取、AI分类和AI总结等可复用函数
 * 采用模块化设计，便于其他新闻相关脚本复用
 * @namespace NewsUtils
 */
const NewsUtils = {

  /**
   * RSS处理模块
   */
  RSS: {
    /**
     * 获取并解析RSS/Atom内容
     * @param {string} url - RSS源URL
     * @param {string} feedType - 源类型 ('rss' 或 'atom')
     * @param {number} redirectCount - 重定向计数（内部使用）
     * @return {Array<Object>} 新闻条目数组
     */
    fetchAndParse: function(url, feedType, redirectCount = 0) {
      try {
        // 验证网络工具依赖
        if (typeof UtilsNetwork === 'undefined' || typeof UtilsNetwork.fetchXml !== 'function') {
          throw new Error('UtilsNetwork对象或fetchXml函数不可用，请确保已部署utils_network.js文件');
        }

        // 1. 使用通用网络工具获取RSS内容
        const xmlText = UtilsNetwork.fetchXml(url, {
          timeout: PERFORMANCE_CONFIG.requestTimeout,
          maxRedirects: 3
        });

        // 2. 解析XML
        const document = XmlService.parse(xmlText);
        const root = document.getRootElement();
        const rootName = root.getName();
        const namespace = root.getNamespace();

        // 3. 根据feedType自动检测或使用指定类型解析
        let entries = [];
        // 处理命名空间
        const namespaceUri = namespace ? (namespace.getURI ? namespace.getURI() : '') : '';
        if (feedType === 'atom' || rootName === 'feed' || namespaceUri.includes('atom')) {
          entries = this.parseAtom(root);
        } else {
          entries = this.parseRSS(root);
        }

        Utils.logAction("解析RSS内容", {
          url: url,
          type: feedType,
          count: entries.length,
          detectedType: rootName
        });

        return entries;

      } catch (error) {
        Utils.logError(error, `获取或解析RSS: ${url}`);
        return []; // 返回空数组，主函数会跳过错误
      }
    },

    /**
     * 解析RSS 2.0格式
     * @param {XmlService.Element} root - XML根元素
     * @return {Array<Object>} 新闻条目数组
     */
    parseRSS: function(root) {
      const entries = [];
      const channel = root.getChild('channel', root.getNamespace());

      if (!channel) return entries;

      const items = channel.getChildren('item', channel.getNamespace());

      items.forEach(item => {
        const entry = {
          title: this.getElementText(item, 'title'),
          link: this.getElementText(item, 'link'),
          description: this.getElementText(item, 'description'),
          pubDate: this.getElementText(item, 'pubDate'),
          guid: this.getElementText(item, 'guid'),
          'content:encoded': this.getElementText(item, 'encoded', XmlService.getNamespace('http://purl.org/rss/1.0/modules/content/'))
        };
        entries.push(entry);
      });

      return entries;
    },

    /**
     * 解析Atom 1.0格式
     * @param {XmlService.Element} root - XML根元素
     * @return {Array<Object>} 新闻条目数组
     */
    parseAtom: function(root) {
      const entries = [];
      const atomNs = XmlService.getNamespace('http://www.w3.org/2005/Atom');

      const items = root.getChildren('entry', atomNs);

      items.forEach(item => {
        const entry = {
          title: this.getElementText(item, 'title', atomNs),
          link: this.getLink(item, atomNs),
          summary: this.getElementText(item, 'summary', atomNs),
          content: this.getElementText(item, 'content', atomNs),
          published: this.getElementText(item, 'published', atomNs),
          updated: this.getElementText(item, 'updated', atomNs),
          id: this.getElementText(item, 'id', atomNs)
        };
        entries.push(entry);
      });

      return entries;
    },

    /**
     * 获取元素的文本内容
     * @param {XmlService.Element} parent - 父元素
     * @param {string} childName - 子元素名称
     * @param {XmlService.Namespace} namespace - 命名空间（可选）
     * @return {string} 文本内容或空字符串
     */
    getElementText: function(parent, childName, namespace = null) {
      const child = namespace ?
        parent.getChild(childName, namespace) :
        parent.getChild(childName, parent.getNamespace());
      return child ? child.getText() : '';
    },

    /**
     * 获取Atom条目中的链接（优先获取alternate类型的链接）
     * @param {XmlService.Element} entry - Atom条目元素
     * @param {XmlService.Namespace} atomNs - Atom命名空间
     * @return {string} 链接URL或空字符串
     */
    getLink: function(entry, atomNs) {
      const links = entry.getChildren('link', atomNs);
      for (const link of links) {
        const rel = link.getAttribute('rel');
        if (!rel || rel.getValue() === 'alternate') {
          const href = link.getAttribute('href');
          return href ? href.getValue() : '';
        }
      }
      // 如果没有alternate链接，返回第一个链接
      if (links.length > 0) {
        const href = links[0].getAttribute('href');
        return href ? href.getValue() : '';
      }
      return '';
    }
  },

  /**
   * 内容处理模块
   */
  Content: {
    /**
     * 智能内容提取器
     * @param {Object} entry - 新闻条目对象
     * @param {Object} feedConfig - RSS源配置对象（可选）
     * @return {string} 提取的新闻正文内容
     */
    extractNewsContent: function(entry, feedConfig) {
      let finalContent = '';
      let sourceType = 'rss'; // rss 或 detail_page
      let detailPageContent = '';

      // 1. 检查是否应该尝试详情页抓取
      // 逻辑：全局启用 && 链接有效 && (feed未配置detailPageConfig 或 feed配置的enabled不为false)
      const shouldFetchDetailPage = CONTENT_CONFIG.detailPageEnabled
        && entry.link && entry.link.trim().length > 0
        && (!feedConfig || !feedConfig.detailPageConfig || feedConfig.detailPageConfig.enabled !== false);

      // 2. 首先尝试详情页抓取（如果启用）
      if (shouldFetchDetailPage) {
        // 获取feed特定的详情页配置（可能为undefined）
        const detailPageConfig = feedConfig ? feedConfig.detailPageConfig : undefined;
        detailPageContent = this.fetchDetailPageContent(entry.link, detailPageConfig);

        if (detailPageContent && detailPageContent.trim().length > 0) {
          finalContent = detailPageContent;
          sourceType = 'detail_page';
        }
      }

      // 3. 如果详情页内容不可用，尝试RSS内容
      if (!finalContent) {
        // 尝试不同RSS内容字段（按优先级）
        const contentSources = [
          entry['content:encoded'],  // RSS 2.0扩展
          entry.content,             // Atom
          entry.description,         // 标准RSS
          entry.summary              // Atom摘要
        ];

        // 提取第一个有效内容
        let rawContent = contentSources.find(src => src && src.trim().length > 0);

        if (!rawContent) {
          // 如果RSS内容和详情页内容都不可用
          if (detailPageContent && detailPageContent.trim().length > 0) {
            finalContent = detailPageContent;
            sourceType = 'detail_page_fallback';
          } else {
            return '【内容提取失败】';
          }
        } else {
          const sourceName = this.getContentSourceName(entry, contentSources, rawContent);

          // 清理和格式化RSS内容
          try {
            const cleanedContent = Utils.cleanHtmlContent(rawContent, {
              keepParagraphs: true,
              removeImages: true,
              allowedTags: ['p', 'br', 'strong', 'em']
            });

            finalContent = cleanedContent;
            sourceType = 'rss';

          } catch (error) {
            Utils.logError(error, "RSS HTML内容清理");
            // 清理失败，尝试使用详情页内容作为备用
            if (detailPageContent && detailPageContent.trim().length > 0) {
              finalContent = detailPageContent;
              sourceType = 'detail_page_fallback_error';
            } else {
              return '【内容清理失败】';
            }
          }
        }
      }

      // 3. 移除末尾包含"记者"或"监制"的行（全局逻辑）
      finalContent = this.cleanFooterContent(finalContent);

      return finalContent || '【内容为空】';
    },


    /**
     * 从详情页URL获取新闻正文内容（通用版本）
     * @param {string} link - 新闻详情页URL
     * @param {Object} detailPageConfig - 详情页配置对象（可选）
     * @return {string} 提取的正文内容或空字符串
     */
    fetchDetailPageContent: function(link, detailPageConfig) {
      if (!link || link.trim().length === 0) {
        return '';
      }

      try {

        // 使用源特定超时或全局配置超时
        const timeout = (detailPageConfig && detailPageConfig.timeout)
          ? detailPageConfig.timeout
          : CONTENT_CONFIG.detailPageTimeout;

        const options = {
          muteHttpExceptions: true,
          followRedirects: true,
          maximumRedirects: 3,
          timeout: timeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Google-Apps-Script; +https://script.google.com)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        };

        const response = UrlFetchApp.fetch(link, options);
        const responseCode = response.getResponseCode();

        if (responseCode !== 200) {
          Utils.logAction("详情页抓取失败", { reason: `HTTP ${responseCode}` });
          return '';
        }

        const html = response.getContentText();

        // 默认选择器列表（当没有配置或配置为空时使用）
        const defaultSelectors = [
          'article',    // HTML5 <article> 标签（优先尝试）
          '.content',   // 通用内容类
          'div[class*="content"]',  // 类名包含content的div
          'div[class*="main"]',     // 类名包含main的div
          'div[class*="article"]',  // 类名包含article的div
          'div[class*="post"]'      // 类名包含post的div
        ];

        // 使用配置的选择器或默认选择器
        const selectors = (detailPageConfig && detailPageConfig.selectors && detailPageConfig.selectors.length > 0)
          ? detailPageConfig.selectors
          : defaultSelectors;

        // 尝试提取正文内容
        let content = '';
        let matchedSelector = '';

        // 按优先级尝试每个选择器
        for (const selector of selectors) {
          let extractedContent = Utils.extractElement(html, selector, { handleNesting: true, maxDepth: 100 });

          if (extractedContent && extractedContent.trim().length > 0) {
            // 检查内容是否足够长（原始HTML长度大于100字符）
            // 避免匹配到过短的div（如仅包含元信息的容器）
            if (extractedContent.trim().length > 100) {
              content = extractedContent;
              matchedSelector = selector;
              break;
            }
          }
        }

        // 如果所有选择器都失败，尝试整个body内容
        if (!content) {
          const bodyMatch = html.match(/<body[^>]*>([\\s\\S]*?)<\/body>/i);
          if (bodyMatch && bodyMatch[1]) {
            content = bodyMatch[1];
          } else {
            content = html;
          }
        }

        // 应用排除选择器（如果有配置）
        let contentAfterExclusion = content;
        if (detailPageConfig && detailPageConfig.excludeSelectors && detailPageConfig.excludeSelectors.length > 0) {
          contentAfterExclusion = Utils.removeHtmlElementsBySelector(content, detailPageConfig.excludeSelectors);
        }

        // 清理HTML内容
        const cleanedContent = Utils.cleanHtmlContent(contentAfterExclusion, {
          keepParagraphs: true,
          removeImages: true,
          allowedTags: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4']
        });

        return cleanedContent;

      } catch (error) {
        Utils.logError(error, `抓取详情页: ${link}`);
        return '';
      }
    },

    /**
     * 清理新闻内容末尾的页脚信息
     * 1. 删除包含"记者"、"监制"、"作者"、"仅供参考"、"版权所有"的整行
     * 2. 删除末尾行中的"(完)"字符（不删整行）
     * 检查清理后的文本末尾10行进行处理
     * @param {string} content - 清理后的文本内容
     * @return {string} 清理页脚信息后的内容
     */
    cleanFooterContent: function(content) {
      if (!content || content.trim().length === 0) {
        return content;
      }

      const lines = content.split('\n');
      if (lines.length === 0) {
        return content;
      }

      // 只检查最后10行，但保留倒数第11行作为安全边界
      const linesToCheck = 10;
      const startIndex = Math.max(0, lines.length - linesToCheck - 1);  // -1确保保留倒数第11行
      const linesToProcess = lines.slice(startIndex);
      const remainingLines = lines.slice(0, startIndex);

      // 要过滤的整行关键词：记者、监制、作者、仅供参考、版权所有
      const keywordsToRemove = ['记者', '监制', '作者', '仅供参考', '版权所有'];

      // 过滤掉包含任意关键词的整行，并清理"(完)"字符
      const processedLines = linesToProcess.map(line => {
        let processedLine = line.trim();

        // 删除"(完)"字符（不删整行）
        if (processedLine.includes('(完)')) {
          processedLine = processedLine.replace(/\(完\)/g, '').trim();
        }

        return processedLine;
      }).filter(line => {
        // 检查是否包含需要删除整行的关键词
        return !keywordsToRemove.some(keyword => line.includes(keyword));
      });

      // 重新组合行
      const resultLines = remainingLines.concat(processedLines);
      return resultLines.join('\n').trim();
    },

    /**
     * 辅助函数：确定内容来源名称
     * @private
     */
    getContentSourceName: function(entry, contentSources, rawContent) {
      if (rawContent === entry['content:encoded']) return 'content:encoded';
      if (rawContent === entry.content) return 'content';
      if (rawContent === entry.description) return 'description';
      if (rawContent === entry.summary) return 'summary';
      return 'unknown';
    }
  },

  /**
   * AI模块
   */
  AI: {
    /**
     * AI新闻分类函数
     * @param {string} title - 新闻标题
     * @return {Object} 包含shouldSave和category属性的对象
     */
    classifyNewsByTitle: function(title) {
      const prompt = AI_CLASSIFICATION_PROMPT + title;

      try {
        // 验证AI工具依赖
        if (typeof UtilsAI === 'undefined' || typeof UtilsAI.askGroq !== 'function') {
          throw new Error('UtilsAI对象不可用，请确保已部署utils_ai.js文件');
        }

        const rawResponse = UtilsAI.askGroq(prompt, 'qwen/qwen3-32b');

        // 清理思考标签，提取最终结果
        const response = this.cleanThinkingTags(rawResponse);

        // 解析响应格式："1,政治新闻" 或 "0,体育新闻"
        const parts = response.split(',').map(s => s.trim());

        if (parts.length < 2) {
          throw new Error(`AI响应格式错误: ${response}`);
        }

        const shouldSaveStr = parts[0];
        const category = parts.slice(1).join(','); // 处理可能包含逗号的分类名称

        // 验证shouldSaveStr必须是"0"或"1"
        if (shouldSaveStr !== '0' && shouldSaveStr !== '1') {
          throw new Error(`AI响应中的保存标志无效: ${shouldSaveStr}`);
        }

        const shouldSave = shouldSaveStr === '1';

        Utils.logAction("AI分类结果", {
          title: title.substring(0, 50) + (title.length > 50 ? '...' : ''),
          shouldSave: shouldSave,
          category: category
        });

        return { shouldSave, category };

      } catch (error) {
        // AI调用失败：默认跳过（shouldSave = false），保守策略
        Utils.logError(error, `AI分类标题: ${title.substring(0, 50)}...`);
        return { shouldSave: false, category: '分类失败' };
      }
    },

    /**
     * AI新闻内容总结函数
     * @param {string} content - 需要总结的新闻内容
     * @return {string} 总结后的内容，如果失败则返回原内容
     */
    summarizeContent: function(content) {
      const prompt = AI_SUMMARIZATION_PROMPT + content;

      try {
        // 验证AI工具依赖
        if (typeof UtilsAI === 'undefined' || typeof UtilsAI.askGroq !== 'function') {
          throw new Error('UtilsAI对象不可用，请确保已部署utils_ai.js文件');
        }

        const rawResponse = UtilsAI.askGroq(prompt, 'qwen/qwen3-32b');

        // 清理思考标签，提取最终结果
        const response = this.cleanThinkingTags(rawResponse);

        return response;

      } catch (error) {
        // AI总结失败：返回原内容
        Utils.logError(error, "AI内容总结失败，返回原内容");
        return content;
      }
    },

    /**
     * 清理AI响应中的思考标签
     * @param {string} rawResponse - 原始AI响应（可能包含思考标签）
     * @return {string} 清理思考标签后的最终结果
     */
    cleanThinkingTags: function(rawResponse) {
      return rawResponse
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .trim();
    }
  },

  /**
   * 存储工具模块（简化包装，调用通用工具函数）
   */
  Storage: {
    /**
     * 创建新闻文件夹结构
     * @param {string} rootFolder - 根文件夹名称
     * @param {string} subFolder - 子文件夹名称
     * @return {GoogleAppsScript.Drive.Folder} 文件夹对象
     */
    createNewsDateFolder: function(rootFolder, subFolder) {
      try {
        // 验证Google工具依赖
        if (typeof UtilsGoogleDrive === 'undefined' || typeof UtilsGoogleDrive.ensureNestedFolderExists !== 'function') {
          throw new Error('UtilsGoogleDrive对象或ensureNestedFolderExists函数不可用，请确保已部署utils_google_drive.js文件');
        }

        // 构建文件夹路径：rootFolder/subFolder（不再按日期分文件夹）
        const folderPath = `${rootFolder}/${subFolder}`;
        const dateFolder = UtilsGoogleDrive.ensureNestedFolderExists(folderPath);

        if (!dateFolder) {
          throw new Error(`无法创建文件夹路径: ${folderPath}`);
        }

        Utils.logAction("创建新闻文件夹", {
          path: folderPath,
          status: "成功"
        });

        return dateFolder;

      } catch (error) {
        Utils.logError(error, `创建新闻文件夹: ${rootFolder}/${subFolder}`);
        return null;
      }
    },

    /**
     * 格式化新闻文件内容
     * @param {Object} fields - 新闻字段对象
     * @param {string} fields.source - 新闻来源
     * @param {string} fields.category - 新闻分类
     * @param {string} fields.title - 新闻标题
     * @param {string} fields.content - 新闻正文内容
     * @param {boolean} fields.isAISummarized - 是否为AI总结内容
     * @return {string} 格式化的新闻内容
     */
    formatNewsContent: function(fields) {
      const { source, category, title, content, isAISummarized = false } = fields;

      // 根据是否为AI总结内容，在内容前添加不同标识
      const contentPrefix = isAISummarized ? 'AI总结：\n' : '新闻原文：\n';
      const finalContent = contentPrefix + (content || '【内容为空】');

      // 构建文件内容，包含来源、分类、标题、正文四个部分
      const formattedContent = `来源：${source || '未知'}
分类：${category || '未分类'}

${title || '【无标题】'}

${finalContent}`;

      return formattedContent;
    },

    /**
     * 保存新闻到Google Drive
     * @param {GoogleAppsScript.Drive.Folder} folder - 目标文件夹
     * @param {string} title - 新闻标题
     * @param {string} content - 新闻内容
     * @return {boolean} 是否保存成功
     */
    saveNewsToDrive: function(folder, title, content) {
      try {
        // 验证Google工具依赖
        if (typeof UtilsGoogleDrive === 'undefined' || typeof UtilsGoogleDrive.saveOrUpdateFile !== 'function') {
          throw new Error('UtilsGoogleDrive对象或saveOrUpdateFile函数不可用，请确保已部署utils_google_drive.js文件');
        }

        // 1. 生成安全文件名
        const safeFileName = Utils.safeFileName(title, 100) + '.txt';

        // 2. 使用通用工具函数保存或更新文件
        const success = UtilsGoogleDrive.saveOrUpdateFile(folder, safeFileName, content);

        // 3. 记录保存信息
        if (success) {
          Utils.logAction("保存新闻到Drive", {
            title: title.substring(0, 50) + (title.length > 50 ? '...' : ''),
            fileName: safeFileName,
            contentLength: content.length,
            folderPath: `${folder.getName()}`
          });
        } else {
          Utils.logError(new Error(`保存文件失败: ${safeFileName}`), "saveNewsToDrive");
        }

        return success;

      } catch (error) {
        Utils.logError(error, `保存新闻到Drive: ${title.substring(0, 50)}...`);
        return false;
      }
    }
  }
};

// ==================== 主函数与入口函数 ====================

/**
 * 处理指定分组的RSS源 - 主函数
 * @param {number} groupNumber - 分组编号（1, 2, 3...）
 */
function processNewsFeedsByGroup(groupNumber) {
  // === 1. 初始化 ===
  Utils.logStart(`新闻源收集 - 组${groupNumber}`);

  // 验证关键依赖
  if (typeof Utils === 'undefined') {
    Utils.logError(new Error('Utils对象不可用，请确保已部署utils.js文件'), '依赖检查');
    return;
  }

  // === 2. 过滤指定分组的RSS源 ===
  const targetFeeds = RSS_FEEDS.filter(feed => feed.processGroup === groupNumber);

  if (targetFeeds.length === 0) {
    Utils.logAction("分组过滤", { group: groupNumber, message: "该分组没有配置RSS源" });
    Utils.logEnd(`新闻源收集 - 组${groupNumber}`, { count: 0, message: "没有要处理的RSS源" });
    return;
  }

  Utils.logAction("分组过滤", {
    group: groupNumber,
    totalSources: targetFeeds.length,
    sourceNames: targetFeeds.map(f => f.name).join(', ')
  });

  // === 3. 创建新闻文件夹 ===
  const newsFolder = NewsUtils.Storage.createNewsDateFolder(STORAGE_CONFIG.rootFolder, STORAGE_CONFIG.subFolder);

  if (!newsFolder) {
    Utils.logError(new Error('无法创建新闻文件夹'), `processNewsFeedsGroup${groupNumber}`);
    return;
  }

  // === 4. 处理每个RSS源 ===
  let totalProcessed = 0;
  let totalSaved = 0;
  let totalErrors = 0;

  targetFeeds.forEach(feed => {
    try {
      // 获取该源的最大处理条目数，如果未配置则使用全局默认
      const maxEntries = feed.maxEntriesPerFeed || PERFORMANCE_CONFIG.maxEntriesPerFeed;

      Utils.logAction("处理RSS源", { name: feed.name, url: feed.url, maxEntries: maxEntries });

      const entries = NewsUtils.RSS.fetchAndParse(feed.url, feed.type);
      const limitedEntries = entries.slice(0, maxEntries);

      Utils.logScanRange("新闻条目", entries.length, {
        extra: `来源: ${feed.name}, 处理限制: ${maxEntries} 个`
      });

      limitedEntries.forEach((entry, index) => {
        // 验证标题有效性
        if (!entry.title || entry.title.trim().length === 0) {
          Utils.logAction("跳过无效标题", { index: index + 1, reason: "标题为空" });
          return;
        }

        totalProcessed++;

        try {
          const classification = NewsUtils.AI.classifyNewsByTitle(entry.title);

          if (classification.shouldSave) {
            // 提取新闻内容
            const extractedContent = NewsUtils.Content.extractNewsContent(entry, feed);

            // 标记是否为AI总结内容
            let isAISummarized = false;
            let finalContent = extractedContent;

            // 检查内容长度：小于最小阈值丢弃，大于最大阈值使用AI总结，之间保存原文
            if (extractedContent.length > CONTENT_CONFIG.maxContentLength) {
              // 调用AI总结
              const summarizedContent = NewsUtils.AI.summarizeContent(extractedContent);
              // 思考标签已在summarizeContent函数中清理
              finalContent = summarizedContent;

              isAISummarized = true;
            }

            // 检查最终内容长度，如果小于最小阈值则跳过
            if (finalContent.length < CONTENT_CONFIG.minContentLength) {
              return; // 跳过这条新闻，进入下一个循环
            }

            // 构建新闻内容，包含来源、分类、标题、正文
            const newsContent = NewsUtils.Storage.formatNewsContent({
              source: feed.name, // 来源：RSS源名称
              category: classification.category,
              title: entry.title, // 标题：新闻标题
              content: finalContent, // 智能内容提取结果
              isAISummarized: isAISummarized // 是否为AI总结
            });

            // 保存文件
            const saved = NewsUtils.Storage.saveNewsToDrive(newsFolder, entry.title, newsContent);
            if (saved) {
              totalSaved++;
            }
          } else {
            Utils.logAction("跳过新闻", {
              title: entry.title.substring(0, 50) + (entry.title.length > 50 ? '...' : ''),
              category: classification.category
            });
          }
        } catch (error) {
          // AI分类或保存错误：跳过当前新闻，记录错误
          Utils.logError(error, `处理新闻: ${entry.title?.substring(0, 50)}...`);
          totalErrors++;
        }
      });

    } catch (error) {
      // RSS获取或解析错误：跳过整个源，记录错误
      Utils.logError(error, `处理RSS源: ${feed.name}`);
      totalErrors++;
    }
  });

  // === 5. 生成执行摘要 ===
  const skipped = totalProcessed - totalSaved;
  const summary = {
    count: totalSaved,
    message: `组${groupNumber} - 共处理 ${totalProcessed} 个新闻，保存 ${totalSaved} 个，跳过 ${skipped} 个，错误 ${totalErrors} 个`
  };

  // 记录性能统计
  Utils.logAction("性能统计", {
    group: groupNumber,
    rssSources: targetFeeds.length,
    maxEntriesPerFeed: PERFORMANCE_CONFIG.maxEntriesPerFeed,
    successRate: totalProcessed > 0 ? Math.round((totalSaved / totalProcessed) * 100) : 0
  });

  Utils.logEnd(`新闻源收集 - 组${groupNumber}`, summary);
}

/**
 * 新闻收集入口函数 - 第1组
 * 调用主函数 processNewsFeedsByGroup(1) 处理 processGroup=1 的RSS源
 */
function processNewsFeedGroup1() {
  processNewsFeedsByGroup(1);
}

/**
 * 新闻收集入口函数 - 第2组
 * 调用主函数 processNewsFeedsByGroup(2) 处理 processGroup=2 的RSS源
 */
function processNewsFeedGroup2() {
  processNewsFeedsByGroup(2);
}
