# 使用一个官方的 Node.js 运行时作为父镜像。
# 选择一个具体的 LTS 版本（例如 18 或 20）以保证可复现性。
FROM node:18-alpine

# 设置容器中的工作目录。
WORKDIR /app

# 首先复制 package.json 和 package-lock.json (或 yarn.lock)
# 这样可以利用 Docker 的层缓存机制。
COPY package*.json ./

# 安装项目依赖。
# 如果你使用 yarn，请将 'npm install' 替换为 'yarn install --frozen-lockfile'。
RUN npm install

# 复制应用程序的其余源代码。
# 注意：如果 .env 文件没有在 .dockerignore 中被忽略，它也会被复制。
COPY . .

# 暴露应用程序运行的端口。
EXPOSE 5173

# 运行应用程序的命令。
# 'npm run dev' 会执行 package.json中定义的 "dev" 脚本。
# '--' 用于确保 '--host' 作为参数传递给 vite 命令，而不是 npm 本身。
CMD ["npm", "run", "dev", "--", "--host"]
