#!/bin/bash

# 等待数据库启动
echo "等待数据库启动..."
sleep 10

# 初始化数据库表
echo "初始化数据库表..."
pnpm run init:db

# 初始化预设车辆数据
echo "初始化预设车辆数据..."
pnpm run init:vehicles

echo "初始化完成!"