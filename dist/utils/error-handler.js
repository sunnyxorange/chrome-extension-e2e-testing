// 错误类型枚举
const ErrorType = {
  NETWORK: 'NETWORK_ERROR',
  STORAGE: 'STORAGE_ERROR',
  COOKIE: 'COOKIE_ERROR',
  SESSION: 'SESSION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// 错误消息映射
const ErrorMessages = {
  [ErrorType.NETWORK]: '网络请求失败，请检查网络连接',
  [ErrorType.STORAGE]: '存储操作失败，请检查存储空间',
  [ErrorType.COOKIE]: 'Cookie 操作失败',
  [ErrorType.SESSION]: '会话操作失败',
  [ErrorType.UNKNOWN]: '发生未知错误，请重试'
};

// 重试配置
const RetryConfig = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 5000
};

/**
 * 错误处理工具类
 */
class ErrorHandler {
  /**
   * 处理错误并显示用户友好的消息
   * @param {Error} error - 错误对象
   * @param {string} type - 错误类型
   */
  static handleError(error, type = ErrorType.UNKNOWN) {
    console.error(`[${type}]`, error);
    
    // 发送错误消息到 popup
    chrome.runtime.sendMessage({
      type: 'showError',
      error: {
        type,
        message: ErrorMessages[type],
        details: error.message
      }
    });
  }

  /**
   * 重试操作
   * @param {Function} operation - 要重试的操作
   * @param {Object} options - 重试选项
   * @returns {Promise} 操作结果
   */
  static async retry(operation, options = {}) {
    const maxRetries = options.maxRetries || RetryConfig.MAX_RETRIES;
    const initialDelay = options.initialDelay || RetryConfig.INITIAL_DELAY;
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // 计算延迟时间（指数退避）
        const delay = Math.min(
          initialDelay * Math.pow(2, attempt - 1),
          RetryConfig.MAX_DELAY
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * 检查存储空间
   * @returns {Promise<boolean>} 是否有足够空间
   */
  static async checkStorageSpace() {
    try {
      const {bytesInUse, quotaBytes} = await chrome.storage.local.getBytesInUse();
      const usagePercentage = (bytesInUse / quotaBytes) * 100;
      
      if (usagePercentage > 80) {
        console.warn(`存储空间使用率高: ${usagePercentage}%`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('检查存储空间失败:', error);
      return false;
    }
  }

  /**
   * 清理过期数据
   * @returns {Promise<void>}
   */
  static async cleanupStorage() {
    try {
      const data = await chrome.storage.local.get(null);
      const now = Date.now();
      const expired = Object.entries(data).filter(([key, value]) => {
        // 清理超过30天的 Cookie 数据
        if (key.startsWith('cookie_') && value.timestamp) {
          return now - value.timestamp > 30 * 24 * 60 * 60 * 1000;
        }
        return false;
      });
      
      if (expired.length > 0) {
        await chrome.storage.local.remove(expired.map(([key]) => key));
        console.log(`已清理 ${expired.length} 条过期数据`);
      }
    } catch (error) {
      console.error('清理存储空间失败:', error);
    }
  }
}

export { ErrorHandler, ErrorType, ErrorMessages, RetryConfig }; 