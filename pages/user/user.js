// pages/user/user.js
const app = getApp()
const cloudApi = require('../../utils/cloudApi')
const Auth = require('../../utils/auth')

Page({
  data: {
    // 用户信息
    userInfo: {
      avatar: '/images/default-avatar.png',
      nickname: '未登录',
      level: 1,
      
    },
    
    // 统计数据
    stats: {
      detectionCount: 0,
      diaryCount: 0,
      reportCount: 0,
      favoriteCount: 0
    },
    
    // 菜单项
    menuItems: [
      {
        id: 'detection-history',
        name: '检测历史',
        icon: '🔍',
        count: 0,
        color: '#FF6B6B'
      },
      {
        id: 'my-diary',
        name: '护肤日记',
        icon: '📝',
        count: 0,
        color: '#4ECDC4'
      },
      {
        id: 'my-reports',
        name: '检测报告',
        icon: '📊',
        count: 0,
        color: '#45B7D1'
      },
      {
        id: 'favorites',
        name: '我的收藏',
        icon: '❤️',
        count: 0,
        color: '#96CEB4'
      },
      {
        id: 'achievements',
        name: '成就徽章',
        icon: '🏆',
        count: 0,
        color: '#FFEAA7'
      },
      {
        id: 'settings',
        name: '设置',
        icon: '⚙️',
        count: 0,
        color: '#DDA0DD'
      },
      {
        id: 'logout',
        name: '退出登录',
        icon: '🚪',
        count: 0,
        color: '#FF6B6B'
      }
    ],
    
    // 服务项
    serviceItems: [
      {
        id: 'feedback',
        name: '意见反馈',
        icon: '💬',
        color: '#74B9FF'
      },
      {
        id: 'help',
        name: '帮助中心',
        icon: '❓',
        color: '#A29BFE'
      },
      {
        id: 'about',
        name: '关于我们',
        icon: 'ℹ️',
        color: '#FD79A8'
      }
    ],
    

    
    // 是否显示登录弹窗
    showLoginModal: false
  },

  onLoad() {
    console.log('用户页面加载');
    this.loadUserInfo();
    this.loadUserStats();
    
    // 添加登录状态变化监听器
    this.loginStatusListener = (isLoggedIn, userInfo) => {
      console.log('用户页面收到登录状态变化通知:', isLoggedIn);
      if (isLoggedIn) {
        this.loadUserInfo();
        this.loadUserStats();
      } else {
        // 用户退出登录，清空页面数据
        this.setData({
          userInfo: null,
          isLoggedIn: false,
          stats: {
            diaryCount: 0,
            detectionCount: 0,
            productCount: 0
          }
        });
      }
    };
    getApp().addLoginStatusListener(this.loginStatusListener);
  },

  onShow() {
    console.log('用户页面显示');
    this.loadUserInfo();
    this.loadUserStats();
  },

  onUnload() {
    // 移除登录状态监听器
    if (this.loginStatusListener) {
      getApp().removeLoginStatusListener(this.loginStatusListener);
    }
  },

  // 加载用户信息 - 使用云开发API
  async loadUserInfo() {
    try {
      // 先从统一认证工具获取，确保为对象形态
      const localUserInfo = Auth.getUserInfo() || app.globalData.userInfo
      console.log('本地用户信息:', localUserInfo)
      
      if (localUserInfo && (localUserInfo.openid || localUserInfo.id || localUserInfo.isLogin)) {
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            ...localUserInfo,
            // 统一字段名处理
            nickName: localUserInfo.nickName || localUserInfo.nickname || '未登录',
            avatarUrl: localUserInfo.avatarUrl || localUserInfo.avatar || '/images/default-avatar.png'
          }
        })
        console.log('用户已登录，显示用户信息:', this.data.userInfo)
      } else {
        console.log('用户未登录，显示默认状态')
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            nickName: '未登录',
            avatarUrl: '/images/default-avatar.png'
          }
        })
      }

      // 如果云开发可用且用户已登录，从云端获取最新用户信息
      if (app.globalData.cloudEnabled && localUserInfo && (localUserInfo.openid || localUserInfo.id)) {
        try {
          const cloudUserInfo = await cloudApi.getUserInfo()
          console.log('云端用户信息:', cloudUserInfo)
          
          const mergedUserInfo = {
            ...this.data.userInfo,
            ...cloudUserInfo,
            // 统一字段名处理
            nickName: cloudUserInfo.nickName || cloudUserInfo.nickname || localUserInfo.nickName || '未登录',
            avatarUrl: cloudUserInfo.avatarUrl || cloudUserInfo.avatar || localUserInfo.avatarUrl || '/images/default-avatar.png'
          }
          
          this.setData({
            userInfo: mergedUserInfo
          })
          wx.setStorageSync('userInfo', mergedUserInfo)
          
          // 如果是新用户，显示欢迎提示
          if (cloudUserInfo.nickname === '新用户') {
            wx.showToast({
              title: '欢迎使用护肤小程序！',
              icon: 'success',
              duration: 2000
            })
          }
        } catch (cloudError) {
          console.log('云端获取用户信息失败，使用本地信息:', cloudError)
        }
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
// 如果是用户不存在的错误，提示用户登录
      if (error.message && error.message.includes('用户不存在')) {
        wx.showModal({
          title: '提示',
          content: '检测到您是新用户，请先完善资料',
          showCancel: false,
          confirmText: '去完善',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/profile/profile'
              })
            }
          }
        })
        return
      }
      
      // 使用本地存储的用户信息作为备用
      const fallbackUserInfo = wx.getStorageSync('userInfo') || app.globalData.userInfo
      if (fallbackUserInfo && (fallbackUserInfo.openid || fallbackUserInfo.id || fallbackUserInfo.isLogin)) {
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            ...fallbackUserInfo,
            // 统一字段名处理
            nickName: fallbackUserInfo.nickName || fallbackUserInfo.nickname || '未登录',
            avatarUrl: fallbackUserInfo.avatarUrl || fallbackUserInfo.avatar || '/images/default-avatar.png'
          }
        })
        console.log('使用备用用户信息:', this.data.userInfo)
      } else {
        // 如果没有任何用户信息，显示默认状态
        console.log('没有用户信息，显示未登录状态')
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            nickName: '未登录',
            avatarUrl: '/images/default-avatar.png'
          }
        })
        wx.showToast({
          title: '请先登录',
          icon: 'none',
          duration: 2000
        })
      }
    }
  },

  // 加载用户统计数据 - 使用云开发API
  async loadUserStats() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      let stats = {
        detectionCount: 0,
        diaryCount: 0,
        reportCount: 0,
        favoriteCount: 0
      }

      if (app.globalData.cloudEnabled && this.data.userInfo && this.data.userInfo.openid) {
        // 使用云开发API获取用户统计数据
        const userInfo = await cloudApi.getUserInfo()
        stats = {
          detectionCount: userInfo.stats?.detectionCount || 0,
          diaryCount: userInfo.stats?.diaryCount || 0,
          reportCount: userInfo.stats?.reportCount || 0,
          favoriteCount: userInfo.stats?.favoriteCount || 0
        }
      } else {
        // 云开发不可用时使用模拟数据
        stats = await this.mockUserStatsAPI()
      }
      
      // 更新菜单项的计数
      const updatedMenuItems = this.data.menuItems.map(item => {
        switch (item.id) {
          case 'detection-history':
            return { ...item, count: stats.detectionCount }
          case 'my-diary':
            return { ...item, count: stats.diaryCount }
          case 'my-reports':
            return { ...item, count: stats.reportCount }
          case 'favorites':
            return { ...item, count: stats.favoriteCount }
          default:
            return item
        }
      })
      
      this.setData({ 
        stats,
        menuItems: updatedMenuItems
      })
    } catch (error) {
      console.error('加载用户统计数据失败:', error)
      
      // 错误时使用模拟数据作为备用
      try {
        const stats = await this.mockUserStatsAPI()
        
        const updatedMenuItems = this.data.menuItems.map(item => {
          switch (item.id) {
            case 'detection-history':
              return { ...item, count: stats.detectionCount }
            case 'my-diary':
              return { ...item, count: stats.diaryCount }
            case 'my-reports':
              return { ...item, count: stats.reportCount }
            case 'favorites':
              return { ...item, count: stats.favoriteCount }
            default:
              return item
          }
        })
        
        this.setData({ 
          stats,
          menuItems: updatedMenuItems
        })
      } catch (mockError) {
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  // 模拟用户统计数据API
  mockUserStatsAPI() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          detectionCount: 15,
          diaryCount: 8,
          reportCount: 3,
          favoriteCount: 12
        })
      }, 300)
    })
  },

  // 编辑个人资料
  onEditProfile() {
    if (!this.data.userInfo.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    
    wx.navigateTo({
      url: '/pages/profile/profile'
    })
  },

  // 点击未登录文字进入登录页
  onLoginTap() {
    if (!this.data.userInfo.openid || this.data.userInfo.nickName === '未登录') {
      console.log('用户中心-未登录点击，跳转登录页');
      wx.navigateTo({
        url: '/pages/login/login'
      })
    }
  },

  // 菜单项点击
  onMenuItemTap(e) {
    const { item } = e.currentTarget.dataset
    
    // 检查是否需要登录
    if (!this.data.userInfo.openid && ['detection-history', 'my-diary', 'my-reports', 'favorites'].includes(item.id)) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    
    switch (item.id) {
      case 'detection-history':
        wx.navigateTo({
          url: '/pages/detection-history/detection-history'
        })
        break
      case 'my-diary':
        wx.navigateTo({
          url: '/pages/diary/diary'
        })
        break
      case 'my-reports':
        wx.navigateTo({
          url: '/pages/my-reports/my-reports'
        })
        break
      case 'favorites':
        wx.navigateTo({
          url: '/pages/favorites/favorites'
        })
        break
      case 'achievements':
        wx.navigateTo({
          url: '/pages/achievements/achievements'
        })
        break
      case 'settings':
        wx.showToast({
          title: '设置功能开发中',
          icon: 'none'
        })
        break
      case 'logout':
        this.onLogout()
        break
    }
  },

  // 服务项点击
  onServiceItemTap(e) {
    const { item } = e.currentTarget.dataset
    
    switch (item.id) {
      case 'feedback':
        wx.navigateTo({
          url: '/pages/feedback/feedback'
        })
        break
      case 'help':
        wx.navigateTo({
          url: '/pages/help/help'
        })
        break
      case 'about':
        wx.navigateTo({
          url: '/pages/about/about'
        })
        break
    }
  },

  // 登录
  async onLogin() {
    try {
      wx.showLoading({
        title: '登录中...'
      })

      if (app.globalData.cloudEnabled) {
        // 使用云开发API登录
        const loginResult = await cloudApi.login()
        const user = (loginResult && loginResult.data && loginResult.data.user) ? loginResult.data.user : {}
        const normalizedUser = {
          ...this.data.userInfo,
          ...user,
          nickName: user.nickName || user.nickname || '微信用户',
          avatarUrl: user.avatarUrl || user.avatar || '/images/default-avatar.png',
          isLogin: true
        }
        this.setData({ userInfo: normalizedUser })
        wx.setStorageSync('userInfo', normalizedUser)
        app.globalData.userInfo = normalizedUser
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
        
        // 重新加载用户统计数据
        this.loadUserStats()
      } else {
        // 云开发不可用时的模拟登录
        const mockUserInfo = {
          openid: 'mock_openid_' + Date.now(),
          nickname: '用户' + Math.floor(Math.random() * 1000),
          avatar: '/images/default-avatar.png',
          level: 1,
          // 
        }
        
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            ...mockUserInfo
          }
        })
        
        wx.setStorageSync('userInfo', mockUserInfo)
        app.globalData.userInfo = mockUserInfo
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
        
        this.loadUserStats()
      }
    } catch (error) {
      console.error('登录失败:', error)
      wx.showToast({
        title: '登录失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 分享
  onShareAppMessage() {
    return {
      title: 'SkinCare小程序 - 专业的AI护肤助手',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.jpg'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: 'SkinCare小程序 - 专业的AI护肤助手',
      imageUrl: '/images/share-cover.jpg'
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadUserInfo()
    this.loadUserStats()
    
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 使用全局退出登录方法
          getApp().logout();
        }
      }
    });
  }
})