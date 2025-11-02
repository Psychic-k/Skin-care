// app.js
const Auth = require('./utils/auth.js');
const Storage = require('./utils/storage.js');
const config = require('./utils/config.js');

App({
  onLaunch() {
    console.log('Skin-care 护肤小程序启动');
    
    // 初始化云开发
    this.initCloud();
    
    // 检查登录状态并进行路由决策
    this.checkLoginStatus();
    
    // 初始化应用
    this.initApp();
    
    // 检查更新
    this.checkUpdate();
  },

  onShow() {
    // 应用从后台进入前台时触发
    console.log('应用进入前台');
  },

  onHide() {
    // 应用从前台进入后台时触发
    console.log('应用进入后台');
  },

  onError(msg) {
    console.error('应用发生错误:', msg);
  },

  // 初始化云开发
  initCloud() {
    // 检查云开发能力
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      wx.showToast({
        title: '云开发不支持',
        icon: 'error',
        duration: 2000
      });
      this.globalData.cloudEnabled = false;
      return;
    }

    // 验证云环境ID配置
    if (!config.cloudEnvId) {
      console.error('云环境ID未配置');
      wx.showToast({
        title: '云环境配置错误',
        icon: 'error',
        duration: 2000
      });
      this.globalData.cloudEnabled = false;
      return;
    }

    try {
      wx.cloud.init({
        env: config.cloudEnvId, // 云开发环境ID
        traceUser: true
      });
      console.log('云开发初始化成功，环境ID:', config.cloudEnvId);
      this.globalData.cloudEnabled = true;
      
      // 测试云开发连接
      this.testCloudConnection();
    } catch (error) {
      console.error('云开发初始化失败:', error);
      wx.showToast({
        title: '云开发初始化失败',
        icon: 'error',
        duration: 2000
      });
      this.globalData.cloudEnabled = false;
    }
  },

  // 测试云开发连接
  async testCloudConnection() {
    try {
      // 测试云函数调用
      const result = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      });
      console.log('云开发连接测试成功:', result);
    } catch (error) {
      console.warn('云开发连接测试失败:', error);
      // 不影响应用启动，仅记录警告
    }
  },

  // 检查登录状态并进行路由决策
  checkLoginStatus() {
    console.log('开始检查登录状态...');
    
    try {
      const userInfo = Storage.getUserInfo();
      console.log('获取到的用户信息:', userInfo);
      
      if (userInfo && (userInfo.openid || userInfo.id) && userInfo.isLogin) {
        // 用户已登录，设置全局用户信息
        this.globalData.userInfo = userInfo;
        this.globalData.isLoggedIn = true;
        console.log('用户已登录，直接进入主页');
        
        // 延迟跳转，确保应用初始化完成
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 100);
      } else {
        // 用户未登录，跳转到登录页
        console.log('用户未登录，跳转到登录页');
        this.globalData.isLoggedIn = false;
        this.redirectToLogin();
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      // 出错时也跳转到登录页
      this.globalData.isLoggedIn = false;
      this.redirectToLogin();
    }
  },

  // 跳转到登录页
  redirectToLogin() {
    console.log('跳转到登录页面');
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/login/login'
      });
    }, 100);
  },

  // 初始化应用
  initApp() {
    // 获取系统信息 - 使用新的API替代废弃的wx.getSystemInfo
    try {
      const systemInfo = {
        ...wx.getWindowInfo(),
        ...wx.getDeviceInfo(),
        ...wx.getAppBaseInfo()
      };
      this.globalData.systemInfo = systemInfo;
      console.log('系统信息:', systemInfo);
    } catch (error) {
      console.error('获取系统信息失败:', error);
    }

    // 初始化全局数据（登录状态检查已在 checkLoginStatus 中处理）
    this.globalData.skinProfile = Storage.getSkinProfile();
    this.globalData.detectionHistory = Storage.getDetectionHistory();
  },

  // 检查小程序更新
  checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          console.log('发现新版本');
        }
      });

      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });

      updateManager.onUpdateFailed(() => {
        console.error('新版本下载失败');
      });
    }
  },

  // 全局数据
  globalData: {
    userInfo: null,
    systemInfo: null,
    skinProfile: null,
    detectionHistory: [],
    config: config,
    cloudEnabled: false,
    isLoggedIn: false,
    // 登录状态变化监听器列表
    loginStatusListeners: []
  },

  // 全局方法
  // 设置用户信息
  setUserInfo(userInfo) {
    console.log('App.setUserInfo 被调用，用户信息:', userInfo);
    const wasLoggedIn = this.globalData.isLoggedIn;
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = !!(userInfo && (userInfo.openid || userInfo.id) && userInfo.isLogin);
    Storage.saveUserInfo(userInfo);
    console.log('用户信息已保存到全局和本地存储');
    
    // 如果登录状态发生变化，通知所有监听器
    if (wasLoggedIn !== this.globalData.isLoggedIn) {
      this.notifyLoginStatusChange(this.globalData.isLoggedIn, userInfo);
    }
  },

  // 获取用户信息
  getUserInfo() {
    if (!this.globalData.userInfo) {
      this.globalData.userInfo = Storage.getUserInfo();
    }
    return this.globalData.userInfo;
  },

  // 设置皮肤档案
  setSkinProfile(profile) {
    this.globalData.skinProfile = profile;
    Storage.setSkinProfile(profile);
  },

  // 获取皮肤档案
  getSkinProfile() {
    return this.globalData.skinProfile || Storage.getSkinProfile();
  },

  // 添加检测记录
  addDetectionRecord(record) {
    this.globalData.detectionHistory.unshift(record);
    Storage.addDetectionRecord(record);
  },

  // 获取检测历史
  getDetectionHistory() {
    return this.globalData.detectionHistory || Storage.getDetectionHistory();
  },

  // 登录状态管理方法
  // 添加登录状态变化监听器
  addLoginStatusListener(listener) {
    if (typeof listener === 'function') {
      this.globalData.loginStatusListeners.push(listener);
      console.log('添加登录状态监听器，当前监听器数量:', this.globalData.loginStatusListeners.length);
    }
  },

  // 移除登录状态变化监听器
  removeLoginStatusListener(listener) {
    const index = this.globalData.loginStatusListeners.indexOf(listener);
    if (index > -1) {
      this.globalData.loginStatusListeners.splice(index, 1);
      console.log('移除登录状态监听器，当前监听器数量:', this.globalData.loginStatusListeners.length);
    }
  },

  // 通知所有监听器登录状态变化
  notifyLoginStatusChange(isLoggedIn, userInfo) {
    console.log('通知登录状态变化:', isLoggedIn, '监听器数量:', this.globalData.loginStatusListeners.length);
    this.globalData.loginStatusListeners.forEach(listener => {
      try {
        listener(isLoggedIn, userInfo);
      } catch (error) {
        console.error('登录状态监听器执行出错:', error);
      }
    });
  },

  // 退出登录
  logout() {
    console.log('执行退出登录');
    const wasLoggedIn = this.globalData.isLoggedIn;
    
    // 清除用户信息
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    Storage.clearUserInfo();
    
    // 通知登录状态变化
    if (wasLoggedIn) {
      this.notifyLoginStatusChange(false, null);
    }
    
    // 跳转到登录页
    wx.reLaunch({
      url: '/pages/login/login'
    });
  },

  // 检查并更新登录状态
  updateLoginStatus() {
    const userInfo = Storage.getUserInfo();
    const isLoggedIn = !!(userInfo && (userInfo.openid || userInfo.id) && userInfo.isLogin);
    const wasLoggedIn = this.globalData.isLoggedIn;
    
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = isLoggedIn;
    
    // 如果状态发生变化，通知监听器
    if (wasLoggedIn !== isLoggedIn) {
      this.notifyLoginStatusChange(isLoggedIn, userInfo);
    }
    
    return isLoggedIn;
  }


})
