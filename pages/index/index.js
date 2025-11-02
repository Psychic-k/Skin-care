// index.js
const request = require('../../utils/request');
const Auth = require('../../utils/auth');

Page({
  data: {
    testResults: [],
    isLoggedIn: false,
    userInfo: null
  },

  onLoad: function (options) {
    console.log('首页加载');
    this.checkLoginStatus();
    // 加载推荐占位，避免函数未定义错误
    this.loadRecommendations();
    
    // 添加登录状态变化监听器
    this.loginStatusListener = (isLoggedIn, userInfo) => {
      console.log('首页收到登录状态变化通知:', isLoggedIn);
      this.setData({
        isLoggedIn: isLoggedIn,
        userInfo: userInfo
      });
    };
    getApp().addLoginStatusListener(this.loginStatusListener);
  },

  onShow: function() {
    console.log('首页显示');
    // 每次显示页面时检查登录状态
    this.checkLoginStatus();
  },

  onUnload: function() {
    // 移除登录状态监听器
    if (this.loginStatusListener) {
      getApp().removeLoginStatusListener(this.loginStatusListener);
    }
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const app = getApp();
    const isLoggedIn = Auth.isLoggedIn();
    const userInfo = app.getUserInfo();
    
    this.setData({
      isLoggedIn: isLoggedIn,
      userInfo: userInfo
    });
  },

  // 推荐内容加载占位实现，后续可替换为真实接口
  loadRecommendations: function() {
    try {
      console.log('加载首页推荐内容');
      // 这里可以接入接口或云函数，当前占位不做操作
    } catch (e) {
      console.warn('加载推荐内容失败(占位):', e);
    }
  },

  // 跳转到登录页面
  goToLogin: function() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // 跳转到皮肤检测页面
  goToDetection: function() {
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: 'AI皮肤检测功能需要登录后使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.goToLogin();
          }
        }
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/detection/detection'
    });
  },

  // 跳转到护肤日记页面
  goToDiary: function() {
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '护肤日记功能需要登录后使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.goToLogin();
          }
        }
      });
      return;
    }
    
    wx.switchTab({
      url: '/pages/diary/diary'
    });
  },

  // 跳转到产品推荐页面
  goToProducts: function() {
    // 产品推荐页面支持游客模式
    wx.switchTab({
      url: '/pages/products/products'
    });
  },

  // 跳转到我的用品页面
  goToMyProducts: function() {
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '我的用品功能需要登录后使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.goToLogin();
          }
        }
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/my-products/my-products'
    });
  },

  // 跳转到用户档案页面
  goToProfile: function() {
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '肌肤档案功能需要登录后使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.goToLogin();
          }
        }
      });
      return;
    }
    
    wx.switchTab({
      url: '/pages/user/user'
    });
  },

  // 测试云函数
  testCloudFunctions: function() {
    wx.showLoading({
      title: '测试中...'
    });
    
    this.setData({
      testResults: []
    });

    // 依次测试所有云函数
    this.testUserLogin();
  },

  // 测试用户登录云函数
  testUserLogin: function() {
    // 优先尝试云函数调用
    wx.cloud.callFunction({
      name: 'user_login',
      data: {
        code: 'test_code',
        userInfo: {
          nickName: '测试用户',
          avatarUrl: 'https://example.com/avatar.jpg'
        }
      }
    }).then(res => {
      this.addTestResult('user_login', '成功', res);
      this.testUserProfile();
    }).catch(err => {
      // 云函数调用失败，尝试HTTP请求
      console.log('云函数调用失败，尝试HTTP请求:', err);
      request.request({
        url: '/api/user/login',
        method: 'POST',
        data: {
          code: 'test_code',
          userInfo: {
            nickName: '测试用户',
            avatarUrl: 'https://example.com/avatar.jpg'
          }
        }
      }).then(res => {
        this.addTestResult('user_login', '成功(HTTP)', res);
        this.testUserProfile();
      }).catch(httpErr => {
        this.addTestResult('user_login', '失败', '云函数未部署且HTTP请求失败: ' + JSON.stringify(httpErr));
        this.testUserProfile();
      });
    });
  },

  // 测试用户资料云函数
  testUserProfile: function() {
    // 优先尝试云函数调用
    wx.cloud.callFunction({
      name: 'user_profile',
      data: {}
    }).then(res => {
      this.addTestResult('user_profile', '成功', res);
      this.testDetectionAnalyze();
    }).catch(err => {
      // 云函数调用失败，尝试HTTP请求
      console.log('云函数调用失败，尝试HTTP请求:', err);
      request.request({
        url: '/api/user/profile',
        method: 'GET'
      }).then(res => {
        this.addTestResult('user_profile', '成功(HTTP)', res);
        this.testDetectionAnalyze();
      }).catch(httpErr => {
        this.addTestResult('user_profile', '失败', '云函数未部署且HTTP请求失败: ' + JSON.stringify(httpErr));
        this.testDetectionAnalyze();
      });
    });
  },

  // 测试皮肤检测分析云函数
  testDetectionAnalyze: function() {
    // 优先尝试云函数调用
    wx.cloud.callFunction({
      name: 'detection_analyze',
      data: {
        imageUrl: 'https://example.com/test-image.jpg',
        userId: 'test_user_id'
      }
    }).then(res => {
      this.addTestResult('detection_analyze', '成功', res);
      this.testDiaryList();
    }).catch(err => {
      // 云函数调用失败，尝试HTTP请求
      console.log('云函数调用失败，尝试HTTP请求:', err);
      request.request({
        url: '/api/detection/analyze',
        method: 'POST',
        data: {
          imageUrl: 'https://example.com/test-image.jpg',
          userId: 'test_user_id'
        }
      }).then(res => {
        this.addTestResult('detection_analyze', '成功(HTTP)', res);
        this.testDiaryList();
      }).catch(httpErr => {
        this.addTestResult('detection_analyze', '失败', '云函数未部署且HTTP请求失败: ' + JSON.stringify(httpErr));
        this.testDiaryList();
      });
    });
  },

  // 测试护肤日记云函数
  testDiaryList: function() {
    // 优先尝试云函数调用
    wx.cloud.callFunction({
      name: 'diary_list',
      data: {
        page: 1,
        limit: 10
      }
    }).then(res => {
      this.addTestResult('diary_list', '成功', res);
      this.testProductsList();
    }).catch(err => {
      // 云函数调用失败，尝试HTTP请求
      console.log('云函数调用失败，尝试HTTP请求:', err);
      request.request({
        url: '/api/diary/list',
        method: 'GET',
        data: {
          page: 1,
          limit: 10
        }
      }).then(res => {
        this.addTestResult('diary_list', '成功(HTTP)', res);
        this.testProductsList();
      }).catch(httpErr => {
        this.addTestResult('diary_list', '失败', '云函数未部署且HTTP请求失败: ' + JSON.stringify(httpErr));
        this.testProductsList();
      });
    });
  },

  // 测试产品推荐云函数
  testProductsList: function() {
    // 优先尝试云函数调用
    wx.cloud.callFunction({
      name: 'products_list',
      data: {
        skinType: 'oily',
        category: 'cleanser'
      }
    }).then(res => {
      this.addTestResult('products_list', '成功', res);
      this.showTestResults();
    }).catch(err => {
      // 云函数调用失败，尝试HTTP请求
      console.log('云函数调用失败，尝试HTTP请求:', err);
      request.request({
        url: '/api/products/list',
        method: 'GET',
        data: {
          skinType: 'oily',
          category: 'cleanser'
        }
      }).then(res => {
        this.addTestResult('products_list', '成功(HTTP)', res);
        this.showTestResults();
      }).catch(httpErr => {
        this.addTestResult('products_list', '失败', '云函数未部署且HTTP请求失败: ' + JSON.stringify(httpErr));
        this.showTestResults();
      });
    });
  },

  // 添加测试结果
  addTestResult: function(functionName, status, result) {
    const testResults = this.data.testResults;
    testResults.push({
      functionName: functionName,
      status: status,
      result: JSON.stringify(result, null, 2),
      timestamp: new Date().toLocaleTimeString()
    });
    this.setData({
      testResults: testResults
    });
  },

  // 显示测试结果
  showTestResults: function() {
    wx.hideLoading();
    
    let message = '云函数测试结果：\n\n';
    let successCount = 0;
    let totalCount = this.data.testResults.length;
    
    this.data.testResults.forEach(item => {
      if (item.status.includes('成功')) {
        successCount++;
        message += `✅ ${item.functionName}: ${item.status}\n`;
      } else {
        message += `❌ ${item.functionName}: ${item.status}\n`;
      }
      message += `⏰ 时间: ${item.timestamp}\n`;
      
      if (item.status === '失败') {
        // 简化错误信息显示
        let errorMsg = item.result;
        if (errorMsg.includes('errCode')) {
          if (errorMsg.includes('-501000')) {
            errorMsg = '云函数未部署或名称不正确';
          } else if (errorMsg.includes('-501001')) {
            errorMsg = '云函数执行超时';
          } else if (errorMsg.includes('-501002')) {
            errorMsg = '云函数内存不足';
          } else {
            errorMsg = '云函数调用失败';
          }
        }
        message += `💡 提示: ${errorMsg}\n`;
      }
      message += '\n';
    });

    // 添加总结信息
    message += `📊 测试总结: ${successCount}/${totalCount} 个函数测试通过\n\n`;
    
    if (successCount === 0) {
      message += '💡 建议:\n';
      message += '1. 确保已在微信开发者工具中初始化云开发\n';
      message += '2. 检查云函数是否已正确部署\n';
      message += '3. 确认云函数名称使用下划线命名规范';
    } else if (successCount < totalCount) {
      message += '💡 部分函数测试失败，请检查对应的云函数部署状态';
    } else {
      message += '🎉 所有云函数测试通过！';
    }

    wx.showModal({
      title: '测试完成',
      content: message,
      showCancel: false,
      confirmText: '确定'
    });
  }
});
