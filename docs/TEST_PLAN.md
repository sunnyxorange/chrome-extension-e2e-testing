# Cookie Isolation Manager 测试计划

## 1. 核心功能测试

### 1.1 Cookie 隔离测试
- **测试场景 A**: 多标签页登录
  1. 打开标签页 1，访问 pinduoduo.com 并登录店铺 A
  2. 打开标签页 2，访问 pinduoduo.com 并登录店铺 B
  3. 验证两个标签页的登录状态是否独立

- **测试场景 B**: 会话切换
  1. 在标签页 1 登录店铺 A
  2. 在标签页 2 登录店铺 B
  3. 打开标签页 3，切换到店铺 A 的会话
  4. 验证标签页 3 是否正确显示店铺 A 的登录状态

### 1.2 会话管理测试
- **测试场景 C**: 会话命名
  1. 在标签页中登录店铺
  2. 点击扩展图标
  3. 输入会话名称（如"店铺A"）并保存
  4. 验证会话名称是否正确显示和保存

- **测试场景 D**: 会话持久化
  1. 创建并命名多个会话
  2. 关闭浏览器
  3. 重新打开浏览器
  4. 验证会话信息是否正确恢复

## 2. 测试结果记录

### 场景 A: 多标签页登录
- [ ] 标签页 1 可以成功登录店铺 A
- [ ] 标签页 2 可以成功登录店铺 B
- [ ] 两个标签页的登录状态互不影响
- [ ] Cookie 正确隔离

### 场景 B: 会话切换
- [ ] 可以成功切换到其他会话
- [ ] 切换后的登录状态正确
- [ ] 页面刷新后状态保持

### 场景 C: 会话命名
- [ ] 可以成功设置会话名称
- [ ] 名称在列表中正确显示
- [ ] 名称持久化保存

### 场景 D: 会话持久化
- [ ] 会话信息在浏览器重启后保持
- [ ] 所有命名的会话都正确恢复
- [ ] Cookie 数据正确恢复

## 3. 问题记录

| ID | 问题描述 | 严重程度 | 状态 |
|----|---------|---------|------|
|    |         |         |      |

## 4. 测试步骤

1. **准备工作**
   - 确保扩展已正确安装
   - 准备两个测试店铺账号
   - 清除浏览器所有 Cookie 和缓存

2. **执行测试**
   - 按照测试场景顺序执行
   - 记录每个步骤的结果
   - 遇到问题及时记录

3. **验证标准**
   - Cookie 隔离是否完全
   - 会话切换是否准确
   - 数据持久化是否可靠
   - 用户界面是否响应正常

## 5. 回归测试

在修复问题后，需要：
1. 重新测试相关功能
2. 验证修复是否影响其他功能
3. 更新测试结果记录 