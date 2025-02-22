const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

class TestEnvironment {
  constructor(config) {
    this.config = {
      extensionPath: config.extensionPath,
      chromePath: config.chromePath,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000
    };
    console.log('测试环境配置:', this.config);
  }

  async setup() {
    try {
      // 验证扩展路径
      await this.validateExtension();
      console.log('扩展验证通过，准备启动浏览器...');

      // 启动浏览器
      this.browser = await this.launchBrowser();
      console.log('浏览器启动成功，等待扩展加载...');

      // 等待扩展加载
      this.extensionId = await this.waitForExtension();
      console.log(`扩展加载成功，ID: ${this.extensionId}`);

      return this.browser;
    } catch (error) {
      console.error('设置测试环境失败:', error);
      await this.cleanup();
      throw error;
    }
  }

  async validateExtension() {
    console.log('开始验证扩展...');
    console.log('扩展路径:', this.config.extensionPath);
    
    if (!fsSync.existsSync(this.config.extensionPath)) {
      throw new Error(`扩展路径不存在: ${this.config.extensionPath}`);
    }

    // 列出扩展目录中的所有文件
    const files = await fs.readdir(this.config.extensionPath);
    console.log('扩展目录文件列表:', files);

    const manifestPath = path.join(this.config.extensionPath, 'manifest.json');
    if (!fsSync.existsSync(manifestPath)) {
      throw new Error(`manifest.json 不存在: ${manifestPath}`);
    }

    // 读取并打印manifest内容
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    console.log('manifest.json 内容:', manifestContent);
    
    // 解析manifest以获取图标路径
    const manifest = JSON.parse(manifestContent);
    const iconPath = path.join(
      this.config.extensionPath, 
      manifest.action.default_icon
    );
    
    if (!fsSync.existsSync(iconPath)) {
      throw new Error(`图标文件不存在: ${iconPath}`);
    }

    const iconStats = await fs.stat(iconPath);
    console.log('图标文件大小:', iconStats.size, '字节');
  }

  async launchBrowser() {
    const userDataDir = path.join(process.cwd(), '.test-user-data');
    console.log('用户数据目录:', userDataDir);

    // 确保用户数据目录存在并且为空
    if (fsSync.existsSync(userDataDir)) {
      await fs.rm(userDataDir, { recursive: true, force: true });
    }
    await fs.mkdir(userDataDir, { recursive: true });

    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--disable-extensions-except=${this.config.extensionPath}`,
      `--load-extension=${this.config.extensionPath}`,
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${userDataDir}`,
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--metrics-recording-only',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-breakpad',
      '--disable-client-side-phishing-detection',
      '--disable-component-extensions-with-background-pages',
      '--disable-features=TranslateUI,BlinkGenPropertyTrees',
      '--enable-automation',
      '--password-store=basic',
      '--use-mock-keychain',
      '--remote-debugging-port=9222',
      '--headless=new',
      '--disable-extensions-http-throttling',
      '--enable-features=NetworkService,NetworkServiceInProcess'
    ];

    console.log('Chrome 启动参数:', args);

    try {
      const browser = await puppeteer.launch({
        executablePath: this.config.chromePath,
        args,
        defaultViewport: { width: 1280, height: 720 },
        dumpio: true
      });

      console.log('浏览器启动成功');
      return browser;
    } catch (error) {
      console.error('浏览器启动失败:', error);
      throw error;
    }
  }

  async waitForExtension(maxAttempts = 10) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const targets = await this.browser.targets();
        console.log('当前浏览器目标:', targets.map(t => ({
          type: t.type(),
          url: t.url()
        })));

        // 查找扩展的背景页面或服务工作进程
        const extensionTarget = targets.find(target => {
          const url = target.url();
          return url.startsWith('chrome-extension://') && 
                 (url.endsWith('background.js') || url.endsWith('hello.html'));
        });

        if (extensionTarget) {
          const extensionId = extensionTarget.url().split('/')[2];
          console.log('找到扩展:', { url: extensionTarget.url(), id: extensionId });
          return extensionId;
        }

        console.log(`等待扩展加载... (${attempt + 1}/${maxAttempts})`);
        await new Promise(r => setTimeout(r, 2000));
      } catch (error) {
        console.error(`尝试 ${attempt + 1}/${maxAttempts} 失败:`, error);
        if (attempt === maxAttempts - 1) throw error;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    throw new Error('扩展加载超时');
  }

  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.error('清理测试环境时出错:', error);
    }
  }
}

module.exports = TestEnvironment; 