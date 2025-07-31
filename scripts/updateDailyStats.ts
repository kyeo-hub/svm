import { VehicleService } from '../lib/vehicleService';
import { initializeDatabase } from '../db/database';

async function updateDailyStats() {
  try {
    // 获取昨天的日期（上海时区）
    const yesterday = getShanghaiTime();
    yesterday.setDate(yesterday.getDate() - 1);
    
    console.log(`开始更新 ${yesterday.toISOString().split('T')[0]} 的每日统计数据...`);
    
    await VehicleService.updateDailyStats(yesterday);
    
    console.log('每日统计数据更新完成');
  } catch (error) {
    console.error('更新每日统计数据时出错:', error);
    process.exit(1);
  }
}

// 执行更新
updateDailyStats();

/**
 * 更新昨日的车辆统计信息
 */
async function updateYesterdayStats() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    console.log(`开始更新 ${yesterday.toISOString().split('T')[0]} 的统计数据...`);
    
    await VehicleService.updateDailyStats(yesterday);
    
    console.log('统计数据更新完成');
    process.exit(0);
  } catch (error) {
    console.error('更新统计数据时出错:', error);
    process.exit(1);
  }
}

/**
 * 更新指定日期的车辆统计信息
 * @param date 指定日期 (格式: YYYY-MM-DD)
 */
async function updateSpecificDateStats(dateString: string) {
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.error('无效的日期格式，请使用 YYYY-MM-DD 格式');
      process.exit(1);
    }
    
    console.log(`开始更新 ${date.toISOString().split('T')[0]} 的统计数据...`);
    
    await VehicleService.updateDailyStats(date);
    
    console.log('统计数据更新完成');
    process.exit(0);
  } catch (error) {
    console.error('更新统计数据时出错:', error);
    process.exit(1);
  }
}

// 解析命令行参数
const args = process.argv.slice(2);
let targetDate: string | undefined;

if (args.includes('--date') && args.length > args.indexOf('--date') + 1) {
  targetDate = args[args.indexOf('--date') + 1];
}

updateDailyStatsForDate(targetDate);