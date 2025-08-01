const { Pool } = require('pg');

// 创建数据库连接池
function initializeDatabase() {
  // 从环境变量获取数据库连接信息
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL 环境变量未设置');
  }
  
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  // 设置时区为Asia/Shanghai
  pool.on('connect', async (client) => {
    try {
      await client.query("SET TIME ZONE 'Asia/Shanghai'");
    } catch (error) {
      console.error('设置时区失败:', error);
    }
  });

  return pool;
}

// 初始化数据库表
async function setupDatabase() {
  let pool;
  
  try {
    pool = initializeDatabase();
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    throw error;
  }
  
  try {
    // 创建车辆表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        vehicle_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        location_x DOUBLE PRECISION,
        location_y DOUBLE PRECISION,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('vehicles 表创建成功或已存在');

    // 创建车辆状态历史表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_status_history (
        id SERIAL PRIMARY KEY,
        vehicle_id TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('vehicle_status_history 表创建成功或已存在');

    // 创建车辆状态段表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_status_segments (
        id SERIAL PRIMARY KEY,
        vehicle_id TEXT NOT NULL,
        status TEXT NOT NULL,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        duration_seconds INTEGER
      )
    `);
    console.log('vehicle_status_segments 表创建成功或已存在');

    // 创建每日车辆统计表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_vehicle_stats (
        id SERIAL PRIMARY KEY,
        vehicle_id TEXT NOT NULL,
        date DATE NOT NULL,
        working_seconds INTEGER DEFAULT 0,
        waiting_seconds INTEGER DEFAULT 0,
        maintenance_seconds INTEGER DEFAULT 0,
        fault_seconds INTEGER DEFAULT 0,
        UNIQUE(vehicle_id, date)
      )
    `);
    console.log('daily_vehicle_stats 表创建成功或已存在');

    console.log('所有数据库表创建成功或已存在');
  } catch (error) {
    console.error('数据库表创建失败:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

module.exports = {
  initializeDatabase,
  setupDatabase
};
