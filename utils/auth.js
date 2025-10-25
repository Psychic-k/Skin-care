// 用户认证工具类
const request = require('./request.js');
const Storage = require('./storage.js');

class Auth {
  // 微信登录
  static login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            // 发送code到后端换取token
            this.exchangeToken(res.code)
              .then(resolve)
              .catch(reject);
          } else {
            reject(new Error('获取微信登录code失败'));
          }
        },
        fail: reject
      });
    });
  }

  // 用code换取token
  static exchangeToken(code) {
    return request.post('/auth/login', { code })
      .then(res => {
        if (res.data.token) {
          // 保存token和用户信息
          Storage.setUserToken(res.data.token);
          Storage.setUserInfo(res.data.user);
          return res.data;
        } else {
          throw new Error('登录失败');
        }
      });
  }

  // 获取用户信息授权
  static getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          resolve(res.userInfo);
        },
        fail: reject
      });
    });
  }

  // 检查登录状态
  static checkLoginStatus() {
    return new Promise((resolve, reject) => {
      const token = Storage.getUserToken();
      if (!token) {
        reject(new Error('未登录'));
        return;
      }

      // 验证token有效性
      request.get('/auth/verify')
        .then(res => {
          resolve(res.data);
        })
        .catch(err => {
          // token无效，清除本地数据
          Storage.logout();
          reject(err);
        });
    });
  }

  // 退出登录
  static logout() {
    return new Promise((resolve) => {
      // 调用后端登出接口
      request.post('/auth/logout')
        .finally(() => {
          // 清除本地数据
          Storage.logout();
          resolve();
        });
    });
  }

  // 检查是否需要登录
  static requireLogin() {
    return new Promise((resolve, reject) => {
      if (Storage.isLoggedIn()) {
        this.checkLoginStatus()
          .then(resolve)
          .catch(() => {
            // 跳转到登录页
            this.redirectToLogin();
            reject(new Error('需要重新登录'));
          });
      } else {
        // 跳转到登录页
        this.redirectToLogin();
        reject(new Error('需要登录'));
      }
    });
  }

  // 跳转到登录页
  static redirectToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  }

  // 获取当前用户信息
  static getCurrentUser() {
    return Storage.getUserInfo();
  }

  // 更新用户信息
  static updateUserInfo(userInfo) {
    return request.put('/user/profile', userInfo)
      .then(res => {
        // 更新本地存储
        Storage.setUserInfo(res.data);
        return res.data;
      });
  }

  // 绑定手机号
  static bindPhone(encryptedData, iv) {
    return request.post('/auth/bind-phone', {
      encryptedData,
      iv
    }).then(res => {
      // 更新用户信息
      const userInfo = Storage.getUserInfo();
      userInfo.phone = res.data.phone;
      Storage.setUserInfo(userInfo);
      return res.data;
    });
  }

  // 检查是否为体验官
  static isExpert() {
    const userInfo = this.getCurrentUser();
    return userInfo && userInfo.role === 'expert';
  }

  // 申请成为体验官
  static applyExpert(inviteCode) {
    return request.post('/expert/apply', { inviteCode })
      .then(res => {
        // 更新用户角色
        const userInfo = Storage.getUserInfo();
        userInfo.role = 'expert';
        userInfo.expertLevel = res.data.level;
        userInfo.points = res.data.points;
        Storage.setUserInfo(userInfo);
        return res.data;
      });
  }
}

module.exports = Auth;