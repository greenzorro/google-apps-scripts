/*
 * File: utils_network.js
 * Project: google_apps_scripts
 * Created: 2025-12-10
 * Author: Victor Cheng
 * Email: hi@victor42.work
 * Description: 网络请求工具函数库，提供通用HTTP请求功能，支持重定向、超时、用户代理配置等。
 */

/**
 * A collection of network utility functions.
 * This acts as a namespace to prevent global scope pollution.
 * @namespace UtilsNetwork
 */
const UtilsNetwork = {

  /**
   * ==================== 通用HTTP请求工具 ====================
   */

  /**
   * 通用HTTP请求函数，支持重定向、超时和自定义配置
   * @param {string} url - 请求URL
   * @param {Object} options - 配置选项
   * @param {number} options.timeout - 请求超时时间（毫秒，默认30000）
   * @param {number} options.maxRedirects - 最大重定向次数（默认5），内部存储为maximumRedirects属性
   * @param {Object} options.headers - 自定义请求头
   * @param {boolean} options.muteHttpExceptions - 是否静默处理HTTP异常（默认true）
   * @param {boolean} options.followRedirects - 是否跟随重定向（默认true）
   * @param {string} options.method - HTTP方法（默认'get'）
   * @param {string|Object} options.payload - 请求负载
   * @param {string} options.contentType - 内容类型
   * @return {GoogleAppsScript.URL_Fetch.HTTPResponse} HTTP响应对象
   */
  fetchWithRetry: function(url, options = {}) {
    const config = {
      muteHttpExceptions: options.muteHttpExceptions !== false,
      followRedirects: options.followRedirects !== false,
      maximumRedirects: options.maxRedirects || 5,
      timeout: options.timeout || 30000,
      method: options.method || 'get',
      payload: options.payload,
      contentType: options.contentType,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        ...options.headers
      }
    };

    // 处理重定向
    return this._handleRedirects(url, config);
  },

  /**
   * 内部函数：处理HTTP重定向
   * @private
   * @param {string} url - 请求URL
   * @param {Object} options - 请求配置
   * @param {number} redirectCount - 当前重定向计数
   * @return {GoogleAppsScript.URL_Fetch.HTTPResponse} HTTP响应对象
   */
  _handleRedirects: function(url, options, redirectCount = 0) {
    try {
      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();

      // 处理重定向状态码
      if (responseCode === 301 || responseCode === 302 || responseCode === 307 || responseCode === 308) {
        // 检查重定向次数限制
        if (redirectCount >= (options.maximumRedirects || 5)) {
          throw new Error(`重定向次数过多 (${redirectCount}次)，可能陷入循环`);
        }

        // 获取重定向地址
        const headers = response.getHeaders();
        const location = headers['Location'] || headers['location'];
        if (location) {
          Logger.log(`处理重定向: ${url} -> ${location} (${responseCode}, 第${redirectCount + 1}次)`);

          // 递归处理重定向后的URL
          return this._handleRedirects(location, options, redirectCount + 1);
        } else {
          throw new Error(`HTTP ${responseCode}: 重定向但没有Location头`);
        }
      }

      // 返回最终响应
      return response;

    } catch (error) {
      // 记录错误并重新抛出
      Logger.log(`网络请求失败: ${url}, 错误: ${error.message}`);
      throw error;
    }
  },

  /**
   * 获取XML内容（专门用于RSS/Atom等XML数据）
   * @param {string} url - XML源URL
   * @param {Object} options - 请求配置（可选）
   * @return {string} XML文本内容
   */
  fetchXml: function(url, options = {}) {
    try {
      // 设置默认的Accept头为XML类型
      const xmlOptions = {
        ...options,
        headers: {
          'Accept': 'application/xml,text/xml,application/rss+xml,application/atom+xml',
          ...options.headers
        }
      };

      const response = this.fetchWithRetry(url, xmlOptions);
      const responseCode = response.getResponseCode();

      if (responseCode !== 200) {
        throw new Error(`HTTP ${responseCode}: ${response.getContentText().substring(0, 100)}`);
      }

      return response.getContentText();

    } catch (error) {
      Logger.log(`获取XML失败: ${url}, 错误: ${error.message}`);
      throw error;
    }
  },

  /**
   * 获取HTML内容（专门用于网页抓取）
   * @param {string} url - 网页URL
   * @param {Object} options - 请求配置（可选）
   * @return {string} HTML文本内容
   */
  fetchHtml: function(url, options = {}) {
    try {
      // 设置默认的Accept头为HTML类型
      const htmlOptions = {
        ...options,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...options.headers
        }
      };

      const response = this.fetchWithRetry(url, htmlOptions);
      const responseCode = response.getResponseCode();

      if (responseCode !== 200) {
        Logger.log(`获取HTML失败: HTTP ${responseCode}, URL: ${url}`);
        return '';
      }

      return response.getContentText();

    } catch (error) {
      Logger.log(`获取HTML失败: ${url}, 错误: ${error.message}`);
      return '';
    }
  },

  /**
   * 简单的GET请求，返回文本内容
   * @param {string} url - 请求URL
   * @param {Object} options - 请求配置（可选）
   * @return {string} 响应文本内容，失败时返回空字符串
   */
  fetchText: function(url, options = {}) {
    try {
      const response = this.fetchWithRetry(url, options);
      const responseCode = response.getResponseCode();

      if (responseCode !== 200) {
        Logger.log(`GET请求失败: HTTP ${responseCode}, URL: ${url}`);
        return '';
      }

      return response.getContentText();

    } catch (error) {
      Logger.log(`GET请求失败: ${url}, 错误: ${error.message}`);
      return '';
    }
  },

  /**
   * 检查URL是否可访问（HEAD请求）
   * @param {string} url - 要检查的URL
   * @param {Object} options - 请求配置（可选）
   * @return {boolean} 是否可访问（HTTP 200-399）
   */
  checkUrlAccessible: function(url, options = {}) {
    try {
      const checkOptions = {
        ...options,
        method: 'head',
        timeout: options.timeout || 10000 // HEAD请求使用较短超时
      };

      const response = this.fetchWithRetry(url, checkOptions);
      const responseCode = response.getResponseCode();

      // 2xx和3xx状态码视为可访问
      return responseCode >= 200 && responseCode < 400;

    } catch (error) {
      Logger.log(`检查URL可访问性失败: ${url}, 错误: ${error.message}`);
      return false;
    }
  },

  /**
   * 获取响应头信息
   * @param {string} url - 请求URL
   * @param {Object} options - 请求配置（可选）
   * @return {Object} 响应头对象，失败时返回空对象
   */
  fetchHeaders: function(url, options = {}) {
    try {
      const headOptions = {
        ...options,
        method: 'head'
      };

      const response = this.fetchWithRetry(url, headOptions);
      return response.getHeaders();

    } catch (error) {
      Logger.log(`获取响应头失败: ${url}, 错误: ${error.message}`);
      return {};
    }
  }

};