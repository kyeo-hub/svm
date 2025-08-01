# 使用官方 Node.js 镜像作为构建环境
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml (如果使用pnpm)
COPY package.json pnpm-lock.yaml* ./ 

# 安装依赖 (使用pnpm或npm)
RUN npm install -g pnpm

RUN pnpm config set registry https://registry.npmmirror.com/

RUN pnpm install --frozen-lockfile
# 复制项目文件
COPY . .

# 构建应用
RUN pnpm build

# 使用更小的运行时镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

RUN npm install -g pnpm --registry=https://registry.npmmirror.com
# 从构建阶段复制构建结果和运行时依赖
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/db ./db
COPY --from=builder /app/data ./data
COPY --from=builder /app/.env ./.env
COPY --from=builder /app/tsconfig.json ./tsconfig.json


# 暴露端口
EXPOSE 3000

# 复制启动脚本
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# 启动命令
CMD ["sh", "./start.sh"]
