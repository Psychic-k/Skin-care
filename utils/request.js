// 网络请求工具类
const config = require('./config.js');

class Request {
  constructor() {
    this.baseUrl = config.apiBaseUrl;
    this.timeout = 10000;
    this.useCloud = config.cloudEnvId ? true : false;
  }

  // 获取用户token
  getToken() {
    return wx.getStorageSync(config.storageKeys.userToken) || '';
  }

  // 云函数调用方法
  callCloudFunction(name, data = {}) {
    return new Promise((resolve, reject) => {
      // 检查云开发是否可用
      const app = getApp();
      if (!app.globalData.cloudEnabled) {
        console.warn('云开发不可用，尝试降级处理');
        reject({ code: -1, message: '云开发服务不可用' });
        return;
      }

      console.log(`调用云函数: ${name}`, data);
      
      wx.cloud.callFunction({
        name,
        data,
        success: (res) => {
          console.log(`云函数 ${name} 调用成功:`, res);
          if (res.result && res.result.code === 0) {
            resolve(res.result);
          } else {
            const error = res.result || { code: -1, message: '云函数调用失败' };
            console.error(`云函数 ${name} 返回错误:`, error);
            this.handleError(error, name);
            reject(error);
          }
        },
        fail: (err) => {
          console.error(`云函数 ${name} 调用失败:`, err);
          this.handleNetworkError(err, name);
          reject(err);
        }
      });
    });
  }

  // 通用请求方法
  request(options) {
    // 如果使用云开发，优先使用云函数
    if (this.useCloud) {
      const { url, method = 'GET', data = {} } = options;
      const functionName = this.urlToFunctionName(url, method);
      return this.callCloudFunction(functionName, data);
    }

    // 传统HTTP请求作为备选方案
    return new Promise((resolve, reject) => {
      const { url, method = 'GET', data = {}, header = {} } = options;
      
      // 添加认证头
      const token = this.getToken();
      if (token) {
        header['Authorization'] = `Bearer ${token}`;
      }
      
      // 添加通用头部
      header['Content-Type'] = header['Content-Type'] || 'application/json';
      
      wx.request({
        url: this.baseUrl + url,
        method,
        data,
        header,
        timeout: this.timeout,
        success: (res) => {
          if (res.statusCode === 200) {
            if (res.data.code === 0) {
              resolve(res.data);
            } else {
              this.handleError(res.data);
              reject(res.data);
            }
          } else {
            this.handleHttpError(res.statusCode);
            reject(res);
          }
        },
        fail: (err) => {
          this.handleNetworkError(err);
          reject(err);
        }
      });
    });
  }

