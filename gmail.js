/*
 * File: gmail.js
 * Project: google_apps_scripts
 * Created: 2025-09-17 10:53:38
 * Author: Victor Cheng
 * Email: hi@victor42.work
 * Description: Gmail 邮件管理脚本，提供 Gmail 收件箱的自动化管理功能。
 */

function gmailAutoArchive() {
  /*
   * Function: gmailAutoArchive
   * Description: 自动归档 Gmail 收件箱中陈旧且未加星标的邮件会话，以保持收件箱整洁。此脚本会检查收件箱中的一批邮件会话，并归档满足以下两个条件的会话：1. 会话中的最后一封邮件，其接收时间早于预设的天数（例如3天前）。2. 整个会话中没有任何一封邮件被加了星标。这有助于将非关键、不需立即处理的旧对话自动移出收件箱，实现"收件箱零邮件"管理。
   */
  // --- 1. 配置参数 ---
  // 你可以在这里调整脚本的核心行为
  const DELAY_DAYS = 3;     // 【可配置】定义"陈旧"的标准。只有比这个天数更早的邮件才会被处理。
  const BATCH_SIZE = 400;   // 【可配置】单次运行检查的邮件会话数量上限。避免脚本运行超时。

  // 使用工具函数记录脚本开始
  Utils.logStart("Gmail 自动归档");

  // --- 2. 计算归档的时间分界线 ---
  // 使用工具函数计算时间分界线，替代手动计算
  const cutoffDate = Utils.getDateDaysAgo(DELAY_DAYS);

  // --- 3. 获取收件箱中的邮件会话 ---
  // 注意: 此脚本只检查主收件箱，不包括任何特定标签。
  // GmailApp.getInboxThreads(0, BATCH_SIZE) 从第0个会话开始，最多获取 BATCH_SIZE 个。
  const threads = GmailApp.getInboxThreads(0, BATCH_SIZE);

  if (threads.length === 0) {
    Logger.log("收件箱中没有邮件会话需要检查。脚本结束。");
    Utils.logEnd("Gmail 自动归档", { count: 0, message: "没有邮件会话需要检查" });
    return;
  }

  // 使用工具函数记录扫描统计
  Utils.logScanRange("邮件会话", threads.length, {
    extra: `将要归档"最后消息时间"早于 ${cutoffDate.toLocaleString()} 的邮件会话`
  });

  // --- 4. 遍历并处理每一个邮件会话 ---
  let archivedCount = 0; // 用于统计本次运行归档了多少会话
  
  threads.forEach(thread => {
    const lastMessageDate = thread.getLastMessageDate();
    const hasStarredMessages = thread.hasStarredMessages();
    
    // 核心判断逻辑：
    // 条件1: 最后一封邮件的日期是否早于我们设定的分界线？
    // 条件2: 整个会话中是否【不包含】任何加星标的邮件？
    if (lastMessageDate < cutoffDate && !hasStarredMessages) {
      const subject = thread.getFirstMessageSubject();
      
      // 使用工具函数记录操作日志，替代直接Logger.log
      Utils.logAction("归档", {
        subject: subject,
        extra: `(最后消息于: ${lastMessageDate.toLocaleDateString()})`
      });
      
      // 执行归档
      thread.moveToArchive();
      archivedCount++;
    }
  });

  // --- 5. 输出最终的执行摘要 ---
  const summary = {
    count: archivedCount,
    message: `成功归档了 ${archivedCount} 个邮件会话`
  };
  
  // 使用工具函数记录脚本结束，替代手动Logger.log
  Utils.logEnd("Gmail 自动归档", summary);
}

function gmailAutoTrash() {
  /*
   * Function: gmailAutoTrash
   * Description: 自动将Gmail所有邮件（All Mail）中1年以上陈旧且未加星标的邮件会话移动到垃圾桶，以释放存储空间。此脚本会检查所有邮件中的一批邮件会话，并删除满足以下两个条件的会话：1. 会话中的最后一封邮件，其接收时间早于1年前。2. 整个会话中没有任何一封邮件被加了星标。请谨慎使用此功能，因为移动到垃圾桶的邮件在30天后会被永久删除。
   */
  // --- 1. 配置参数 ---
  // 你可以在这里调整脚本的核心行为
  const DELAY_DAYS = 365;   // 【可配置】定义"陈旧"的标准。只有比这个天数更早的邮件才会被处理。
  const BATCH_SIZE = 400;   // 【可配置】单次运行检查的邮件会话数量上限。避免脚本运行超时。

  // 使用工具函数记录脚本开始
  Utils.logStart("Gmail 自动删除到垃圾桶");

  // --- 2. 计算删除的时间分界线 ---
  // 使用工具函数计算时间分界线，替代手动计算
  const cutoffDate = Utils.getDateDaysAgo(DELAY_DAYS);

  // --- 3. 获取所有邮件会话（All Mail） ---
  // 注意: 此脚本检查所有邮件会话，包括收件箱和已归档的邮件。
  // 使用 search 查询来获取所有邮件（不包括垃圾箱和垃圾邮件）
  // older_than:365d 表示只匹配1年前或更早的邮件
  const allThreads = GmailApp.search('-in:trash -in:spam older_than:365d');
  // 限制处理数量，避免脚本超时
  const threads = allThreads.slice(0, BATCH_SIZE);

  if (threads.length === 0) {
    Logger.log("没有邮件会话需要检查。脚本结束。");
    Utils.logEnd("Gmail 自动删除到垃圾桶", { count: 0, message: "没有邮件会话需要检查" });
    return;
  }

  // 使用工具函数记录扫描统计
  Utils.logScanRange("邮件会话", threads.length, {
    extra: `从 ${allThreads.length} 个1年前的老邮件中选取前 ${BATCH_SIZE} 个进行处理，将要删除"最后消息时间"早于 ${cutoffDate.toLocaleString()} 的邮件会话`
  });

  // --- 4. 遍历并处理每一个邮件会话 ---
  let trashedCount = 0; // 用于统计本次运行删除到垃圾桶多少个会话

  threads.forEach(thread => {
    const lastMessageDate = thread.getLastMessageDate();
    const hasStarredMessages = thread.hasStarredMessages();

    // 核心判断逻辑：
    // 条件1: 最后一封邮件的日期是否早于我们设定的分界线？
    // 条件2: 整个会话中是否【不包含】任何加星标的邮件？
    if (lastMessageDate < cutoffDate && !hasStarredMessages) {
      const subject = thread.getFirstMessageSubject();

      // 使用工具函数记录操作日志，替代直接Logger.log
      Utils.logAction("删除到垃圾桶", {
        subject: subject,
        extra: `(最后消息于: ${lastMessageDate.toLocaleDateString()})`
      });

      // 执行删除到垃圾桶
      thread.moveToTrash();
      trashedCount++;
    }
  });

  // --- 5. 输出最终的执行摘要 ---
  const summary = {
    count: trashedCount,
    message: `成功删除了 ${trashedCount} 个邮件会话到垃圾桶`
  };

  // 使用工具函数记录脚本结束，替代手动Logger.log
  Utils.logEnd("Gmail 自动删除到垃圾桶", summary);
}