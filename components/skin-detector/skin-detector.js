// 皮肤检测组件
Component({
  properties: {
    // 检测模式：camera（拍照）、album（相册）
    mode: {
      type: String,
      value: 'camera'
    },
    // 是否显示检测指引
    showGuide: {
      type: Boolean,
      value: true
    },
    // 检测区域样式
    detectionStyle: {
      type: String,
      value: 'circle' // circle, square
    }
  },

  data: {
    // 相机上下文
    cameraContext: null,
    // 检测状态
    detecting: false,
    // 检测进度
    progress: 0,
    // 检测结果
    result: null,
    // 拍照的图片路径
    imagePath: '',
    // 检测指引步骤
    guideStep: 0,
    guideSteps: [
      {
        title: '调整光线',
        desc: '请在光线充足的环境下进行检测',
        icon: '💡'
      },
      {
        title: '正面拍摄',
        desc: '请保持面部正对镜头',
        icon: '📷'
      },
      {
        title: '保持距离',
        desc: '请保持30-50cm的拍摄距离',
        icon: '📏'
      }
    ],
    // 检测区域位置
    detectionArea: {
      width: 300,
      height: 400,
      left: 0,
      top: 0
    }
  },

  lifetimes: {
    attached() {
      this.initCamera()
      this.calculateDetectionArea()
    },

    detached() {
      if (this.data.cameraContext) {
        this.data.cameraContext.stopRecord()
      }
    }
  },

  methods: {
    // 初始化相机
    initCamera() {
      const cameraContext = wx.createCameraContext()
      this.setData({ cameraContext })
    },

    // 计算检测区域位置
    calculateDetectionArea() {
      const query = this.createSelectorQuery()
      query.select('.camera-container').boundingClientRect((rect) => {
        if (rect) {
          const { width, height } = rect
          const areaWidth = Math.min(width * 0.8, 300)
          const areaHeight = areaWidth * 1.3
          
          this.setData({
            'detectionArea.width': areaWidth,
            'detectionArea.height': areaHeight,
            'detectionArea.left': (width - areaWidth) / 2,
            'detectionArea.top': (height - areaHeight) / 2
          })
        }
      }).exec()
    },

    // 开始检测
    startDetection() {
      if (this.data.detecting) return

      if (this.properties.mode === 'camera') {
        this.takePhoto()
      } else {
        this.chooseImage()
      }
    },

    // 拍照
    takePhoto() {
      const { cameraContext } = this.data
      if (!cameraContext) return

      this.setData({ detecting: true, progress: 0 })

      cameraContext.takePhoto({
        quality: 'high',
        success: (res) => {
          this.setData({ imagePath: res.tempImagePath })
          this.processImage(res.tempImagePath)
        },
        fail: (err) => {
          console.error('拍照失败:', err)
          this.setData({ detecting: false })
          wx.showToast({
            title: '拍照失败',
            icon: 'none'
          })
        }
      })
    },

    // 选择图片
    chooseImage() {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album'],
        success: (res) => {
          const imagePath = res.tempFilePaths[0]
          this.setData({ 
            imagePath,
            detecting: true,
            progress: 0
          })
          this.processImage(imagePath)
        },
        fail: (err) => {
          console.error('选择图片失败:', err)
        }
      })
    },

    // 处理图片
    processImage(imagePath) {
      // 模拟AI检测过程
      this.simulateDetection(imagePath)
    },

    // 模拟检测过程
    simulateDetection(imagePath) {
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 20
        if (progress >= 100) {
          progress = 100
          clearInterval(interval)
          this.completeDetection(imagePath)
        }
        this.setData({ progress })
      }, 200)
    },

    // 完成检测
    completeDetection(imagePath) {
      // 模拟检测结果
      const mockResult = {
        skinType: '混合性',
        skinAge: 25,
        moisture: 65,
        oiliness: 45,
        sensitivity: 30,
        acne: 20,
        wrinkles: 15,
        pores: 40,
        spots: 25,
        redness: 35,
        score: 78,
        problems: [
          { type: 'dryness', level: 'mild', area: 'T区' },
          { type: 'pores', level: 'moderate', area: '鼻翼' }
        ],
        suggestions: [
          '建议使用保湿面霜',
          '注意清洁毛孔',
          '定期使用面膜'
        ]
      }

      setTimeout(() => {
        this.setData({
          detecting: false,
          result: mockResult,
          progress: 100
        })

        // 触发检测完成事件
        this.triggerEvent('detectionComplete', {
          imagePath,
          result: mockResult
        })
      }, 500)
    },

    // 重新检测
    retryDetection() {
      this.setData({
        detecting: false,
        progress: 0,
        result: null,
        imagePath: ''
      })
    },

    // 切换检测模式
    switchMode() {
      const newMode = this.properties.mode === 'camera' ? 'album' : 'camera'
      this.triggerEvent('modeChange', { mode: newMode })
    },

    // 显示检测指引
    showDetectionGuide() {
      this.setData({ guideStep: 0 })
      this.selectComponent('#guide-modal').show()
    },

    // 下一步指引
    nextGuideStep() {
      const { guideStep, guideSteps } = this.data
      if (guideStep < guideSteps.length - 1) {
        this.setData({ guideStep: guideStep + 1 })
      } else {
        this.selectComponent('#guide-modal').hide()
      }
    },

    // 关闭指引
    closeGuide() {
      this.selectComponent('#guide-modal').hide()
    },

    // 相机错误处理
    onCameraError(e) {
      console.error('相机错误:', e.detail)
      wx.showModal({
        title: '相机权限',
        content: '需要相机权限才能进行皮肤检测，请在设置中开启',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            wx.openSetting()
          }
        }
      })
    },

    // 相机初始化完成
    onCameraReady() {
      console.log('相机初始化完成')
    }
  }
})