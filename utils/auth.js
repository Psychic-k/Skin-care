// 用户认证相关工具函数
const app = getApp();

/**
 * 检查用户是否已登录
 * @returns {boolean} 是否已登录
 */
function isLoggedIn() {
  const userInfo = getUserInfo();
  // 检查多种登录状态标识
  return userInfo && (userInfo.openid || userInfo.id || userInfo.isLogin);
}

/**
 * 获取用户信息
 */
function getUserInfo() {
  return wx.getStorageSync('userInfo') || {};
}

/**
 * 设置用户信息
 */
function setUserInfo(userInfo) {
  wx.setStorageSync('userInfo', userInfo);
  // 同时设置到全局
  const app = getApp();
  if (app) {
    app.globalData.userInfo = userInfo;
  }
}

/**
 * 清除用户信息（退出登录）
 */
function clearUserInfo() {
  wx.removeStorageSync('userInfo');
  wx.removeStorageSync('token');
  // 同时清除全局用户信息
  const app = getApp();
  if (app) {
    app.globalData.userInfo = null;
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
              const { openid, session_key } = result.result;
              const userInfo = {
                id: openid, // 添加id字段
                openid,
                session_key,
                nickname: '微信用户',
                nickName: '微信用户', // 统一字段名
                avatar: '/images/default-avatar.png',
                avatarUrl: '/images/default-avatar.png', // 统一字段名
                role: 'user', // 默认为普通用户
                isLogin: true, // 添加登录状态标识
                loginTime: new Date().getTime()
              };
              setUserInfo(userInfo);
              resolve(userInfo);
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



module.exports = {
  isLoggedIn,
  getUserInfo,
  setUserInfo,
  clearUserInfo,
  isAdmin,
  getUserRole,
  hasPermission,
  wxLogin,
  getUserProfile

};