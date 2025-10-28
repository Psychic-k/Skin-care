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
      wx.cloud.callFunction({
        name,
        data,
        success: (res) => {
          if (res.result && res.result.code === 0) {
            resolve(res.result);
          } else {
            this.handleError(res.result || { code: -1, message: '云函数调用失败' });
            reject(res.result || { code: -1, message: '云函数调用失败' });
          }
        },
        fail: (err) => {
          this.handleNetworkError(err);
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

  // URL转换为云函数名称
  urlToFunctionName(url, method) {
    // 移除开头的斜杠
    const cleanUrl = url.replace(/^\/+/, '');
    
    // 处理带参数的URL路径（如 /api/diary/list/123）
    let normalizedUrl = cleanUrl;
    
    // 移除动态参数，保留基础路径
    normalizedUrl = normalizedUrl.replace(/\/[a-f0-9]{24}$/, ''); // 移除MongoDB ObjectId
    normalizedUrl = normalizedUrl.replace(/\/\d+$/, ''); // 移除数字ID
    normalizedUrl = normalizedUrl.replace(/\/[^\/]+$/, function(match) {
      // 如果最后一段看起来像ID，则移除
      if (/^\/[a-zA-Z0-9_-]{8,}$/.test(match)) {
        return '';
      }
      return match;
    });
    
    // 将URL路径转换为云函数名称
    const parts = normalizedUrl.split('/');
    let functionName = parts.join('_');
    
    // 添加方法前缀
    if (method !== 'GET') {
      functionName = method.toLowerCase() + '_' + functionName;
    }
    
    // 处理常见的API路径映射
    const apiMappings = {
      'api/user/login': 'login',
      'api/user/profile': 'userProfile',
      'api/detection/analyze': 'detectionAnalyze',
      'api/detection/history': 'detectionHistory',
      'api/diary/list': 'diaryList',
      'api/diary/create': 'diaryCreate',
      'api/diary/update': 'diaryUpdate',
      'api/diary/stats': 'diaryStats',
      'api/products/list': 'getProductRecommendations',
      'api/products/user-products': 'getUserProducts',
      'api/products/search': 'productsSearch',
      'user/login': 'login',
      'user/profile': 'userProfile',
      'detection/analyze': 'detectionAnalyze',
      'detection/history': 'detectionHistory',
      'diary/list': 'diaryList',
      'diary/create': 'diaryCreate',
      'diary/update': 'diaryUpdate',
      'diary/stats': 'diaryStats',
      'products/list': 'getProductRecommendations',
      'products/user-products': 'getUserProducts',
      'products/search': 'productsSearch'
    };
    
    console.log('URL映射调试:', {
      originalUrl: url,
      cleanUrl: cleanUrl,
      normalizedUrl: normalizedUrl,
      mappedFunction: apiMappings[normalizedUrl] || functionName || 'defaultFunction'
    });
    
    return apiMappings[normalizedUrl] || functionName || 'defaultFunction';
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
  handleError(error, url) {
    console.error('请求错误详情:', {
      url: url,
      error: error,
      errorType: typeof error,
      errorKeys: Object.keys(error || {})
    })
    
    if (error.errCode) {
      // 云函数错误
      console.error('云函数调用失败:', error)
      return {
        code: -1,
        message: error.errMsg || '云函数调用失败',
        data: null,
        error: error
      }
    } else if (error.statusCode) {
      // HTTP错误
      return this.handleHttpError(error)
    } else {
      // 网络错误
      return this.handleNetworkError(error)
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
  handleNetworkError(error) {
    let message = '网络连接失败';
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