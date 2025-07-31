import { VehicleService } from '../lib/vehicleService';
import { getShanghaiTime } from '../lib/timeUtils';

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

// 获取命令行参数
const args = process.argv.slice(2);

if (args.length === 0) {
  // 默认更新昨日数据
  updateYesterdayStats();
} else if (args.length === 2 && args[0] === '--date') {
  // 更新指定日期数据
  updateSpecificDateStats(args[1]);
} else {
  console.log('用法:');
  console.log('  ts-node updateDailyStats.ts                     # 更新昨日统计数据');
  console.log('  ts-node updateDailyStats.ts --date YYYY-MM-DD   # 更新指定日期统计数据');
  process.exit(1);
}