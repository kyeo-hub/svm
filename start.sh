#!/bin/sh

# 等待数据库可用
echo "等待数据库连接..."
POSTGRES_HOST=${POSTGRES_HOST:-10.106.56.48}
POSTGRES_PORT=${POSTGRES_PORT:-5432}

# 尝试连接数据库，最多等待30秒
for i in $(seq 1 30); do
  if nc -z $POSTGRES_HOST $POSTGRES_PORT; then
    echo "数据库连接成功！"
    break
  fi
  echo "等待数据库连接... $i/30"
  sleep 1
  if [ $i -eq 30 ]; then
    echo "数据库连接超时，继续启动应用..."
  fi
done

# 初始化数据库
echo "正在初始化数据库..."
node scripts/initDb.js

# 启动应用
echo "启动应用..."
pnpm start
