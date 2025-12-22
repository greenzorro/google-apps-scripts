/*
 * File: demo_models.js
 * Project: google_apps_scripts
 * Created: 2025-09-18 03:19:09
 * Author: Victor Cheng
 * Email: hi@victor42.work
 * Description: AI模型调用演示脚本，展示如何使用UtilsAI对象中的AI服务工具函数进行各种AI模型的调用测试（Gemini、Deepseek、Groq、Cerebras）。
 */

/**
 * 测试所有AI服务（Gemini、Deepseek、Groq、Cerebras）的演示函数
 * 依次调用四个AI服务，显示每个服务的回复内容
 * 用于验证API密钥配置和AI服务连接性
 */
function testAllAIServices() {
  Utils.logStart("AI模型测试");

  Logger.log('--- 测试 Gemini API ---');
  const geminiResponse = UtilsAI.askGemini('你好，请用一句话介绍你自己。', 'gemini-flash-lite-latest');
  Logger.log('Gemini AI回复: ' + geminiResponse);

  Logger.log('--- 测试 Deepseek API ---');
  const deepseekResponse = UtilsAI.askDeepseek('你好，请用一句话介绍你自己。', 'deepseek-chat');
  Logger.log('Deepseek AI回复: ' + deepseekResponse);

  Logger.log('--- 测试 Groq API ---');
  const groqResponse = UtilsAI.askGroq('你好，请用一句话介绍你自己。', 'qwen/qwen3-32b');
  Logger.log('Groq AI回复: ' + groqResponse);

  Logger.log('--- 测试 Cerebras API ---');
  const cerebrasResponse = UtilsAI.askCerebras('你好，请用一句话介绍你自己。', 'qwen-3-32b');
  Logger.log('Cerebras AI回复: ' + cerebrasResponse);

  Utils.logEnd("AI模型测试", { count: 4, message: "已完成所有AI服务的测试调用" });
}

