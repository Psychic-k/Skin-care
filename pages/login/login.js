// 登录页面
const Auth = require('../../utils/auth.js');
const Utils = require('../../utils/utils.js');

Page({
  data: {
    canIUseGetUserProfile: false,
    isLoading: false
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
      // 微信登录
      const loginResult = await Auth.login();
      
      Utils.hideLoading();
      Utils.showSuccess('登录成功');
      
      // 跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      });
      
    } catch (error) {
      Utils.hideLoading();
      Utils.showError(error.message || '登录失败');
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
  }
});