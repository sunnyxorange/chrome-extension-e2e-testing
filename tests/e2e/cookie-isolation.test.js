const {
  TEST_CONFIG,
  setupTestEnvironment,
  cleanupTestEnvironment,
  createTestPage,
  loginShop,
  getLoginStatus,
  getExtensionId
} = require('./setup');

jest.setTimeout(120000); // 设置全局超时时间为120秒

describe('Cookie 隔离测试', () => {
  let browser;

  beforeAll(async () => {
    try {
      browser = await setupTestEnvironment();
    } catch (error) {
      console.error('启动测试环境失败:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await browser.close();
      await cleanupTestEnvironment();
    } catch (error) {
      console.error('清理测试环境失败:', error);
    }
  });

  test('场景A：多标签页登录测试', async () => {
    // 创建两个测试页面
    const pageA = await createTestPage(browser);
    const pageB = await createTestPage(browser);

    // 分别登录不同店铺
    await loginShop(pageA, TEST_CONFIG.accounts.shopA);
    await loginShop(pageB, TEST_CONFIG.accounts.shopB);

    // 验证登录状态
    const statusA = await getLoginStatus(pageA);
    const statusB = await getLoginStatus(pageB);

    expect(statusA.isLoggedIn).toBe(true);
    expect(statusA.shopName).toBe('Shop A');
    expect(statusB.isLoggedIn).toBe(true);
    expect(statusB.shopName).toBe('Shop B');

    await pageA.close();
    await pageB.close();
  }, 60000);

  test('场景B：会话切换测试', async () => {
    // 创建测试页面
    const page = await createTestPage(browser);
    
    // 打开扩展弹窗
    const extensionId = await getExtensionId(browser);
    const popupPage = await openExtensionPopup(browser, extensionId);

    // 切换到Shop A的会话
    await popupPage.click('#session-shop-a');
    await page.waitForTimeout(1000); // 等待会话切换生效

    // 验证登录状态
    const status = await getLoginStatus(page);
    expect(status.isLoggedIn).toBe(true);
    expect(status.shopName).toBe('Shop A');

    await page.close();
    await popupPage.close();
  }, 60000);
});

// 辅助函数
async function openExtensionPopup(browser, extensionId) {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const page = await browser.newPage();
  await page.goto(popupUrl);
  return page;
} 