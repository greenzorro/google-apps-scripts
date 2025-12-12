/*
 * File: google_drive.js
 * Project: google_apps_scripts
 * Created: 2025-09-17 10:54:13
 * Author: Victor Cheng
 * Email: hi@victor42.work
 * Description: Google Drive 文件管理脚本，提供 Google Drive 文件清理和存储空间管理功能。
 */

function gdriveCleanScreenshots() {
  /*
   * Function: gdriveCleanScreenshots
   * Description: 清理screenshots目录中7天以前的文件。脚本会查找screenshots文件夹，删除创建时间超过7天的所有文件，用于定期清理旧截图以释放存储空间。
   */
  return UtilsGoogleDrive.cleanFilesInFolder("screenshots", {
    filters: [
      { type: 'time', olderThan: '7d', field: 'dateCreated' }
    ],
    action: 'trash'
  });
}

function gdriveCleanAiStudio() {
  /*
   * Function: gdriveCleanAiStudio
   * Description: 在"Google AI Studio"文件夹中查找并移动符合特定条件的文件到回收站。清理条件：1. 文件没有扩展名。2. 文件名不包含指定的排除字符（例如 📌, 🗄️）。3. 文件最后更新时间超过7天前。脚本记录每个操作并提供最终摘要。
   */
  return UtilsGoogleDrive.cleanFilesInFolder("Google AI Studio", {
    filters: [
      { type: 'no_extension' },
      { type: 'exclude_chars', chars: ['📌', '🗄️'] },
      { type: 'time', olderThan: '7d', field: 'lastUpdated' }
    ],
    action: 'trash'
  });
}

function gdriveCleanWechatMpData() {
  /*
   * Function: gdriveCleanWechatMpData
   * Description: 查找并删除 app_data/Backup/mp_wechat 目录中早于当天的日期文件。基于文件名中的日期前缀进行筛选（格式：yyyy-mm-dd），并检查文件创建时间是否早于1天。自动删除符合条件的文件并记录操作日志。
   */
  return UtilsGoogleDrive.cleanFilesInFolder("app_data/Backup/mp_wechat", {
    filters: [
      { type: 'filename_pattern', pattern: '^\\d{4}-\\d{2}-\\d{2}' },
      { type: 'time', olderThan: '1d', field: 'dateCreated' }
    ],
    action: 'trash'
  });
}

function gdriveCleanNewsFeed() {
  /*
   * Function: gdriveCleanNewsFeed
   * Description: 清理 app_data/news_feed/text 和 app_data/news_feed/audio 目录中创建时间早于18小时的新闻文件。脚本会查找所有文件，删除创建时间早于18小时的文件，用于定期清理旧新闻文件以释放存储空间。
   */
  const SUB_DIRECTORIES = ["text", "audio"];
  let totalOldFilesCount = 0;
  const results = {};

  // 记录脚本开始
  Utils.logScanRange("新闻Feed文件清理", 0, {
    extra: `开始清理 ${SUB_DIRECTORIES.length} 个目录：${SUB_DIRECTORIES.join(', ')}`
  });

  // 遍历所有子目录：text 和 audio
  for (const subDir of SUB_DIRECTORIES) {
    const folderPath = `app_data/news_feed/${subDir}`;

    // 使用通用清理引擎（cleanFilesInFolder会记录详细的开始、扫描、结束日志）
    const result = UtilsGoogleDrive.cleanFilesInFolder(folderPath, {
      filters: [
        { type: 'time', olderThan: '18h', field: 'dateCreated' }
      ],
      action: 'trash'
    });

    results[subDir] = result;
    if (result.success) {
      totalOldFilesCount += result.actioned;
    }
  }

  // 记录汇总结果
  const summary = {
    count: totalOldFilesCount,
    message: totalOldFilesCount > 0 ?
      `新闻Feed文件清理完成：共删除 ${totalOldFilesCount} 个创建时间早于18小时的文件（text: ${results.text?.actioned || 0}, audio: ${results.audio?.actioned || 0}）` :
      `在 news_feed/text 和 news_feed/audio 目录中没有找到早于18小时的文件`,
    details: results
  };

  Utils.logAction("新闻Feed文件清理完成", summary);
  return totalOldFilesCount > 0;
}