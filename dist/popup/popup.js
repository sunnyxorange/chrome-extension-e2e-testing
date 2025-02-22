// 获取当前标签页
let currentTabId = null;

// 显示错误信息
function showError(error) {
  const container = document.getElementById('errorContainer');
  const message = document.getElementById('errorMessage');
  const details = document.getElementById('errorDetails');
  
  message.textContent = error.message;
  details.textContent = error.details || '';
  container.style.display = 'block';
  
  // 5秒后自动隐藏
  setTimeout(() => {
    container.style.display = 'none';
  }, 5000);
}

// 显示/隐藏加载状态
function toggleLoading(show) {
  document.getElementById('loading').style.display = show ? 'block' : 'none';
}

// 初始化界面
document.addEventListener('DOMContentLoaded', async () => {
  try {
    toggleLoading(true);
    
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabId = tab.id;
    
    // 获取会话信息
    chrome.runtime.sendMessage({ type: "getSessions" }, (response) => {
      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }
      
      const { sessionMap, sessionNames } = response;
      
      // 更新当前会话信息
      const currentSessionId = sessionMap[currentTabId];
      if (currentSessionId) {
        document.getElementById('currentName').textContent = sessionNames[currentSessionId] || '未命名';
        document.getElementById('currentId').textContent = currentSessionId;
      }
      
      // 更新会话列表
      updateSessionList(sessionMap, sessionNames);
    });
  } catch (error) {
    showError({
      message: '初始化失败',
      details: error.message
    });
  } finally {
    toggleLoading(false);
  }
  
  // 绑定保存名称按钮事件
  document.getElementById('saveName').addEventListener('click', async () => {
    try {
      const newName = document.getElementById('nameInput').value.trim();
      if (!newName) {
        throw new Error('请输入会话名称');
      }
      
      toggleLoading(true);
      
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: "setSessionName",
          tabId: currentTabId,
          name: newName
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
      
      if (response.success) {
        // 刷新界面
        window.location.reload();
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      showError({
        message: '保存名称失败',
        details: error.message
      });
    } finally {
      toggleLoading(false);
    }
  });
});

// 更新会话列表
function updateSessionList(sessionMap, sessionNames) {
  try {
    const sessionList = document.getElementById('sessionList');
    sessionList.innerHTML = '';
    
    // 创建会话项目
    Object.entries(sessionMap).forEach(([tabId, sessionId]) => {
      const sessionItem = document.createElement('div');
      sessionItem.className = 'session-item';
      
      // 会话名称
      const nameSpan = document.createElement('span');
      nameSpan.textContent = sessionNames[sessionId] || '未命名';
      sessionItem.appendChild(nameSpan);
      
      // 切换按钮
      if (tabId != currentTabId) {
        const switchBtn = document.createElement('button');
        switchBtn.className = 'switch-btn';
        switchBtn.textContent = '切换';
        switchBtn.addEventListener('click', async () => {
          try {
            toggleLoading(true);
            
            const response = await new Promise((resolve, reject) => {
              chrome.runtime.sendMessage({
                type: "switchSession",
                targetTabId: currentTabId,
                targetSessionId: sessionId
              }, (response) => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve(response);
                }
              });
            });
            
            if (response.success) {
              // 关闭弹出窗口
              window.close();
            } else {
              throw new Error('切换失败');
            }
          } catch (error) {
            showError({
              message: '切换会话失败',
              details: error.message
            });
          } finally {
            toggleLoading(false);
          }
        });
        sessionItem.appendChild(switchBtn);
      } else {
        const currentLabel = document.createElement('span');
        currentLabel.textContent = '当前';
        currentLabel.style.color = '#666';
        sessionItem.appendChild(currentLabel);
      }
      
      sessionList.appendChild(sessionItem);
    });
  } catch (error) {
    showError({
      message: '更新会话列表失败',
      details: error.message
    });
  }
}

// 监听来自 background 的错误消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'showError') {
    showError(message.error);
  }
}); 