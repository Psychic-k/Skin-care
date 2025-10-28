// 登录页面
const Auth = require('../../utils/auth.js');
const Utils = require('../../utils/utils.js');
const cloudApi = require('../../utils/cloudApi.js');

Page({
  data: {
    canIUseGetUserProfile: false,
    isLoading: false,
    showDevModal: false,
    skinCareTapCount: 0,
    skinCareTapTimer: null
  },

  onLoad() {
    // 检查是否支持getUserProfile
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      });
    }
  },

  // 微信登录
  async onWechatLogin() {
    if (this.data.isLoading) return;
    
    this.setData({ isLoading: true });
    Utils.showLoading('登录中...');

    try {
      // 优先使用云开发登录
      if (getApp().globalData.cloudEnabled) {
        const loginResult = await cloudApi.login();
        
        Utils.hideLoading();
        Utils.showSuccess('登录成功');
        
        // 设置用户信息到全局
        const app = getApp();
        app.setUserInfo(loginResult);
        
        // 跳转到首页
        wx.switchTab({
          url: '/pages/index/index'
        });
      } else {
        // 降级到传统登录方式
        const loginResult = await Auth.wxLogin();
        
        Utils.hideLoading();
        Utils.showSuccess('登录成功');
        
        // 设置用户信息到全局
        const app = getApp();
        app.setUserInfo(loginResult);
        
        // 跳转到首页
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
      
    } catch (error) {
      Utils.hideLoading();
      console.error('登录失败:', error);
      
      // 如果云开发登录失败，尝试降级处理
      if (getApp().globalData.cloudEnabled && error.message && error.message.includes('FUNCTION_NOT_FOUND')) {
        wx.showModal({
          title: '登录提示',
          content: '云服务暂时不可用，是否使用离线模式继续？',
          confirmText: '继续',
          cancelText: '重试',
          success: (res) => {
            if (res.confirm) {
              // 设置为离线模式
              getApp().globalData.cloudEnabled = false;
              wx.setStorageSync('offlineMode', true);
              
              // 创建临时用户信息
              const tempUser = {
                id: 'guest_' + Date.now(),
                nickname: '游客用户',
                avatar: '/images/default-avatar.png',
                isGuest: true,
                isLogin: true
              };
              
              // 使用app的方法设置用户信息
              const app = getApp();
              app.setUserInfo(tempUser);
              
              Utils.showSuccess('已切换到离线模式');
              wx.switchTab({
                url: '/pages/index/index'
              });
            }
          }
        });
      } else {
        Utils.showError(error.message || '登录失败，请重试');
      }
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 获取用户信息授权
  async onGetUserProfile() {
    try {
      const userInfo = await Auth.getUserProfile();
      console.log('获取用户信息成功:', userInfo);
      
      // 更新用户信息
      await Auth.updateUserInfo(userInfo);
      
      Utils.showSuccess('授权成功');
    } catch (error) {
      Utils.showError('授权失败');
      console.error('获取用户信息失败:', error);
    }
  },

  // 跳过登录（游客模式）
  onSkipLogin() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // Logo点击事件（开发者模式入口）
  onSkinCareTap() {
    // 在微信小程序中使用 __wxConfig 检查环境，或者暂时移除限制以便测试
    // 如果是正式版本，可以通过 __wxConfig.envVersion 检查
    // if (__wxConfig && __wxConfig.envVersion === 'release') return;
    
    this.setData({
      skinCareTapCount: this.data.skinCareTapCount + 1
    });

    // 清除之前的定时器
    if (this.data.skinCareTapTimer) {
      clearTimeout(this.data.skinCareTapTimer);
    }

    // 设置新的定时器，2秒后重置计数
    this.setData({
      skinCareTapTimer: setTimeout(() => {
        this.setData({
          skinCareTapCount: 0,
          skinCareTapTimer: null
        });
      }, 2000)
    });

    // 连续点击5次触发开发者模式
    if (this.data.skinCareTapCount >= 5) {
      this.setData({
        showDevModal: true,
        skinCareTapCount: 0
      });
      
      if (this.data.skinCareTapTimer) {
        clearTimeout(this.data.skinCareTapTimer);
        this.setData({ skinCareTapTimer: null });
      }
      
      wx.showToast({
        title: '开发者模式已激活',
        icon: 'success'
      });
    }
  },

  // 选择角色
  onSelectRole(e) {
    const role = e.currentTarget.dataset.role;
    
    // 设置用户信息到本地存储
    const userInfo = {
      id: 'dev_' + Date.now(), // 添加用户ID
      role: role,
      nickname: role === 'admin' ? '管理员' : '普通用户',
      avatar: '/images/default-avatar.png',
      isDev: true, // 标记为开发模式用户
      isLogin: true
    };
    
    // 使用app的方法设置用户信息
    const app = getApp();
    app.setUserInfo(userInfo);
    
    this.setData({
      showDevModal: false
    });
    
    // 根据角色跳转到对应页面
    let targetUrl = '/pages/index/index';
    if (role === 'admin') {
      targetUrl = '/pages/admin/manage';
    }
   
    
    wx.showToast({
      title: `已切换为${userInfo.nickname}`,
      icon: 'success',
      duration: 1500,
      complete: () => {
        setTimeout(() => {
          if (role === 'admin') {
            wx.navigateTo({
              url: targetUrl
            });
          } else {
            wx.switchTab({
              url: targetUrl
            });
          }
        }, 1500);
      }
    });
  },

  // 关闭开发者模式弹窗
  onCloseDevModal() {
    this.setData({
      showDevModal: false
    });
  }
});