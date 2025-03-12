# 使用多阶段构建优化镜像大小
# 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json (或 yarn.lock)
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm ci

# 复制所有文件
COPY . .

# 设置环境变量
ENV NEXT_PUBLIC_API_BASE_URL=https://stock.superaihub.com/api
ENV NEXT_PUBLIC_API_KEY=your-secret-api-key

# 构建应用
RUN npm run build

# 运行阶段
FROM node:18-alpine AS runner
WORKDIR /app

# 设置为生产环境
ENV NODE_ENV production

# 添加非root用户以提高安全性
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建的应用和必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# 设置正确的权限
RUN chown -R nextjs:nodejs /app

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 设置环境变量让Next.js监听所有网络接口
ENV HOSTNAME "0.0.0.0"

# 启动应用
CMD ["npm", "start"]