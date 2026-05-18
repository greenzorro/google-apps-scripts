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
   * 校验并规范化调用参数
   * @param {Object} options - 调用参数
   * @param {string} providerName - provider名称
   * @param {Object} defaults - 默认参数
   * @returns {Object} 规范化后的参数
   */
  normalizeOptions: function(options, providerName, defaults) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new Error('AI调用参数必须是对象');
    }

    const normalized = Object.assign({}, defaults || {}, options);
    normalized.delaySeconds = normalized.delaySeconds ?? 0;
    normalized[providerName] = Object.assign(
      {},
      (defaults && defaults[providerName]) || {},
      options[providerName] || {}
    );

    return normalized;
  },

  /**
   * 如果配置了延迟，则等待指定秒数
   * @param {number} delaySeconds - 延迟秒数
   */
  sleepIfNeeded: function(delaySeconds) {
    if (delaySeconds > 0) {
      Utilities.sleep(delaySeconds * 1000);
    }
  },

  /**
   * 对可恢复的AI调用执行有限重试，最终失败时抛出最后一次错误。
   * @param {Function} operation - 要执行的函数
   * @param {Object} options - 重试配置
   * @param {number} options.maxAttempts - 最大尝试次数（默认3）
   * @param {number} options.retryDelaySeconds - 重试间隔秒数（默认5）
   * @param {string} options.context - 日志上下文
   * @returns {*} operation的返回值
   */
  withRetry: function(operation, options = {}) {
    if (typeof operation !== 'function') {
      throw new Error('withRetry需要传入函数');
    }

    const maxAttempts = Math.max(1, options.maxAttempts || 3);
    const retryDelaySeconds = options.retryDelaySeconds ?? 5;
    const context = options.context || 'AI调用';
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return operation(attempt);
      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts) {
          if (typeof Utils !== 'undefined' && typeof Utils.logError === 'function') {
            Utils.logError(error, `${context}失败，第${attempt}次尝试失败，${retryDelaySeconds}秒后重试`);
          } else {
            Logger.log(`${context}失败，第${attempt}次尝试失败，${retryDelaySeconds}秒后重试: ${error.message || error.toString()}`);
          }

          if (retryDelaySeconds > 0) {
            Utilities.sleep(retryDelaySeconds * 1000);
          }
        }
      }
    }

    throw lastError || new Error(`${context}失败`);
  },

  /**
   * 过滤掉值为undefined的字段
   * @param {Object} source - 原始对象
   * @returns {Object} 过滤后的对象
   */
  pickDefined: function(source) {
    const result = {};

    Object.keys(source || {}).forEach(key => {
      if (source[key] !== undefined) {
        result[key] = source[key];
      }
    });

    return result;
  },

  /**
   * 规范化消息内容为字符串或原始数组
   * @param {*} content - 消息内容
   * @returns {*}
   */
  normalizeMessageContent: function(content) {
    if (content === undefined || content === null) {
      return '';
    }
    return content;
  },

  /**
   * 将内容规范化为Gemini所需的parts数组
   * @param {*} content - 消息内容
   * @returns {Array<Object>}
   */
  normalizeGeminiParts: function(content) {
    if (content === undefined || content === null) {
      return [{ text: '' }];
    }

    if (typeof content === 'string') {
      return [{ text: content }];
    }

    if (Array.isArray(content)) {
      return content.map(part => {
        if (typeof part === 'string') {
          return { text: part };
        }
        if (part && typeof part === 'object') {
          if (part.text !== undefined) {
            return { text: part.text };
          }
          if (part.type === 'text' && part.text !== undefined) {
            return { text: part.text };
          }
          return part;
        }
        return { text: String(part) };
      });
    }

    if (typeof content === 'object') {
      if (content.text !== undefined) {
        return [{ text: content.text }];
      }
      if (content.type === 'text' && content.text !== undefined) {
        return [{ text: content.text }];
      }
      return [content];
    }

    return [{ text: String(content) }];
  },

  /**
   * 构建OpenAI兼容接口的messages数组
   * @param {Object} options - 调用参数
   * @returns {Array<Object>}
   */
  buildOpenAIMessages: function(options) {
    const messages = [];

    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }

    if (options.messages && options.messages.length > 0) {
      options.messages.forEach(message => {
        if (!message || !message.role) {
          throw new Error('messages中的每一项都必须包含role');
        }

        messages.push({
          role: message.role,
          content: this.normalizeMessageContent(message.content),
          name: message.name
        });
      });
    } else if (options.prompt !== undefined) {
      messages.push({
        role: 'user',
        content: options.prompt
      });
    } else {
      throw new Error('必须提供prompt或messages');
    }

    return messages;
  },

  /**
   * 构建Gemini接口的contents与systemInstruction
   * @param {Object} options - 调用参数
   * @returns {{contents: Array<Object>, systemInstruction: (Object|undefined)}}
   */
  buildGeminiContents: function(options) {
    const contents = [];
    const systemPrompts = [];

    if (options.systemPrompt) {
      systemPrompts.push(options.systemPrompt);
    }

    if (options.messages && options.messages.length > 0) {
      options.messages.forEach(message => {
        if (!message || !message.role) {
          throw new Error('messages中的每一项都必须包含role');
        }

        if (message.role === 'system') {
          if (message.content !== undefined && message.content !== null) {
            if (typeof message.content === 'string') {
              systemPrompts.push(message.content);
            } else {
              systemPrompts.push(JSON.stringify(message.content));
            }
          }
          return;
        }

        const role = message.role === 'assistant' ? 'model' : (message.role === 'model' ? 'model' : 'user');
        contents.push({
          role: role,
          parts: this.normalizeGeminiParts(message.content)
        });
      });
    } else if (options.prompt !== undefined) {
      contents.push({
        role: 'user',
        parts: [{ text: options.prompt }]
      });
    } else {
      throw new Error('必须提供prompt或messages');
    }

    if (contents.length === 0) {
      throw new Error('至少需要一条非system消息');
    }

    const systemInstruction = systemPrompts.length > 0
      ? { parts: [{ text: systemPrompts.join('\n\n') }] }
      : undefined;

    return { contents, systemInstruction };
  },

  /**
   * 执行HTTP请求并解析JSON响应
   * @param {string} url - 请求URL
   * @param {Object} fetchOptions - UrlFetchApp选项
   * @returns {{response: GoogleAppsScript.URL_Fetch.HTTPResponse, responseData: Object, responseText: string}}
   */
  fetchJson: function(url, fetchOptions) {
    const response = UrlFetchApp.fetch(url, fetchOptions);
    const responseText = response.getContentText();
    let responseData = null;

    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      responseData = null;
    }

    return { response, responseData, responseText };
  },

  /**
   * 构造统一的API失败错误
   * @param {string} providerName - provider名称
   * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} response - HTTP响应
   * @param {string} responseText - 响应文本
   * @returns {Error}
   */
  buildApiError: function(providerName, response, responseText) {
    return new Error(`${providerName} API请求失败，状态码: ${response.getResponseCode()}, 响应: ${responseText}`);
  },

  /**
   * 将通用responseFormat映射为Gemini generationConfig字段
   * @param {*} responseFormat - 通用responseFormat配置
   * @returns {Object}
   */
  buildGeminiResponseFormatConfig: function(responseFormat) {
    if (!responseFormat) {
      return {};
    }

    const formatType = typeof responseFormat === 'string'
      ? responseFormat
      : responseFormat.type;

    if (formatType === 'json_object') {
      return { responseMimeType: 'application/json' };
    }

    return {};
  },

  /**
   * ==================== AI服务调用工具 ====================
   */

  /**
   * 向Google Gemini API发送请求并获取AI回复
   * @param {Object} options - 调用参数
   * @returns {string} AI的回复内容
   */
  askGemini: function(options) {
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('GEMINI_API_KEY');
    const config = this.normalizeOptions(options, 'gemini', {
      model: 'gemini-flash-lite-latest',
      temperature: 0.7,
      maxTokens: 8192,
      topP: 0.95,
      gemini: {
        topK: 20,
        candidateCount: 1
      }
    });

    if (!apiKey) {
      throw new Error('未配置 GEMINI_API_KEY');
    }

    this.sleepIfNeeded(config.delaySeconds);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`;
    const contentPayload = this.buildGeminiContents(config);

    const generationConfig = this.pickDefined({
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
      topP: config.topP,
      topK: config.gemini.topK,
      candidateCount: config.gemini.candidateCount,
      stopSequences: config.stop,
      seed: config.seed,
      presencePenalty: config.presencePenalty,
      frequencyPenalty: config.frequencyPenalty,
      responseMimeType: config.gemini.responseMimeType,
      responseSchema: config.gemini.responseSchema,
      responseJsonSchema: config.gemini.responseJsonSchema,
      responseLogprobs: config.gemini.responseLogprobs,
      logprobs: config.gemini.logprobs,
      thinkingConfig: config.gemini.thinkingConfig
    });

    Object.assign(generationConfig, this.buildGeminiResponseFormatConfig(config.responseFormat));

    const requestData = this.pickDefined({
      contents: contentPayload.contents,
      systemInstruction: contentPayload.systemInstruction,
      generationConfig: generationConfig,
      safetySettings: config.gemini.safetySettings,
      tools: config.gemini.tools,
      toolConfig: config.gemini.toolConfig,
      serviceTier: config.gemini.serviceTier,
      store: config.gemini.store
    });

    const fetchOptions = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(requestData),
      'muteHttpExceptions': true
    };

    try {
      const { response, responseData, responseText } = this.fetchJson(url, fetchOptions);

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
        throw this.buildApiError('Gemini', response, responseText);
      }
    } catch (error) {
      throw new Error(`请求失败: ${error.message}`);
    }
  },

  /**
   * 向Deepseek API发送请求并获取AI回复
   * @param {Object} options - 调用参数
   * @returns {string} AI的回复内容
   */
  askDeepseek: function(options) {
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('DEEPSEEK_API_KEY');
    const config = this.normalizeOptions(options, 'deepseek', {
      model: 'deepseek-v4-flash',
      temperature: 0.7,
      maxTokens: 8192,
      topP: 1
    });

    if (!apiKey) {
      throw new Error('未配置 DEEPSEEK_API_KEY');
    }

    this.sleepIfNeeded(config.delaySeconds);

    const url = 'https://api.deepseek.com/chat/completions';
    const messages = this.buildOpenAIMessages(config);

    const requestData = this.pickDefined({
      model: config.model,
      messages: messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      top_p: config.topP,
      stop: config.stop,
      frequency_penalty: config.frequencyPenalty,
      presence_penalty: config.presencePenalty,
      response_format: typeof config.responseFormat === 'string'
        ? { type: config.responseFormat }
        : config.responseFormat,
      thinking: config.deepseek.thinking,
      stream_options: config.deepseek.streamOptions,
      logprobs: config.deepseek.logprobs,
      top_logprobs: config.deepseek.topLogprobs
    });

    const fetchOptions = {
      'method': 'post',
      'contentType': 'application/json',
      'headers': {
        'Authorization': 'Bearer ' + apiKey
      },
      'payload': JSON.stringify(requestData),
      'muteHttpExceptions': true
    };

    try {
      const { response, responseData, responseText } = this.fetchJson(url, fetchOptions);

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
        throw this.buildApiError('DeepSeek', response, responseText);
      }
    } catch (error) {
      throw new Error(`请求失败: ${error.message}`);
    }
  },

  /**
   * 向Groq API发送请求并获取AI回复
   * @param {Object} options - 调用参数
   * @returns {string} AI的回复内容
   */
  askGroq: function(options) {
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('GROQ_API_KEY');
    const config = this.normalizeOptions(options, 'groq', {
      model: 'qwen/qwen3-32b',
      temperature: 0.7,
      maxTokens: 8192,
      topP: 1
    });

    if (!apiKey) {
      throw new Error('未配置 GROQ_API_KEY');
    }

    this.sleepIfNeeded(config.delaySeconds);

    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const messages = this.buildOpenAIMessages(config);

    const requestData = this.pickDefined({
      model: config.model,
      messages: messages,
      max_completion_tokens: config.maxTokens,
      temperature: config.temperature,
      top_p: config.topP,
      stop: config.stop,
      response_format: typeof config.responseFormat === 'string'
        ? { type: config.responseFormat }
        : config.responseFormat,
      seed: config.seed,
      reasoning_effort: config.groq.reasoningEffort,
      reasoning_format: config.groq.reasoningFormat,
      include_reasoning: config.groq.includeReasoning,
      service_tier: config.groq.serviceTier,
      truncation: config.groq.truncation
    });

    const fetchOptions = {
      'method': 'post',
      'contentType': 'application/json',
      'headers': {
        'Authorization': 'Bearer ' + apiKey
      },
      'payload': JSON.stringify(requestData),
      'muteHttpExceptions': true
    };

    try {
      const { response, responseData, responseText } = this.fetchJson(url, fetchOptions);

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
        throw this.buildApiError('Groq', response, responseText);
      }
    } catch (error) {
      throw new Error(`请求失败: ${error.message}`);
    }
  },

  /**
   * 向Cerebras API发送请求并获取AI回复
   * @param {Object} options - 调用参数
   * @returns {string} AI的回复内容
   */
  askCerebras: function(options) {
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('CEREBRAS_API_KEY');
    const config = this.normalizeOptions(options, 'cerebras', {
      model: 'qwen-3-235b-a22b-instruct-2507',
      temperature: 0.7,
      maxTokens: 8192,
      topP: 0.95
    });

    if (!apiKey) {
      throw new Error('未配置 CEREBRAS_API_KEY');
    }

    this.sleepIfNeeded(config.delaySeconds);

    const url = 'https://api.cerebras.ai/v1/chat/completions';
    const messages = this.buildOpenAIMessages(config);

    const requestData = this.pickDefined({
      model: config.model,
      messages: messages,
      max_completion_tokens: config.maxTokens,
      temperature: config.temperature,
      top_p: config.topP,
      stop: config.stop,
      seed: config.seed,
      frequency_penalty: config.frequencyPenalty,
      presence_penalty: config.presencePenalty,
      response_format: typeof config.responseFormat === 'string'
        ? { type: config.responseFormat }
        : config.responseFormat,
      reasoning_effort: config.cerebras.reasoningEffort,
      prompt_cache_key: config.cerebras.promptCacheKey,
      service_tier: config.cerebras.serviceTier,
      stream: false
    });

    const fetchOptions = {
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
      const { response, responseData, responseText } = this.fetchJson(url, fetchOptions);

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
        throw this.buildApiError('Cerebras', response, responseText);
      }
    } catch (error) {
      throw new Error(`请求失败: ${error.message}`);
    }
  }
};
