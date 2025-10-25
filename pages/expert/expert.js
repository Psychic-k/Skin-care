// 体验官中心页面
const app = getApp()
const { request } = require('../../utils/request')
const { formatDate, showToast, showModal } = require('../../utils/utils')

Page({
  data: {
    userInfo: null,
    expertLevel: 1,
    currentPoints: 1250,
    nextLevelPoints: 2000,
    progressPercent: 62.5,
    
    // 统计数据
    stats: {
      completedTasks: 15,
      totalReports: 8,
      totalPoints: 3250,
      ranking: 12
    },
    
    // 任务列表
    tasks: [],
    currentTaskTab: 0,
    taskTabs: ['进行中', '已完成', '全部'],
    
    // 积分记录
    pointRecords: [],
    
    // 排行榜
    rankings: [],
    
    // 当前标签页
    currentTab: 0,
    tabs: [
      { name: '任务中心', icon: '📋' },
      { name: '积分记录', icon: '💎' },
      { name: '排行榜', icon: '🏆' },
      { name: '我的报告', icon: '📊' }
    ],
    
    // 我的报告
    reports: [],
    
    // 加载状态
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10
  },

  onLoad(options) {
    this.loadUserInfo()
    this.loadExpertData()
    this.loadTasks()
  },

  onShow() {
    // 刷新数据
    this.loadExpertData()
  },

  onPullDownRefresh() {
    this.refreshData()
  },

  onReachBottom() {
    this.loadMore()
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const userInfo = app.globalData.userInfo
      if (userInfo) {
        this.setData({ userInfo })
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },

  // 加载体验官数据
  async loadExpertData() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const res = await request('/api/expert/profile', 'GET')
      if (res.success) {
        const { level, points, nextLevelPoints, stats } = res.data
        const progressPercent = (points / nextLevelPoints) * 100
        
        this.setData({
          expertLevel: level,
          currentPoints: points,
          nextLevelPoints,
          progressPercent,
          stats
        })
      }
    } catch (error) {
      console.error('加载体验官数据失败:', error)
      showToast('加载失败，请重试')
    } finally {
      wx.hideLoading()
    }
  },

  // 加载任务列表
  async loadTasks() {
    try {
      const { currentTaskTab } = this.data
      let status = ''
      
      switch (currentTaskTab) {
        case 0: status = 'in_progress'; break
        case 1: status = 'completed'; break
        case 2: status = 'all'; break
      }
      
      const res = await request('/api/expert/tasks', 'GET', { status })
      if (res.success) {
        this.setData({ tasks: res.data })
      }
    } catch (error) {
      console.error('加载任务失败:', error)
    }
  },

  // 加载积分记录
  async loadPointRecords() {
    try {
      const { page, pageSize } = this.data
      const res = await request('/api/expert/points', 'GET', { page, pageSize })
      
      if (res.success) {
        const newRecords = res.data.records || []
        const pointRecords = page === 1 ? newRecords : [...this.data.pointRecords, ...newRecords]
        
        this.setData({
          pointRecords,
          hasMore: newRecords.length === pageSize
        })
      }
    } catch (error) {
      console.error('加载积分记录失败:', error)
    }
  },

  // 加载排行榜
  async loadRankings() {
    try {
      const res = await request('/api/expert/rankings', 'GET')
      if (res.success) {
        this.setData({ rankings: res.data })
      }
    } catch (error) {
      console.error('加载排行榜失败:', error)
    }
  },

  // 加载我的报告
  async loadReports() {
    try {
      const { page, pageSize } = this.data
      const res = await request('/api/expert/reports', 'GET', { page, pageSize })
      
      if (res.success) {
        const newReports = res.data.reports || []
        const reports = page === 1 ? newReports : [...this.data.reports, ...newReports]
        
        this.setData({
          reports,
          hasMore: newReports.length === pageSize
        })
      }
    } catch (error) {
      console.error('加载报告失败:', error)
    }
  },

  // 标签页切换
  onTabChange(e) {
    const { index } = e.currentTarget.dataset
    this.setData({ 
      currentTab: index,
      page: 1,
      hasMore: true
    })
    
    // 根据标签页加载对应数据
    switch (index) {
      case 0:
        this.loadTasks()
        break
      case 1:
        this.loadPointRecords()
        break
      case 2:
        this.loadRankings()
        break
      case 3:
        this.loadReports()
        break
    }
  },

  // 任务标签页切换
  onTaskTabChange(e) {
    const { index } = e.currentTarget.dataset
    this.setData({ currentTaskTab: index })
    this.loadTasks()
  },

  // 接受任务
  async onAcceptTask(e) {
    const { task } = e.currentTarget.dataset
    
    try {
      const confirm = await showModal('确认接受', `确定要接受任务"${task.title}"吗？`)
      if (!confirm) return
      
      wx.showLoading({ title: '处理中...' })
      
      const res = await request('/api/expert/tasks/accept', 'POST', { taskId: task.id })
      if (res.success) {
        showToast('任务接受成功')
        this.loadTasks()
        this.loadExpertData()
      } else {
        showToast(res.message || '接受失败')
      }
    } catch (error) {
      console.error('接受任务失败:', error)
      showToast('接受失败，请重试')
    } finally {
      wx.hideLoading()
    }
  },

  // 提交任务
  async onSubmitTask(e) {
    const { task } = e.currentTarget.dataset
    
    // 跳转到任务详情页面进行提交
    wx.navigateTo({
      url: `/pages/task-detail/task-detail?id=${task.id}&action=submit`
    })
  },

  // 查看任务详情
  onTaskDetail(e) {
    const { task } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/task-detail/task-detail?id=${task.id}`
    })
  },

  // 查看报告详情
  onReportDetail(e) {
    const { report } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/report-detail/report-detail?id=${report.id}`
    })
  },

  // 积分兑换
  onPointsExchange() {
    wx.navigateTo({
      url: '/pages/points-exchange/points-exchange'
    })
  },

  // 查看积分规则
  onPointsRule() {
    wx.navigateTo({
      url: '/pages/points-rule/points-rule'
    })
  },

  // 分享成就
  onShareAchievement() {
    const { expertLevel, currentPoints, stats } = this.data
    
    return {
      title: `我是谷雨${expertLevel}级体验官，已获得${currentPoints}积分！`,
      path: '/pages/expert/expert',
      imageUrl: '/images/share-expert.jpg'
    }
  },

  // 刷新数据
  async refreshData() {
    try {
      this.setData({ page: 1, hasMore: true })
      
      await Promise.all([
        this.loadExpertData(),
        this.loadCurrentTabData()
      ])
      
      showToast('刷新成功')
    } catch (error) {
      console.error('刷新失败:', error)
      showToast('刷新失败')
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  // 加载更多
  loadMore() {
    const { currentTab, loading, hasMore } = this.data
    
    if (loading || !hasMore) return
    
    this.setData({ 
      loading: true,
      page: this.data.page + 1
    })
    
    // 只有积分记录和报告支持分页
    if (currentTab === 1) {
      this.loadPointRecords()
    } else if (currentTab === 3) {
      this.loadReports()
    }
    
    this.setData({ loading: false })
  },

  // 加载当前标签页数据
  loadCurrentTabData() {
    const { currentTab } = this.data
    
    switch (currentTab) {
      case 0:
        return this.loadTasks()
      case 1:
        return this.loadPointRecords()
      case 2:
        return this.loadRankings()
      case 3:
        return this.loadReports()
    }
  },

  // 获取等级名称
  getLevelName(level) {
    const levelNames = {
      1: '初级体验官',
      2: '中级体验官',
      3: '高级体验官',
      4: '资深体验官',
      5: '专家体验官'
    }
    return levelNames[level] || '体验官'
  },

  // 获取任务状态文本
  getTaskStatusText(status) {
    const statusMap = {
      'pending': '待接受',
      'in_progress': '进行中',
      'submitted': '已提交',
      'completed': '已完成',
      'expired': '已过期'
    }
    return statusMap[status] || status
  },

  // 获取任务状态样式
  getTaskStatusClass(status) {
    const classMap = {
      'pending': 'status-pending',
      'in_progress': 'status-progress',
      'submitted': 'status-submitted',
      'completed': 'status-completed',
      'expired': 'status-expired'
    }
    return classMap[status] || ''
  },

  // 格式化积分变化
  formatPointChange(change, type) {
    const prefix = change > 0 ? '+' : ''
    return `${prefix}${change}`
  },

  // 获取积分变化样式
  getPointChangeClass(change) {
    return change > 0 ? 'point-increase' : 'point-decrease'
  }
})