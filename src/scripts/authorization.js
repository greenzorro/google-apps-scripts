/*
 * File: authorization.js
 * Project: google_apps_scripts
 * Created: 2026-05-15 00:00:00
 * Author: Victor Cheng
 * Email: hi@victor42.work
 * Description: 项目级授权辅助脚本，用于手动触发 Google Apps Script 项目所需服务的 OAuth 授权，并输出基础服务可用性检查日志。
 */

function authorizeProject() {
  /*
   * Function: authorizeProject
   * Description: 手动运行一次以触发当前项目所需 Google 服务的授权流程。此函数只执行低副作用的读取或探测操作，不创建、修改或删除用户文件。
   */
  const SCRIPT_NAME = "项目授权检查";
  const checks = [];

  Utils.logStart(SCRIPT_NAME);

  checks.push(runAuthorizationCheck_("脚本属性", function() {
    const keys = PropertiesService.getScriptProperties().getKeys();
    return `已读取 ${keys.length} 个脚本属性键`;
  }));

  checks.push(runAuthorizationCheck_("Google Drive", function() {
    const rootFolderName = DriveApp.getRootFolder().getName();
    const appDataFolders = DriveApp.getFoldersByName("app_data");
    return `已读取根目录 "${rootFolderName}"，app_data 是否存在：${appDataFolders.hasNext()}`;
  }));

  checks.push(runAuthorizationCheck_("Gmail", function() {
    const unreadCount = GmailApp.getInboxUnreadCount();
    return `已读取收件箱未读数：${unreadCount}`;
  }));

  checks.push(runAuthorizationCheck_("Google Calendar", function() {
    const calendarName = CalendarApp.getDefaultCalendar().getName();
    return `已读取默认日历："${calendarName}"`;
  }));

  checks.push(runAuthorizationCheck_("UrlFetch", function() {
    const response = UrlFetchApp.fetch("https://www.google.com/generate_204", {
      muteHttpExceptions: true
    });
    return `外部请求状态码：${response.getResponseCode()}`;
  }));

  checks.push(runAuthorizationCheck_("Google Sheets", function() {
    const spreadsheetFiles = DriveApp.getFilesByName("微信公众号数据");
    if (!spreadsheetFiles.hasNext()) {
      return "未找到目标表格“微信公众号数据”，跳过 SpreadsheetApp 读取";
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetFiles.next().getId());
    return `已读取目标表格："${spreadsheet.getName()}"`;
  }));

  const successCount = checks.filter(check => check.success).length;
  const failedCount = checks.length - successCount;

  Utils.logEnd(SCRIPT_NAME, {
    count: successCount,
    message: `完成 ${checks.length} 项检查，成功 ${successCount} 项，失败 ${failedCount} 项`
  });

  return {
    success: failedCount === 0,
    total: checks.length,
    successCount: successCount,
    failedCount: failedCount,
    checks: checks
  };
}

function runAuthorizationCheck_(serviceName, checkFn) {
  /*
   * Function: runAuthorizationCheck_
   * Description: 执行单个授权检查步骤并记录结果，避免某个服务异常阻断后续检查。
   */
  try {
    const message = checkFn();
    Utils.logAction("授权检查通过", {
      name: serviceName,
      extra: message
    });
    return {
      service: serviceName,
      success: true,
      message: message
    };
  } catch (error) {
    Utils.logError(error, `${serviceName} 授权检查失败`);
    return {
      service: serviceName,
      success: false,
      message: error.message || error.toString()
    };
  }
}
