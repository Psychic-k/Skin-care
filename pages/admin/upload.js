// pages/admin/upload.js
const app = getApp()
const request = require('../../utils/request')
const { showToast, showLoading, hideLoading, formatDate } = require('../../utils/utils')

Page({
  data: {
    // 用户信息
    userInfo: null,
    isAdmin: false,
    
    // 上传方式
    uploadType: 'batch', // batch: 批量上传, single: 单个添加
    
    // 批量上传相关
    selectedFile: null,
    uploadProgress: 0,
    isUploading: false,
    uploadResult: null,
    
    // 单个产品添加
    productForm: {
      name: '',
      brand: '',
      price: '',
      description: '',
      skinTypes: [],
      effects: [],
      ingredients: [],
      imageUrl: '',
      category: 'serum'
    },
    
    // 选项数据
    skinTypeOptions: [
      { id: 'dry', name: '干性肌肤', selected: false },
      { id: 'oily', name: '油性肌肤', selected: false },
      { id: 'combination', name: '混合性肌肤', selected: false },
      { id: 'sensitive', name: '敏感性肌肤', selected: false },
      { id: 'normal', name: '中性肌肤', selected: false }
    ],
    
    effectOptions: [
      { id: 'moisturizing', name: '保湿', selected: false },
      { id: 'whitening', name: '美白', selected: false },
      { id: 'anti-aging', name: '抗衰老', selected: false },
      { id: 'acne-control', name: '控痘', selected: false },
      { id: 'oil-control', name: '控油', selected: false },
      { id: 'pore-minimizing', name: '收缩毛孔', selected: false },
      { id: 'brightening', name: '提亮', selected: false },
      { id: 'firming', name: '紧致', selected: false }
    ],
    
    categoryOptions: [
      { id: 'cleanser', name: '洁面' },
      { id: 'toner', name: '爽肤水' },
      { id: 'serum', name: '精华' },
      { id: 'moisturizer', name: '面霜' },
      { id: 'sunscreen', name: '防晒' },
      { id: 'mask', name: '面膜' }
    ],
    
    // 成分输入
    ingredientInput: '',
    
    // 品牌列表
    brandList: [],
    showBrandPicker: false,
    
    // 验证结果
    validationErrors: []
  },

  onLoad(options) {
    this.checkAdminPermission()
    this.loadBrandList()
  },

  // 检查管理员权限
  async checkAdminPermission() {
    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      wx.navigateTo({
        url: '/pages/login/login'
      })
      return
    }

    // 检查是否为管理员
    if (userInfo.userType !== 'admin' && userInfo.userType !== 'super_admin') {
      wx.showModal({
        title: '权限不足',
        content: '您没有管理员权限，无法访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return
    }

    this.setData({
      userInfo,
      isAdmin: true
    })
  },

  // 加载品牌列表
  async loadBrandList() {
    try {
      const res = await request({
        url: '/api/brands/list',
        method: 'GET'
      })

      if (res.code === 0) {
        this.setData({
          brandList: res.data.brands || []
        })
      }
    } catch (error) {
      console.error('加载品牌列表失败:', error)
    }
  },

  // 切换上传方式
  switchUploadType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      uploadType: type,
      validationErrors: []
    })
  },

  // 选择文件
  chooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls', 'csv'],
      success: (res) => {
        const file = res.tempFiles[0]
        if (file.size > 10 * 1024 * 1024) { // 10MB限制
          showToast('文件大小不能超过10MB')
          return
        }
        
        this.setData({
          selectedFile: file,
          uploadResult: null
        })
      },
      fail: (error) => {
        console.error('选择文件失败:', error)
        showToast('选择文件失败')
      }
    })
  },

  // 移除选中的文件
  removeFile() {
    this.setData({
      selectedFile: null,
      uploadResult: null,
      uploadProgress: 0
    })
  },

  // 批量上传文件（云存储 + 云函数）
  async uploadFile() {
    if (!this.data.selectedFile) {
      showToast('请先选择文件')
      return
    }

    this.setData({ isUploading: true, uploadProgress: 0 })

    try {
      const progressInterval = setInterval(() => {
        const progress = this.data.uploadProgress + 10
        this.setData({ uploadProgress: Math.min(progress, 90) })
      }, 200)

      // 1) 申请上传配置
      const cfg = await request.callCloudFunction('uploadFile', {
        fileType: 'application/vnd.ms-excel',
        fileName: this.data.selectedFile.name || 'batch.xlsx',
        fileSize: this.data.selectedFile.size,
        category: 'product',
        metadata: { source: 'adminBatch' }
      })
      if (cfg.code !== 0) throw new Error(cfg.message || '获取上传配置失败')

      // 2) 上传到云存储
      const cloudRet = await wx.cloud.uploadFile({
        cloudPath: cfg.data.cloudPath,
        filePath: this.data.selectedFile.path
      })

      // 3) 调用批量导入云函数
      const importRes = await request.callCloudFunction('adminBatchUpload', {
        fileID: cloudRet.fileID
      })

      clearInterval(progressInterval)
      this.setData({ uploadProgress: 100, isUploading: false })

      if (importRes.code === 0) {
        this.setData({
          uploadResult: {
            success: true,
            message: `导入完成：成功 ${importRes.data.successCount} 条，失败 ${importRes.data.failureCount} 条`,
            data: importRes.data
          }
        })
        showToast('上传成功')
      } else {
        this.setData({
          uploadResult: {
            success: false,
            message: importRes.message || '上传失败',
            errors: (importRes.data && importRes.data.errors) || []
          }
        })
        showToast('上传失败')
      }
    } catch (error) {
      console.error('上传文件失败:', error)
      this.setData({
        isUploading: false,
        uploadResult: { success: false, message: '上传失败', errors: [] }
      })
      showToast('上传失败')
    }
  },

  // 表单输入处理
  onFormInput(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({
      [`productForm.${field}`]: value
    })
  },

  // 选择分类
  onCategoryChange(e) {
    const index = e.detail.value
    const category = this.data.categoryOptions[index]
    this.setData({
      'productForm.category': category.id
    })
  },

  // 选择肌肤类型
  toggleSkinType(e) {
    const { index } = e.currentTarget.dataset
    const skinTypeOptions = [...this.data.skinTypeOptions]
    skinTypeOptions[index].selected = !skinTypeOptions[index].selected
    
    const selectedSkinTypes = skinTypeOptions
      .filter(item => item.selected)
      .map(item => item.id)
    
    this.setData({
      skinTypeOptions,
      'productForm.skinTypes': selectedSkinTypes
    })
  },

  // 选择功效
  toggleEffect(e) {
    const { index } = e.currentTarget.dataset
    const effectOptions = [...this.data.effectOptions]
    effectOptions[index].selected = !effectOptions[index].selected
    
    const selectedEffects = effectOptions
      .filter(item => item.selected)
      .map(item => item.id)
    
    this.setData({
      effectOptions,
      'productForm.effects': selectedEffects
    })
  },

  // 添加成分
  onIngredientInput(e) {
    this.setData({
      ingredientInput: e.detail.value
    })
  },

  addIngredient() {
    const ingredient = this.data.ingredientInput.trim()
    if (!ingredient) return

    const ingredients = [...this.data.productForm.ingredients]
    if (!ingredients.includes(ingredient)) {
      ingredients.push(ingredient)
      this.setData({
        'productForm.ingredients': ingredients,
        ingredientInput: ''
      })
    }
  },

  // 移除成分
  removeIngredient(e) {
    const { index } = e.currentTarget.dataset
    const ingredients = [...this.data.productForm.ingredients]
    ingredients.splice(index, 1)
    this.setData({
      'productForm.ingredients': ingredients
    })
  },

  // 选择品牌
  showBrandSelector() {
    this.setData({
      showBrandPicker: true
    })
  },

  hideBrandSelector() {
    this.setData({
      showBrandPicker: false
    })
  },

  selectBrand(e) {
    const { brand } = e.currentTarget.dataset
    this.setData({
      'productForm.brand': brand,
      showBrandPicker: false
    })
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        this.uploadImage(tempFilePath)
      }
    })
  },

  // 上传图片（云存储）
  async uploadImage(filePath) {
    showLoading('上传图片中...')
    try {
      const conf = await request.callCloudFunction('uploadFile', {
        fileType: 'image/jpeg',
        fileName: `product_${Date.now()}.jpg`,
        category: 'product'
      })
      if (conf.code !== 0) throw new Error(conf.message || '获取上传配置失败')

      const up = await wx.cloud.uploadFile({
        cloudPath: conf.data.cloudPath,
        filePath
      })

      this.setData({ 'productForm.imageUrl': up.fileID })
      showToast('图片上传成功')
    } catch (e) {
      console.error('图片上传失败:', e)
      showToast('图片上传失败')
    } finally {
      hideLoading()
    }
  },

  // 验证表单
  validateForm() {
    const { productForm } = this.data
    const errors = []

    if (!productForm.name.trim()) {
      errors.push('产品名称不能为空')
    }
    if (!productForm.brand.trim()) {
      errors.push('品牌不能为空')
    }
    if (!productForm.price || isNaN(productForm.price) || productForm.price <= 0) {
      errors.push('请输入有效的价格')
    }
    if (!productForm.description.trim()) {
      errors.push('产品描述不能为空')
    }
    if (productForm.skinTypes.length === 0) {
      errors.push('请至少选择一种适用肌肤类型')
    }
    if (productForm.effects.length === 0) {
      errors.push('请至少选择一种功效')
    }

    this.setData({
      validationErrors: errors
    })

    return errors.length === 0
  },

  // 提交单个产品
  async submitProduct() {
    if (!this.validateForm()) {
      showToast('请完善产品信息')
      return
    }

    showLoading('提交中...')

    try {
      const res = await request({
        url: '/api/admin/products/create',
        method: 'POST',
        data: {
          ...this.data.productForm,
          userId: this.data.userInfo.id
        }
      })

      if (res.code === 0) {
        showToast('产品添加成功')
        this.resetForm()
      } else {
        showToast(res.message || '添加失败')
      }
    } catch (error) {
      console.error('提交产品失败:', error)
      showToast('提交失败')
    } finally {
      hideLoading()
    }
  },

  // 重置表单
  resetForm() {
    this.setData({
      productForm: {
        name: '',
        brand: '',
        price: '',
        description: '',
        skinTypes: [],
        effects: [],
        ingredients: [],
        imageUrl: '',
        category: 'serum'
      },
      skinTypeOptions: this.data.skinTypeOptions.map(item => ({
        ...item,
        selected: false
      })),
      effectOptions: this.data.effectOptions.map(item => ({
        ...item,
        selected: false
      })),
      ingredientInput: '',
      validationErrors: []
    })
  },

  // 下载模板
  downloadTemplate() {
    wx.showModal({
      title: '下载模板',
      content: '请联系管理员获取Excel上传模板',
      showCancel: false
    })
  }
})