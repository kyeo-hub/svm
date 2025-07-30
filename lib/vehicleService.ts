import { initializeDatabase } from '../db/database';
import { Pool } from 'pg';
import { readFile } from 'fs/promises';
import { join } from 'path';

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

export class VehicleService {
  // 获取所有车辆
  static async getAllVehicles() {
    const pool = initializeDatabase();
    try {
      const result = await pool.query('SELECT * FROM vehicles ORDER BY last_updated DESC');
      return result.rows;
    } catch (error) {
      console.error('获取车辆列表错误:', error);
      throw error;
    } finally {
      await pool.end();
    }
  }

  // 根据ID获取车辆
  static async getVehicleById(vehicle_id: string) {
    const pool = initializeDatabase();
    try {
      const result = await pool.query('SELECT * FROM vehicles WHERE vehicle_id = $1', [vehicle_id]);
      return result.rows[0];
    } catch (error) {
      console.error('获取车辆信息错误:', error);
      throw error;
    } finally {
      await pool.end();
    }
  }

  // 更新车辆状态
  static async updateVehicleStatus(vehicle_id: string, name: string, status: string, location_x?: number, location_y?: number) {
    const pool = initializeDatabase();
    const client = await pool.connect();
    
    try {
      // 开始事务
      await client.query('BEGIN');
      
      // 检查车辆是否存在
      const existingVehicleResult = await client.query('SELECT * FROM vehicles WHERE vehicle_id = $1', [vehicle_id]);
      
      if (existingVehicleResult.rows.length > 0) {
        // 更新车辆状态
        await client.query(`
          UPDATE vehicles 
          SET status = $1, location_x = $2, location_y = $3, last_updated = CURRENT_TIMESTAMP
          WHERE vehicle_id = $4
        `, [status, location_x, location_y, vehicle_id]);
      } else {
        // 创建新车辆
        await client.query(`
          INSERT INTO vehicles (vehicle_id, name, status, location_x, location_y)
          VALUES ($1, $2, $3, $4, $5)
        `, [vehicle_id, name, status, location_x, location_y]);
      }
      
      // 添加状态历史记录
      await client.query(`
        INSERT INTO vehicle_status_history (vehicle_id, status)
        VALUES ($1, $2)
      `, [vehicle_id, status]);
      
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
    const pool = initializeDatabase();
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
    } finally {
      await pool.end();
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