  // 获取云函数名称
  getCloudFunctionName(url, method) {
    // 移除开头的斜杠和结尾的斜杠
    const cleanUrl = url.replace(/^\/+/, '').replace(/\/+$/, '');
    
    // 完整的API路径映射表，基于云开发控制台的实际云函数名称
    const apiMappings = {
      // 用户相关
      'api/user/login': 'login',
      'api/user/info': 'getUserInfo',
      'api/user/profile': 'userProfile',
      'user/login': 'login',
      'user/info': 'getUserInfo',
      'user/profile': 'userProfile',
      
      // 检测相关
      'api/detection/analyze': 'detectionAnalyze',
      'api/detection/history': 'detectionHistory',
      'detection/analyze': 'detectionAnalyze',
      'detection/history': 'detectionHistory',
      
      // 日记相关
      'api/diary/list': 'diaryList',
      'api/diary/create': 'diaryCreate',
      'api/diary/update': 'diaryUpdate',
      'api/diary/stats': 'diaryStats',
      'diary/list': 'diaryList',
      'diary/create': 'diaryCreate',
      'diary/update': 'diaryUpdate',
      'diary/stats': 'diaryStats',
      
      // 产品相关
      'api/products/list': 'getProductRecommendations',
      'api/products/recommendations': 'getProductRecommendations',
      'api/products/user-products': 'getUserProducts',
      'api/products/search': 'productsSearch',
      'products/list': 'getProductRecommendations',
      'products/recommendations': 'getProductRecommendations',
      'products/user-products': 'getUserProducts',
      'products/search': 'productsSearch',
      
      // 文件上传
      'api/upload/file': 'uploadFile',
      'upload/file': 'uploadFile'
    };
    
    // 处理带参数的URL路径，移除动态参数
    let normalizedUrl = cleanUrl;
    
    // 移除常见的动态参数模式
    normalizedUrl = normalizedUrl.replace(/\/[a-f0-9]{24}$/, ''); // 移除MongoDB ObjectId
    normalizedUrl = normalizedUrl.replace(/\/\d+$/, ''); // 移除数字ID
    normalizedUrl = normalizedUrl.replace(/\/[a-zA-Z0-9_-]{8,}$/, ''); // 移除其他ID格式
    
    // 优先使用精确匹配
    if (apiMappings[normalizedUrl]) {
      console.log('URL映射调试:', {
        originalUrl: url,
        cleanUrl: cleanUrl,
        normalizedUrl: normalizedUrl,
        mappedFunction: apiMappings[normalizedUrl],
        method: method
      });
      return apiMappings[normalizedUrl];
    }
    
    // 如果没有精确匹配，尝试匹配原始URL
    if (apiMappings[cleanUrl]) {
      console.log('URL映射调试:', {
        originalUrl: url,
        cleanUrl: cleanUrl,
        normalizedUrl: normalizedUrl,
        mappedFunction: apiMappings[cleanUrl],
        method: method
      });
      return apiMappings[cleanUrl];
    }
    
    // 如果仍然没有匹配，记录警告并返回默认函数名
    console.warn('未找到匹配的云函数映射:', {
      originalUrl: url,
      cleanUrl: cleanUrl,
      normalizedUrl: normalizedUrl,
      method: method,
      availableMappings: Object.keys(apiMappings)
    });
    
    // 作为最后的备选方案，生成一个基于路径的函数名（但这通常不应该被使用）
    const fallbackName = normalizedUrl.replace(/\//g, '_').replace(/^api_/, '') || 'defaultFunction';
    
    console.log('使用备选函数名:', {
      originalUrl: url,
      fallbackName: fallbackName
    });
    
    return fallbackName;
  }

  // URL转换为云函数名称（保持向后兼容）
  urlToFunctionName(url, method) {
    return this.getCloudFunctionName(url, method);
  }

  // GET请求
  get(url, data = {}) {
    return this.request({
      url,
      method: 'GET',
      data
    });
  }

  // POST请求
  post(url, data = {}) {
    return this.request({
      url,
      method: 'POST',
      data
    });
  }

  // PUT请求
  put(url, data = {}) {
    return this.request({
      url,
      method: 'PUT',
      data
    });
  }

  // DELETE请求
  delete(url, data = {}) {
    return this.request({
      url,
      method: 'DELETE',
      data
    });
  }

  // 上传文件
  uploadFile(filePath, url, formData = {}) {
    return new Promise((resolve, reject) => {
      const token = this.getToken();
      const header = {};
      if (token) {
        header['Authorization'] = `Bearer ${token}`;
      }

      wx.uploadFile({
        url: this.baseUrl + url,
        filePath,
        name: 'file',
        formData,
        header,
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.code === 0) {
              resolve(data);
            } else {
              this.handleError(data);
              reject(data);
            }
          } catch (e) {
            reject({ message: '响应数据解析失败' });
          }
        },
        fail: (err) => {
          this.handleNetworkError(err);
          reject(err);
        }
      });
    });
  }

  // 处理错误
  handleError(error, context = '') {
    console.error('请求错误详情:', {
      context: context,
      error: error,
      errorType: typeof error,
      errorKeys: Object.keys(error || {})
    });
    
    // 显示用户友好的错误提示
    let userMessage = '操作失败，请稍后重试';
    
    if (error.errCode) {
      // 云函数错误
      console.error('云函数调用失败:', error);
      userMessage = error.errMsg || '服务暂时不可用';
    } else if (error.statusCode) {
      // HTTP错误
      userMessage = this.getHttpErrorMessage(error.statusCode);
    } else if (error.code === -1) {
      // 自定义错误
      userMessage = error.message || '服务异常';
    } else {
      // 网络错误
      userMessage = '网络连接异常，请检查网络设置';
    }
    
    // 显示错误提示
    wx.showToast({
      title: userMessage,
      icon: 'error',
      duration: 2000
    });
    
    return {
      code: -1,
      message: userMessage,
      data: null,
      error: error
    };
  }

  // 获取HTTP错误消息
  getHttpErrorMessage(statusCode) {
    switch (statusCode) {
      case 400:
        return '请求参数错误';
      case 401:
        return '请先登录';
      case 403:
        return '权限不足';
      case 404:
        return '服务不存在';
      case 500:
        return '服务器内部错误';
      case 502:
        return '网关错误';
      case 503:
        return '服务暂时不可用';
      default:
        return '网络请求失败';
    }
  }

  // HTTP状态码错误处理
  handleHttpError(error) {
    const statusCode = error.statusCode;
    let message = '请求失败';
    
    switch (statusCode) {
      case 400:
        message = '请求参数错误';
        break;
      case 401:
        message = '未授权，请重新登录';
        // 清除token并跳转到登录页
        wx.removeStorageSync(config.storageKeys.userToken);
        wx.navigateTo({
          url: '/pages/login/login'
        });
        break;
      case 403:
        message = '禁止访问';
        break;
      case 404:
        message = '请求的资源不存在';
        break;
      case 500:
        message = '服务器内部错误';
        break;
      default:
        message = `请求失败 (${statusCode})`;
    }
    
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
    
    return {
      code: -1,
      message: message,
      data: null,
      statusCode: statusCode
    };
  }

  // 网络错误处理
  handleNetworkError(error, context = '') {
    let message = '网络连接失败';
    console.error(`网络错误 [${context}]:`, error);
    
    if (error.errMsg) {
      if (error.errMsg.includes('timeout')) {
        message = '请求超时，请重试';
      } else if (error.errMsg.includes('fail')) {
        message = '网络连接失败，请检查网络';
      }
    }
    
    console.error('网络错误详情:', error);
    
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
    
    return {
      code: -1,
      message: message,
      data: null,
      error: error
    };
  }
}

// 创建请求实例
const request = new Request();

module.exports = request;