const {
  TEST_CONFIG,
  setupTestEnvironment,
  cleanupTestEnvironment,
  createTestPage,
  getExtensionId
} = require('./setup');

jest.setTimeout(120000); // 设置全局超时时间为120秒

describe('会话管理测试', () => {
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

  test('场景C：会话命名测试', async () => {
    // 打开扩展弹窗
    const extensionId = await getExtensionId(browser);
    const popupPage = await openExtensionPopup(browser, extensionId);

    // 创建新会话
    await popupPage.click('#new-session-btn');
    await popupPage.waitForSelector('#session-name-input');
    
    // 设置会话名称
    const sessionName = 'Test Session';
    await popupPage.type('#session-name-input', sessionName);
    await popupPage.click('#save-session-name-btn');

    // 重新加载弹窗
    await popupPage.reload();
    await popupPage.waitForSelector('.session-item');

    // 验证会话名称
    const displayedName = await popupPage.$eval('.session-name', el => el.textContent);
    expect(displayedName).toBe(sessionName);

    await popupPage.close();
  }, 60000);

  test('场景D：会话持久化测试', async () => {
    // 创建多个会话
    const sessions = ['Session 1', 'Session 2', 'Session 3'];
    const extensionId = await getExtensionId(browser);
    let popupPage = await openExtensionPopup(browser, extensionId);

    for (const sessionName of sessions) {
      await popupPage.click('#new-session-btn');
      await popupPage.waitForSelector('#session-name-input');
      await popupPage.type('#session-name-input', sessionName);
      await popupPage.click('#save-session-name-btn');
      await popupPage.waitForTimeout(500);
    }

    // 关闭并重新打开浏览器
    await browser.close();
    browser = await setupTestEnvironment();
    
    // 重新打开扩展弹窗
    popupPage = await openExtensionPopup(browser, extensionId);
    await popupPage.waitForSelector('.session-item');

    // 验证所有会话是否存在
    const sessionElements = await popupPage.$$('.session-name');
    const sessionNames = await Promise.all(
      sessionElements.map(el => popupPage.evaluate(el => el.textContent, el))
    );

    expect(sessionNames.length).toBe(sessions.length);
    for (const sessionName of sessions) {
      expect(sessionNames).toContain(sessionName);
    }

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