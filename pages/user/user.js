// pages/user/user.js
const app = getApp()
const cloudApi = require('../../utils/cloudApi')

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
    this.loadUserInfo()
    this.loadUserStats()
  },

  onShow() {
    this.loadUserInfo()
    this.loadUserStats()
  },

  // 加载用户信息 - 使用云开发API
  async loadUserInfo() {
    try {
      // 先从本地存储获取
      const localUserInfo = wx.getStorageSync('userInfo') || app.globalData.userInfo
      if (localUserInfo) {
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            ...localUserInfo
          }
        })
      }

      // 如果云开发可用，从云端获取最新用户信息
      if (app.globalData.cloudEnabled) {
        const cloudUserInfo = await cloudApi.getUserInfo()
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            ...cloudUserInfo
          }
        })
        wx.setStorageSync('userInfo', cloudUserInfo)
        
        // 如果是新用户，显示欢迎提示
        if (cloudUserInfo.nickname === '新用户') {
          wx.showToast({
            title: '欢迎使用护肤小程序！',
            icon: 'success',
            duration: 2000
          })
        }
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
// 如果是用户不存在的错误，提示用户登录
      if (error.message && error.message.includes('用户不存在')) {
        wx.showModal({
          title: '提示',
          content: '检测到您是新用户，请先完成登录授权',
          showCancel: false,
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/login/login'
              })
            }
          }
        })
        return
      }
      
      // 使用本地存储的用户信息作为备用
      const localUserInfo = wx.getStorageSync('userInfo') || app.globalData.userInfo
      if (localUserInfo) {
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            ...localUserInfo
          }
        })
      } else {
        // 如果没有任何用户信息，显示默认状态
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
      return
    }
    
    wx.navigateTo({
      url: '/pages/profile/profile'
    })
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
        wx.navigateTo({
          url: '/pages/settings/settings'
        })
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
        
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            ...loginResult.userInfo
          }
        })
        
        wx.setStorageSync('userInfo', loginResult.userInfo)
        app.globalData.userInfo = loginResult.userInfo
        
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
  }
})