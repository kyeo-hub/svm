/**
 * 时间处理工具函数
 */

/**
 * 获取上海时区的当前时间
 * @returns Date对象，表示上海时区的当前时间
 */
export function getShanghaiTime(): Date {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000; // 转换为毫秒
  // 上海时区为UTC+8
  const shanghaiOffset = 8 * 3600000;
  return new Date(now.getTime() + timezoneOffset + shanghaiOffset);
}

/**
 * 将日期转换为上海时区的日期字符串（YYYY-MM-DD）
 * @param date 日期对象
 * @returns YYYY-MM-DD格式的字符串
 */
export function toShanghaiDateString(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60000; // 转换为毫秒
  // 上海时区为UTC+8
  const shanghaiOffset = 8 * 3600000;
  const shanghaiTime = new Date(date.getTime() + timezoneOffset + shanghaiOffset);
  return shanghaiTime.toISOString().split('T')[0];
}

/**
 * 获取上海时区的指定日期的开始时间（00:00:00）
 * @param date 日期字符串 YYYY-MM-DD 或 Date 对象
 * @returns Date对象，表示上海时区的指定日期的开始时间
 */
export function getShanghaiStartOfDay(date: string | Date): Date {
  let targetDate: Date;
  
  if (typeof date === 'string') {
    // 解析 YYYY-MM-DD 格式的日期字符串
    const [year, month, day] = date.split('-').map(Number);
    targetDate = new Date(year, month - 1, day); // 月份从0开始
  } else {
    targetDate = new Date(date);
  }
  
  // 设置为上海时区的当天开始时间
  const timezoneOffset = targetDate.getTimezoneOffset() * 60000; // 转换为毫秒
  // 上海时区为UTC+8
  const shanghaiOffset = 8 * 3600000;
  const shanghaiTime = new Date(targetDate.getTime() + timezoneOffset + shanghaiOffset);
  shanghaiTime.setHours(0, 0, 0, 0);
  
  // 转换回本地时间以便数据库存储
  return new Date(shanghaiTime.getTime() - timezoneOffset - shanghaiOffset);
}

/**
 * 格式化时间为上海时区的本地字符串
 * @param date 日期对象
 * @returns 格式化的日期时间字符串
 */
export function formatShanghaiTime(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60000; // 转换为毫秒
  // 上海时区为UTC+8
  const shanghaiOffset = 8 * 3600000;
  const shanghaiTime = new Date(date.getTime() + timezoneOffset + shanghaiOffset);
  
  return shanghaiTime.toLocaleString('zh-CN', {
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