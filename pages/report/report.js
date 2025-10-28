// pages/report/report.js
const app = getApp()
const request = require('../../utils/request')
const { showToast, showLoading, hideLoading, formatDate } = require('../../utils/utils')

Page({
  data: {
    // 检测报告数据
    reportData: null,
    detectionId: '',
    
    // 报告展示状态
    isLoading: true,
    currentTab: 'overview', // overview, details, recommendations, history
    
    // 皮肤评分动画
    scoreAnimation: 0,
    
    // 对比数据
    comparisonData: null,
    showComparison: false,
    
    // 分享状态
    isSharing: false
  },

  onLoad(options) {
    console.log('报告页面接收参数:', options)
    
    if (options.detectionId) {
      this.setData({
        detectionId: options.detectionId
      })
      this.loadReportData()
    } else if (options.mockData) {
      // 处理本地模拟数据
      try {
        const mockResult = JSON.parse(decodeURIComponent(options.mockData))
        console.log('使用本地模拟数据:', mockResult)
        this.setData({
          reportData: mockResult,
          isLoading: false
        })
        this.animateScore()
      } catch (error) {
        console.error('解析模拟数据失败:', error)
        showToast('数据解析失败')
        wx.navigateBack()
      }
    } else {
      showToast('检测数据不存在')
      wx.navigateBack()
    }
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.detectionId) {
      this.loadReportData()
    }
  },

  // 加载报告数据
  async loadReportData() {
    try {
      showLoading('加载报告中...')
      
      const res = await request.get(`/api/detection/report/${this.data.detectionId}`)

      console.log('报告数据加载结果:', res)

      if (res.code === 0 && res.data) {
        this.setData({
          reportData: res.data,
          isLoading: false
        })
        
        // 启动评分动画
        this.animateScore()
        
        // 加载对比数据
        this.loadComparisonData()
      } else {
        throw new Error(res.message || '加载报告失败')
      }
    } catch (error) {
      showToast(error.message || '加载报告失败')
      console.error('加载报告失败:', error)
    } finally {
      hideLoading()
    }
  },

  // 加载对比数据
  async loadComparisonData() {
    try {
      const userInfo = app.globalData.userInfo
      if (!userInfo) return

      const res = await request({
        url: `/api/detection/comparison/${userInfo.id}`,
        method: 'GET',
        data: {
          currentDetectionId: this.data.detectionId,
          limit: 5
        }
      })

      if (res.success && res.data.length > 0) {
        this.setData({
          comparisonData: res.data,
          showComparison: true
        })
      }
    } catch (error) {
      console.error('加载对比数据失败:', error)
    }
  },

  // 评分动画
  animateScore() {
    if (!this.data.reportData) return
    
    const targetScore = this.data.reportData.overallScore || 0
    let currentScore = 0
    const increment = targetScore / 30 // 30帧动画
    
    const animate = () => {
      currentScore += increment
      if (currentScore >= targetScore) {
        currentScore = targetScore
      }
      
      this.setData({
        scoreAnimation: Math.round(currentScore)
      })
      
      if (currentScore < targetScore) {
        requestAnimationFrame(animate)
      }
    }
    
    animate()
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      currentTab: tab
    })
  },

  // 查看详细分析
  viewDetailAnalysis(e) {
    const category = e.currentTarget.dataset.category
    wx.navigateTo({
      url: `/pages/analysis/analysis?detectionId=${this.data.detectionId}&category=${category}`
    })
  },

  // 查看产品推荐
  viewProductRecommendation(e) {
    const productId = e.currentTarget.dataset.productId
    wx.navigateTo({
      url: `/pages/products/detail?id=${productId}&from=report`
    })
  },

  // 保存到护肤档案
  async saveToProfile() {
    try {
      showLoading('保存中...')
      
      const userInfo = app.globalData.userInfo
      if (!userInfo) {
        showToast('请先登录')
        return
      }

      const res = await request({
        url: '/api/profile/save-detection',
        method: 'POST',
        data: {
          userId: userInfo.id,
          detectionId: this.data.detectionId,
          reportData: this.data.reportData
        }
      })

      if (res.success) {
        showToast('已保存到护肤档案')
      } else {
        throw new Error(res.message || '保存失败')
      }
    } catch (error) {
      showToast(error.message || '保存失败')
      console.error('保存到档案失败:', error)
    } finally {
      hideLoading()
    }
  },

  // 分享报告
  async shareReport() {
    try {
      this.setData({ isSharing: true })
      
      // 生成分享图片
      const shareImage = await this.generateShareImage()
      
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      })
      
      // 保存到相册
      wx.saveImageToPhotosAlbum({
        filePath: shareImage,
        success: () => {
          showToast('已保存到相册')
        },
        fail: () => {
          showToast('保存失败')
        }
      })
    } catch (error) {
      showToast('分享失败')
      console.error('分享失败:', error)
    } finally {
      this.setData({ isSharing: false })
    }
  },

  // 生成分享图片
  generateShareImage() {
    return new Promise((resolve, reject) => {
      const ctx = wx.createCanvasContext('shareCanvas')
      
      // 绘制背景
      ctx.setFillStyle('#f0f9f0')
      ctx.fillRect(0, 0, 750, 1334)
      
      // 绘制标题
      ctx.setFillStyle('#2d5016')
      ctx.setFontSize(48)
      ctx.setTextAlign('center')
      ctx.fillText('我的皮肤检测报告', 375, 100)
      
      // 绘制评分
      ctx.setFillStyle('#4CAF50')
      ctx.setFontSize(72)
      ctx.fillText(`${this.data.reportData.overallScore}分`, 375, 200)
      
      // 绘制日期
      ctx.setFillStyle('#666')
      ctx.setFontSize(28)
      ctx.fillText(formatDate(new Date()), 375, 250)
      
      ctx.draw(false, () => {
        wx.canvasToTempFilePath({
          canvasId: 'shareCanvas',
          success: (res) => {
            resolve(res.tempFilePath)
          },
          fail: reject
        })
      })
    })
  },

  // 重新检测
  retakeDetection() {
    wx.redirectTo({
      url: '/pages/detection/detection'
    })
  },

  // 查看历史趋势
  viewTrends() {
    wx.navigateTo({
      url: `/pages/trends/trends?userId=${app.globalData.userInfo.id}`
    })
  },

  // 开始护肤计划
  startSkincarePlan() {
    wx.navigateTo({
      url: `/pages/plan/plan?detectionId=${this.data.detectionId}`
    })
  },

// 返回首页
goHome() {
  wx.switchTab({
    url: '/pages/index/index'
  })
},

// 分享给朋友
onShareAppMessage() {
  return {
    title: `我的皮肤检测得分${this.data.reportData.overallScore}分，快来测测你的吧！`,
    path: `/pages/detection/detection`,
    imageUrl: '/images/share-detection.jpg'
  }
},

// 分享到朋友圈
onShareTimeline() {
  return {
    title: `皮肤检测得分${this.data.reportData.overallScore}分 - Skin-care护肤助手`,
    imageUrl: '/images/share-detection.jpg'
  }
}
})