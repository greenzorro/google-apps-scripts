/*
 * File: utils_google_sheets.js
 * Project: google_apps_scripts
 * Created: 2025-12-11
 * Author: Victor Cheng
 * Email: hi@victor42.work
 * Description: Google Sheets操作工具函数库，提供Google Sheets数据读取、更新、查找等操作功能。
 */

/**
 * A collection of Google Sheets utility functions.
 * @namespace UtilsGoogleSheets
 */
const UtilsGoogleSheets = {

  /**
   * ==================== Google Sheets 操作工具 ====================
   */

  /**
   * 将列字母转换为列号（A=1, B=2, ..., Z=26, AA=27, AB=28, ...）
   * @param {string} column - 列字母
   * @return {number} 列号
   */
  columnToNumber: function(column) {
    let result = 0;
    for (let i = 0; i < column.length; i++) {
      result = result * 26 + (column.charCodeAt(i) - 64);
    }
    return result;
  },

  /**
   * 将列号转换为列字母（1=A, 2=B, ..., 26=Z, 27=AA, 28=AB, ...）
   * @param {number} columnNumber - 列号
   * @return {string} 列字母
   */
  numberToColumn: function(columnNumber) {
    let result = '';
    while (columnNumber > 0) {
      const remainder = (columnNumber - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      columnNumber = Math.floor((columnNumber - 1) / 26);
    }
    return result;
  },


  /**
   * 在Google Sheets特定列中查找内容并返回第一个匹配的行列号
   * @param {string} fileName - 文件名（Google Drive根目录中）
   * @param {string} sheetName - 工作表名称
   * @param {string} column - 列字母（如"B"）
   * @param {string} searchText - 要查找的文本内容
   * @return {Object|null} 包含行号和列号的对象，或null（未找到时）
   */
  findTextInColumn: function(fileName, sheetName, column, searchText) {
    try {
      // 在Google Drive根目录中查找文件
      const files = DriveApp.getFilesByName(fileName);
      if (!files.hasNext()) {
        Logger.log(`错误：找不到文件 "${fileName}"`);
        return null;
      }

      const file = files.next();
      const spreadsheet = SpreadsheetApp.openById(file.getId());

      // 获取指定工作表
      const sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        Logger.log(`错误：在工作表 "${fileName}" 中找不到工作表 "${sheetName}"`);
        return null;
      }

      // 获取指定列的所有数据
      const lastRow = sheet.getLastRow();
      if (lastRow === 0) {
        Logger.log("工作表为空");
        return null;
      }

      const range = sheet.getRange(`${column}1:${column}${lastRow}`);
      const values = range.getValues();

      // 从上到下查找匹配内容
      for (let i = 0; i < values.length; i++) {
        const cellValue = values[i][0]; // 单列数据，每个元素是单元素数组
        if (cellValue === searchText) {
          const row = i + 1; // 转换为1-based行号
          const columnNumber = this.columnToNumber(column);
          Logger.log(`找到匹配：${fileName} - ${sheetName} - ${column}${row}`);
          return { row: row, column: columnNumber };
        }
      }

      Logger.log(`未找到匹配内容 "${searchText}"`);
      return null;

    } catch (error) {
      Logger.log(`查找失败：${error.message}`);
      return null;
    }
  },


  /**
   * 通过文件名和工作表名读取Google Sheets特定区域的内容
   * @param {string} fileName - 文件名（Google Drive根目录中）
   * @param {string} sheetName - 工作表名称
   * @param {string} rangeA1 - 范围（A1表示法，如"B3:D8"）
   * @return {Array<Array<*>>|null} 二维数组数据或null（读取失败时）
   */
  readSheetByFileName: function(fileName, sheetName, rangeA1) {
    try {
      // 在Google Drive根目录中查找文件
      const files = DriveApp.getFilesByName(fileName);
      if (!files.hasNext()) {
        Logger.log(`错误：找不到文件 "${fileName}"`);
        return null;
      }

      const file = files.next();
      const spreadsheet = SpreadsheetApp.openById(file.getId());

      // 获取指定工作表
      const sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        Logger.log(`错误：在工作表 "${fileName}" 中找不到工作表 "${sheetName}"`);
        return null;
      }

      // 读取指定范围的数据
      const data = this.readSheetData(file, rangeA1);
      if (data) {
        Logger.log(`成功读取：${fileName} - ${sheetName} - ${rangeA1}`);
      }
      return data;

    } catch (error) {
      Logger.log(`读取失败：${error.message}`);
      return null;
    }
  },

  /**
   * 读取Google Sheets文件中的指定范围数据，支持Google Sheets、CSV文件格式
   * 对于Excel文件会提示需要手动转换为Google Sheets格式
   * @param {File} file - 文件对象（支持Google Sheets、CSV格式）
   * @param {string} rangeA1 - 范围（A1表示法，如"A1:E100"）
   * @return {Array<Array<*>>|null} 二维数组数据或null（读取失败时）
   */
  readSheetData: function(file, rangeA1) {
    try {
      const mimeType = file.getMimeType();

      // 检查文件类型
      if (mimeType !== 'application/vnd.google-apps.spreadsheet') {
        // Excel文件需要手动转换
        if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            mimeType === 'application/vnd.ms-excel') {
          Logger.log(`错误: Excel文件需要手动转换为Google Sheets格式: ${file.getName()}`);
          Logger.log(`请右键点击文件 "${file.getName()}" -> "打开方式" -> "Google Sheets"`);
          Logger.log(`或者将文件上传到Google Drive并选择"转换为Google Sheets格式"`);
          return null;
        }
        // 支持CSV文件读取
        else if (mimeType === 'text/csv') {
          return this.readCSVData(file, rangeA1);
        }
        else {
          Logger.log(`错误: 不支持的文件格式: ${mimeType}`);
          return null;
        }
      }

      // 如果是Google Sheets文件，正常读取
      const spreadsheet = SpreadsheetApp.openById(file.getId());
      const sheet = spreadsheet.getSheets()[0]; // 获取第一个工作表
      const range = sheet.getRange(rangeA1);
      return range.getValues();
    } catch (error) {
      Logger.log(`读取数据失败: ${error.message}`);
      return null;
    }
  },

  /**
   * 读取CSV文件数据并提取指定范围的内容
   * @param {File} file - CSV文件
   * @param {string} rangeA1 - 范围（A1表示法，如"A1:E100"），用于从CSV文件中提取子范围
   * @return {Array<Array<*>>|null} 二维数组数据或null（读取失败时）
   */
  readCSVData: function(file, rangeA1) {
    try {
      // 解析范围参数
      const rangeMatch = rangeA1.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if (!rangeMatch) {
        Logger.log(`错误: 无效的范围格式: ${rangeA1}`);
        return null;
      }

      const startCol = this.columnToNumber(rangeMatch[1]);
      const startRow = parseInt(rangeMatch[2]);
      const endCol = this.columnToNumber(rangeMatch[3]);
      const endRow = parseInt(rangeMatch[4]);

      // 读取CSV文件内容
      const csvContent = file.getBlob().getDataAsString();
      const lines = csvContent.split('\n');

      // 解析CSV数据
      const allData = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const rowData = line.split(',').map(cell => cell.trim().replace(/^"/, '').replace(/"$/, ''));
          allData.push(rowData);
        }
      }

      // 提取指定范围的数据
      const result = [];
      for (let row = startRow - 1; row < Math.min(endRow, allData.length); row++) {
        const rowData = [];
        for (let col = startCol - 1; col < Math.min(endCol, allData[row].length); col++) {
          rowData.push(allData[row][col] || '');
        }
        result.push(rowData);
      }

      Logger.log(`成功读取CSV文件: ${file.getName()}, 范围: ${rangeA1}`);
      return result;

    } catch (error) {
      Logger.log(`读取CSV数据失败: ${error.message}`);
      return null;
    }
  },


  /**
   * 通过文件名和工作表名更新Google Sheets特定区域
   * @param {string} fileName - 文件名（Google Drive根目录中）
   * @param {string} sheetName - 工作表名称
   * @param {string} rangeA1 - 范围（A1表示法，如"B2:D7"）
   * @param {Array<Array<*>>} data - 二维数组数据
   * @return {boolean} 是否成功更新
   */
  updateSheetByFileName: function(fileName, sheetName, rangeA1, data) {
    try {
      // 在Google Drive根目录中查找文件
      const files = DriveApp.getFilesByName(fileName);
      if (!files.hasNext()) {
        Logger.log(`错误：找不到文件 "${fileName}"`);
        return false;
      }

      const file = files.next();
      const spreadsheet = SpreadsheetApp.openById(file.getId());

      // 获取指定工作表
      const sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        Logger.log(`错误：在工作表 "${fileName}" 中找不到工作表 "${sheetName}"`);
        return false;
      }

      // 更新指定范围
      const range = sheet.getRange(rangeA1);
      range.setValues(data);

      Logger.log(`成功更新：${fileName} - ${sheetName} - ${rangeA1}`);
      return true;

    } catch (error) {
      Logger.log(`更新失败：${error.message}`);
      return false;
    }
  },

  /**
   * 通过文件名和工作表名清空Google Sheets特定区域
   * @param {string} fileName - 文件名（Google Drive根目录中）
   * @param {string} sheetName - 工作表名称
   * @param {string} rangeA1 - 范围（A1表示法，如"B3:C6"）
   * @return {boolean} 是否成功清空
   */
  clearSheetByFileName: function(fileName, sheetName, rangeA1) {
    try {
      // 在Google Drive根目录中查找文件
      const files = DriveApp.getFilesByName(fileName);
      if (!files.hasNext()) {
        Logger.log(`错误：找不到文件 "${fileName}"`);
        return false;
      }

      const file = files.next();
      const spreadsheet = SpreadsheetApp.openById(file.getId());

      // 获取指定工作表
      const sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        Logger.log(`错误：在工作表 "${fileName}" 中找不到工作表 "${sheetName}"`);
        return false;
      }

      // 清空指定范围
      const range = sheet.getRange(rangeA1);
      range.clearContent();

      Logger.log(`成功清空：${fileName} - ${sheetName} - ${rangeA1}`);
      return true;

    } catch (error) {
      Logger.log(`清空失败：${error.message}`);
      return false;
    }
  },

  /**
   * 智能更新Google Sheets数据，自动计算并匹配数据范围
   * @param {string} fileName - 目标文件名
   * @param {string} sheetName - 目标工作表名称
   * @param {string} targetRangeStart - 目标起始单元格（如"A1"）
   * @param {Array<Array<*>>} sourceData - 源数据二维数组
   * @return {boolean} 是否成功更新
   */
  updateSheetWithAutoRange: function(fileName, sheetName, targetRangeStart, sourceData) {
    try {
      if (!sourceData || sourceData.length === 0) {
        Logger.log(`警告：源数据为空，跳过更新`);
        return true;
      }

      const rows = sourceData.length;
      const cols = sourceData[0] ? sourceData[0].length : 0;

      if (cols === 0) {
        Logger.log(`错误：源数据列数为0`);
        return false;
      }

      // 解析起始单元格
      const startCellMatch = targetRangeStart.match(/([A-Z]+)(\d+)/);
      if (!startCellMatch) {
        Logger.log(`错误：无效的起始单元格格式 "${targetRangeStart}"`);
        return false;
      }

      const startColumn = startCellMatch[1];
      const startRow = parseInt(startCellMatch[2]);

      // 计算目标范围
      const endColumn = this.numberToColumn(this.columnToNumber(startColumn) + cols - 1);
      const endRow = startRow + rows - 1;
      const targetRange = `${startColumn}${startRow}:${endColumn}${endRow}`;

      // 更新数据
      const success = this.updateSheetByFileName(fileName, sheetName, targetRange, sourceData);
      if (success) {
        Logger.log(`智能更新成功：${fileName} - ${sheetName} - ${targetRange} (${rows}行 × ${cols}列)`);
      }
      return success;

    } catch (error) {
      Logger.log(`智能更新失败：${error.message}`);
      return false;
    }
  },

  /**
   * 基于内容匹配的批量更新：匹配的更新，未匹配的可选追加到表尾
   * @param {string} targetFileName - 目标文件名
   * @param {string} targetSheetName - 目标工作表名称
   * @param {string} searchColumn - 搜索列字母（如"A"，表示用第一列作为匹配键）
   * @param {File} sourceFile - 源文件对象
   * @param {string} dataRange - 源数据范围（如"A1:I1000"，包含表头）
   * @param {number} headerRows - 源数据中的表头行数（默认为1）
   * @param {Object} options - 可选配置
   * @param {boolean} options.appendIfNotFound - 找不到时是否追加，默认为true
   * @return {boolean} 是否成功
   */
  updateSheetByContentMatchOrAppend: function(targetFileName, targetSheetName,
                                              searchColumn, sourceFile, dataRange, headerRows, options) {
    try {
      if (headerRows === undefined) headerRows = 1;
      const appendIfNotFound = (options && options.appendIfNotFound !== undefined) ? options.appendIfNotFound : true;

      // 1. 读取源数据所有行
      const sourceData = this.readSheetData(sourceFile, dataRange);
      if (!sourceData || sourceData.length <= headerRows) {
        Logger.log(`信息：源数据为空或只有表头，跳过更新`);
        return true;
      }

      // 2. 获取目标 sheet 对象（用于追加操作）
      const files = DriveApp.getFilesByName(targetFileName);
      if (!files.hasNext()) {
        Utils.logError(new Error(`找不到文件 "${targetFileName}"`), "批量更新");
        return false;
      }
      const file = files.next();
      const spreadsheet = SpreadsheetApp.openById(file.getId());
      const sheet = spreadsheet.getSheetByName(targetSheetName);
      if (!sheet) {
        Utils.logError(new Error(`在工作表 "${targetFileName}" 中找不到工作表 "${targetSheetName}"`), "批量更新");
        return false;
      }

      // 3. 遍历源数据每行（跳过表头）
      let updatedCount = 0;
      let appendedCount = 0;
      let skippedCount = 0;
      const searchColumnIndex = this.columnToNumber(searchColumn) - 1; // 转为0-based

      // 获取目标表搜索列的所有数据（一次性读取，避免重复打开文件）
      const lastRow = sheet.getLastRow();
      const targetSearchColumn = this.columnToNumber(searchColumn);
      let targetSearchValues = [];
      if (lastRow > 0) {
        const searchRange = sheet.getRange(`${searchColumn}1:${searchColumn}${lastRow}`);
        targetSearchValues = searchRange.getValues();
      }

      for (let i = headerRows; i < sourceData.length; i++) {
        const rowData = sourceData[i];
        const searchText = rowData[searchColumnIndex];

        if (!searchText) {
          Logger.log(`警告：第 ${i + 1} 行搜索列为空，跳过`);
          skippedCount++;
          continue;
        }

        // 在已读取的列数据中查找（避免重复打开文件）
        let foundRow = null;
        for (let j = 0; j < targetSearchValues.length; j++) {
          if (targetSearchValues[j][0] === searchText) {
            foundRow = j + 1; // 转为1-based行号
            break;
          }
        }

        if (foundRow) {
          // 已存在：直接更新该行（复用已打开的sheet对象）
          const cols = rowData.length;
          const endColumn = this.numberToColumn(targetSearchColumn + cols - 1);
          const targetRange = `${searchColumn}${foundRow}:${endColumn}${foundRow}`;
          sheet.getRange(targetRange).setValues([rowData]);
          updatedCount++;
        } else {
          // 不存在：根据选项决定追加或跳过
          if (appendIfNotFound) {
            sheet.appendRow(rowData);
            appendedCount++;
            Utils.logAction("追加新行", { title: searchText, extra: `到 ${targetSheetName}` });
          } else {
            skippedCount++;
            Logger.log(`跳过未匹配内容: "${searchText}"`);
          }
        }
      }

      const actionText = appendIfNotFound ? "追加" : "跳过";
      const totalCount = appendIfNotFound ? appendedCount : skippedCount;
      Utils.logEnd("批量更新", { count: totalCount, message: `更新 ${updatedCount} 行，${actionText} ${totalCount} 行` });
      return true;

    } catch (error) {
      Utils.logError(error, "批量更新");
      return false;
    }
  }
};
