// 用户认证相关工具函数
const app = getApp();
const Storage = require('./storage.js');

/**
 * 检查用户是否已登录
 * @returns {boolean} 是否已登录
 */
function isLoggedIn() {
  const userInfo = getUserInfo();
  // 检查多种登录状态标识，并确保返回严格布尔值
  return !!(userInfo && (userInfo.openid || userInfo.id || userInfo.isLogin));
}

/**
 * 获取用户信息
 */
function getUserInfo() {
  // 使用统一的 Storage 工具，确保读取到的是对象而非未解析的字符串
  return Storage.getUserInfo() || {};
}

/**
 * 设置用户信息
 */
function setUserInfo(userInfo) {
  // 统一通过 Storage 写入，避免形态不一致
  Storage.saveUserInfo(userInfo);
  // 同时设置到全局
  const app = getApp();
  if (app) {
    app.globalData.userInfo = userInfo;
    app.globalData.isLoggedIn = !!(userInfo && (userInfo.openid || userInfo.id || userInfo.isLogin));
  }
}

/**
 * 清除用户信息（退出登录）
 */
function clearUserInfo() {
  Storage.clearUserInfo();
  wx.removeStorageSync('token');
  // 同时清除全局用户信息
  const app = getApp();
  if (app) {
    app.globalData.userInfo = null;
    app.globalData.isLoggedIn = false;
  }
}

/**
 * 检查用户是否为管理员
 */
function isAdmin() {
  const userInfo = getUserInfo();
  return userInfo.role === 'admin';
}

/**
 * 获取用户角色
 * @returns {string} 'user' | 'admin'
 */
function getUserRole() {
  const userInfo = getUserInfo();
  const role = userInfo.role || 'user';
  
  // 只允许两种角色：普通用户和管理员
  if (role === 'admin') {
    return 'admin';
  }
  return 'user';
}

/**
 * 检查用户权限
 * @param {string} permission 权限名称
 * @returns {boolean} 是否有权限
 */
function hasPermission(permission) {
  const userInfo = getUserInfo();
  const role = getUserRole();
  
  // 管理员拥有所有权限
  if (role === 'admin') {
    return true;
  }
  
  // 普通用户权限列表
  const userPermissions = [
    'view_products',      // 查看产品
    'create_diary',       // 创建护肤日记
    'use_detection',      // 使用AI检测
    'view_reports',       // 查看检测报告
    'edit_profile',       // 编辑个人资料
    'view_history'        // 查看历史记录
  ];
  
  return userPermissions.includes(permission);
}

/**
 * 微信登录
 */
function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          // 调用云函数进行登录
          wx.cloud.callFunction({
            name: 'login',
            data: {
              code: res.code
            },
            success: (result) => {
              if (result.result && result.result.code === 0) {
                const data = result.result.data || {}
                const openid = data.openid
                const user = data.user || {}
                const userInfo = {
                  ...user,
                  id: user._id || user.id || openid || ('cloud_' + Date.now()),
                  openid: openid || ('cloud_' + Date.now()),
                  nickName: user.nickName || user.nickname || '微信用户',
                  avatarUrl: user.avatarUrl || user.avatar || '/images/default-avatar.png',
                  role: user.role || 'user',
                  isLogin: true,
                  loginTime: new Date().getTime()
                }
                setUserInfo(userInfo);
                resolve(userInfo);
              } else {
                const msg = (result.result && result.result.message) || '登录失败'
                reject(new Error(msg))
              }
            },
            fail: reject
          });
        } else {
          reject(new Error('获取登录凭证失败'));
        }
      },
      fail: reject
    });
  });
}

/**
 * 获取用户资料
 */
function getUserProfile() {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = getUserInfo();
        const updatedUserInfo = {
          ...userInfo,
          ...res.userInfo,
          id: res.userInfo.openid || userInfo.id || 'user_' + Date.now(), // 确保有id字段
          nickname: res.userInfo.nickName, // 统一字段名
          avatar: res.userInfo.avatarUrl, // 统一字段名
          avatarUrl: res.userInfo.avatarUrl,
          nickName: res.userInfo.nickName,
          gender: res.userInfo.gender,
          city: res.userInfo.city,
          province: res.userInfo.province,
          country: res.userInfo.country,
          isLogin: true, // 添加登录状态标识
          loginTime: new Date().getTime()
        };
        setUserInfo(updatedUserInfo);
        resolve(updatedUserInfo);
      },
      fail: reject
    });
  });
}



/**
 * 跳转到登录页
 */
function redirectToLogin() {
  console.log('跳转登录页');
  wx.navigateTo({
    url: '/pages/login/login'
  });
}

/**
 * 检查页面访问权限
 * @param {string} pageName 页面名称
 * @returns {boolean} 是否有访问权限
 */
function checkPageAccess(pageName) {
  const loginRequiredPages = ['detection', 'diary'];
  
  if (loginRequiredPages.includes(pageName)) {
    return isLoggedIn();
  }
  
  // 其他页面不需要登录
  return true;
}

/**
 * 验证页面访问权限，如果没有权限则跳转登录页
 * @param {string} pageName 页面名称
 * @returns {boolean} 是否有访问权限
 */
function requireLogin(pageName) {
  if (!checkPageAccess(pageName)) {
    wx.showToast({
      title: '请先登录',
      icon: 'none',
      duration: 2000
    });
    // 不再自动跳转，由页面按需引导到资料完善
    return false;
  }
  return true;
}

/**
 * 检查是否为游客用户
 * @returns {boolean} 是否为游客用户
 */
function isGuest() {
  const userInfo = getUserInfo();
  return userInfo && userInfo.isGuest === true;
}

/**
 * 获取用户登录状态信息
 * @returns {object} 登录状态信息
 */
function getLoginStatus() {
  const userInfo = getUserInfo();
  return {
    isLoggedIn: isLoggedIn(),
    isGuest: isGuest(),
    userInfo: userInfo,
    loginMethod: userInfo ? userInfo.loginMethod : null
  };
}

module.exports = {
  isLoggedIn,
  getUserInfo,
  setUserInfo,
  clearUserInfo,
  isAdmin,
  getUserRole,
  hasPermission,
  wxLogin,
  getUserProfile,
  redirectToLogin,
  checkPageAccess,
  requireLogin,
  isGuest,
  getLoginStatus
};