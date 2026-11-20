/*
 * File: news_tts_colab.js
 * Project: google_apps_scripts
 * Created: 2026-11-20
 * Author: Victor Cheng
 * Email: hi@victor42.work
 * Description: 新闻旁路 TTS 增量模块。通过纯 HTTP 协议触发 Colab GPU 运行 IndexTTS 2.5，
 * 将 app_data/news_feed/text 中的新闻文本合成为 MP3，经由 Web App doPost 守门接口
 * 写回 app_data/news_feed/audio，并在完成后自动退租销毁 Colab 实例。
 */

const NEWS_TTS_COLAB_CONFIG = {
  textFolderPath: 'app_data/news_feed/text',
  audioFolderPath: 'app_data/news_feed/audio',
  accelerator: 'L4', // 'L4' (支持原生 bf16) 或 'T4'
  rawBaseUrl: 'https://raw.githubusercontent.com/greenzorro/google-apps-scripts/main/colab',
  maxArticlesPerRun: 60,
  batchSize: 3,
  cachePrefix: 'TTS_JOB_',
  cacheTtlSeconds: 7200
};

const NewsTtsColab = {

  /**
   * 读取并校验必需的脚本属性
   * @returns {{clientId: string, clientSecret: string, refreshToken: string, webappUrl: string}}
   */
  getRequiredProperties: function(requireWebappUrl = true) {
    const props = PropertiesService.getScriptProperties();
    const clientId = props.getProperty('COLAB_CLIENT_ID');
    const clientSecret = props.getProperty('COLAB_CLIENT_SECRET');
    const refreshToken = props.getProperty('COLAB_REFRESH_TOKEN');
    const webappUrl = props.getProperty('NEWS_TTS_WEBAPP_URL');

    const missing = [];
    if (!clientId) missing.push('COLAB_CLIENT_ID');
    if (!clientSecret) missing.push('COLAB_CLIENT_SECRET');
    if (!refreshToken) missing.push('COLAB_REFRESH_TOKEN');
    if (requireWebappUrl && !webappUrl) missing.push('NEWS_TTS_WEBAPP_URL');

    if (missing.length > 0) {
      throw new Error(`缺少必需的脚本属性: ${missing.join(', ')}`);
    }

    return { clientId, clientSecret, refreshToken, webappUrl };
  },

  /**
   * 剥离 Google API 返回体开头的 XSSI 前缀
   * @param {string} text
   * @returns {Object}
   */
  parseColabJson: function(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return {};
    const cleaned = trimmed.startsWith(")]}'\n") ? trimmed.substring(5) : trimmed;
    return JSON.parse(cleaned);
  },

  /**
   * 用 refresh_token 换取短期 access_token
   * @returns {string}
   */
  getAccessToken: function() {
    const creds = this.getRequiredProperties(false);
    const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
      method: 'post',
      payload: {
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: creds.refreshToken,
        grant_type: 'refresh_token'
      },
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const body = response.getContentText();
    if (code !== 200) {
      throw new Error(`刷新 Colab OAuth Token 失败 (${code}): ${body}`);
    }
    const parsed = JSON.parse(body);
    if (!parsed.access_token) {
      throw new Error('OAuth 响应缺少 access_token');
    }
    return parsed.access_token;
  },

  /**
   * 发起带 Colab 认证头的 HTTP JSON 请求
   * @param {string} url
   * @param {string} method
   * @param {Object} headers
   * @param {Object=} payloadObj
   * @returns {Object}
   */
  requestJson: function(url, method, headers, payloadObj) {
    const fetchOptions = {
      method: method.toLowerCase(),
      headers: Object.assign({
        'Accept': 'application/json',
        'X-Colab-Client-Agent': 'colab-cli'
      }, headers || {}),
      muteHttpExceptions: true
    };

    if (payloadObj !== undefined) {
      fetchOptions.contentType = 'application/json';
      fetchOptions.payload = JSON.stringify(payloadObj);
    }

    const response = UrlFetchApp.fetch(url, fetchOptions);
    const code = response.getResponseCode();
    const text = response.getContentText();

    if (code < 200 || code >= 300) {
      throw new Error(`HTTP ${method.toUpperCase()} ${url} 失败 (${code}): ${text.substring(0, 400)}`);
    }
    return this.parseColabJson(text);
  },

  /**
   * 生成与 colab-cli 一致的 44 位 Web-safe Base64 notebook hash
   * @returns {string}
   */
  buildNotebookHash: function() {
    const raw = Utilities.getUuid().replace(/-/g, '_');
    return raw + '........';
  },

  /**
   * 查询当前账户 Colab CCU 余额与可用加速器
   * @returns {Object}
   */
  getCcuInfo: function() {
    const accessToken = this.getAccessToken();
    return this.requestJson(
      'https://colab.research.google.com/tun/m/ccu-info?authuser=0',
      'GET',
      { 'Authorization': `Bearer ${accessToken}` }
    );
  },

  /**
   * 通过纯 HTTP 分配 Colab 实例（传入 'NONE' 时申请零显卡消耗的 CPU 实例）
   * @param {string} accessToken
   * @param {string=} accelerator
   * @returns {{endpoint: string, proxyUrl: string, proxyToken: string}}
   */
  assignRuntime: function(accessToken, accelerator) {
    const nbh = encodeURIComponent(this.buildNotebookHash());
    const targetAcc = accelerator || NEWS_TTS_COLAB_CONFIG.accelerator;
    const gpuQuery = targetAcc && targetAcc !== 'NONE'
      ? `&variant=GPU&accelerator=${encodeURIComponent(targetAcc)}`
      : '';
    const assignUrl = `https://colab.research.google.com/tun/m/assign?nbh=${nbh}${gpuQuery}&authuser=0`;
    const authHeaders = { 'Authorization': `Bearer ${accessToken}` };

    const getRes = this.requestJson(assignUrl, 'GET', authHeaders);
    let postRes = getRes;
    if (!getRes.runtimeProxyInfo) {
      if (!getRes.token) {
        throw new Error('GET /tun/m/assign 未返回 XSRF token');
      }
      postRes = this.requestJson(
        assignUrl,
        'POST',
        Object.assign({}, authHeaders, { 'X-Goog-Colab-Token': getRes.token })
      );
    }

    if (!postRes.runtimeProxyInfo || !postRes.runtimeProxyInfo.url || !postRes.runtimeProxyInfo.token) {
      throw new Error(`Colab 分配响应缺少 runtimeProxyInfo: ${JSON.stringify(postRes)}`);
    }

    return {
      endpoint: postRes.endpoint,
      proxyUrl: postRes.runtimeProxyInfo.url.replace(/\/+$/, ''),
      proxyToken: postRes.runtimeProxyInfo.token
    };
  },

  /**
   * 通过纯 HTTP 刷新 Colab Tunnel Frontend 的会话活跃时间戳，防止长任务被空闲回收
   * @param {string} accessToken
   * @param {string} endpoint
   * @returns {{ok: boolean, status: number}}
   */
  keepAliveRuntime: function(accessToken, endpoint) {
    if (!endpoint) return { ok: false, status: 0 };
    const url = `https://colab.research.google.com/tun/m/${encodeURIComponent(endpoint)}/keep-alive/?authuser=0`;
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'X-Colab-Client-Agent': 'colab-cli',
        'X-Colab-Tunnel': 'Google'
      },
      muteHttpExceptions: true
    });
    const code = response.getResponseCode();
    return { ok: code >= 200 && code < 300, status: code };
  },

  /**
   * 通过纯 HTTP 销毁并退租 Colab 实例
   * @param {string} accessToken
   * @param {string} endpoint
   */
  unassignRuntime: function(accessToken, endpoint) {
    if (!endpoint) return false;
    const url = `https://colab.research.google.com/tun/m/unassign/${encodeURIComponent(endpoint)}?authuser=0`;
    const authHeaders = { 'Authorization': `Bearer ${accessToken}` };
    const getRes = this.requestJson(url, 'GET', authHeaders);
    this.requestJson(
      url,
      'POST',
      Object.assign({}, authHeaders, { 'X-Goog-Colab-Token': getRes.token })
    );
    return true;
  },

  /**
   * 通过 Jupyter Contents API 写入远端文本文件
   */
  putRemoteTextFile: function(proxyUrl, proxyToken, remotePath, contentStr) {
    const cleanPath = remotePath.replace(/^\/+/, '');
    const encodedPath = cleanPath.split('/').map(encodeURIComponent).join('/');
    const url = `${proxyUrl}/api/contents/${encodedPath}?authuser=0&colab-runtime-proxy-token=${encodeURIComponent(proxyToken)}`;
    const b64 = Utilities.base64Encode(contentStr, Utilities.Charset.UTF_8);

    return this.requestJson(
      url,
      'PUT',
      {
        'X-Colab-Runtime-Proxy-Token': proxyToken,
        'Authorization': `Bearer ${proxyToken}`
      },
      {
        name: cleanPath.split('/').pop(),
        path: cleanPath,
        type: 'file',
        format: 'base64',
        content: b64,
        chunk: 1
      }
    );
  },

  /**
   * 仅通过 POST /api/kernels 拉起 IPython 内核以触发启动钩子
   */
  startKernel: function(proxyUrl, proxyToken) {
    const url = `${proxyUrl}/api/kernels?authuser=0&colab-runtime-proxy-token=${encodeURIComponent(proxyToken)}`;
    return this.requestJson(
      url,
      'POST',
      {
        'X-Colab-Runtime-Proxy-Token': proxyToken,
        'Authorization': `Bearer ${proxyToken}`
      },
      {
        name: 'python3',
        path: 'content'
      }
    );
  },

  /**
   * 扫描待合成音频的新闻文本（仅选取 audio/ 中尚未生成同名 .mp3 的条目）
   * @param {number} maxItems
   * @returns {Array<{name: string, text: string}>}
   */
  collectPendingArticles: function(maxItems) {
    const textFolder = UtilsGoogleDrive.getFolderByPath(NEWS_TTS_COLAB_CONFIG.textFolderPath);
    if (!textFolder) {
      throw new Error(`找不到新闻文本目录: ${NEWS_TTS_COLAB_CONFIG.textFolderPath}`);
    }

    const audioFolder = UtilsGoogleDrive.ensureNestedFolderExists(NEWS_TTS_COLAB_CONFIG.audioFolderPath);
    if (!audioFolder) {
      throw new Error(`无法访问或创建音频目录: ${NEWS_TTS_COLAB_CONFIG.audioFolderPath}`);
    }

    const existingAudioSet = {};
    const audioFiles = audioFolder.getFiles();
    while (audioFiles.hasNext()) {
      const f = audioFiles.next();
      if (!f.isTrashed()) {
        existingAudioSet[f.getName()] = true;
      }
    }

    const candidates = [];
    const textFiles = textFolder.getFiles();
    while (textFiles.hasNext()) {
      const f = textFiles.next();
      if (f.isTrashed()) continue;
      const fname = f.getName();
      if (!fname.toLowerCase().endsWith('.txt')) continue;

      const mp3Name = fname.slice(0, -4) + '.mp3';
      if (existingAudioSet[mp3Name]) continue;

      candidates.push({
        file: f,
        mp3Name: mp3Name,
        updatedAt: f.getLastUpdated().getTime()
      });
    }

    // 优先处理最新新闻
    candidates.sort((a, b) => b.updatedAt - a.updatedAt);
    const limit = Math.max(1, maxItems || NEWS_TTS_COLAB_CONFIG.maxArticlesPerRun);

    return candidates.slice(0, limit).map(entry => ({
      name: entry.mp3Name,
      text: entry.file.getBlob().getDataAsString('UTF-8')
    }));
  },

  /**
   * 构造写入 /root/.ipython/profile_default/startup/00_tts.py 的点火钩子
   */
  buildStartupHookCode: function() {
    const workerUrl = `${NEWS_TTS_COLAB_CONFIG.rawBaseUrl}/tts_worker.py`;
    return [
      'import json, os, subprocess, traceback, urllib.request',
      'marker = "/content/.tts_started"',
      'if not os.path.exists(marker):',
      '    with open(marker, "w") as f:',
      '        f.write("1")',
      '    try:',
      `        urllib.request.urlretrieve("${workerUrl}", "/content/tts_worker.py")`,
      '        subprocess.Popen(',
      '            ["python3", "-u", "/content/tts_worker.py"],',
      '            stdout=open("/content/tts_worker.log", "w"),',
      '            stderr=subprocess.STDOUT,',
      '            start_new_session=True,',
      '        )',
      '    except Exception as exc:',
      '        with open("/content/tts_job.json", "r", encoding="utf-8") as jf:',
      '            job = json.load(jf)',
      '        payload = json.dumps({"action": "error", "job_id": job["job_id"], "token": job["callback_token"], "error": f"hook: {exc}\\n{traceback.format_exc()}"}).encode("utf-8")',
      '        req = urllib.request.Request(job["callback_url"], data=payload, headers={"Content-Type": "application/json"}, method="POST")',
      '        urllib.request.urlopen(req, timeout=30)',
      ''
    ].join('\n');
  },

  /**
   * 构造脱离 GitHub 的纯协议门铃冒烟测试钩子（使用 CPU + ffmpeg 生成 1 秒静音 MP3 回传）
   */
  buildDoorbellSmokeHookCode: function() {
    return [
      'import base64, json, os, subprocess, traceback, urllib.request',
      'marker = "/content/.tts_started"',
      'if not os.path.exists(marker):',
      '    with open(marker, "w") as f:',
      '        f.write("1")',
      '    def run_smoke():',
      '        with open("/content/tts_job.json", "r", encoding="utf-8") as jf:',
      '            job = json.load(jf)',
      '        def post_cb(body):',
      '            data = json.dumps(body).encode("utf-8")',
      '            req = urllib.request.Request(job["callback_url"], data=data, headers={"Content-Type": "application/json"}, method="POST")',
      '            with urllib.request.urlopen(req, timeout=60) as resp:',
      '                return resp.read().decode("utf-8", errors="replace")',
      '        try:',
      '            mp3_path = "/content/smoke_test_colab_doorbell.mp3"',
      '            subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "1", "-b:a", "64k", mp3_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)',
      '            with open(mp3_path, "rb") as mf:',
      '                b64 = base64.b64encode(mf.read()).decode("ascii")',
      '            r1 = post_cb({"action": "upload_batch", "job_id": job["job_id"], "token": job["callback_token"], "files": [{"name": "smoke_test_colab_doorbell.mp3", "content_base64": b64}]})',
      '            post_cb({"action": "complete", "job_id": job["job_id"], "token": job["callback_token"], "summary": {"mode": "doorbell_smoke", "upload_resp": r1[:200]}})',
      '        except Exception as exc:',
      '            post_cb({"action": "error", "job_id": job["job_id"], "token": job["callback_token"], "error": f"smoke: {exc}\\n{traceback.format_exc()}"})',
      '    import threading',
      '    threading.Thread(target=run_smoke, daemon=False).start()',
      ''
    ].join('\n');
  },

  /**
   * 公共底座：分配 Colab 实例、写入任务配置与启动钩子并拉起内核
   */
  _launchColabJob: function(taskName, accelerator, hookCode, buildPayloadFn) {
    Utils.logStart(taskName);
    const creds = this.getRequiredProperties(true);
    const jobId = Utilities.getUuid();
    const callbackToken = Utilities.getUuid() + '-' + Utilities.getUuid();
    const accessToken = this.getAccessToken();

    let runtime = null;
    try {
      runtime = this.assignRuntime(accessToken, accelerator);
      const jobPayload = buildPayloadFn(jobId, callbackToken, creds.webappUrl);
      const itemCount = Array.isArray(jobPayload.items) ? jobPayload.items.length : 1;

      Utils.logAction('已分配Colab实例', {
        endpoint: runtime.endpoint,
        accelerator: accelerator,
        items: itemCount
      });

      CacheService.getScriptCache().put(
        NEWS_TTS_COLAB_CONFIG.cachePrefix + jobId,
        JSON.stringify({ token: callbackToken, endpoint: runtime.endpoint, total: itemCount }),
        NEWS_TTS_COLAB_CONFIG.cacheTtlSeconds
      );

      this.putRemoteTextFile(
        runtime.proxyUrl,
        runtime.proxyToken,
        'content/tts_job.json',
        JSON.stringify(jobPayload)
      );
      this.putRemoteTextFile(
        runtime.proxyUrl,
        runtime.proxyToken,
        'root/.ipython/profile_default/startup/00_tts.py',
        hookCode
      );
      this.startKernel(runtime.proxyUrl, runtime.proxyToken);

      const msg = `已点火启动 Colab (${runtime.endpoint})，任务数 ${itemCount}`;
      Utils.logEnd(taskName, { count: itemCount, message: msg });
      return { triggered: true, jobId: jobId, endpoint: runtime.endpoint, pending: itemCount };
    } catch (error) {
      if (runtime && runtime.endpoint) {
        try {
          this.unassignRuntime(accessToken, runtime.endpoint);
        } catch (cleanupErr) {
          Utils.logError(cleanupErr, '点火失败后清理 Colab 实例');
        }
      }
      CacheService.getScriptCache().remove(NEWS_TTS_COLAB_CONFIG.cachePrefix + jobId);
      Utils.logError(error, taskName);
      throw error;
    }
  },

  /**
   * 触发一次 Colab 旁路 TTS 合成任务（Fire-and-Forget）
   * @param {number=} maxItems - 可选，限制本次处理的最多文章数
   */
  triggerSynthesis: function(maxItems) {
    const taskName = '新闻旁路TTS触发';
    this.getRequiredProperties(true);
    const items = this.collectPendingArticles(maxItems);

    if (items.length === 0) {
      Utils.logStart(taskName);
      const msg = '所有新闻均已有对应音频，本次无需唤醒 Colab';
      Utils.logAction('跳过Colab唤醒', { reason: msg });
      Utils.logEnd(taskName, { count: 0, message: msg });
      return { triggered: false, pending: 0 };
    }

    return this._launchColabJob(
      taskName,
      NEWS_TTS_COLAB_CONFIG.accelerator,
      this.buildStartupHookCode(),
      (jobId, callbackToken, webappUrl) => ({
        job_id: jobId,
        callback_url: webappUrl,
        callback_token: callbackToken,
        ref_audio_url: `${NEWS_TTS_COLAB_CONFIG.rawBaseUrl}/ref_serena.wav`,
        ref_audio_path: '/content/ref_serena.wav',
        batch_size: NEWS_TTS_COLAB_CONFIG.batchSize,
        items: items
      })
    );
  },

  /**
   * 纯协议门铃测试（不依赖 GitHub，申请 CPU 实例生成一个 1 秒测试 MP3 回调 doPost 并自动退租）
   */
  testDoorbellProtocol: function() {
    return this._launchColabJob(
      'Colab门铃协议冒烟测试',
      'NONE',
      this.buildDoorbellSmokeHookCode(),
      (jobId, callbackToken, webappUrl) => ({
        job_id: jobId,
        callback_url: webappUrl,
        callback_token: callbackToken
      })
    );
  },

  /**
   * 将校验通过的 MP3 批次写入硬编码的 audio/ 目录
   */
  saveAudioBatch: function(files) {
    const audioFolder = UtilsGoogleDrive.ensureNestedFolderExists(NEWS_TTS_COLAB_CONFIG.audioFolderPath);
    if (!audioFolder) {
      throw new Error(`无法定位音频输出目录: ${NEWS_TTS_COLAB_CONFIG.audioFolderPath}`);
    }

    let saved = 0;
    (files || []).forEach(item => {
      if (!item || !item.name || !item.content_base64) return;
      const rawName = String(item.name).split(/[\\/]/).pop();
      if (!rawName.toLowerCase().endsWith('.mp3')) return;

      const base = Utils.safeFileName(rawName.slice(0, -4), 100);
      if (!base) return;
      const safeMp3Name = `${base}.mp3`;

      const existing = audioFolder.getFilesByName(safeMp3Name);
      while (existing.hasNext()) {
        existing.next().setTrashed(true);
      }

      const bytes = Utilities.base64Decode(item.content_base64);
      const blob = Utilities.newBlob(bytes, 'audio/mpeg', safeMp3Name);
      audioFolder.createFile(blob);
      saved++;
    });

    return saved;
  },

  /**
   * Web App 守门人入口处理函数
   * @param {GoogleAppsScript.Events.DoPost} e
   * @returns {GoogleAppsScript.Content.TextOutput}
   */
  handleDoPost: function(e) {
    const jsonOut = obj => ContentService
      .createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON);

    try {
      if (!e || !e.postData || !e.postData.contents) {
        return jsonOut({ ok: false, error: 'empty_body' });
      }

      const payload = JSON.parse(e.postData.contents);
      const jobId = String(payload.job_id || '');
      const token = String(payload.token || '');
      if (!jobId || !token) {
        return jsonOut({ ok: false, error: 'missing_auth' });
      }

      const cache = CacheService.getScriptCache();
      const cacheKey = NEWS_TTS_COLAB_CONFIG.cachePrefix + jobId;
      const cachedRaw = cache.get(cacheKey);
      if (!cachedRaw) {
        return jsonOut({ ok: false, error: 'expired_or_unknown_job' });
      }

      const jobState = JSON.parse(cachedRaw);
      if (jobState.token !== token) {
        return jsonOut({ ok: false, error: 'invalid_token' });
      }

      if (payload.action === 'heartbeat' || payload.action === 'upload_batch') {
        cache.put(cacheKey, cachedRaw, NEWS_TTS_COLAB_CONFIG.cacheTtlSeconds);

        let keepAlive = { ok: false, status: 0 };
        if (jobState.endpoint) {
          try {
            const accessToken = this.getAccessToken();
            keepAlive = this.keepAliveRuntime(accessToken, jobState.endpoint);
          } catch (kaErr) {
            Utils.logError(kaErr, `刷新 Colab 保活失败: ${jobState.endpoint}`);
          }
        }

        if (payload.action === 'heartbeat') {
          Utils.logAction('ColabTTS心跳保活', { jobId: jobId, stage: payload.stage || '', keepAlive: keepAlive });
          return jsonOut({ ok: true, keepAlive: keepAlive });
        }

        const saved = this.saveAudioBatch(payload.files);
        Utils.logAction('接收Colab音频批次', { jobId: jobId, saved: saved, keepAlive: keepAlive });
        return jsonOut({ ok: true, saved: saved, keepAlive: keepAlive });
      }

      if (payload.action === 'complete' || payload.action === 'error') {
        cache.remove(cacheKey);

        let unassigned = false;
        if (jobState.endpoint) {
          try {
            const accessToken = this.getAccessToken();
            unassigned = this.unassignRuntime(accessToken, jobState.endpoint);
          } catch (unErr) {
            Utils.logError(unErr, `退租 Colab 实例失败: ${jobState.endpoint}`);
          }
        }

        if (payload.action === 'complete') {
          Utils.logAction('ColabTTS合成完成', Object.assign({ jobId: jobId, unassigned: unassigned }, payload.summary || {}));
        } else {
          Utils.logError(new Error(String(payload.error || '未知错误')), `ColabTTS执行异常 (jobId=${jobId}, unassigned=${unassigned})`);
        }
        return jsonOut({ ok: true, unassigned: unassigned });
      }

      return jsonOut({ ok: false, error: 'unsupported_action' });
    } catch (error) {
      Utils.logError(error, 'news_tts_colab doPost');
      return jsonOut({ ok: false, error: error.message });
    }
  }
};

/**
 * 定时触发器入口：为所有尚无音频的当日新闻触发一次 Colab TTS 合成
 */
function triggerNewsTtsColab() {
  return NewsTtsColab.triggerSynthesis();
}

/**
 * 冒烟测试入口：仅选取最新 1 篇待合成新闻测试全链路连通性与音频落盘
 */
function testNewsTtsColabSingle() {
  return NewsTtsColab.triggerSynthesis(1);
}

/**
 * 纯协议门铃冒烟测试（不依赖 GitHub，申请 CPU 实例生成 1 秒测试 MP3 回调 doPost 并自动退租）
 */
function testColabDoorbellProtocol() {
  return NewsTtsColab.testDoorbellProtocol();
}

/**
 * 工具函数：在 GAS 日志中查询当前 Colab 账号的 CCU 余额与可用 GPU
 */
function checkColabCcuBalance() {
  const info = NewsTtsColab.getCcuInfo();
  Utils.logAction('Colab CCU 余额查询', info);
  return info;
}

/**
 * Google Apps Script Web App POST 守门人入口
 * @param {GoogleAppsScript.Events.DoPost} e
 */
function doPost(e) {
  return NewsTtsColab.handleDoPost(e);
}
