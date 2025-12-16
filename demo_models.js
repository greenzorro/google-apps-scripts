/*
 * File: demo_models.js
 * Project: google_apps_scripts
 * Created: 2025-09-18 03:19:09
 * Author: Victor Cheng
 * Email: hi@victor42.work
 * Description: AI模型调用演示脚本，展示如何使用UtilsAI对象中的AI服务工具函数进行各种AI模型的调用测试（Gemini、Deepseek、GLM、Groq、OpenRouter）。
 */

/**
 * 测试所有AI服务（Gemini、Deepseek、GLM、Groq、OpenRouter）的演示函数
 * 依次调用五个AI服务，显示每个服务的回复内容
 * 用于验证API密钥配置和AI服务连接性
 */
function testAllAIServices() {
  Utils.logStart("AI模型测试");

  Logger.log('--- 测试 Gemini API ---');
  const geminiResponse = UtilsAI.askGemini('你好，请用一句话介绍你自己。', 'gemini-2.5-flash');
  Logger.log('Gemini AI回复: ' + geminiResponse);

  Logger.log('--- 测试 Deepseek API ---');
  const deepseekResponse = UtilsAI.askDeepseek('你好，请用一句话介绍你自己。', 'deepseek-chat');
  Logger.log('Deepseek AI回复: ' + deepseekResponse);

  Logger.log('--- 测试 GLM API ---');
  const glmResponse = UtilsAI.askGLM('你好，请用一句话介绍你自己。', 'glm-4.6v-flash');
  Logger.log('GLM AI回复: ' + glmResponse);

  Logger.log('--- 测试 Groq API ---');
  const groqResponse = UtilsAI.askGroq('你好，请用一句话介绍你自己。', 'moonshotai/kimi-k2-instruct-0905');
  Logger.log('Groq AI回复: ' + groqResponse);

  Logger.log('--- 测试 OpenRouter API ---');
  const openrouterResponse = UtilsAI.askOpenRouter('你好，请用一句话介绍你自己。', 'z-ai/glm-4.5-air:free');
  Logger.log('OpenRouter AI回复: ' + openrouterResponse);

  Utils.logEnd("AI模型测试", { count: 5, message: "已完成所有AI服务的测试调用" });
}