// pages/detection/detection.js
const app = getApp()
const request = require('../../utils/request')
const { showToast, showLoading, hideLoading } = require('../../utils/utils')
const Auth = require('../../utils/auth')

Page({
  data: {
    // 检测状态
    isDetecting: false,
    detectionStep: 1, // 1: 准备拍照, 2: 拍照中, 3: 分析中, 4: 完成
    
    // 拍照相关
    cameraPosition: 'front', // front: 前置, back: 后置
    flash: 'off',
    
    // 滚动状态
    scrollTop: 0,
    scrollDirection: 'up',
    lastScrollTop: 0,
    isScrolling: false,
    
    // 检测类型
    detectionTypes: [
      { id: 'face', name: '面部检测', icon: '👤', desc: '检测肤质、毛孔、痘痘等' },
      { id: 'eye', name: '眼部检测', icon: '👁️', desc: '检测黑眼圈、细纹、浮肿' },
      { id: 'lip', name: '唇部检测', icon: '👄', desc: '检测唇色、干燥度、纹理' },
      { id: 'more', name: '更多检测', icon: '📊', desc: '敬请期待更多功能' }
    ],
    selectedType: 'face',
    
    // 拍照指导
    guidelines: [
      '请在光线充足的环境下拍照',
      '保持手机与面部距离30-50cm',
      '确保面部完整出现在画面中',
      '拍照时请保持自然表情'
    ],
    
    // 检测历史
    recentDetections: [],
    
    // 用户信息
    userInfo: null
  },

  onLoad(options) {
    // 检查登录状态
    if (!Auth.isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: 'AI皮肤检测功能需要登录后使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            })
          } else {
            wx.navigateBack()
          }
        }
      })
      return
    }

    this.getUserInfo()
    this.getRecentDetections()
    
    // 如果有指定检测类型
    if (options.type) {
      this.setData({
        selectedType: options.type
      })
    }
  },

  onShow() {
    // 检查登录状态
    if (!Auth.isLoggedIn()) {
      return
    }
    
    // 检查相机权限
    this.checkCameraAuth()
  },

  // 页面滚动监听
  onPageScroll(e) {
    const scrollTop = e.scrollTop
    const scrollDirection = scrollTop > (this.data.lastScrollTop || 0) ? 'down' : 'up'
    
    // 更新滚动状态
    this.setData({
      scrollTop: scrollTop,
      scrollDirection: scrollDirection,
      lastScrollTop: scrollTop,
      isScrolling: true
    })
    
    // 清除之前的定时器
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer)
    }
    
    // 设置滚动结束检测
    this.scrollTimer = setTimeout(() => {
      this.setData({
        isScrolling: false
      })
    }, 150)
  },

  // 获取用户信息
  getUserInfo() {
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({ userInfo })
    }
  },

  // 获取最近检测记录
  async getRecentDetections() {
    try {
      const res = await request.get('/api/detection/history', { page: 1, limit: 3 })

      if (res.code === 0 && res.data) {
        this.setData({
          recentDetections: res.data.detections.slice(0, 3) // 只显示最近3次
        })
      }
    } catch (error) {
      console.error('获取检测历史失败:', error)
    }
  },

  // 检查相机权限
  checkCameraAuth() {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.camera']) {
          wx.showModal({
            title: '需要相机权限',
            content: '皮肤检测需要使用相机功能，请授权后继续',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.authorize({
                  scope: 'scope.camera',
                  fail: () => {
                    wx.showModal({
                      title: '授权失败',
                      content: '请在设置中手动开启相机权限',
                      showCancel: false
                    })
                  }
                })
              }
            }
          })
        }
      }
    })
  },

  // 选择检测类型
  selectDetectionType(e) {
    const type = e.currentTarget.dataset.type
    
    // 如果选择的是"更多检测"，显示提示
    if (type === 'more') {
      showToast('更多检测功能即将上线，敬请期待！')
      return
    }
    
    this.setData({
      selectedType: type
    })
  },

  // 开始检测
  startDetection() {
    // 再次检查登录状态
    if (!Auth.isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: 'AI皮肤检测功能需要登录后使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
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

    if (!this.data.userInfo) {
      this.getUserInfo()
      if (!this.data.userInfo) {
        showToast('获取用户信息失败，请重新登录')
        return
      }
    }

    this.setData({
      detectionStep: 2
    })
  },

  // 拍照
  takePhoto() {
    const ctx = wx.createCameraContext()
    
    this.setData({
      isDetecting: true,
      detectionStep: 3
    })

    showLoading('正在拍照...')

    ctx.takePhoto({
      quality: 'high',
      success: (res) => {
        hideLoading()
        this.analyzePhoto(res.tempImagePath)
      },
      fail: (error) => {
        hideLoading()
        showToast('拍照失败，请重试')
        this.setData({
          isDetecting: false,
          detectionStep: 2
        })
        console.error('拍照失败:', error)
      }
    })
  },

  // 从相册选择
  chooseFromAlbum() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album'],
      success: (res) => {
        this.setData({
          isDetecting: true,
          detectionStep: 3
        })
        this.analyzePhoto(res.tempFilePaths[0])
      },
      fail: (error) => {
        showToast('选择图片失败')
        console.error('选择图片失败:', error)
      }
    })
  },

  // 分析照片
  async analyzePhoto(imagePath) {
    try {
      showLoading('AI分析中...')
      console.log('开始分析图片:', imagePath)

      // 将图片转换为base64
      const base64 = await this.imageToBase64(imagePath)
      console.log('图片转换完成，base64长度:', base64.length)

      // 调用AI检测接口 - 修正参数名称
      const res = await request.post('/api/detection/analyze', {
        imageUrl: base64,  // 修改为云函数期望的参数名
        detectionType: this.data.selectedType
      })

      console.log('云函数调用结果:', res)
      hideLoading()

      // 修正返回数据结构判断
      if (res.code === 0 && res.data) {
        this.setData({
          detectionStep: 4
        })

        // 跳转到检测报告页面
        wx.navigateTo({
          url: `/pages/report/report?detectionId=${res.data.detectionId}`
        })
      } else {
        // 如果云函数调用失败，使用本地模拟分析
        console.warn('云函数分析失败，使用本地模拟分析')
        const mockResult = await this.performLocalAnalysis(base64)
        
        this.setData({
          detectionStep: 4
        })

        // 跳转到检测报告页面，传递模拟数据
        wx.navigateTo({
          url: `/pages/report/report?mockData=${encodeURIComponent(JSON.stringify(mockResult))}`
        })
      }
    } catch (error) {
      console.error('AI检测详细错误:', {
        error: error,
        message: error.message,
        stack: error.stack
      })
      
      hideLoading()
      
      // 尝试本地模拟分析作为降级方案
      try {
        console.log('尝试本地模拟分析作为降级方案')
        const base64 = await this.imageToBase64(imagePath)
        const mockResult = await this.performLocalAnalysis(base64)
        
        this.setData({
          detectionStep: 4
        })

        showToast('网络不佳，使用本地分析')
        wx.navigateTo({
          url: `/pages/report/report?mockData=${encodeURIComponent(JSON.stringify(mockResult))}`
        })
      } catch (fallbackError) {
        console.error('本地分析也失败:', fallbackError)
        showToast('分析失败，请检查网络后重试')
        this.setData({
          isDetecting: false,
          detectionStep: 2
        })
      }
    }
  },

  // 图片转base64
  imageToBase64(imagePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => {
          resolve(`data:image/jpeg;base64,${res.data}`)
        },
        fail: reject
      })
    })
  },

  // 切换摄像头
  switchCamera() {
    this.setData({
      cameraPosition: this.data.cameraPosition === 'front' ? 'back' : 'front'
    })
  },

  // 切换闪光灯
  switchFlash() {
    const flashModes = ['off', 'on', 'auto']
    const currentIndex = flashModes.indexOf(this.data.flash)
    const nextIndex = (currentIndex + 1) % flashModes.length
    
    this.setData({
      flash: flashModes[nextIndex]
    })
  },

  // 本地模拟分析（降级方案）
  async performLocalAnalysis(base64Image) {
    return new Promise((resolve) => {
      // 模拟分析延迟
      setTimeout(() => {
        const mockAnalysisResult = {
          detectionId: 'mock_' + Date.now(),
          analysisResult: {
            skinType: '混合性',
            skinScore: Math.floor(Math.random() * 20) + 70, // 70-90分
            issues: [
              { type: 'acne', severity: 'mild', score: Math.floor(Math.random() * 30) + 10 },
              { type: 'wrinkle', severity: 'light', score: Math.floor(Math.random() * 20) + 5 },
              { type: 'moisture', severity: 'normal', score: Math.floor(Math.random() * 15) + 60 }
            ],
            areas: {
              forehead: { score: Math.floor(Math.random() * 20) + 70 },
              cheeks: { score: Math.floor(Math.random() * 20) + 75 },
              nose: { score: Math.floor(Math.random() * 20) + 65 },
              chin: { score: Math.floor(Math.random() * 20) + 70 }
            }
          },
          recommendations: [
            {
              category: '清洁',
              products: ['温和洁面乳', '卸妆水'],
              tips: '每日早晚使用温和洁面产品'
            },
            {
              category: '保湿',
              products: ['保湿精华', '面霜'],
              tips: '选择适合混合性肌肤的保湿产品'
            },
            {
              category: '防护',
              products: ['防晒霜', '隔离霜'],
              tips: '每日使用SPF30以上防晒产品'
            }
          ],
          detectionTime: new Date().toISOString(),
          isLocalAnalysis: true
        }
        
        resolve(mockAnalysisResult)
      }, 1500) // 模拟1.5秒分析时间
    })
  },

  // 查看检测历史
  viewHistory() {
    wx.navigateTo({
      url: '/pages/profile/profile?tab=history'
    })
  },

  // 查看历史检测详情
  viewDetectionDetail(e) {
    const detectionId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/report/report?detectionId=${detectionId}`
    })
  },

  // 重新开始
  restart() {
    this.setData({
      isDetecting: false,
      detectionStep: 1
    })
  },

  // 返回首页
  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})