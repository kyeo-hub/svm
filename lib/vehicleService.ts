import { Pool } from 'pg';
import { initializeDatabase } from '../db/database';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Create a singleton pool instance
const pool = initializeDatabase();

export interface Vehicle {
  id?: number;
  vehicle_id: string;
  name: string;
  status: '作业中' | '待命' | '维保中' | '故障中';
  location_x?: number;
  location_y?: number;
  last_updated?: Date;
}

export interface VehicleStatusHistory {
  id?: number;
  vehicle_id: string;
  status: string;
  timestamp?: Date;
}

export interface PresetVehicle {
  vehicle_id: string;
  name: string;
  status: string;
  location_x: number;
  location_y: number;
}

export interface VehicleStatusSegment {
  id?: number;
  vehicle_id: string;
  status: string;
  start_time: Date;
  end_time?: Date;
  duration_seconds?: number;
}

export interface DailyVehicleStats {
  id?: number;
  vehicle_id: string;
  date: Date;
  working_seconds: number;
  waiting_seconds: number;
  maintenance_seconds: number;
  fault_seconds: number;
}

// 状态映射对象
const statusMap: { [key: string]: string } = {
  'working': '作业中',
  'waiting': '待命',
  'maintenance': '维保中',
  'fault': '故障中',
  '作业中': '作业中',
  '待命': '待命',
  '维保中': '维保中',
  '故障中': '故障中'
};

export class VehicleService {
  // 获取所有车辆
  static async getAllVehicles() {
    try {
      const result = await pool.query('SELECT * FROM vehicles ORDER BY last_updated DESC');
      return result.rows;
    } catch (error) {
      console.error('获取车辆列表错误:', error);
      throw error;
    }
  }

  // 根据ID获取车辆
  static async getVehicleById(vehicle_id: string) {
    try {
      const result = await pool.query('SELECT * FROM vehicles WHERE vehicle_id = $1', [vehicle_id]);
      return result.rows[0];
    } catch (error) {
      console.error('获取车辆信息错误:', error);
      throw error;
    }
  }

