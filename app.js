// app.js
const Auth = require('./utils/auth.js');
const Storage = require('./utils/storage.js');
const config = require('./utils/config.js');

App({
  onLaunch() {
    console.log('Skin-care 护肤小程序启动');
    
    // 初始化云开发
    this.initCloud();
    
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
    if (config.cloudEnvId) {
      wx.cloud.init({
        env: config.cloudEnvId,
        traceUser: true
      });
      console.log('云开发初始化成功，环境ID:', config.cloudEnvId);
    } else {
      console.warn('未配置云开发环境ID');
    }
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

    // 检查登录状态
    if (Storage.isLoggedIn()) {
      Auth.checkLoginStatus()
        .then(user => {
          this.globalData.userInfo = user;
          console.log('用户已登录:', user);
        })
        .catch(err => {
          console.log('登录状态失效:', err);
          Storage.logout();
        });
    }

    // 初始化全局数据
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
    config: config
  },

  // 全局方法
  // 设置用户信息
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
    Storage.setUserInfo(userInfo);
  },

  // 获取用户信息
  getUserInfo() {
    return this.globalData.userInfo || Storage.getUserInfo();
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

  // 检查是否为体验官
  isExpert() {
    const userInfo = this.getUserInfo();
    return userInfo && userInfo.role === 'expert';
  }
})
