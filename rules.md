## Chrome 启动成功的解决方案

1. **确保 Chrome 安装完整**：重新安装 Chrome，以确保没有损坏的文件。
   ```bash
   sudo apt-get remove google-chrome-stable
   sudo apt-get install google-chrome-stable
   ```

2. **清理用户数据目录**：在启动 Chrome 之前，确保清理临时用户数据目录，以避免文件冲突。
   ```bash
   rm -rf /tmp/test-user-data-dir/*
   ```

3. **终止所有 Chrome 进程**：确保没有其他 Chrome 实例在运行。
   ```bash
   pkill chrome
   ```

4. **释放被占用的端口**：使用 `fuser` 命令释放被占用的端口。
   ```bash
   fuser -k 3333/tcp
   ```

5. **增加扩展加载的超时时间**：在 `waitForExtension` 函数中增加超时时间，以便给扩展更多的时间来加载。 