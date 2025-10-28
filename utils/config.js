// 应用配置文件
const config = {
  // API基础配置
  apiBaseUrl: '', // 使用云开发，不需要baseUrl
  
  // 微信小程序配置
  appId: 'wxfdbb0cd8b2a0995c',
  
  // 云开发配置
  cloudEnvId: 'cloud1-7grsf5bufd76f124',
  
  // 存储键名
  storageKeys: {
    userToken: 'user_token',
    userInfo: 'user_info',
    skinProfile: 'skin_profile',
    detectionHistory: 'detection_history'
  },
  
  // 谷雨品牌色彩配置
  colors: {
    primary: '#4CAF50',      // 谷雨品牌绿
    secondary: '#E3F2FD',    // 清新蓝
    accent: '#81C784',       // 浅绿色
    background: '#f8f9fa',   // 背景色
    text: '#333333',         // 主文字色
    textSecondary: '#666666', // 次要文字色
    border: '#e0e0e0',       // 边框色
    success: '#4CAF50',      // 成功色
    warning: '#FF9800',      // 警告色
    error: '#F44336'         // 错误色
  },
  
  // 皮肤检测配置
  detection: {
    maxImageSize: 2 * 1024 * 1024, // 2MB
    supportedFormats: ['jpg', 'jpeg', 'png'],
    analysisTimeout: 30000, // 30秒
    retryTimes: 3
  },
  

};

module.exports = config;