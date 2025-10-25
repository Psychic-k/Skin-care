// 个人中心页面
const app = getApp()

Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: '',
      level: 1,
      points: 0,
      vipLevel: 0,
      vipExpireTime: ''
    },
    stats: {
      detectionCount: 0,
      diaryCount: 0,
      reportCount: 0,
      favoriteCount: 0
    },
    menuItems: [
      {
        id: 'detection-history',
        icon: '🔍',
        title: '检测历史',
        subtitle: '查看历史检测记录',
        arrow: true
      },
      {
        id: 'my-diary',
        icon: '📖',
        title: '我的护肤日记',
        subtitle: '记录护肤心得',
        arrow: true
      },
      {
        id: 'my-reports',
        icon: '📊',
        title: '我的报告',
        subtitle: '查看体验报告',
        arrow: true
      },
      {
        id: 'favorites',
        icon: '❤️',
        title: '我的收藏',
        subtitle: '收藏的产品和文章',
        arrow: true
      },
      {
        id: 'achievements',
        icon: '🏆',
        title: '成就中心',
        subtitle: '查看获得的成就',
        arrow: true
      },
      {
        id: 'settings',
        icon: '⚙️',
        title: '设置',
        subtitle: '个人设置和隐私',
        arrow: true
      }
    ],
    serviceItems: [
      {
        id: 'feedback',
        icon: '💬',
        title: '意见反馈',
        subtitle: '帮助我们改进产品'
      },
      {
        id: 'help',
        icon: '❓',
        title: '帮助中心',
        subtitle: '常见问题解答'
      },
      {
        id: 'about',
        icon: 'ℹ️',
        title: '关于我们',
        subtitle: '了解谷雨品牌'
      }
    ],
    showVipModal: false,
    vipPlans: [
      {
        id: 'monthly',
        name: '月度会员',
        price: 19.9,
        originalPrice: 29.9,
        duration: '1个月',
        benefits: ['无限次AI检测', '专属护肤方案', '优先客服支持', '会员专享内容']
      },
      {
        id: 'yearly',
        name: '年度会员',
        price: 199,
        originalPrice: 299,
        duration: '12个月',
        benefits: ['无限次AI检测', '专属护肤方案', '优先客服支持', '会员专享内容', '生日专属礼品', '线下活动优先']
      }
    ]
  },

  onLoad() {
    this.loadUserInfo()
    this.loadUserStats()
  },

  onShow() {
    this.loadUserInfo()
    this.loadUserStats()
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    this.setData({
      userInfo: {
        ...this.data.userInfo,
        ...userInfo
      }
    })
  },

  // 加载用户统计数据
  loadUserStats() {
    // 模拟数据，实际应从服务器获取
    const stats = {
      detectionCount: 15,
      diaryCount: 8,
      reportCount: 3,
      favoriteCount: 12
    }
    
    this.setData({ stats })
  },

  // 编辑个人资料
  onEditProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    })
  },

  // 升级VIP
  onUpgradeVip() {
    this.setData({
      showVipModal: true
    })
  },

  // 关闭VIP弹窗
  onCloseVipModal() {
    this.setData({
      showVipModal: false
    })
  },

  // 选择VIP套餐
  onSelectVipPlan(e) {
    const { plan } = e.currentTarget.dataset
    
    wx.showModal({
      title: '确认购买',
      content: `确认购买${plan.name}（¥${plan.price}）？`,
      success: (res) => {
        if (res.confirm) {
          this.purchaseVip(plan)
        }
      }
    })
  },

  // 购买VIP
  purchaseVip(plan) {
    wx.showLoading({
      title: '处理中...'
    })

    // 模拟支付流程
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '购买成功',
        icon: 'success'
      })
      
      // 更新用户VIP状态
      const userInfo = { ...this.data.userInfo }
      userInfo.vipLevel = 1
      userInfo.vipExpireTime = this.getVipExpireTime(plan.duration)
      
      this.setData({ userInfo })
      wx.setStorageSync('userInfo', userInfo)
      
      this.onCloseVipModal()
    }, 2000)
  },

  // 计算VIP到期时间
  getVipExpireTime(duration) {
    const now = new Date()
    if (duration === '1个月') {
      now.setMonth(now.getMonth() + 1)
    } else if (duration === '12个月') {
      now.setFullYear(now.getFullYear() + 1)
    }
    return now.toISOString().split('T')[0]
  },

  // 菜单项点击
  onMenuItemTap(e) {
    const { item } = e.currentTarget.dataset
    
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

  // 分享
  onShareAppMessage() {
    return {
      title: '谷雨护肤小程序 - 专业的AI护肤助手',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.jpg'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '谷雨护肤小程序 - 专业的AI护肤助手',
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