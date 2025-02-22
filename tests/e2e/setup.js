const path = require('path');
const puppeteer = require('puppeteer-core');
const MockServer = require('./mock-server');
const fs = require('fs');

// 扩展路径
const EXTENSION_PATH = path.join(__dirname, '../../src');

// Chrome 可执行文件路径
const CHROME_PATH = '/usr/bin/google-chrome';

// 测试配置
const TEST_CONFIG = {
  // 测试账号
  accounts: {
    shopA: {
      username: 'test_shop_a',
      password: 'test_password_a'
    },
    shopB: {
      username: 'test_shop_b',
      password: 'test_password_b'
    }
  },
  // 测试URL
  urls: {
    login: 'http://localhost:3333/login',
    home: 'http://localhost:3333/home'
  }
};

let mockServer = null;
let browser = null;
let extensionId = null;

/**
 * 等待扩展加载完成
 */
async function waitForExtension(browser, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const targets = await browser.targets();
    
    // 首先尝试查找 service worker
    const serviceWorkerTarget = targets.find(
      target => target.type() === 'service_worker' && target.url().includes('chrome-extension://')
    );
    
    if (serviceWorkerTarget) {
      const url = serviceWorkerTarget.url();
      extensionId = url.split('/')[2];
      console.log('扩展已加载（service worker），ID:', extensionId);
      
      // 等待 service worker 完全初始化
      await new Promise(resolve => setTimeout(resolve, 1000));
      return extensionId;
    }
    
    // 如果找不到 service worker，尝试查找 background page
    const backgroundTarget = targets.find(
      target => target.type() === 'background_page' && target.url().includes('chrome-extension://')
    );
    
    if (backgroundTarget) {
      const url = backgroundTarget.url();
      extensionId = url.split('/')[2];
      console.log('扩展已加载（background page），ID:', extensionId);
      return extensionId;
    }
    
    console.log(`等待扩展加载... (${i + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 如果仍然找不到扩展，打印所有目标以帮助调试
  console.log('所有目标:', await Promise.all(
    (await browser.targets()).map(async target => ({
      type: target.type(),
      url: target.url()
    }))
  ));
  
  throw new Error('扩展加载超时');
}

/**
 * 启动测试环境
 */
async function setupTestEnvironment() {
  try {
    // 打印扩展路径
    console.log('扩展路径:', EXTENSION_PATH);

    // 检查扩展路径下的文件
    if (!fs.existsSync(EXTENSION_PATH)) {
      console.error('扩展路径不存在:', EXTENSION_PATH);
      throw new Error('扩展路径不存在');
    }

    const extensionFiles = fs.readdirSync(EXTENSION_PATH);
    console.log('扩展路径下的文件:', extensionFiles);

    // 检查是否存在图标文件
    const iconPath = path.join(EXTENSION_PATH, 'icon.png');
    if (!fs.existsSync(iconPath)) {
      console.error('图标文件不存在:', iconPath);
      throw new Error('图标文件不存在');
    }

    // 启动模拟服务器
    mockServer = new MockServer();
    await mockServer.start();

    console.log('准备启动浏览器...');

    // 启动浏览器
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--enable-logging',
        '--v=1',
        '--window-size=1280,720',
        '--disable-gpu',
        '--remote-debugging-port=9222',
        '--user-data-dir=/tmp/test-user-data-dir'
      ],
      timeout: 180000,
      defaultViewport: {
        width: 1280,
        height: 720
      },
      ignoreDefaultArgs: ['--disable-extensions']
    });

    if (!browser) {
      console.error('浏览器启动失败，停止后续操作。');
      throw new Error('浏览器启动失败');
    }

    console.log('浏览器启动成功，等待扩展加载...');

    // 等待扩展加载完成
    await waitForExtension(browser);

    return browser;
  } catch (error) {
    console.error('设置测试环境失败:', error);
    if (browser) {
      await browser.close();
    }
    if (mockServer) {
      await mockServer.stop();
    }
    throw error;
  }
}

/**
 * 清理测试环境
 */
async function cleanupTestEnvironment() {
  try {
    if (browser) {
      await browser.close();
      browser = null;
    }
    if (mockServer) {
      await mockServer.stop();
      mockServer = null;
    }
  } catch (error) {
    console.error('清理测试环境失败:', error);
  }
}

/**
 * 创建新的测试页面
 */
async function createTestPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  // 设置请求拦截
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().includes('/api/login')) {
      request.continue({
        method: 'POST',
        postData: JSON.stringify({
          username: request.postData().username,
          password: request.postData().password
        }),
        headers: {
          ...request.headers(),
          'Content-Type': 'application/json'
        }
      });
    } else {
      request.continue();
    }
  });

  return page;
}

/**
 * 登录店铺
 */
async function loginShop(page, account) {
  await page.goto(TEST_CONFIG.urls.login);
  await page.waitForSelector('#usernameId');
  await page.type('#usernameId', account.username);
  await page.type('#passwordId', account.password);
  await Promise.all([
    page.waitForNavigation(),
    page.click('.login-button')
  ]);
}

/**
 * 获取当前登录状态
 */
async function getLoginStatus(page) {
  try {
    await page.goto(TEST_CONFIG.urls.home);
    await page.waitForSelector('.shop-name', { timeout: 5000 });
    const shopName = await page.$eval('.shop-name', el => el.textContent);
    return {
      isLoggedIn: Boolean(shopName),
      shopName
    };
  } catch (error) {
    return {
      isLoggedIn: false,
      error: error.message
    };
  }
}

/**
 * 获取扩展ID
 */
async function getExtensionId() {
  if (!extensionId) {
    throw new Error('扩展ID未初始化');
  }
  return extensionId;
}

module.exports = {
  TEST_CONFIG,
  setupTestEnvironment,
  cleanupTestEnvironment,
  createTestPage,
  loginShop,
  getLoginStatus,
  getExtensionId
}; 