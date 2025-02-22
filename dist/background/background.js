import { ErrorHandler, ErrorType } from '/utils/error-handler.js';

// 会话和 Cookie 存储
let sessionMap = {};        // tabId -> sessionId 映射
let sessionNames = {};      // sessionId -> name 映射
let isolatedCookies = {};   // sessionId_url -> cookies 映射

// 当创建新标签页时，自动创建新会话
chrome.tabs.onCreated.addListener(async (tab) => {
  try {
    const sessionId = `session_${Date.now()}_${tab.id}`;
    sessionMap[tab.id] = sessionId;
    sessionNames[sessionId] = `店铺_${tab.id}`;
    
    // 检查存储空间
    const hasSpace = await ErrorHandler.checkStorageSpace();
    if (!hasSpace) {
      await ErrorHandler.cleanupStorage();
    }
    
    // 保存到持久存储
    await ErrorHandler.retry(async () => {
      await chrome.storage.local.set({ 
        sessionMap, 
        sessionNames 
      });
    });

    // 更新规则
    await updateCookieRules(tab.id, sessionId);
  } catch (error) {
    ErrorHandler.handleError(error, ErrorType.SESSION);
  }
});

// 当关闭标签页时，清理会话数据
chrome.tabs.onRemoved.addListener(async (tabId) => {
  try {
    const sessionId = sessionMap[tabId];
    delete sessionMap[tabId];
    delete sessionNames[sessionId];
    
    // 更新持久存储
    await ErrorHandler.retry(async () => {
      await chrome.storage.local.set({ 
        sessionMap, 
        sessionNames 
      });
    });

    // 移除规则
    await removeCookieRules(tabId);
  } catch (error) {
    ErrorHandler.handleError(error, ErrorType.SESSION);
  }
});

// 更新Cookie规则
async function updateCookieRules(tabId, sessionId) {
  try {
    // 移除旧规则
    await removeCookieRules(tabId);

    // 添加新规则
    const rules = [{
      id: tabId,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: 'Cookie',
            operation: 'set',
            value: await getCookieValue(sessionId)
          }
        ]
      },
      condition: {
        urlFilter: '*://*.pinduoduo.com/*',
        resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest']
      }
    }];

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [tabId],
      addRules: rules
    });
  } catch (error) {
    ErrorHandler.handleError(error, ErrorType.COOKIE);
  }
}

// 移除Cookie规则
async function removeCookieRules(tabId) {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [tabId]
    });
  } catch (error) {
    ErrorHandler.handleError(error, ErrorType.COOKIE);
  }
}

// 获取Cookie值
async function getCookieValue(sessionId) {
  try {
    const result = await ErrorHandler.retry(async () => {
      return await chrome.storage.local.get(`cookie_${sessionId}`);
    });
    
    const cookieData = result[`cookie_${sessionId}`];
    return cookieData?.value?.join('; ') || '';
  } catch (error) {
    ErrorHandler.handleError(error, ErrorType.COOKIE);
    return '';
  }
}

// 处理来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case "getSessions":
          // 返回所有会话信息
          sendResponse({ 
            sessionMap, 
            sessionNames 
          });
          break;
          
        case "setSessionName":
          // 设置会话名称
          const { tabId, name } = message;
          const sessionId = sessionMap[tabId];
          if (sessionId) {
            sessionNames[sessionId] = name;
            await ErrorHandler.retry(async () => {
              await chrome.storage.local.set({ sessionNames });
            });
            sendResponse({ success: true });
          } else {
            throw new Error('会话不存在');
          }
          break;
          
        case "switchSession":
          // 切换会话
          const { targetTabId, targetSessionId } = message;
          sessionMap[targetTabId] = targetSessionId;
          await ErrorHandler.retry(async () => {
            await chrome.storage.local.set({ sessionMap });
          });
          await updateCookieRules(targetTabId, targetSessionId);
          chrome.tabs.reload(targetTabId);  // 刷新标签页以应用新会话
          sendResponse({ success: true });
          break;
      }
    } catch (error) {
      ErrorHandler.handleError(error, ErrorType.SESSION);
      sendResponse({ success: false, error: error.message });
    }
  })();
  return true;  // 保持消息通道开放
});

// 初始化：从存储中恢复数据
(async () => {
  try {
    const items = await ErrorHandler.retry(async () => {
      return await chrome.storage.local.get(null);
    });
    
    if (items.sessionMap) sessionMap = items.sessionMap;
    if (items.sessionNames) sessionNames = items.sessionNames;
    
    // 检查并清理存储空间
    const hasSpace = await ErrorHandler.checkStorageSpace();
    if (!hasSpace) {
      await ErrorHandler.cleanupStorage();
    }

    // 更新所有标签页的规则
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      const sessionId = sessionMap[tab.id];
      if (sessionId) {
        await updateCookieRules(tab.id, sessionId);
      }
    }
  } catch (error) {
    ErrorHandler.handleError(error, ErrorType.STORAGE);
  }
})(); 