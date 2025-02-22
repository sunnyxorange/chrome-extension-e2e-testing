# Chrome Extension E2E Testing Example

这是一个使用 Jest 和 Puppeteer 对 Chrome 扩展进行端到端测试的示例项目。

## 项目结构

```
.
├── src/                    # 扩展源代码
│   ├── hello.html         # 扩展弹出页面
│   ├── hello_extensions.png # 扩展图标
│   ├── manifest.json      # 扩展配置文件
│   └── popup.js          # 弹出页面脚本
├── tests/                 # 测试代码
│   └── e2e/              # 端到端测试
│       ├── test.js       # 测试用例
│       └── test-environment.js # 测试环境配置
└── package.json          # 项目配置文件
```

## 安装依赖

```bash
npm install
```

## 运行测试

```bash
npm run test:e2e
```

## CI/CD

本项目使用 GitHub Actions 进行持续集成和部署。每次推送到 main 分支或创建 Pull Request 时，都会自动运行测试。

## 环境要求

- Node.js 18+
- Google Chrome
- Xvfb (用于Linux环境下的无头浏览器测试)

## 许可证

MIT 