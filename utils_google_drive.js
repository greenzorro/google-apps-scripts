/*
 * File: utils_google_drive.js
 * Project: google_apps_scripts
 * Created: 2025-12-11
 * Author: Victor Cheng
 * Email: hi@victor42.work
 * Description: Google Drive操作工具函数库，提供Google Drive文件管理、文件夹操作、文件清理等功能。
 */

/**
 * A collection of Google Drive utility functions.
 * @namespace UtilsGoogleDrive
 */
const UtilsGoogleDrive = {

  /**
   * ==================== Google Drive 操作工具 ====================
   */

  /**
   * 按名称获取文件夹
   * @param {string} folderName - 文件夹名称
   * @return {Folder|null} 文件夹对象或null
   */
  getFolderByName: function(folderName) {
    const folders = DriveApp.getFoldersByName(folderName);
    return folders.hasNext() ? folders.next() : null;
  },

  /**
   * 按路径获取文件夹（只查找不创建）
   * @param {string} folderPath - 文件夹路径，支持斜杠分隔
   * @return {Folder|null} 文件夹对象或null（不存在时）
   */
  getFolderByPath: function(folderPath) {
    try {
      if (!folderPath || folderPath.trim().length === 0) {
        Logger.log(`错误：文件夹路径为空`);
        return null;
      }

      // 分割路径
      const pathParts = folderPath.split('/').filter(part => part.trim().length > 0);
      if (pathParts.length === 0) {
        Logger.log(`错误：无效的文件夹路径 "${folderPath}"`);
        return null;
      }

      let currentFolder = null;

      // 处理每个路径部分，只查找不创建
      for (let i = 0; i < pathParts.length; i++) {
        const folderName = pathParts[i];

        if (i === 0) {
          // 第一级：从根目录开始查找
          const folders = DriveApp.getFoldersByName(folderName);
          if (!folders.hasNext()) {
            Logger.log(`文件夹路径不存在: 第一级文件夹 "${folderName}" 不存在`);
            return null;
          }
          currentFolder = folders.next();
        } else {
          // 后续级别：从当前文件夹的子文件夹中查找
          const subFolders = currentFolder.getFoldersByName(folderName);
          if (!subFolders.hasNext()) {
            Logger.log(`文件夹路径不存在: 在 "${pathParts[i-1]}" 中找不到子文件夹 "${folderName}"`);
            return null;
          }
          currentFolder = subFolders.next();
        }
      }

      Logger.log(`成功找到文件夹路径: "${folderPath}"`);
      return currentFolder;

    } catch (error) {
      Logger.log(`getFolderByPath 失败 "${folderPath}": ${error.message}`);
      return null;
    }
  },

  /**
   * 在文件夹中查找文件
   * @param {Folder} folder - 文件夹对象
   * @param {string} fileName - 文件名
   * @return {File|null} 文件对象或null
   */
  findFileInFolder: function(folder, fileName) {
    const files = folder.getFilesByName(fileName);
    return files.hasNext() ? files.next() : null;
  },

  /**
   * 查找带扩展名的文件
   * @param {Folder} folder - 文件夹对象
   * @param {string} baseName - 基础文件名（不含扩展名）
   * @return {File|null} 文件对象或null
   */
  findFileWithExtensions: function(folder, baseName) {
    // 常见电子表格文件扩展名
    const extensions = ['', '.xlsx', '.csv', '.gsheet', '.xls'];

    for (const ext of extensions) {
      const fileName = baseName + ext;
      const files = folder.getFilesByName(fileName);
      if (files.hasNext()) {
        Logger.log(`找到文件: ${fileName}`);
        return files.next();
      }
    }

    Logger.log(`未找到文件: ${baseName} (尝试了扩展名: ${extensions.join(', ')})`);
    return null;
  },

  /**
   * 确保嵌套文件夹路径存在，如果不存在则创建
   * @param {string} folderPath - 文件夹路径，支持斜杠分隔
   * @return {Folder|null} 最内层文件夹对象，创建失败时返回null
   */
  ensureNestedFolderExists: function(folderPath) {
    try {
      if (!folderPath || folderPath.trim().length === 0) {
        Logger.log(`错误：文件夹路径为空`);
        return null;
      }

      // 分割路径
      const pathParts = folderPath.split('/').filter(part => part.trim().length > 0);
      if (pathParts.length === 0) {
        Logger.log(`错误：无效的文件夹路径 "${folderPath}"`);
        return null;
      }

      let currentFolder = null;

      // 处理每个路径部分
      for (let i = 0; i < pathParts.length; i++) {
        const folderName = pathParts[i];

        if (i === 0) {
          // 第一级：从根目录开始
          try {
            const folders = DriveApp.getFoldersByName(folderName);
            if (folders.hasNext()) {
              currentFolder = folders.next();
            } else {
              currentFolder = DriveApp.createFolder(folderName);
              Logger.log(`创建文件夹: "${folderName}" (一级文件夹)`);
            }
          } catch (error) {
            Logger.log(`创建一级文件夹失败 "${folderName}": ${error.message}`);
            return null;
          }
        } else {
          // 后续级别：从当前文件夹的子文件夹中查找或创建
          try {
            const subFolders = currentFolder.getFoldersByName(folderName);
            if (subFolders.hasNext()) {
              currentFolder = subFolders.next();
            } else {
              currentFolder = currentFolder.createFolder(folderName);
              Logger.log(`创建文件夹: "${folderName}" (在 "${pathParts[i-1]}" 内)`);
            }
          } catch (error) {
            Logger.log(`创建子文件夹失败 "${folderName}": ${error.message}`);
            return null;
          }
        }
      }

      Logger.log(`确保文件夹路径存在: "${folderPath}" - 成功`);
      return currentFolder;

    } catch (error) {
      Logger.log(`ensureNestedFolderExists 失败 "${folderPath}": ${error.message}`);
      return null;
    }
  },

  /**
   * 保存或更新文件到指定文件夹
   * @param {Folder} folder - 目标文件夹对象
   * @param {string} fileName - 文件名
   * @param {string} content - 文件内容
   * @return {boolean} 是否成功保存
   */
  saveOrUpdateFile: function(folder, fileName, content) {
    try {
      if (!folder || !fileName || fileName.trim().length === 0) {
        Logger.log(`错误：无效参数，folder=${!!folder}, fileName="${fileName}"`);
        return false;
      }

      let file;
      try {
        // 检查文件是否已存在
        const files = folder.getFilesByName(fileName);
        if (files.hasNext()) {
          file = files.next();
          // 文件已存在，更新内容
          file.setContent(content);
          Logger.log(`更新文件: "${fileName}" (在文件夹 "${folder.getName()}")`);
        } else {
          // 文件不存在，创建新文件
          file = folder.createFile(fileName, content);
          Logger.log(`创建文件: "${fileName}" (在文件夹 "${folder.getName()}")`);
        }
      } catch (e) {
        Logger.log(`文件操作失败 "${fileName}": ${e.message}`);
        return false;
      }

      return true;

    } catch (error) {
      Logger.log(`saveOrUpdateFile 失败 "${fileName}": ${error.message}`);
      return false;
    }
  },


  /**
   * 处理文件夹中的文件，支持多种过滤条件和操作
   * @param {string|Folder} target - 文件夹路径、名称或Folder对象
   * @param {Object} options - 处理选项
   * @param {Array} options.filters - 过滤条件数组
   * @param {string} options.action - 操作类型：'trash'（移动到回收站）
   * @param {number} options.maxFiles - 最大处理文件数（默认：无限制）
   * @param {boolean} options.dryRun - 试运行模式，不实际执行操作（默认：false）
   * @return {Object} 处理结果统计
   */
  cleanFilesInFolder: function(target, options) {
    try {
      Utils.logStart("Google Drive文件处理");

      // 默认选项
      const defaults = {
        filters: [],
        action: 'trash',
        maxFiles: 0, // 0表示无限制
        dryRun: false,
        returnFileList: false // 是否返回符合条件的文件列表（不执行实际操作）
      };
      const config = { ...defaults, ...options };

      // 获取文件夹对象
      let folder;
      if (typeof target === 'string') {
        // 如果是路径，使用getFolderByPath（只查找不创建）
        if (target.includes('/')) {
          folder = this.getFolderByPath(target);
        } else {
          // 如果是名称，使用getFolderByName
          folder = this.getFolderByName(target);
        }
      } else {
        // 假设是Folder对象
        folder = target;
      }

      if (!folder) {
        const errorMsg = typeof target === 'string' ?
          `找不到文件夹: ${target}` : '提供的文件夹对象无效';
        Utils.logError(new Error(errorMsg), "文件夹查找");
        return { success: false, error: errorMsg, processed: 0, actioned: 0 };
      }

      // 记录扫描信息（在扫描完成后记录实际数量）

      if (config.dryRun) {
        Utils.logAction("试运行模式", { extra: "不实际执行文件操作" });
      }

      // 遍历文件
      const files = folder.getFiles();
      let processed = 0;
      let actioned = 0;
      const skippedFiles = [];
      const fileList = []; // 收集符合条件的文件列表

      while (files.hasNext() && (config.maxFiles === 0 || processed < config.maxFiles)) {
        const file = files.next();
        processed++;

        // 跳过已在回收站的文件
        if (file.isTrashed()) {
          continue;
        }

        // 应用所有过滤条件
        let shouldAction = true;
        for (const filter of config.filters) {
          if (!this._applyFileFilter(file, filter)) {
            shouldAction = false;
            break;
          }
        }

        if (shouldAction) {
          actioned++;

          // 收集符合条件的文件信息
          if (config.returnFileList) {
            fileList.push({
              name: file.getName(),
              id: file.getId(),
              size: file.getSize(),
              lastUpdated: file.getLastUpdated()
            });
          }

          // 执行操作
          if (!config.dryRun) {
            try {
              if (config.action === 'trash') {
                file.setTrashed(true);
                Utils.logAction("将文件移至回收站", {
                  name: file.getName(),
                  extra: `(ID: ${file.getId()}, 最近更新: ${file.getLastUpdated()})`
                });
              }
              // 可以扩展其他操作：delete, move, copy等
            } catch (error) {
              Utils.logError(error, `执行操作 '${config.action}' 失败`);
              skippedFiles.push({ file: file.getName(), error: error.message });
            }
          } else {
            // 试运行模式，只记录
            Utils.logAction("[试运行] 符合条件的文件", {
              name: file.getName(),
              extra: `(ID: ${file.getId()}, 最近更新: ${file.getLastUpdated()})`
            });
          }
        }
      }

      // 记录扫描信息
      Utils.logScanRange("Drive文件", processed, {
        extra: `正在扫描文件夹: '${folder.getName()}' (ID: ${folder.getId()})`
      });

      // 生成结果摘要
      const summary = {
        success: true,
        folder: folder.getName(),
        processed: processed,
        actioned: actioned,
        skipped: skippedFiles.length,
        skippedDetails: skippedFiles,
        dryRun: config.dryRun,
        count: actioned,  // 为Utils.logEnd兼容添加count字段
        message: `扫描了 ${processed} 个文件，处理了 ${actioned} 个文件，跳过 ${skippedFiles.length} 个文件`,
        fileList: config.returnFileList ? fileList : undefined  // 返回文件列表（仅当returnFileList为true时）
      };

      Utils.logEnd("Google Drive文件处理", summary);
      return summary;

    } catch (error) {
      Utils.logError(error, "文件处理");
      return { success: false, error: error.message, processed: 0, actioned: 0, fileList: [] };
    }
  },

  /**
   * 判断文件是否早于指定时间
   * @param {File} file - 文件对象
   * @param {string|Date|number} timeThreshold - 时间阈值，支持字符串（如"7d"、"18h"）、Date对象或毫秒时间戳
   * @param {string} timeField - 时间字段：'lastUpdated'（默认）或 'dateCreated'
   * @return {boolean} 文件是否早于阈值
   */
  isFileOlderThan: function(file, timeThreshold, timeField = 'lastUpdated') {
    try {
      if (!file) return false;

      // 获取文件时间
      let fileTime;
      if (timeField === 'dateCreated') {
        fileTime = file.getDateCreated().getTime();
      } else {
        fileTime = file.getLastUpdated().getTime();
      }

      // 解析时间阈值
      let thresholdTime;
      if (typeof timeThreshold === 'string') {
        thresholdTime = this._parseTimeString(timeThreshold);
      } else if (timeThreshold instanceof Date) {
        thresholdTime = timeThreshold.getTime();
      } else if (typeof timeThreshold === 'number') {
        thresholdTime = timeThreshold;
      } else {
        Logger.log(`错误：不支持的时间阈值类型: ${typeof timeThreshold}`);
        return false;
      }

      return fileTime < thresholdTime;

    } catch (error) {
      Logger.log(`isFileOlderThan 失败: ${error.message}`);
      return false;
    }
  },

  /**
   * 内部函数：应用文件过滤条件
   * @private
   */
  _applyFileFilter: function(file, filter) {
    try {
      const fileName = file.getName();

      switch (filter.type) {
        case 'time':
          // 时间过滤：{ type: 'time', olderThan: '7d', field: 'lastUpdated' }
          const olderThan = filter.olderThan || '0d';
          const field = filter.field || 'lastUpdated';
          return this.isFileOlderThan(file, olderThan, field);

        case 'filename_pattern':
          // 文件名模式过滤：{ type: 'filename_pattern', pattern: '^\\d{4}-\\d{2}-\\d{2}' }
          const pattern = filter.pattern;
          if (!pattern) return true;
          const regex = new RegExp(pattern);
          return regex.test(fileName);

        case 'exclude_chars':
          // 排除字符过滤：{ type: 'exclude_chars', chars: ['📌', '🗄️'] }
          const chars = filter.chars || [];
          if (chars.length === 0) return true;
          return !Utils.hasExcludedChars(fileName, chars);

        case 'no_extension':
          // 无扩展名过滤：检查以下情况视为无扩展名：
          // 1. 没有点 (例如：filename)
          // 2. 最后一个点的右边紧跟着一个英文空格 (例如：filename. )
          // 3. 以点结尾 (例如：filename.)
          // 4. 最后一个点后面跟着常见网站域名 (例如：website.com, site.cn)
          const lastDotIndex = fileName.lastIndexOf('.');

          // 情况1：没有点 -> 无扩展名
          if (lastDotIndex === -1) {
            return true;
          }

          // 情况2：以点结尾 -> 无扩展名
          if (lastDotIndex === fileName.length - 1) {
            return true;
          }

          // 情况3：最后一个点的右边紧跟着一个英文空格 -> 无扩展名
          if (lastDotIndex < fileName.length - 1 && fileName.charAt(lastDotIndex + 1) === ' ') {
            return true;
          }

          // 情况4：最后一个点后面跟着常见网站域名 -> 无扩展名
          const afterLastDot = fileName.substring(lastDotIndex + 1).toLowerCase();
          const commonDomainExtensions = ['com', 'net', 'cn', 'gov', 'org', 'edu'];
          if (commonDomainExtensions.some(ext => afterLastDot.startsWith(ext))) {
            return true;
          }

          // 其他情况视为有扩展名
          return false;

        case 'has_extension':
          // 有扩展名过滤：{ type: 'has_extension', extensions: ['.txt', '.csv'] }
          const extensions = filter.extensions || [];
          if (extensions.length === 0) return true;
          const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
          return extensions.some(ext => fileExt === ext.toLowerCase());

        case 'min_size':
          // 最小大小过滤：{ type: 'min_size', bytes: 1024 }
          const minBytes = filter.bytes || 0;
          return file.getSize() >= minBytes;

        case 'max_size':
          // 最大大小过滤：{ type: 'max_size', bytes: 10485760 }
          const maxBytes = filter.bytes || Infinity;
          return file.getSize() <= maxBytes;

        default:
          Logger.log(`警告：未知的过滤类型: ${filter.type}`);
          return true;
      }
    } catch (error) {
      Logger.log(`过滤条件应用失败: ${error.message}`);
      return false;
    }
  },

  /**
   * 内部函数：解析时间字符串
   * @private
   */
  _parseTimeString: function(timeStr) {
    try {
      // 匹配数字和单位
      const match = timeStr.match(/^(\d+)([dhms])$/);
      if (!match) {
        // 处理非标准格式时间字符串
        const date = new Date(timeStr);
        if (isNaN(date.getTime())) {
          throw new Error(`无法解析时间字符串: ${timeStr}`);
        }
        return date.getTime();
      }

      const value = parseInt(match[1], 10);
      const unit = match[2];

      // 使用时间工具函数
      let thresholdDate;
      switch (unit) {
        case 'd': // 天
          thresholdDate = Utils.getDateDaysAgo(value);
          break;
        case 'h': // 小时
          // 使用现有工具函数：将小时转换为分钟（60分钟=1小时）
          thresholdDate = Utils.getDateMinutesAgo(value * 60);
          break;
        case 'm': // 分钟
          thresholdDate = Utils.getDateMinutesAgo(value);
          break;
        case 's': // 秒
          // 使用现有工具函数：将秒转换为分钟（60秒=1分钟）
          thresholdDate = Utils.getDateMinutesAgo(Math.ceil(value / 60));
          break;
        default:
          throw new Error(`不支持的时间单位: ${unit}`);
      }

      return thresholdDate.getTime();

    } catch (error) {
      Logger.log(`时间字符串解析失败: ${error.message}`);
      return 0;
    }
  }
};
