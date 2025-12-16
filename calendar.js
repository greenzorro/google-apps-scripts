/*
 * File: calendar.js
 * Project: google_apps_scripts
 * Created: 2025-09-17 10:56:16
 * Author: Victor Cheng
 * Email: hi@victor42.work
 * Description: Google Calendar 日历管理脚本，提供日历事件监控和变更检测功能。
 */

function monitorCalendarChanges() {
  /*
   * Function: monitorCalendarChanges
   * Description: 在一个包含当月、过去6个月和未来6个月（共13个月）的时间范围内，查找"最后更新时间"最新的一个日历事件。核心规则：只有当该事件的"最后更新时间"与脚本当前运行时间的差值在15分钟以内时，才将其视为一个有效的新创建或更新，并显示其详细信息。否则，将视为因删除旧日程等原因产生的陈旧更新，并只做简单记录。
   */
  // 使用工具函数记录脚本开始
  Utils.logStart("日历监控");
  
  // --- 1. 定义时间范围和当前运行时间 ---
  const scriptRunTime = new Date(); // 记录脚本的准确运行时间
  
  // 使用工具函数计算月份范围，替代手动计算
  const { startTime, endTime } = Utils.getMonthRange(6, 6); // 前后6个月

  // --- 2. 获取日历和所有事件 ---
  const calendar = CalendarApp.getDefaultCalendar();
  const events = calendar.getEvents(startTime, endTime);

  if (events.length === 0) {
    Logger.log("在这个广阔的时间范围内没有找到任何日历事件。");
    Utils.logEnd("日历监控", { count: 0, message: "没有找到任何日历事件" });
    return;
  }

  // 使用工具函数记录扫描统计，替代直接Logger.log
  Utils.logScanRange("日历事件", events.length, {
    extra: `时间范围: ${startTime.toLocaleDateString()} 到 ${endTime.toLocaleDateString()}`
  });

  const mostRecentEvent = events.reduce((latestEvent, currentEvent) => {
    return currentEvent.getLastUpdated() > latestEvent.getLastUpdated() ? currentEvent : latestEvent;
  });

  // --- 3. 核心逻辑：15分钟有效性检查 ---
  if (mostRecentEvent) {
    const lastUpdatedTime = mostRecentEvent.getLastUpdated();
    
    // 使用工具函数检查时间差，替代手动计算
    const isValid = Utils.isTimeDifferenceValid(lastUpdatedTime, 15); // 15分钟有效期
    
    if (isValid) {
      // --- 时间差在15分钟内：视为有效操作，输出完整档案 ---
      Logger.log("--- 发现新创建或更新的日程（15分钟内）！正在输出其全部信息 ---");
      
      // 使用工具函数记录事件详细信息
      logCalendarEventDetails(mostRecentEvent);
      
    } else {
      // --- 时间差超过15分钟：视为陈旧更新，只做简单记录 ---
      const timeDifferenceInMillis = scriptRunTime.getTime() - lastUpdatedTime.getTime();
      const differenceInMinutes = Math.round(timeDifferenceInMillis / 60000);
      
      // 使用工具函数记录状态信息
      Utils.logScanRange("日历事件检查", 1, {
        extra: `找到的最新更新事件已超过15分钟（更新于 ${differenceInMinutes} 分钟前）`
      });
      Logger.log("这通常由删除一个非常旧的日程导致，因此不视为有新日程被创建。");
      Logger.log(`触发检查的事件标题为: '${mostRecentEvent.getTitle()}'`);
    }
  }
  
  // 使用工具函数记录脚本结束
  Utils.logEnd("日历监控", { 
    count: mostRecentEvent ? 1 : 0, 
    message: mostRecentEvent ? "完成日历事件检查" : "没有找到日历事件" 
  });
}

/**
 * 记录日历事件详细信息
 * @param {CalendarEvent} event - 日历事件对象
 */
function logCalendarEventDetails(event) {
  const lastUpdatedTime = event.getLastUpdated();
  
  Logger.log(`标题: ${event.getTitle()}`);
  
  if (event.isAllDayEvent()) {
    Logger.log(`日期: ${event.getAllDayStartDate().toLocaleDateString()} (全天事件)`);
  } else {
    Logger.log(`开始时间: ${event.getStartTime().toLocaleString()}`);
    Logger.log(`结束时间: ${event.getEndTime().toLocaleString()}`);
  }
  
  Logger.log(`创建于: ${event.getDateCreated().toLocaleString()}`);
  Logger.log(`最后更新于: ${lastUpdatedTime.toLocaleString()}`);
  Logger.log(`描述: ${event.getDescription() || "无"}`);
  Logger.log(`地点: ${event.getLocation() || "无"}`);
  
  const guests = event.getGuestList();
  if (guests.length > 0) {
    const guestEmails = guests.map(guest => guest.getEmail());
    Logger.log(`参与者: ${guestEmails.join(', ')}`);
  } else {
    Logger.log("参与者: 无");
  }
  Logger.log(`事件ID: ${event.getId()}`);
  Logger.log("--- 档案结束 ---");
}