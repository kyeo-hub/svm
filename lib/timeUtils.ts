/**
 * 时间处理工具函数
 */

/**
 * 获取上海时区的当前时间
 * @returns Date对象，表示上海时区的当前时间
 */
export function getShanghaiTime(): Date {
  return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Shanghai"}));
}

/**
 * 将日期转换为上海时区的日期字符串（YYYY-MM-DD）
 * @param date 日期对象
 * @returns YYYY-MM-DD格式的字符串
 */
export function toShanghaiDateString(date: Date): string {
  return date.toLocaleString("en-US", {timeZone: "Asia/Shanghai"}).split(',')[0].split('/').reverse().join('-').replace(/\b\d\b/g, '0$&');
}

/**
 * 获取上海时区的指定日期的开始时间（00:00:00）
 * @param date 日期字符串 YYYY-MM-DD 或 Date 对象
 * @returns Date对象，表示上海时区的指定日期的开始时间
 */
export function getShanghaiStartOfDay(date: string | Date): Date {
  let dateStr: string;
  
  if (typeof date === 'string') {
    // 验证日期格式是否为YYYY-MM-DD
    const dateRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    const match = date.match(dateRegex);
    
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      
      // 验证月份和日期的有效性
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        // 返回无效日期
        return new Date('Invalid Date');
      }
      
      // 格式化日期确保两位数格式
      const formattedMonth = month.toString().padStart(2, '0');
      const formattedDay = day.toString().padStart(2, '0');
      dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    } else {
      // 格式不匹配，返回无效日期
      return new Date('Invalid Date');
    }
  } else {
    dateStr = date.toISOString().split('T')[0];
  }
  
  // 创建上海时区的日期
  const shanghaiDate = new Date(`${dateStr}T00:00:00+08:00`);
  return shanghaiDate;
}

/**
 * 格式化时间为上海时区的本地字符串
 * @param date 日期对象
 * @returns 格式化的日期时间字符串
 */
export function formatShanghaiTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}