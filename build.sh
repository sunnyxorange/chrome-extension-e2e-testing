#!/bin/bash

# 清理并创建构建目录
rm -rf dist
mkdir -p dist/background
mkdir -p dist/utils

# 复制 error-handler.js 到 utils 目录
cp src/utils/error-handler.js dist/utils/

# 复制并修改 background.js
cp src/background/background.js dist/background/

# 复制其他文件到目标目录
cp -r src/popup dist/

# 复制manifest.json
cp manifest.json dist/

# 复制图标
if [ -d "public" ]; then
  cp -r public/* dist/
fi

# 修改 background.js 中的导入路径
sed -i 's|../utils/error-handler.js|/utils/error-handler.js|g' dist/background/background.js

echo "构建完成，扩展文件在 dist 目录中" 