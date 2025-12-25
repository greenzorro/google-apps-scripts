/*
 * File: utils_ai.js
 * Project: google_apps_scripts
 * Created: 2025-12-09
 * Author: Victor Cheng
 * Email: hi@victor42.work
 * Description: AI服务工具函数库，提供多模型AI服务调用功能（Gemini、Deepseek、Groq、Cerebras）。
 */

/**
 * A collection of AI service utility functions.
 * This acts as a namespace to prevent global scope pollution.
 * @namespace UtilsAI
 */
const UtilsAI = {

  /**
   * ==================== AI服务调用工具 ====================
   */

  /**
   * 向Google Gemini API发送请求并获取AI回复
   * @param {string} prompt - 要发送的提示内容
   * @param {string} [model='gemini-flash-lite-latest'] - 使用的模型名称
   * @param {number} [delay=0] - 请求间隔（秒），默认为0不设间隔
   * @returns {string} AI的回复内容
   */
  askGemini: function(prompt, model, delay) {
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('GEMINI_API_KEY');
    model = model || 'gemini-flash-lite-latest';
    delay = delay || 0;

    // 如果设置了延迟，等待指定秒数
    if (delay > 0) {
      Utilities.sleep(delay * 1000);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestData = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        topP: 0.95,
        topK: 20,
        candidateCount: 1
      }
    };

    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(requestData),
      'muteHttpExceptions': true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const responseData = JSON.parse(response.getContentText());

      if (response.getResponseCode() === 200) {
        const reply = responseData.candidates &&
                     responseData.candidates[0] &&
                     responseData.candidates[0].content &&
                     responseData.candidates[0].content.parts &&
                     responseData.candidates[0].content.parts[0] &&
                     responseData.candidates[0].content.parts[0].text;

        if (reply) {
          return reply;
        } else {
          throw new Error('无法从API响应中提取回复内容');
        }
      } else {
        throw new Error(`API请求失败，状态码: ${response.getResponseCode()}, 响应: ${response.getContentText()}`);
      }
    } catch (error) {
      throw new Error(`请求失败: ${error.message}`);
    }
  },

  /**
   * 向Deepseek API发送请求并获取AI回复
   * @param {string} prompt - 要发送的提示内容
   * @param {string} [model='deepseek-chat'] - 使用的模型名称
   * @param {number} [delay=0] - 请求间隔（秒），默认为0不设间隔
   * @returns {string} AI的回复内容
   */
  askDeepseek: function(prompt, model, delay) {
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('DEEPSEEK_API_KEY');
    model = model || 'deepseek-chat';
    delay = delay || 0;

    // 如果设置了延迟，等待指定秒数
    if (delay > 0) {
      Utilities.sleep(delay * 1000);
    }

    const url = 'https://api.deepseek.com/chat/completions';

    const requestData = {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 8192,
      temperature: 0.7
    };

    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'headers': {
        'Authorization': 'Bearer ' + apiKey
      },
      'payload': JSON.stringify(requestData),
      'muteHttpExceptions': true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const responseData = JSON.parse(response.getContentText());

      if (response.getResponseCode() === 200) {
        const reply = responseData.choices &&
                     responseData.choices[0] &&
                     responseData.choices[0].message &&
                     responseData.choices[0].message.content;

        if (reply) {
          return reply;
        } else {
          throw new Error('无法从API响应中提取回复内容');
        }
      } else {
        throw new Error(`API请求失败，状态码: ${response.getResponseCode()}, 响应: ${response.getContentText()}`);
      }
    } catch (error) {
      throw new Error(`请求失败: ${error.message}`);
    }
  },

  /**
   * 向Groq API发送请求并获取AI回复
   * @param {string} prompt - 要发送的提示内容
   * @param {string} [model='qwen/qwen3-32b'] - 使用的模型名称
   * @param {number} [delay=0] - 请求间隔（秒），默认为0不设间隔
   * @returns {string} AI的回复内容
   */
  askGroq: function(prompt, model, delay) {
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('GROQ_API_KEY');
    model = model || 'qwen/qwen3-32b';
    delay = delay || 0;

    // 如果设置了延迟，等待指定秒数
    if (delay > 0) {
      Utilities.sleep(delay * 1000);
    }

    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const requestData = {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 8192,
      temperature: 0.7
    };

    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'headers': {
        'Authorization': 'Bearer ' + apiKey
      },
      'payload': JSON.stringify(requestData),
      'muteHttpExceptions': true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const responseData = JSON.parse(response.getContentText());

      if (response.getResponseCode() === 200) {
        const reply = responseData.choices &&
                     responseData.choices[0] &&
                     responseData.choices[0].message &&
                     responseData.choices[0].message.content;

        if (reply) {
          return reply;
        } else {
          throw new Error('无法从API响应中提取回复内容');
        }
      } else {
        throw new Error(`API请求失败，状态码: ${response.getResponseCode()}, 响应: ${response.getContentText()}`);
      }
    } catch (error) {
      throw new Error(`请求失败: ${error.message}`);
    }
  },

  /**
   * 向Cerebras API发送请求并获取AI回复
   * @param {string} prompt - 要发送的提示内容
   * @param {string} [model='qwen-3-32b'] - 使用的模型名称
   * @param {number} [delay=0] - 请求间隔（秒），默认为0不设间隔
   * @returns {string} AI的回复内容
   */
  askCerebras: function(prompt, model, delay) {
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('CEREBRAS_API_KEY');
    model = model || 'qwen-3-32b';
    delay = delay || 0;

    // 如果设置了延迟，等待指定秒数
    if (delay > 0) {
      Utilities.sleep(delay * 1000);
    }

    const url = 'https://api.cerebras.ai/v1/chat/completions';

    const requestData = {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 8192,
      temperature: 0.7,
      top_p: 0.95,
      stream: false
    };

    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'headers': {
        'Authorization': 'Bearer ' + apiKey,
        'User-Agent': 'GoogleAppsScript/CerebrasSDK'
      },
      'payload': JSON.stringify(requestData),
      'muteHttpExceptions': true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const responseData = JSON.parse(response.getContentText());

      if (response.getResponseCode() === 200) {
        const reply = responseData.choices &&
                     responseData.choices[0] &&
                     responseData.choices[0].message &&
                     responseData.choices[0].message.content;

        if (reply) {
          return reply;
        } else {
          throw new Error('无法从API响应中提取回复内容');
        }
      } else {
        throw new Error(`API请求失败，状态码: ${response.getResponseCode()}, 响应: ${response.getContentText()}`);
      }
    } catch (error) {
      throw new Error(`请求失败: ${error.message}`);
    }
  }
};