// 通用工具函数
const config = require('./config.js');

class Utils {
  // 格式化日期
  static formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    const second = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute)
      .replace('ss', second);
  }

  // 获取相对时间
  static getRelativeTime(date) {
    const now = new Date();
    const target = new Date(date);
    const diff = now - target;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天前`;
    } else if (hours > 0) {
      return `${hours}小时前`;
    } else if (minutes > 0) {
      return `${minutes}分钟前`;
    } else {
      return '刚刚';
    }
  }

  // 防抖函数
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // 节流函数
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // 生成唯一ID
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 图片压缩
  static compressImage(src, quality = 0.8) {
    return new Promise((resolve, reject) => {
      wx.compressImage({
        src,
        quality,
        success: resolve,
        fail: reject
      });
    });
  }

  // 选择图片
  static chooseImage(count = 1, sourceType = ['album', 'camera']) {
    return new Promise((resolve, reject) => {
      wx.chooseImage({
        count,
        sourceType,
        success: resolve,
        fail: reject
      });
    });
  }

  // 预览图片
  static previewImage(urls, current = 0) {
    wx.previewImage({
      urls,
      current: typeof current === 'number' ? urls[current] : current
    });
  }

  // 保存图片到相册
  static saveImageToPhotosAlbum(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: resolve,
        fail: reject
      });
    });
  }

  // 显示加载提示
  static showLoading(title = '加载中...') {
    wx.showLoading({
      title,
      mask: true
    });
  }

  // 隐藏加载提示
  static hideLoading() {
    wx.hideLoading();
  }

  // 显示成功提示
  static showSuccess(title, duration = 2000) {
    wx.showToast({
      title,
      icon: 'success',
      duration
    });
  }

  // 显示错误提示
  static showError(title, duration = 2000) {
    wx.showToast({
      title,
      icon: 'none',
      duration
    });
  }

  // 显示确认对话框
  static showConfirm(content, title = '提示') {
    return new Promise((resolve) => {
      wx.showModal({
        title,
        content,
        success: (res) => {
          resolve(res.confirm);
        }
      });
    });
  }

  // 复制到剪贴板
  static copyToClipboard(data) {
    return new Promise((resolve, reject) => {
      wx.setClipboardData({
        data,
        success: () => {
          this.showSuccess('复制成功');
          resolve();
        },
        fail: reject
      });
    });
  }

  // 拨打电话
  static makePhoneCall(phoneNumber) {
    wx.makePhoneCall({
      phoneNumber
    });
  }

  // 获取系统信息 - 使用新的API替代废弃的wx.getSystemInfo
  static getSystemInfo() {
    return new Promise((resolve, reject) => {
      try {
        const systemInfo = {
          ...wx.getWindowInfo(),
          ...wx.getDeviceInfo(),
          ...wx.getAppBaseInfo()
        };
        resolve(systemInfo);
      } catch (error) {
        reject(error);
      }
    });
  }

  // 获取网络状态
  static getNetworkType() {
    return new Promise((resolve, reject) => {
      wx.getNetworkType({
        success: resolve,
        fail: reject
      });
    });
  }

  // 震动反馈
  static vibrateShort() {
    wx.vibrateShort();
  }

  // 计算皮肤评分
  static calculateSkinScore(detectionData) {
    const weights = {
      moisture: 0.25,    // 水分
      oiliness: 0.2,     // 油分
      elasticity: 0.2,   // 弹性
      pores: 0.15,       // 毛孔
      acne: 0.1,         // 痘痘
      wrinkles: 0.1      // 皱纹
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const [key, weight] of Object.entries(weights)) {
      if (detectionData[key] !== undefined) {
        totalScore += detectionData[key] * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  // 获取皮肤类型描述
  static getSkinTypeDescription(skinType) {
    const descriptions = {
      dry: '干性肌肤',
      oily: '油性肌肤',
      combination: '混合性肌肤',
      sensitive: '敏感性肌肤',
      normal: '中性肌肤'
    };
    return descriptions[skinType] || '未知肌肤类型';
  }

  // 获取体验官等级
  static getExpertLevel(points) {
    const levels = config.expertLevels;
    for (const [level, config] of Object.entries(levels).reverse()) {
      if (points >= config.minPoints) {
        return { level, ...config };
      }
    }
    return levels.bronze;
  }

  // 计算连续打卡天数
  static calculateStreakDays(diaryRecords) {
    if (!diaryRecords || diaryRecords.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streakDays = 0;
    let currentDate = new Date(today);

    for (let i = 0; i < diaryRecords.length; i++) {
      const recordDate = new Date(diaryRecords[i].date);
      recordDate.setHours(0, 0, 0, 0);

      if (recordDate.getTime() === currentDate.getTime()) {
        streakDays++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streakDays;
  }

  // 验证手机号
  static validatePhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  // 验证邮箱
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // 深度克隆对象
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }
}

module.exports = Utils;