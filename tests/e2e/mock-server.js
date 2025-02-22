const express = require('express');
const bodyParser = require('body-parser');

class MockServer {
  constructor(port = 3333) {
    this.app = express();
    this.app.use(bodyParser.json());
    this.server = null;
    this.port = port;
    this.setupRoutes();
  }

  setupRoutes() {
    // 模拟登录页面
    this.app.get('/login', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>登录</title></head>
        <body>
          <form id="loginForm">
            <input type="text" id="usernameId" />
            <input type="password" id="passwordId" />
            <button type="submit" class="login-button">登录</button>
          </form>
        </body>
        </html>
      `);
    });

    // 模拟登录API
    this.app.post('/api/login', (req, res) => {
      const { username, password } = req.body;
      // 模拟登录验证
      if (username.includes('shop_a')) {
        res.cookie('session', 'shop_a_token', { domain: 'localhost' });
        res.json({ success: true, shopName: '测试店铺A' });
      } else if (username.includes('shop_b')) {
        res.cookie('session', 'shop_b_token', { domain: 'localhost' });
        res.json({ success: true, shopName: '测试店铺B' });
      } else {
        res.status(401).json({ success: false });
      }
    });

    // 模拟首页
    this.app.get('/home', (req, res) => {
      const sessionCookie = req.cookies.session;
      let shopName = '';
      
      if (sessionCookie === 'shop_a_token') {
        shopName = '测试店铺A';
      } else if (sessionCookie === 'shop_b_token') {
        shopName = '测试店铺B';
      }

      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>首页</title></head>
        <body>
          <div class="shop-name">${shopName}</div>
        </body>
        </html>
      `);
    });
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`Mock server running at http://localhost:${this.port}`);
          resolve();
        });

        this.server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`端口 ${this.port} 已被占用，尝试使用其他端口`);
            this.port++;
            this.start().then(resolve).catch(reject);
          } else {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('Mock server stopped');
          resolve();
        });
      });
    }
  }
}

module.exports = MockServer; 