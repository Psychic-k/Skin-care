// 本地存储工具类
const config = require('./config.js');

class Storage {
  // 设置存储数据
  static set(key, data) {
    try {
      wx.setStorageSync(key, data);
      return true;
    } catch (error) {
      console.error('存储数据失败:', error);
      return false;
    }
  }

  // 获取存储数据
  static get(key, defaultValue = null) {
    try {
      const data = wx.getStorageSync(key);
      return data !== '' ? data : defaultValue;
    } catch (error) {
      console.error('获取数据失败:', error);
      return defaultValue;
    }
  }

  // 删除存储数据
  static remove(key) {
    try {
      wx.removeStorageSync(key);
      return true;
    } catch (error) {
      console.error('删除数据失败:', error);
      return false;
    }
  }

  // 清空所有存储数据
  static clear() {
    try {
      wx.clearStorageSync();
      return true;
    } catch (error) {
      console.error('清空数据失败:', error);
      return false;
    }
  }

  // 用户相关存储方法
  static setUserToken(token) {
    return this.set(config.storageKeys.userToken, token);
  }

  static getUserToken() {
    return this.get(config.storageKeys.userToken);
  }

  static removeUserToken() {
    return this.remove(config.storageKeys.userToken);
  }

  static setUserInfo(userInfo) {
    return this.set(config.storageKeys.userInfo, userInfo);
  }

  static getUserInfo() {
    return this.get(config.storageKeys.userInfo);
  }

  static removeUserInfo() {
    return this.remove(config.storageKeys.userInfo);
  }

  // 皮肤档案相关存储方法
  static setSkinProfile(profile) {
    return this.set(config.storageKeys.skinProfile, profile);
  }

  static getSkinProfile() {
    return this.get(config.storageKeys.skinProfile);
  }

  static removeSkinProfile() {
    return this.remove(config.storageKeys.skinProfile);
  }

  // 检测历史相关存储方法
  static setDetectionHistory(history) {
    return this.set(config.storageKeys.detectionHistory, history);
  }

  static getDetectionHistory() {
    return this.get(config.storageKeys.detectionHistory, []);
  }

  static addDetectionRecord(record) {
    const history = this.getDetectionHistory();
    history.unshift(record); // 添加到数组开头
    
    // 限制历史记录数量，最多保存50条
    if (history.length > 50) {
      history.splice(50);
    }
    
    return this.setDetectionHistory(history);
  }

  static removeDetectionHistory() {
    return this.remove(config.storageKeys.detectionHistory);
  }

  // 检查用户是否已登录
  static isLoggedIn() {
    const token = this.getUserToken();
    const userInfo = this.getUserInfo();
    return !!(token && userInfo);
  }

  // 用户登出，清除相关数据
  static logout() {
    this.removeUserToken();
    this.removeUserInfo();
    // 保留皮肤档案和检测历史，用户重新登录后可以继续使用
  }

  // 获取存储信息统计
  static getStorageInfo() {
    try {
      return wx.getStorageInfoSync();
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return null;
    }
  }
}

module.exports = Storage;