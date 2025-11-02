// pages/product-request/product-request.js
const app = getApp();

Page({
  data: {
    // 表单数据
    formData: {
      productName: '',
      brand: '',
      category: '',
      description: '',
      contact: '',
      notes: ''
    },
    
    // 分类选项
    categoryOptions: [
      { label: '洁面', value: 'cleanser' },
      { label: '爽肤水', value: 'toner' },
      { label: '精华', value: 'serum' },
      { label: '乳液面霜', value: 'moisturizer' },
      { label: '防晒', value: 'sunscreen' },
      { label: '面膜', value: 'mask' },
      { label: '套装', value: 'skincare_set' },
      { label: '其他', value: 'other' }
    ],
    categoryDisplay: '',
    
    // 图片上传
    uploadedImages: [],
    maxImages: 3,
    
    // 表单状态
    canSubmit: false,
    submitting: false,
    
    // 弹窗状态
    showCategoryModal: false,
    
    // 申请记录
    showHistory: false,
    requestHistory: [],
    historyLoading: false,
    
    // 用户信息
    userInfo: null
  },

  onLoad: function (options) {
    this.getUserInfo();
  },

  onShow: function () {
    this.validateForm();
  },

  // 获取用户信息
  getUserInfo: function() {
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({ userInfo });
    } else {
      // 如果没有用户信息，尝试登录
      app.login().then(() => {
        this.setData({ userInfo: app.globalData.userInfo });
      }).catch(err => {
        console.error('用户登录失败:', err);
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      });
    }
  },

  // 输入框变化处理
  onInputChange: function(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    this.setData({
      [`formData.${field}`]: value
    });
    
    this.validateForm();
  },

  // 显示分类选择器
  showCategoryPicker: function() {
    this.setData({ showCategoryModal: true });
  },

  // 隐藏分类选择器
  hideCategoryModal: function() {
    this.setData({ showCategoryModal: false });
  },

  // 选择分类
  selectCategory: function(e) {
    const { value, label } = e.currentTarget.dataset;
    this.setData({
      'formData.category': value,
      categoryDisplay: label,
      showCategoryModal: false
    });
    this.validateForm();
  },

  // 选择图片
  chooseImage: function() {
    const remainingCount = this.data.maxImages - this.data.uploadedImages.length;
    
    wx.chooseMedia({
      count: remainingCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        this.uploadImages(res.tempFiles);
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 上传图片
  uploadImages: function(tempFiles) {
    const uploadPromises = tempFiles.map((file, index) => {
      // 添加到上传列表，显示上传状态
      const imageItem = {
        url: file.tempFilePath,
        uploading: true,
        cloudPath: ''
      };
      
      const uploadedImages = [...this.data.uploadedImages, imageItem];
      this.setData({ uploadedImages });
      
      // 生成云存储路径
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const extension = file.tempFilePath.split('.').pop();
      const cloudPath = `product-requests/${this.data.userInfo.userId}/${timestamp}_${random}.${extension}`;
      
      // 上传到云存储
      return wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: file.tempFilePath
      }).then(uploadRes => {
        // 更新上传状态
        const currentImages = this.data.uploadedImages;
        const targetIndex = currentImages.findIndex(img => img.url === file.tempFilePath && img.uploading);
        
        if (targetIndex !== -1) {
          currentImages[targetIndex] = {
            url: uploadRes.fileID,
            uploading: false,
            cloudPath: cloudPath
          };
          this.setData({ uploadedImages: currentImages });
        }
        
        return uploadRes.fileID;
      }).catch(err => {
        console.error('图片上传失败:', err);
        
        // 移除上传失败的图片
        const currentImages = this.data.uploadedImages.filter(img => 
          !(img.url === file.tempFilePath && img.uploading)
        );
        this.setData({ uploadedImages: currentImages });
        
        wx.showToast({
          title: '图片上传失败',
          icon: 'none'
        });
        
        throw err;
      });
    });

    // 等待所有图片上传完成
    Promise.allSettled(uploadPromises).then(() => {
      this.validateForm();
    });
  },

  // 删除图片
  deleteImage: function(e) {
    const index = e.currentTarget.dataset.index;
    const uploadedImages = this.data.uploadedImages;
    const imageToDelete = uploadedImages[index];
    
    // 如果是云存储文件，删除云文件
    if (imageToDelete.cloudPath) {
      wx.cloud.deleteFile({
        fileList: [imageToDelete.url]
      }).catch(err => {
        console.error('删除云文件失败:', err);
      });
    }
    
    uploadedImages.splice(index, 1);
    this.setData({ uploadedImages });
    this.validateForm();
  },

  // 预览图片
  previewImage: function(e) {
    const url = e.currentTarget.dataset.url;
    const urls = this.data.uploadedImages.map(img => img.url);
    
    wx.previewImage({
      current: url,
      urls: urls
    });
  },

  // 表单验证
  validateForm: function() {
    const { formData, uploadedImages } = this.data;
    const canSubmit = formData.productName.trim() && 
                     formData.brand.trim() && 
                     formData.category && 
                     uploadedImages.length > 0 &&
                     !uploadedImages.some(img => img.uploading);
    
    this.setData({ canSubmit });
  },

  // 提交申请
  submitRequest: function() {
    if (!this.data.canSubmit || this.data.submitting) return;
    
    const { formData, uploadedImages, userInfo } = this.data;
    
    // 验证必填字段
    if (!formData.productName.trim()) {
      wx.showToast({ title: '请输入产品名称', icon: 'none' });
      return;
    }
    
    if (!formData.brand.trim()) {
      wx.showToast({ title: '请输入品牌名称', icon: 'none' });
      return;
    }
    
    if (!formData.category) {
      wx.showToast({ title: '请选择产品分类', icon: 'none' });
      return;
    }
    
    if (uploadedImages.length === 0) {
      wx.showToast({ title: '请上传产品图片', icon: 'none' });
      return;
    }
    
    if (uploadedImages.some(img => img.uploading)) {
      wx.showToast({ title: '图片上传中，请稍候', icon: 'none' });
      return;
    }
    
    this.setData({ submitting: true });
    
    // 准备提交数据
    const requestData = {
      userId: userInfo.userId,
      userNickname: userInfo.nickName || '匿名用户',
      productName: formData.productName.trim(),
      brand: formData.brand.trim(),
      category: formData.category,
      description: formData.description.trim(),
      contact: formData.contact.trim(),
      notes: formData.notes.trim(),
      images: uploadedImages.map(img => ({
        url: img.url,
        cloudPath: img.cloudPath
      }))
    };
    
    // 调用云函数提交申请
    wx.cloud.callFunction({
      name: 'submitProductRequest',
      data: requestData
    }).then(res => {
      console.log('提交产品申请成功:', res);
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: '提交成功',
          icon: 'success'
        });
        
        // 重置表单
        this.resetForm();
        
        // 刷新申请记录
        if (this.data.showHistory) {
          this.loadRequestHistory();
        }
        
        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(res.result?.error || '提交失败');
      }
    }).catch(err => {
      console.error('提交产品申请失败:', err);
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      });
    }).finally(() => {
      this.setData({ submitting: false });
    });
  },

  // 重置表单
  resetForm: function() {
    this.setData({
      formData: {
        productName: '',
        brand: '',
        category: '',
        description: '',
        contact: '',
        notes: ''
      },
      categoryDisplay: '',
      uploadedImages: [],
      canSubmit: false
    });
  },

  // 切换申请记录显示
  toggleHistory: function() {
    const showHistory = !this.data.showHistory;
    this.setData({ showHistory });
    
    if (showHistory && this.data.requestHistory.length === 0) {
      this.loadRequestHistory();
    }
  },

  // 加载申请记录
  loadRequestHistory: function() {
    if (!this.data.userInfo) return;
    
    this.setData({ historyLoading: true });
    
    wx.cloud.callFunction({
      name: 'getProductRequests',
      data: {
        userId: this.data.userInfo.userId,
        page: 1,
        limit: 20
      }
    }).then(res => {
      console.log('获取申请记录成功:', res);
      
      if (res.result && res.result.success) {
        const requests = res.result.data.requests.map(request => ({
          ...request,
          submitDateDisplay: this.formatDate(request.submitDate)
        }));
        
        this.setData({ requestHistory: requests });
      } else {
        throw new Error(res.result?.error || '获取申请记录失败');
      }
    }).catch(err => {
      console.error('获取申请记录失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }).finally(() => {
      this.setData({ historyLoading: false });
    });
  },

  // 获取状态文本
  getStatusText: function(status) {
    const statusMap = {
      'pending': '待审核',
      'approved': '已通过',
      'rejected': '已拒绝',
      'processing': '处理中'
    };
    return statusMap[status] || status;
  },

  // 格式化日期
  formatDate: function(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return '今天';
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  }
});