// 应用配置文件
const config = {
  // API基础配置
  apiBaseUrl: '', // 使用云开发，不需要baseUrl
  
  // 微信小程序配置
  appId: 'wx20498e7775b32e18',
  
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
  
  // 体验官等级配置
  expertLevels: {
    bronze: { minPoints: 0, name: '青铜体验官' },
    silver: { minPoints: 500, name: '白银体验官' },
    gold: { minPoints: 1500, name: '黄金体验官' },
    platinum: { minPoints: 3000, name: '铂金体验官' },
    diamond: { minPoints: 5000, name: '钻石体验官' }
  },
  
  // 积分规则配置
  pointsRules: {
    dailyCheckIn: 10,        // 每日签到
    skinDetection: 20,       // 皮肤检测
    diaryRecord: 15,         // 日记记录
    taskComplete: 50,        // 完成任务
    reportSubmit: 100,       // 提交报告
    shareApp: 30             // 分享应用
  }
};

module.exports = config;