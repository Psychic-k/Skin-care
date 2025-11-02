// 网络请求工具类
const config = require('./config.js');
const { CacheStorage } = require('./storage.js');

class Request {
  constructor() {
    this.baseUrl = config.apiBaseUrl;
    this.timeout = 10000;
    this.useCloud = config.cloudEnvId ? true : false;
    this.maxRetries = 3; // 最大重试次数
    this.retryDelay = 1000; // 重试延迟（毫秒）
    this.requestQueue = new Map(); // 请求队列，用于防抖动
  }

  // 获取用户token
  getToken() {
    return wx.getStorageSync(config.storageKeys.userToken) || '';
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 生成请求唯一标识
  generateRequestId(name, data) {
    return `${name}_${JSON.stringify(data)}`;
  }

  // 防抖动处理
  debounceRequest(requestId, requestFn, delay = 300) {
    // 如果已有相同请求在队列中，清除之前的
    if (this.requestQueue.has(requestId)) {
      clearTimeout(this.requestQueue.get(requestId).timer);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(async () => {
        this.requestQueue.delete(requestId);
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);

      this.requestQueue.set(requestId, { timer, resolve, reject });
    });
  }

  // 云函数调用方法（带重试机制）
  callCloudFunction(name, data = {}, options = {}) {
    const requestId = this.generateRequestId(name, data);
    
    // 如果启用防抖动，使用防抖动处理
    if (options.debounce !== false) {
      return this.debounceRequest(requestId, () => this._callCloudFunctionWithRetry(name, data, options));
    }
    
    return this._callCloudFunctionWithRetry(name, data, options);
  }

  // 带重试的云函数调用
  async _callCloudFunctionWithRetry(name, data = {}, options = {}) {
    const { maxRetries = this.maxRetries, useCache = true, cacheTime = 5 * 60 * 1000 } = options;
    
    // 尝试从缓存获取数据
    if (useCache) {
      const cacheKey = `cloudFunction_${name}_${JSON.stringify(data)}`;
      const cachedData = CacheStorage.getCache(cacheKey);
      if (cachedData) {
        console.log(`从缓存获取云函数 ${name} 数据`);
        return cachedData;
      }
    }

    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`调用云函数: ${name} (第${attempt}次尝试)`, data);
        
        const result = await this._callCloudFunctionOnce(name, data);
        
        // 缓存成功的结果
        if (useCache && result.code === 0) {
          const cacheKey = `cloudFunction_${name}_${JSON.stringify(data)}`;
          CacheStorage.setCache(cacheKey, result, cacheTime);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`云函数 ${name} 第${attempt}次调用失败:`, error);
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // 指数退避
          console.log(`等待 ${delay}ms 后重试...`);
          await this.delay(delay);
        }
      }
    }
    
    // 所有重试都失败，尝试降级处理
    console.error(`云函数 ${name} 所有重试都失败，尝试降级处理`);
    return this.handleCloudFunctionFallback(name, data, lastError);
  }

  // 单次云函数调用
  _callCloudFunctionOnce(name, data = {}) {
    return new Promise((resolve, reject) => {
      // 检查云开发是否可用
      const app = getApp();
      if (!app.globalData.cloudEnabled) {
        reject({ code: -1, message: '云开发服务不可用' });
        return;
      }
      
      wx.cloud.callFunction({
        name,
        data,
        timeout: this.timeout,
        success: (res) => {
          console.log(`云函数 ${name} 调用成功:`, res);
          if (res.result && res.result.code === 0) {
            resolve(res.result);
          } else {
            const error = res.result || { code: -1, message: '云函数调用失败' };
            console.error(`云函数 ${name} 返回错误:`, error);
            reject(error);
          }
        },
        fail: (err) => {
          console.error(`云函数 ${name} 调用失败:`, err);
          reject(err);
        }
      });
    });
  }

  // 云函数降级处理
  handleCloudFunctionFallback(name, data, error) {
    console.log(`执行云函数 ${name} 降级处理`);
    
    // 尝试从本地缓存获取历史数据
    const cacheKey = `cloudFunction_${name}_fallback`;
    const fallbackData = CacheStorage.getCache(cacheKey);
    
    if (fallbackData) {
      console.log(`使用云函数 ${name} 的降级缓存数据`);
      return {
        code: 0,
        data: fallbackData,
        message: '使用缓存数据',
        fromCache: true
      };
    }
    
    // 根据不同的云函数提供不同的降级策略
    switch (name) {
      case 'diaryList':
        return {
          code: 0,
          data: { diaries: [], total: 0 },
          message: '暂无数据',
          fromFallback: true
        };
      case 'diaryStats':
        return {
          code: 0,
          data: this.getDefaultStatsData(),
          message: '使用默认统计数据',
          fromFallback: true
        };
      case 'getUserProducts':
        return {
          code: 0,
          data: { products: this.getDefaultProducts() },
          message: '使用默认产品数据',
          fromFallback: true
        };
      default:
        // 抛出原始错误
        throw error;
    }
  }

  // 获取默认统计数据
  getDefaultStatsData() {
    return {
      basic: {
        totalCount: 0,
        thisMonthCount: 0,
        consecutiveDays: 0
      },
      skinCondition: {
        moisture: 5,
        oiliness: 5,
        sensitivity: 5,
        breakouts: 5,
        overall: 5
      },
      mood: {
        excellent: 0,
        good: 0,
        neutral: 0,
        bad: 0,
        terrible: 0
      },
      topProducts: [],
      last7Days: [],
      summary: {
        completionRate: 0
      }
    };
  }

  // 获取默认产品数据
  getDefaultProducts() {
    return [
      {
        id: 'default_1',
        name: '温和洁面乳',
        brand: '默认品牌',
        image: '/images/placeholder/placeholder-product.png',
        category: 'cleanser'
      },
      {
        id: 'default_2',
        name: '保湿爽肤水',
        brand: '默认品牌',
        image: '/images/placeholder/placeholder-product.png',
        category: 'toner'
      }
    ];
  }

  // 通用请求方法（带重试机制）
  async request(options) {
    const { maxRetries = this.maxRetries, useCache = true, cacheTime = 5 * 60 * 1000 } = options;
    
    // 如果使用云开发，优先使用云函数
    if (this.useCloud) {
      const { url, method = 'GET', data = {} } = options;
      const functionName = this.urlToFunctionName(url, method);
      return this.callCloudFunction(functionName, data, { maxRetries, useCache, cacheTime });
    }

    // 传统HTTP请求作为备选方案
    const requestId = this.generateRequestId(options.url, options.data);
    
    // 防抖动处理
    if (options.debounce !== false) {
      return this.debounceRequest(requestId, () => this._requestWithRetry(options));
    }
    
    return this._requestWithRetry(options);
  }

  // 带重试的HTTP请求
  async _requestWithRetry(options) {
    const { maxRetries = this.maxRetries, useCache = true, cacheTime = 5 * 60 * 1000 } = options;
    
    // 尝试从缓存获取数据
    if (useCache && options.method === 'GET') {
      const cacheKey = `http_${options.url}_${JSON.stringify(options.data)}`;
      const cachedData = CacheStorage.getCache(cacheKey);
      if (cachedData) {
        console.log(`从缓存获取HTTP请求 ${options.url} 数据`);
        return cachedData;
      }
    }

    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`HTTP请求: ${options.url} (第${attempt}次尝试)`);
        
        const result = await this._requestOnce(options);
        
        // 缓存成功的GET请求结果
        if (useCache && options.method === 'GET' && result.code === 0) {
          const cacheKey = `http_${options.url}_${JSON.stringify(options.data)}`;
          CacheStorage.setCache(cacheKey, result, cacheTime);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`HTTP请求 ${options.url} 第${attempt}次调用失败:`, error);
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // 指数退避
          console.log(`等待 ${delay}ms 后重试...`);
          await this.delay(delay);
        }
      }
    }
    
    // 所有重试都失败，抛出错误
    console.error(`HTTP请求 ${options.url} 所有重试都失败`);
    throw lastError;
  }

  // 单次HTTP请求
  _requestOnce(options) {
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
              this.handleError(res.data, `HTTP ${method} ${url}`);
              reject(res.data);
            }
          } else {
            const error = this.handleHttpError(res);
            reject(error);
          }
        },
        fail: (err) => {
          const error = this.handleNetworkError(err, `HTTP ${method} ${url}`);
          reject(error);
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
    
    // 针对带ID的日记资源，依据HTTP方法选择云函数
    if ((normalizedUrl === 'api/diary' || normalizedUrl === 'diary')) {
      if (method === 'PUT') {
        return 'diaryUpdate'
      }
      if (method === 'DELETE') {
        return 'diaryDelete'
      }
    }

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