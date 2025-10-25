// pages/profile/profile.js
const app = getApp()
const { request } = require('../../utils/request')
const { showToast, showLoading, hideLoading, formatDate } = require('../../utils/utils')

Page({
  data: {
    // 用户档案数据
    profileData: null,
    userInfo: null,
    
    // 当前标签页
    currentTab: 'overview', // overview, history, analysis, settings
    
    // 皮肤档案
    skinProfile: {
      skinType: '',
      concerns: [],
      goals: [],
      allergies: [],
      currentRoutine: []
    },
    
    // 检测历史
    detectionHistory: [],
    historyPage: 1,
    hasMoreHistory: true,
    
    // 趋势数据
    trendData: null,
    
    // 编辑状态
    isEditing: false,
    editData: {},
    
    // 皮肤类型选项
    skinTypes: [
      { id: 'dry', name: '干性', desc: '皮肤缺水，容易紧绷' },
      { id: 'oily', name: '油性', desc: '出油较多，毛孔粗大' },
      { id: 'combination', name: '混合性', desc: 'T区油腻，两颊干燥' },
      { id: 'sensitive', name: '敏感性', desc: '容易过敏，泛红刺痛' },
      { id: 'normal', name: '中性', desc: '水油平衡，状态良好' }
    ],
    
    // 护肤关注点
    skinConcerns: [
      { id: 'acne', name: '痘痘', icon: '🔴' },
      { id: 'blackheads', name: '黑头', icon: '⚫' },
      { id: 'pores', name: '毛孔粗大', icon: '🕳️' },
      { id: 'wrinkles', name: '细纹', icon: '📏' },
      { id: 'dark_spots', name: '色斑', icon: '🟤' },
      { id: 'dullness', name: '暗沉', icon: '🌫️' },
      { id: 'dryness', name: '干燥', icon: '🏜️' },
      { id: 'oiliness', name: '出油', icon: '💧' }
    ],
    
    // 护肤目标
    skinGoals: [
      { id: 'hydration', name: '补水保湿', icon: '💦' },
      { id: 'anti_aging', name: '抗衰老', icon: '⏰' },
      { id: 'brightening', name: '美白提亮', icon: '✨' },
      { id: 'acne_control', name: '控痘祛痘', icon: '🎯' },
      { id: 'pore_refining', name: '收缩毛孔', icon: '🔍' },
      { id: 'oil_control', name: '控油', icon: '🧴' }
    ]
  },

  // 辅助方法：获取皮肤类型名称
  getSkinTypeName(skinTypeId) {
    if (!skinTypeId) return '';
    const skinType = this.data.skinTypes.find(item => item.id === skinTypeId);
    return skinType ? skinType.name : '';
  },

  // 辅助方法：获取护肤关注点信息
  getSkinConcernInfo(concernId, property) {
    if (!concernId) return '';
    const concern = this.data.skinConcerns.find(c => c.id === concernId);
    return concern ? concern[property] : '';
  },

  // 辅助方法：获取护肤目标信息
  getSkinGoalInfo(goalId, property) {
    if (!goalId) return '';
    const goal = this.data.skinGoals.find(g => g.id === goalId);
    return goal ? goal[property] : '';
  },

  onLoad(options) {
    // 检查传入的标签页参数
    if (options.tab) {
      this.setData({
        currentTab: options.tab
      })
    }
    
    this.getUserInfo()
    this.loadProfileData()
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadProfileData()
  },

  onPullDownRefresh() {
    this.loadProfileData()
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    if (this.data.currentTab === 'history' && this.data.hasMoreHistory) {
      this.loadMoreHistory()
    }
  },

  // 获取用户信息
  getUserInfo() {
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({ userInfo })
    } else {
      wx.navigateTo({
        url: '/pages/login/login'
      })
    }
  },

  // 加载档案数据
  async loadProfileData() {
    try {
      showLoading('加载中...')
      
      const userInfo = app.globalData.userInfo
      if (!userInfo) return

      const res = await request({
        url: `/api/profile/${userInfo.id}`,
        method: 'GET'
      })

      if (res.success) {
        this.setData({
          profileData: res.data.profile,
          skinProfile: res.data.skinProfile || this.data.skinProfile,
          detectionHistory: res.data.recentDetections || [],
          trendData: res.data.trendData
        })
      }
    } catch (error) {
      showToast('加载失败')
      console.error('加载档案数据失败:', error)
    } finally {
      hideLoading()
    }
  },

  // 加载更多历史记录
  async loadMoreHistory() {
    try {
      const userInfo = app.globalData.userInfo
      if (!userInfo) return

      const res = await request({
        url: `/api/detection/history/${userInfo.id}`,
        method: 'GET',
        data: {
          page: this.data.historyPage + 1,
          limit: 10
        }
      })

      if (res.success) {
        const newHistory = res.data.detections || []
        this.setData({
          detectionHistory: [...this.data.detectionHistory, ...newHistory],
          historyPage: this.data.historyPage + 1,
          hasMoreHistory: newHistory.length >= 10
        })
      }
    } catch (error) {
      console.error('加载更多历史记录失败:', error)
    }
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      currentTab: tab
    })
    
    // 如果切换到历史页面，加载历史数据
    if (tab === 'history' && this.data.detectionHistory.length === 0) {
      this.loadDetectionHistory()
    }
  },

  // 加载检测历史
  async loadDetectionHistory() {
    try {
      const userInfo = app.globalData.userInfo
      if (!userInfo) return

      const res = await request({
        url: `/api/detection/history/${userInfo.id}`,
        method: 'GET',
        data: {
          page: 1,
          limit: 10
        }
      })

      if (res.success) {
        this.setData({
          detectionHistory: res.data.detections || [],
          historyPage: 1,
          hasMoreHistory: (res.data.detections || []).length >= 10
        })
      }
    } catch (error) {
      console.error('加载检测历史失败:', error)
    }
  },

  // 开始编辑档案
  startEdit() {
    this.setData({
      isEditing: true,
      editData: JSON.parse(JSON.stringify(this.data.skinProfile))
    })
  },

  // 取消编辑
  cancelEdit() {
    this.setData({
      isEditing: false,
      editData: {}
    })
  },

  // 保存编辑
  async saveEdit() {
    try {
      showLoading('保存中...')
      
      const userInfo = app.globalData.userInfo
      if (!userInfo) return

      const res = await request({
        url: '/api/profile/update',
        method: 'POST',
        data: {
          userId: userInfo.id,
          skinProfile: this.data.editData
        }
      })

      if (res.success) {
        this.setData({
          skinProfile: this.data.editData,
          isEditing: false,
          editData: {}
        })
        showToast('保存成功')
      } else {
        throw new Error(res.message || '保存失败')
      }
    } catch (error) {
      showToast(error.message || '保存失败')
      console.error('保存档案失败:', error)
    } finally {
      hideLoading()
    }
  },

  // 选择皮肤类型
  selectSkinType(e) {
    const skinType = e.currentTarget.dataset.type
    this.setData({
      'editData.skinType': skinType
    })
  },

  // 切换关注点
  toggleConcern(e) {
    const concernId = e.currentTarget.dataset.id
    const concerns = [...this.data.editData.concerns]
    const index = concerns.indexOf(concernId)
    
    if (index > -1) {
      concerns.splice(index, 1)
    } else {
      concerns.push(concernId)
    }
    
    this.setData({
      'editData.concerns': concerns
    })
  },

  // 切换护肤目标
  toggleGoal(e) {
    const goalId = e.currentTarget.dataset.id
    const goals = [...this.data.editData.goals]
    const index = goals.indexOf(goalId)
    
    if (index > -1) {
      goals.splice(index, 1)
    } else {
      goals.push(goalId)
    }
    
    this.setData({
      'editData.goals': goals
    })
  },

  // 查看检测详情
  viewDetectionDetail(e) {
    const detectionId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/report/report?detectionId=${detectionId}`
    })
  },

  // 开始新检测
  startNewDetection() {
    wx.navigateTo({
      url: '/pages/detection/detection'
    })
  },

  // 查看趋势分析
  viewTrendAnalysis() {
    wx.navigateTo({
      url: `/pages/trends/trends?userId=${this.data.userInfo.id}`
    })
  },

  // 导出数据
  async exportData() {
    try {
      showLoading('导出中...')
      
      const userInfo = app.globalData.userInfo
      if (!userInfo) return

      const res = await request({
        url: `/api/profile/export/${userInfo.id}`,
        method: 'GET'
      })

      if (res.success) {
        // 这里可以实现数据导出功能
        showToast('导出成功')
      }
    } catch (error) {
      showToast('导出失败')
      console.error('导出数据失败:', error)
    } finally {
      hideLoading()
    }
  },

  // 删除检测记录
  async deleteDetection(e) {
    const detectionId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条检测记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            showLoading('删除中...')
            
            const result = await request({
              url: `/api/detection/${detectionId}`,
              method: 'DELETE'
            })

            if (result.success) {
              // 从列表中移除
              const newHistory = this.data.detectionHistory.filter(
                item => item.id !== detectionId
              )
              this.setData({
                detectionHistory: newHistory
              })
              showToast('删除成功')
            }
          } catch (error) {
            showToast('删除失败')
            console.error('删除检测记录失败:', error)
          } finally {
            hideLoading()
          }
        }
      }
    })
  },

  // 分享档案
  shareProfile() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '我的护肤档案 - Skin-care护肤助手',
      path: '/pages/detection/detection',
      imageUrl: '/images/share-profile.jpg'
    }
  }
})