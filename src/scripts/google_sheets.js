/*
 * File: google_sheets.js
 * Project: google_apps_scripts
 * Created: 2025-09-22 04:34:42
 * Author: Victor Cheng
 * Email: hi@victor42.work
 * Description: Google Sheets 数据操作脚本，提供 Google Sheets 数据读取、更新和自动化处理功能。
 */

function mpWechatDataUpdate() {
  /*
   * Function: mpWechatDataUpdate
   * Description: 微信公众号数据更新函数。从 app_data/Backup/mp_wechat 三层目录结构中读取当天的数据文件（traffic、content、user），并更新到微信公众号数据表格。支持智能数据范围计算和基于内容匹配的更新，确保数据完整性和准确性。
   */
  try {
    Logger.log("开始微信公众号数据更新...");
    
    // 常量定义
    const DATA_FOLDER_NAME = "app_data";
    const BACKUP_FOLDER_NAME = "Backup";
    const MP_WECHAT_FOLDER_NAME = "mp_wechat";
    const TARGET_SPREADSHEET_NAME = "微信公众号数据";
    const TODAY = new Date();
    const DATE_STRING = Utilities.formatDate(TODAY, "GMT+8", "yyyy-MM-dd");

    // 1. 查找Data目录
    const dataFolder = UtilsGoogleDrive.getFolderByName(DATA_FOLDER_NAME);
    if (!dataFolder) {
      Logger.log(`错误：找不到目录 "${DATA_FOLDER_NAME}"`);
      return false;
    }

    // 2. 在app_data目录中查找Backup子文件夹
    const backupFolders = dataFolder.getFoldersByName(BACKUP_FOLDER_NAME);
    if (!backupFolders.hasNext()) {
      Logger.log(`错误：在${DATA_FOLDER_NAME}目录中找不到子目录 "${BACKUP_FOLDER_NAME}"`);
      return false;
    }
    const backupFolder = backupFolders.next();

    // 3. 在Backup目录中查找mp_wechat子文件夹
    const mpWechatFolders = backupFolder.getFoldersByName(MP_WECHAT_FOLDER_NAME);
    if (!mpWechatFolders.hasNext()) {
      Logger.log(`错误：在${BACKUP_FOLDER_NAME}目录中找不到子目录 "${MP_WECHAT_FOLDER_NAME}"`);
      return false;
    }
    const mpWechatFolder = mpWechatFolders.next();
    
    // 3. 构建当天文件名
    const trafficFileName = `${DATE_STRING}_wechat_traffic`;
    const contentFileName = `${DATE_STRING}_wechat_content_sorted`;
    const userFileName = `${DATE_STRING}_wechat_user`;
    
    Logger.log(`查找文件: ${trafficFileName}, ${contentFileName}, ${userFileName}`);
    
    // 4. 查找目标微信公众号数据表格
    const targetFiles = DriveApp.getFilesByName(TARGET_SPREADSHEET_NAME);
    if (!targetFiles.hasNext()) {
      Logger.log(`错误：找不到目标表格 "${TARGET_SPREADSHEET_NAME}"`);
      return false;
    }
    const targetFile = targetFiles.next();
    const targetSpreadsheet = SpreadsheetApp.openById(targetFile.getId());
    
    // 5. 更新traffic数据
    const trafficFile = UtilsGoogleDrive.findFileWithExtensions(mpWechatFolder, trafficFileName);
    if (trafficFile) {
      // 读取全部数据，使用智能更新函数
      const trafficData = UtilsGoogleSheets.readSheetData(trafficFile, "A1:Z1000");
      if (trafficData) {
        const success = UtilsGoogleSheets.updateSheetWithAutoRange(TARGET_SPREADSHEET_NAME, "traffic", "A1", trafficData);
        if (!success) {
          Logger.log("traffic数据更新失败");
          return false;
        }
      }
    } else {
      Logger.log(`警告：找不到traffic文件 ${trafficFileName}`);
    }
    
    // 6. 更新content数据（匹配的更新，未匹配的追加）
    const contentFile = UtilsGoogleDrive.findFileWithExtensions(mpWechatFolder, contentFileName);
    if (contentFile) {
      // 使用批量更新函数：匹配的更新，未匹配的追加
        const success = UtilsGoogleSheets.updateSheetByContentMatchOrAppend(
        TARGET_SPREADSHEET_NAME, "content", "A",
        contentFile, "A1:I1000", 1
      );
      if (!success) {
        Logger.log("content数据更新失败");
        return false;
      }
      Logger.log("content数据更新完成");
    } else {
      Logger.log(`信息：找不到content文件 ${contentFileName}，跳过更新`);
    }
    
    // 7. 更新user数据
    const userFile = UtilsGoogleDrive.findFileWithExtensions(mpWechatFolder, userFileName);
    if (userFile) {
      // 读取全部数据，使用智能更新函数
      const userData = UtilsGoogleSheets.readSheetData(userFile, "A1:Z1000");
      if (userData) {
        const success = UtilsGoogleSheets.updateSheetWithAutoRange(TARGET_SPREADSHEET_NAME, "user", "A1", userData);
        if (!success) {
          Logger.log("user数据更新失败");
          return false;
        }
      }
    } else {
      Logger.log(`警告：找不到user文件 ${userFileName}`);
    }
    
    Logger.log("微信公众号数据更新完成");
    return true;
    
  } catch (error) {
    Logger.log(`微信公众号数据更新失败: ${error.message}`);
    return false;
  }
}


