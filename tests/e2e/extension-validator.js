// extension-validator.js
const fs = require('fs').promises;
const path = require('path');

class ExtensionValidator {
  constructor(extensionPath) {
    this.extensionPath = extensionPath;
    this.requiredFiles = [
      'manifest.json',
      'icon.png',
      'background/background.js',
      'popup/popup.html'
    ];
  }

  async validate() {
    await this.validateDirectory();
    await this.validateRequiredFiles();
    await this.validateManifest();
    await this.validateIcon();
  }

  async validateDirectory() {
    try {
      await fs.access(this.extensionPath);
    } catch {
      throw new Error(`扩展目录不存在: ${this.extensionPath}`);
    }
  }

  async validateRequiredFiles() {
    const missingFiles = [];
    for (const file of this.requiredFiles) {
      const filePath = path.join(this.extensionPath, file);
      try {
        await fs.access(filePath);
      } catch {
        missingFiles.push(file);
      }
    }
    if (missingFiles.length > 0) {
      throw new Error(`缺少必需文件: ${missingFiles.join(', ')}`);
    }
  }

  async validateManifest() {
    const manifestPath = path.join(this.extensionPath, 'manifest.json');
    const manifest = JSON.parse(
      await fs.readFile(manifestPath, 'utf-8')
    );
    const requiredFields = ['manifest_version', 'name', 'version'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    if (missingFields.length > 0) {
      throw new Error(`manifest.json 缺少必需字段: ${missingFields.join(', ')}`);
    }
  }

  async validateIcon() {
    const iconPath = path.join(this.extensionPath, 'icon.png');
    try {
      const stats = await fs.stat(iconPath);
      if (stats.size === 0) {
        throw new Error('图标文件是空的');
      }
    } catch (error) {
      throw new Error(`图标文件无效: ${error.message}`);
    }
  }
}

module.exports = ExtensionValidator; 