  // 更新车辆状态
  static async updateVehicleStatus(vehicle_id: string, name: string | null, status: string, location_x?: number, location_y?: number) {
    const pool = initializeDatabase();
    const client = await pool.connect();
    
    try {
      // 开始事务
      await client.query('BEGIN');
      
      // 检查车辆是否存在
      const existingVehicleResult = await client.query('SELECT * FROM vehicles WHERE vehicle_id = $1', [vehicle_id]);
      
      // 确定要使用的车辆名称
      let vehicleName = name;
      if (!vehicleName && existingVehicleResult.rows.length > 0) {
        // 如果没有提供名称且车辆已存在，则使用现有名称
        vehicleName = existingVehicleResult.rows[0].name;
      } else if (!vehicleName) {
        // 如果没有提供名称且是新车辆，则使用默认名称
        vehicleName = `车辆-${vehicle_id}`;
      }
      
      // 确定要使用的状态（转换为中文显示）
      const vehicleStatus = statusMap[status] || status;

      if (existingVehicleResult.rows.length > 0) {
        // 如果提供了新的位置信息，则使用新的，否则保留原有的位置信息
        let newX = location_x;
        let newY = location_y;
        
        // 如果没有提供新的位置信息，则使用原有的位置信息
        if (newX === undefined && newY === undefined) {
          newX = existingVehicleResult.rows[0].location_x;
          newY = existingVehicleResult.rows[0].location_y;
        }
        
        // 更新车辆状态
        await client.query(`
          UPDATE vehicles 
          SET name = $1, status = $2, location_x = $3, location_y = $4, last_updated = CURRENT_TIMESTAMP
          WHERE vehicle_id = $5
        `, [vehicleName, vehicleStatus, newX, newY, vehicle_id]);
      } else {
        // 创建新车辆
        await client.query(`
          INSERT INTO vehicles (vehicle_id, name, status, location_x, location_y)
          VALUES ($1, $2, $3, $4, $5)
        `, [vehicle_id, vehicleName, vehicleStatus, location_x, location_y]);
      }
      
      // 结束上一个状态段
      await client.query(`
        UPDATE vehicle_status_segments 
        SET end_time = CURRENT_TIMESTAMP, 
            duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))
        WHERE vehicle_id = $1 AND end_time IS NULL
      `, [vehicle_id]);
      
      // 添加新的状态段
      await client.query(`
        INSERT INTO vehicle_status_segments (vehicle_id, status, start_time)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
      `, [vehicle_id, vehicleStatus]);
      
      // 添加状态历史记录（使用中文状态）
      await client.query(`
        INSERT INTO vehicle_status_history (vehicle_id, status)
        VALUES ($1, $2)
      `, [vehicle_id, vehicleStatus]);
      
      // 提交事务
      await client.query('COMMIT');
      
      // 返回更新后的车辆信息
      const result = await pool.query('SELECT * FROM vehicles WHERE vehicle_id = $1', [vehicle_id]);
      return result.rows[0];
    } catch (error) {
      // 回滚事务
      await client.query('ROLLBACK');
      console.error('更新车辆状态错误:', error);
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  }

  // 获取车辆状态历史
  static async getVehicleStatusHistory(vehicle_id: string, hours: number = 24) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      const result = await pool.query(`
        SELECT * FROM vehicle_status_history 
        WHERE vehicle_id = $1 AND timestamp >= $2 
        ORDER BY timestamp DESC
      `, [vehicle_id, since]);
      return result.rows;
    } catch (error) {
      console.error('获取车辆状态历史错误:', error);
      throw error;
    }
  }
  
  // 获取车辆状态段
  static async getVehicleStatusSegments(vehicle_id: string, startDate: Date, endDate: Date) {
    try {
      const result = await pool.query(`
        SELECT * FROM vehicle_status_segments
        WHERE vehicle_id = $1 
        AND start_time >= $2 
        AND (end_time <= $3 OR end_time IS NULL)
        ORDER BY start_time DESC
      `, [vehicle_id, startDate, endDate]);
      return result.rows;
    } catch (error) {
      console.error('获取车辆状态段错误:', error);
      throw error;
    }
  }
  
  // 获取车辆每日统计
  static async getVehicleDailyStats(vehicle_id: string, startDate: Date, endDate: Date) {
    try {
      const result = await pool.query(`
        SELECT * FROM daily_vehicle_stats
        WHERE vehicle_id = $1
        AND date >= $2
        AND date <= $3
        ORDER BY date DESC
      `, [vehicle_id, startDate, endDate]);
      return result.rows;
    } catch (error) {
      console.error('获取车辆每日统计错误:', error);
      throw error;
    }
  }
  
  // 获取车辆在指定时间段内的状态时长统计
  static async getVehicleStatusDurationStats(vehicle_id: string, startDate: Date, endDate: Date) {
    try {
      // 查询状态段表计算时长
      const result = await pool.query(`
        SELECT 
          status,
          SUM(
            CASE 
              WHEN end_time IS NOT NULL THEN EXTRACT(EPOCH FROM (end_time - start_time))
              ELSE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))
            END
          ) as total_seconds
        FROM vehicle_status_segments
        WHERE vehicle_id = $1
        AND start_time <= $3
        AND (end_time IS NULL OR end_time >= $2)
        GROUP BY status
      `, [vehicle_id, startDate, endDate]);
      
      // 整理结果
      const stats: { [key: string]: number } = {
        '作业中': 0,
        '待命': 0,
        '维保中': 0,
        '故障中': 0
      };
      
      result.rows.forEach(row => {
        stats[row.status] = parseFloat(row.total_seconds) || 0;
      });
      
      return stats;
    } catch (error) {
      console.error('获取车辆状态时长统计错误:', error);
      throw error;
    }
  }
  
  // 更新每日统计（用于定时任务）
  static async updateDailyStats(date?: Date) {
    const targetDate = date || new Date();
    // 设置为目标日期的开始时间
    targetDate.setHours(0, 0, 0, 0);
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 删除指定日期的统计数据（如果存在）
      await client.query(`
        DELETE FROM daily_vehicle_stats WHERE date = $1
      `, [targetDate]);
      
      // 计算指定日期内各车辆的状态时长
      const result = await client.query(`
        SELECT 
          vehicle_id,
          status,
          SUM(
            CASE 
              WHEN end_time IS NOT NULL THEN EXTRACT(EPOCH FROM (LEAST(end_time, $2) - GREATEST(start_time, $1)))
              ELSE EXTRACT(EPOCH FROM ($2 - GREATEST(start_time, $1)))
            END
          ) as duration_seconds
        FROM vehicle_status_segments
        WHERE start_time <= $2
        AND (end_time IS NULL OR end_time >= $1)
        GROUP BY vehicle_id, status
      `, [targetDate, new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)]);
      
      // 整理数据并插入到每日统计表中
      const statsMap: { [key: string]: any } = {};
      
      result.rows.forEach(row => {
        const vehicleId = row.vehicle_id;
        if (!statsMap[vehicleId]) {
          statsMap[vehicleId] = {
            vehicle_id: vehicleId,
            date: targetDate,
            working_seconds: 0,
            waiting_seconds: 0,
            maintenance_seconds: 0,
            fault_seconds: 0
          };
        }
        
        switch (row.status) {
          case '作业中':
            statsMap[vehicleId].working_seconds = parseFloat(row.duration_seconds) || 0;
            break;
          case '待命':
            statsMap[vehicleId].waiting_seconds = parseFloat(row.duration_seconds) || 0;
            break;
          case '维保中':
            statsMap[vehicleId].maintenance_seconds = parseFloat(row.duration_seconds) || 0;
            break;
          case '故障中':
            statsMap[vehicleId].fault_seconds = parseFloat(row.duration_seconds) || 0;
            break;
        }
      });
      
      // 插入统计数据
      for (const vehicleId in statsMap) {
        const stat = statsMap[vehicleId];
        await client.query(`
          INSERT INTO daily_vehicle_stats 
          (vehicle_id, date, working_seconds, waiting_seconds, maintenance_seconds, fault_seconds)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          stat.vehicle_id,
          stat.date,
          stat.working_seconds,
          stat.waiting_seconds,
          stat.maintenance_seconds,
          stat.fault_seconds
        ]);
      }
      
      await client.query('COMMIT');
      console.log(`每日统计更新完成: ${targetDate.toISOString().split('T')[0]}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('更新每日统计错误:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // 从JSON文件加载预设车辆数据
  static async loadPresetVehicles(): Promise<PresetVehicle[]> {
    try {
      const filePath = join(process.cwd(), 'data', 'presetVehicles.json');
      const data = await readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('加载预设车辆数据错误:', error);
      throw error;
    }
  }
  
  // 初始化预设车辆
  static async initializeDefaultVehicles() {
    try {
      console.log('开始初始化默认车辆数据...');
      
      // 从JSON文件加载预设车辆数据
      const presetVehicles = await this.loadPresetVehicles();
      
      // 逐个添加车辆
      for (const vehicle of presetVehicles) {
        await this.updateVehicleStatus(
          vehicle.vehicle_id,
          vehicle.name,
          vehicle.status,
          vehicle.location_x,
          vehicle.location_y
        );
        console.log(`已初始化车辆: ${vehicle.vehicle_id}`);
      }
      
      console.log('默认车辆数据初始化完成!');
    } catch (error) {
      console.error('初始化默认车辆数据时出错:', error);
      throw error;
    }
  }
}