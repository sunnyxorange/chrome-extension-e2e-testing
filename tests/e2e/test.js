const TestEnvironment = require('./test-environment');
const path = require('path');

describe('扩展测试', () => {
  let testEnv;
  let browser;

  beforeAll(async () => {
    jest.setTimeout(120000); // 设置更长的超时时间
    
    testEnv = new TestEnvironment({
      extensionPath: path.join(__dirname, '../../src'),
      chromePath: '/usr/bin/google-chrome',
      timeout: 60000
    });

    try {
      browser = await testEnv.setup();
      console.log('测试环境设置完成');
    } catch (error) {
      console.error('测试环境设置失败:', error);
      throw error;
    }
  });

  test('扩展加载测试', async () => {
    try {
      expect(testEnv.extensionId).toBeTruthy();
      console.log(`扩展 ID: ${testEnv.extensionId}`);

      const page = await browser.newPage();
      console.log('创建新页面成功');

      const popupUrl = `chrome-extension://${testEnv.extensionId}/hello.html`;
      console.log('尝试访问扩展弹出页面:', popupUrl);
      
      await page.goto(popupUrl);
      console.log('成功导航到扩展弹出页面');

      // 等待页面加载完成
      const content = await page.$eval('body', el => el.textContent);
      console.log('页面内容:', content);
      
      expect(content).toContain('Hello Extensions');
      console.log('扩展弹出页面加载成功');

      await page.close();
    } catch (error) {
      console.error('测试执行失败:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await testEnv.cleanup();
      console.log('测试环境清理完成');
    } catch (error) {
      console.error('测试环境清理失败:', error);
    }
  });
}); 