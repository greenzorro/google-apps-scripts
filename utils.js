/*
 * File: utils.js
 * Project: google_apps_scripts
 * Created: 2025-11-01 10:24:26
 * Author: Victor Cheng
 * Email: hi@victor42.work
 * Description: Google Apps Scripts 核心工具函数库，提供数学计算、时间处理、日志记录、筛选验证等通用功能。
 */

/**
 * A collection of core utility functions for the project.
 * This acts as a namespace to prevent global scope pollution.
 * @namespace Utils
 */
const Utils = {

  /**
   * ==================== 数学计算工具 ====================
   */

  /**
   * 计算两个数的百分比
   * @param {number} part - 部分值
   * @param {number} total - 总值
   * @return {number} 百分比
   */
  calculatePercentage: function(part, total) {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
  },

  /**
   * 安全地解析整数
   * @param {any} value - 要解析的值
   * @param {number} defaultValue - 默认值
   * @return {number} 解析后的整数或默认值
   */
  safeParseInt: function(value, defaultValue) {
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultValue : parsed;
  },

  /**
   * 验证数字参数是否在有效范围内
   * @param {number} value - 要验证的值
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @param {string} paramName - 参数名称
   * @return {boolean} 是否有效
   */
  validateNumberRange: function(value, min, max, paramName) {
    if (value < min || value > max) {
      this.logError(new Error(`参数 ${paramName} 必须在 ${min} 到 ${max} 之间`), "参数验证");
      return false;
    }
    return true;
  },

  /**
   * ==================== 时间处理工具 ====================
   */

  /**
   * 获取X天前的日期
   * @param {number} days - 天数
   * @return {Date} X天前的日期对象
   */
  getDateDaysAgo: function(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  },

  /**
   * 获取X分钟前的日期时间
   * @param {number} minutes - 分钟数
   * @return {Date} X分钟前的日期对象
   */
  getDateMinutesAgo: function(minutes) {
    const date = new Date();
    date.setMinutes(date.getMinutes() - minutes);
    return date;
  },

  /**
   * 获取相对于当前时间的月份范围
   * @param {number} monthsBack - 向前多少个月
   * @param {number} monthsForward - 向后多少个月
   * @return {Object} 包含开始时间和结束时间的对象
   */
  getMonthRange: function(monthsBack, monthsForward) {
    const now = new Date();
    const startTime = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    const endTime = new Date(now.getFullYear(), now.getMonth() + monthsForward + 1, 0);
    return { startTime, endTime };
  },

  /**
   * 检查目标时间与当前时间的时间差是否在指定分钟数内
   * @param {Date} targetTime - 目标时间
   * @param {number} maxDifferenceMinutes - 最大时间差（分钟）
   * @return {boolean} 是否在时间差范围内
   */
  isTimeDifferenceValid: function(targetTime, maxDifferenceMinutes) {
    const now = new Date();
    const timeDifferenceInMillis = now.getTime() - targetTime.getTime();
    const maxDifferenceInMillis = maxDifferenceMinutes * 60 * 1000;
    return timeDifferenceInMillis <= maxDifferenceInMillis;
  },

  /**
   * ==================== 文本处理工具 ====================
   */

  /**
   * 检查文本是否包含排除字符
   * @param {string} text - 要检查的文本
   * @param {Array<string>} excludedArray - 排除字符数组
   * @return {boolean} 是否包含排除字符
   */
  hasExcludedChars: function(text, excludedArray) {
    if (!excludedArray || excludedArray.length === 0) return false;
    return excludedArray.some(char => text.includes(char));
  },

  /**
   * 生成安全的文件名
   * @param {string} text - 原始文本
   * @param {number} maxLength - 最大长度（默认100）
   * @return {string} 安全的文件名
   */
  safeFileName: function(text, maxLength = 100) {
    let safe = text.replace(/[\\/:*?"<>|]/g, '');
    if (safe.length > maxLength) {
      safe = safe.substring(0, maxLength);
    }
    return safe.trim();
  },

  /**
   * 通用HTML内容清理和格式化
   * @param {string} html - 原始HTML内容
   * @param {Object} options - 配置选项
   * @param {boolean} options.keepParagraphs - 是否保留段落格式（默认true）
   * @param {boolean} options.removeImages - 是否移除图片（默认true）
   * @param {Array<string>} options.allowedTags - 允许保留的标签（默认['p', 'br', 'strong', 'em']）
   * @return {string} 清理后的文本内容
   */
  cleanHtmlContent: function(html, options = {}) {
    const config = {
      keepParagraphs: options.keepParagraphs !== false,
      removeImages: options.removeImages !== false,
      allowedTags: options.allowedTags || ['p', 'br', 'strong', 'em']
    };

    let text = html;

    // 转换HTML实体
    text = text.replace(/&nbsp;/g, ' ')
               .replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'");

    // 移除HTML注释 <!-- ... -->
    text = text.replace(/<!--[\s\S]*?-->/g, '');

    // 移除脚本和样式标签及其内容
    text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
               .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
               .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
               .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');

    // 移除图片相关标签
    if (config.removeImages) {
      text = text.replace(/<img[^>]*>/gi, '')
                 .replace(/<figure[^>]*>.*?<\/figure>/gi, '')
                 .replace(/<picture[^>]*>.*?<\/picture>/gi, '');
    }

    // 处理段落标签
    if (config.keepParagraphs) {
      text = text.replace(/<p[^>]*>/gi, '\n\n')
                 .replace(/<\/p>/gi, '\n\n')
                 .replace(/<br\s*\/?>/gi, '\n');
    }

    // 移除所有其他HTML标签
    text = text.replace(/<[^>]+>/g, '');

    // 统一换行符：将\r\n和\r替换为\n
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 处理全角空格（中文排版常用）和其他特殊空白字符
    text = text.replace(/\u3000/g, ' ')  // 全角空格
               .replace(/\u200b/g, '')   // 零宽空格
               .replace(/\f/g, ' ')      // 换页符
               .replace(/\v/g, ' ');     // 垂直制表符

    // 压缩连续空格（包括普通空格和制表符）
    text = text.replace(/[ \t]+/g, ' ');

    // 修剪每行的首尾空格
    text = text.split('\n').map(line => line.trim()).join('\n');

    // 压缩连续换行符（3个或更多换行符替换为2个）
    text = text.replace(/\n{3,}/g, '\n\n');

    // 移除首尾空白字符
    text = text.trim();

    return text;
  },


  /**
   * ==================== HTML处理工具 ====================
   */

  /**
   * 从HTML内容中移除指定选择器匹配的元素
   * @param {string} html - 原始HTML内容
   * @param {Array<string>} selectors - 选择器数组，支持多种格式：
   *   - CSS类选择器: ".className" (匹配class属性包含该类的任何元素)
   *   - 属性选择器: "div[class*=\"content\"]" 或 "div[class*='content']"
   *   - 标签选择器: "article", "body"
   *   - 自定义属性选择器: "[data-role=\"main\"]"
   * @return {string} 移除匹配元素后的HTML内容
   */
  removeHtmlElementsBySelector: function(html, selectors) {
    if (!selectors || !Array.isArray(selectors) || selectors.length === 0) {
      return html;
    }

    let cleanedHtml = html;

    selectors.forEach(selector => {
      try {
        // 根据选择器类型构建正则表达式
        let pattern;

        if (selector.startsWith('.')) {
          // CSS类选择器
          const className = selector.substring(1);
          const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // 匹配包含该类的任何元素，移除整个元素
          pattern = new RegExp(`<[^>]*class=["'][^"']*\\b${escapedClassName}\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/[^>]*>`, 'gi');
        } else if (selector.startsWith('div[')) {
          // 属性选择器
          let attrSelector = selector.substring(3);
          attrSelector = attrSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          attrSelector = attrSelector.replace(/=["']/g, '=["\']').replace(/['"]\]/g, '["\']]');
          pattern = new RegExp(`<div[^>]*${attrSelector}[^>]*>[\\s\\S]*?<\\/div>`, 'gi');
        } else if (selector.toLowerCase() === 'article') {
          pattern = /<article[^>]*>[\s\S]*?<\/article>/gi;
        } else if (selector.toLowerCase() === 'body') {
          pattern = /<body[^>]*>[\s\S]*?<\/body>/gi;
        } else if (selector.startsWith('[') && selector.includes(']')) {
          // 自定义属性选择器
          const attrPattern = selector;
          pattern = new RegExp(`<div[^>]*${attrPattern}[^>]*>[\\s\\S]*?<\\/div>`, 'gi');
        } else {
          // 默认按元素标签处理
          pattern = new RegExp(`<${selector}[^>]*>[\\s\\S]*?<\\/${selector}>`, 'gi');
        }

        // 移除匹配的元素
        cleanedHtml = cleanedHtml.replace(pattern, '');

      } catch (error) {
        Logger.log(`移除HTML元素失败: 选择器 "${selector}", 错误: ${error.message}`);
      }
    });

    return cleanedHtml;
  },

  /**
   * 增强版HTML元素提取，支持嵌套元素处理
   * @param {string} html - 原始HTML内容
   * @param {string} selector - 选择器，支持多种格式：
   *   - CSS类选择器: ".className" (匹配class属性包含该类的div元素)
   *   - ID选择器: "#idName" (匹配id属性为指定值的div元素)
   *   - 属性选择器: "div[class*=\"content\"]" 或 "div[class*='content']"
   *   - 标签选择器: "article", "body", "div", "p" 等
   *   - 自定义属性选择器: "[data-role=\"main\"]"
   * @param {Object} options - 配置选项（可选）
   * @param {boolean} options.handleNesting - 是否处理嵌套元素（默认true）
   * @param {number} options.maxDepth - 最大嵌套深度（默认100）
   * @return {string} 提取的元素内容，未找到时返回空字符串
   */
  extractElement: function(html, selector, options = {}) {
    if (!html || !selector) return '';

    const config = {
      handleNesting: options.handleNesting !== false,
      maxDepth: options.maxDepth || 100
    };

    let startPattern;

    // 构建开始标签的正则表达式
    if (selector.startsWith('.')) {
      const className = selector.substring(1);
      const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      startPattern = new RegExp(`<div[^>]*class=["'][^"']*\\b${escapedClassName}\\b[^"']*["'][^>]*>`, 'i');
    } else if (selector.startsWith('#')) {
      const idName = selector.substring(1);
      const escapedIdName = idName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      startPattern = new RegExp(`<div[^>]*id=["']${escapedIdName}["'][^>]*>`, 'i');
    } else if (selector.startsWith('div[')) {
      // 属性选择器：例如 'div[class*="content"]' 或 'div[class*=\\'content\\']'
      let attrSelector = selector.substring(3); // 去掉开头的 'div'
      // 转义正则表达式特殊字符，但保留引号
      attrSelector = attrSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // 允许单引号或双引号
      attrSelector = attrSelector.replace(/=["']/g, '=["\']').replace(/['"]\]/g, '["\']]');
      startPattern = new RegExp(`<div[^>]*${attrSelector}[^>]*>`, 'i');
    } else if (selector.startsWith('[') && selector.includes(']')) {
      // 自定义属性选择器（不以'div'开头）
      const attrPattern = selector;
      startPattern = new RegExp(`<div[^>]*${attrPattern}[^>]*>`, 'i');
    } else if (selector.toLowerCase() === 'article') {
      startPattern = /<article[^>]*>/i;
    } else if (selector.toLowerCase() === 'body') {
      startPattern = /<body[^>]*>/i;
    } else {
      // 默认按标签处理
      startPattern = new RegExp(`<${selector}[^>]*>`, 'i');
    }

    const startMatch = html.match(startPattern);
    if (!startMatch) return '';

    const startIndex = startMatch.index;
    const startTag = startMatch[0];

    // 如果不处理嵌套，则简单查找闭合标签
    if (!config.handleNesting) {
      const closeTag = `</${selector}>`;
      const closeIndex = html.indexOf(closeTag, startIndex + startTag.length);
      if (closeIndex === -1) return '';
      return html.substring(startIndex + startTag.length, closeIndex);
    }

    // 扫描处理嵌套
    let depth = 0;
    let index = startIndex;
    const len = html.length;

    // 确定标签类型
    const isDivTag = startPattern.toString().includes('<div');
    const isArticleTag = selector.toLowerCase() === 'article';
    const isBodyTag = selector.toLowerCase() === 'body';

    while (index < len && depth < config.maxDepth) {
      if (isDivTag) {
        // 对于div标签，需要处理嵌套
        if (html.substr(index, 4) === '<div') {
          const tagEnd = html.indexOf('>', index);
          if (tagEnd === -1) break;

          const tag = html.substring(index, tagEnd + 1);
          if (!tag.includes('/')) {
            depth++;
          }
          index = tagEnd + 1;
        } else if (html.substr(index, 6) === '</div>') {
          depth--;
          index += 6;
          if (depth === 0) {
            // 找到匹配的闭合标签
            const contentStart = startIndex + startTag.length;
            return html.substring(contentStart, index - 6); // 减去</div>
          }
        } else {
          index++;
        }
      } else if (isArticleTag) {
        // 对于article标签，寻找</article>
        if (html.substr(index, 10) === '</article>') {
          const contentStart = startIndex + startTag.length;
          return html.substring(contentStart, index);
        }
        index++;
      } else if (isBodyTag) {
        // 对于body标签，寻找</body>
        if (html.substr(index, 7) === '</body>') {
          const contentStart = startIndex + startTag.length;
          return html.substring(contentStart, index);
        }
        index++;
      } else {
        // 对于其他标签，简单寻找闭合标签（假设无嵌套）
        const closeTag = `</${selector}>`;
        if (html.substr(index, closeTag.length) === closeTag) {
          const contentStart = startIndex + startTag.length;
          return html.substring(contentStart, index);
        }
        index++;
      }
    }

    return ''; // 未找到匹配的闭合标签
  },

  /**
   * ==================== 日志记录工具 ====================
   */

  /**
   * 记录脚本开始日志
   * @param {string} scriptName - 脚本名称
   */
  logStart: function(scriptName) {
    Logger.log("--- 开始运行 %s 脚本 ---", scriptName);
  },

  /**
   * 记录脚本结束日志
   * @param {string} scriptName - 脚本名称
   * @param {Object} summary - 执行摘要对象
   */
  logEnd: function(scriptName, summary) {
    if (summary && summary.count > 0) {
      Logger.log("--- %s 脚本执行完毕。%s ---", scriptName, summary.message);
    } else {
      Logger.log("--- %s 脚本执行完毕。没有找到符合条件的项目。---", scriptName);
    }
  },

  /**
   * 记录操作日志
   * @param {string} action - 操作名称
   * @param {Object} details - 操作详情对象
   */
  logAction: function(action, details) {
    if (details && details.subject) {
      Logger.log("--> 正在%s: \"%s\" %s", action, details.subject, details.extra || "");
    } else if (details && details.title) {
      Logger.log("--> 正在%s: \"%s\" %s", action, details.title, details.extra || "");
    } else if (details && details.name) {
      Logger.log("--> 正在%s: \"%s\" %s", action, details.name, details.extra || "");
    } else {
      Logger.log("--> 正在%s", action);
    }
  },

  /**
   * 记录错误日志
   * @param {Error} error - 错误对象
   * @param {string} context - 错误上下文
   */
  logError: function(error, context) {
    Logger.log("错误: %s。上下文: %s。错误详情: %s",
      context || "未知操作",
      error.message || error.toString(),
      error.stack || "无堆栈信息"
    );
  },

  /**
   * 记录扫描范围日志
   * @param {string} itemType - 项目类型
   * @param {number} totalCount - 总数
   * @param {Object} range - 范围信息
   */
  logScanRange: function(itemType, totalCount, range) {
    if (range && range.start && range.end) {
      Logger.log("正在扫描%s: 从 %s 到 %s，共找到 %d 个%s",
        itemType,
        range.start.toLocaleDateString(),
        range.end.toLocaleDateString(),
        totalCount,
        itemType
      );
    } else if (range && range.extra) {
      // 支持传入额外信息的情况
      Logger.log("找到了 %d 个%s，%s", totalCount, itemType, range.extra);
    } else {
      Logger.log("找到了 %d 个%s，开始逐一检查...", totalCount, itemType);
    }
  },

};