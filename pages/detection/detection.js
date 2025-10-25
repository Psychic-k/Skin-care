// pages/detection/detection.js
const app = getApp()
const { request } = require('../../utils/request')
const { showToast, showLoading, hideLoading } = require('../../utils/utils')

Page({
  data: {
    // 检测状态
    isDetecting: false,
    detectionStep: 1, // 1: 准备拍照, 2: 拍照中, 3: 分析中, 4: 完成
    
    // 拍照相关
    cameraPosition: 'front', // front: 前置, back: 后置
    flash: 'off',
    
    // 检测类型
    detectionTypes: [
      { id: 'face', name: '面部检测', icon: '👤', desc: '检测肤质、毛孔、痘痘等' },
      { id: 'eye', name: '眼部检测', icon: '👁️', desc: '检测黑眼圈、细纹、浮肿' },
      { id: 'lip', name: '唇部检测', icon: '👄', desc: '检测唇色、干燥度、纹理' }
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
    // 检查相机权限
    this.checkCameraAuth()
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
      const userInfo = app.globalData.userInfo
      if (!userInfo) return

      const res = await request({
        url: `/api/detection/history/${userInfo.id}`,
        method: 'GET'
      })

      if (res.success) {
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
    this.setData({
      selectedType: type
    })
  },

  // 开始检测
  startDetection() {
    if (!this.data.userInfo) {
      showToast('请先登录')
      wx.navigateTo({
        url: '/pages/login/login'
      })
      return
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

      // 将图片转换为base64
      const base64 = await this.imageToBase64(imagePath)

      // 调用AI检测接口
      const res = await request({
        url: '/api/detection/analyze',
        method: 'POST',
        data: {
          image: base64,
          userId: this.data.userInfo.id,
          detectionType: this.data.selectedType
        }
      })

      hideLoading()

      if (res.success) {
        this.setData({
          detectionStep: 4
        })

        // 跳转到检测报告页面
        wx.navigateTo({
          url: `/pages/report/report?detectionId=${res.data.detectionId}`
        })
      } else {
        throw new Error(res.message || '检测失败')
      }
    } catch (error) {
      hideLoading()
      showToast(error.message || '检测失败，请重试')
      this.setData({
        isDetecting: false,
        detectionStep: 2
      })
      console.error('AI检测失败:', error)
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