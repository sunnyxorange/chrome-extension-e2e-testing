// retry.js
class RetryableOperation {
  async execute(operation, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.log(`Retry ${i + 1}/${maxRetries} failed:`, error.message);
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
    throw lastError;
  }
}

module.exports = { RetryableOperation }; 