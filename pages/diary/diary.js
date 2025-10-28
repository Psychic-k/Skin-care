// pages/diary/diary.js
const app = getApp()
const request = require('../../utils/request')
const { showToast, showLoading, hideLoading, formatDate } = require('../../utils/utils')

Page({
  data: {
    // 日记列表
    diaryList: [],
    currentPage: 1,
    hasMore: true,
    
    // 当前视图模式
    viewMode: 'list', // list, calendar, chart
    
    // 日历相关
    currentDate: '',
    selectedDate: '',
    calendarData: {},
    
    // 筛选条件
    filterType: 'all', // all, skincare, mood, weather
    sortBy: 'date', // date, mood, weather
    
    // 新增日记
    showAddModal: false,
    newDiary: {
      date: '',
      skinCondition: 5,
      mood: 5,
      weather: 'sunny',
      products: [],
      notes: '',
      photos: []
    },
    
    // 编辑状态
    editingId: null,
    
    // 产品选择
    showProductModal: false,
    availableProducts: [],
    selectedProducts: [],
    filteredProducts: [],
    productSearchText: '',
    
    // 天气选项
    weatherOptions: [
      { id: 'sunny', name: '晴天', icon: '☀️' },
      { id: 'cloudy', name: '多云', icon: '☁️' },
      { id: 'rainy', name: '雨天', icon: '🌧️' },
      { id: 'snowy', name: '雪天', icon: '❄️' },
      { id: 'windy', name: '大风', icon: '💨' }
    ],
    
    // 统计数据
    statsData: null,
    
    // 用户信息
    userInfo: null
  },

  // 获取天气信息的辅助方法
  getWeatherInfo(weatherId, type) {
    const weather = this.data.weatherOptions.find(function(w) {
      return w.id === weatherId;
    });
    return weather ? weather[type] : '';
  },

  onLoad(options) {
    this.getUserInfo()
    this.initDate()
    this.loadDiaryList()
    this.loadAvailableProducts()
    this.loadStatsData()
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadDiaryList()
  },

  onPullDownRefresh() {
    this.loadDiaryList(true)
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    if (this.data.hasMore) {
      this.loadMoreDiary()
    }
  },

  // 获取用户信息
  getUserInfo() {
    const userInfo = app.getUserInfo()
    if (userInfo && userInfo.id) {
      this.setData({ userInfo })
    } else {
      console.log('用户信息不存在，跳转到登录页')
      wx.navigateTo({
        url: '/pages/login/login'
      })
    }
  },

  // 初始化日期
  initDate() {
    const now = new Date()
    const currentDate = this.formatDate(now)
    this.setData({
      currentDate,
      selectedDate: currentDate,
      'newDiary.date': currentDate
    })
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 加载日记列表
  async loadDiaryList(refresh = false) {
    try {
      if (refresh) {
        this.setData({
          currentPage: 1,
          hasMore: true
        })
      }
      
      showLoading('加载中...')
      
      const userInfo = app.getUserInfo()
      if (!userInfo || !userInfo.id) {
        console.log('用户信息不存在，跳转到登录页')
        wx.navigateTo({
          url: '/pages/login/login'
        })
        return
      }

      console.log('开始加载日记列表，用户ID:', userInfo.id)

      // 修改API调用方式，直接传递userId作为参数
      const res = await request({
        url: '/api/diary/list',
        method: 'GET',
        data: {
          userId: userInfo.id,
          page: refresh ? 1 : this.data.currentPage,
          limit: 10,
          filterType: this.data.filterType,
          sortBy: this.data.sortBy
        }
      })

      console.log('日记列表API响应:', res)

      if (res && res.code === 0) {
        const newList = res.data.diaries || []
        this.setData({
          diaryList: refresh ? newList : [...this.data.diaryList, ...newList],
          hasMore: newList.length >= 10,
          currentPage: refresh ? 2 : this.data.currentPage + 1
        })
        
        // 更新日历数据
        this.updateCalendarData(newList)
        console.log('日记列表加载成功，数量:', newList.length)
      } else {
        console.error('日记列表API返回错误:', res)
        showToast(res?.message || '加载失败')
      }
    } catch (error) {
      console.error('加载日记列表失败:', error)
      showToast('网络连接失败，请检查网络设置')
    } finally {
      hideLoading()
    }
  },

  // 加载更多日记
  loadMoreDiary() {
    this.loadDiaryList()
  },

  // 更新日历数据
  updateCalendarData(diaries) {
    const calendarData = {}
    diaries.forEach(diary => {
      calendarData[diary.date] = {
        mood: diary.mood,
        skinCondition: diary.skinCondition,
        hasEntry: true
      }
    })
    this.setData({ calendarData })
  },

  // 加载可用产品
  async loadAvailableProducts() {
    try {
      const res = await request.get('/api/products/user-products')

      if (res.success) {
        this.setData({
          availableProducts: res.data.products || []
        })
      }
    } catch (error) {
      console.error('加载产品列表失败:', error)
    }
  },

  // 加载统计数据
  async loadStatsData() {
    try {
      const userInfo = app.globalData.userInfo
      if (!userInfo) return

      const res = await request({
        url: `/api/diary/stats/${userInfo.id}`,
        method: 'GET'
      })

      if (res.success) {
        this.setData({
          statsData: res.data
        })
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  },

  // 切换视图模式
  switchViewMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      viewMode: mode
    })
  },

  // 切换筛选类型
  switchFilter(e) {
    const filterType = e.currentTarget.dataset.type
    this.setData({
      filterType,
      currentPage: 1
    })
    this.loadDiaryList(true)
  },

  // 切换排序方式
  switchSort(e) {
    const sortBy = e.currentTarget.dataset.sort
    this.setData({
      sortBy,
      currentPage: 1
    })
    this.loadDiaryList(true)
  },

  // 显示添加日记弹窗
  showAddDiary() {
    this.setData({
      showAddModal: true,
      editingId: null,
      newDiary: {
        date: this.data.selectedDate || this.data.currentDate,
        skinCondition: 5,
        mood: 5,
        weather: 'sunny',
        products: [],
        notes: '',
        photos: []
      }
    })
  },

  // 编辑日记
  editDiary(e) {
    const diaryId = e.currentTarget.dataset.id
    const diary = this.data.diaryList.find(item => item.id === diaryId)
    
    if (diary) {
      this.setData({
        showAddModal: true,
        editingId: diaryId,
        newDiary: {
          date: diary.date,
          skinCondition: diary.skinCondition,
          mood: diary.mood,
          weather: diary.weather,
          products: diary.products || [],
          notes: diary.notes || '',
          photos: diary.photos || []
        }
      })
    }
  },

  // 关闭添加弹窗
  closeAddModal() {
    this.setData({
      showAddModal: false,
      editingId: null
    })
  },

  // 选择日期
  onDateChange(e) {
    const date = e.detail.value
    this.setData({
      'newDiary.date': date
    })
  },

  // 皮肤状态滑块变化
  onSkinConditionChange(e) {
    this.setData({
      'newDiary.skinCondition': e.detail.value
    })
  },

  // 心情滑块变化
  onMoodChange(e) {
    this.setData({
      'newDiary.mood': e.detail.value
    })
  },

  // 选择天气
  selectWeather(e) {
    const weather = e.currentTarget.dataset.weather
    this.setData({
      'newDiary.weather': weather
    })
  },

  // 输入备注
  onNotesInput(e) {
    this.setData({
      'newDiary.notes': e.detail.value
    })
  },

  // 显示产品选择弹窗
  showProductSelector() {
    this.setData({
      showProductModal: true,
      selectedProducts: [...this.data.newDiary.products],
      filteredProducts: [...this.data.availableProducts],
      productSearchText: ''
    })
  },

  // 关闭产品选择弹窗
  closeProductModal() {
    this.setData({
      showProductModal: false,
      productSearchText: '',
      filteredProducts: []
    })
  },

  // 产品搜索
  onProductSearch(e) {
    const searchText = e.detail.value.toLowerCase()
    this.setData({
      productSearchText: searchText
    })
    
    if (searchText.trim() === '') {
      this.setData({
        filteredProducts: [...this.data.availableProducts]
      })
    } else {
      const filtered = this.data.availableProducts.filter(product => {
        return product.name.toLowerCase().includes(searchText) ||
               product.brand.toLowerCase().includes(searchText)
      })
      this.setData({
        filteredProducts: filtered
      })
    }
  },

  // 清空所有选择
  clearAllProducts() {
    this.setData({
      selectedProducts: []
    })
  },

  // 切换产品选择
  toggleProduct(e) {
    const productId = e.currentTarget.dataset.id
    const selectedProducts = [...this.data.selectedProducts]
    const index = selectedProducts.indexOf(productId)
    
    if (index > -1) {
      selectedProducts.splice(index, 1)
    } else {
      selectedProducts.push(productId)
    }
    
    this.setData({
      selectedProducts
    })
  },

  // 确认产品选择
  confirmProducts() {
    this.setData({
      'newDiary.products': this.data.selectedProducts,
      showProductModal: false
    })
  },

  // 选择照片
  choosePhotos() {
    wx.chooseImage({
      count: 3 - this.data.newDiary.photos.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const photos = [...this.data.newDiary.photos, ...res.tempFilePaths]
        this.setData({
          'newDiary.photos': photos
        })
      }
    })
  },

  // 删除照片
  deletePhoto(e) {
    const index = e.currentTarget.dataset.index
    const photos = [...this.data.newDiary.photos]
    photos.splice(index, 1)
    this.setData({
      'newDiary.photos': photos
    })
  },

  // 保存日记
  async saveDiary() {
    try {
      const { newDiary, editingId } = this.data
      
      // 验证必填字段
      if (!newDiary.date) {
        showToast('请选择日期')
        return
      }
      
      showLoading(editingId ? '更新中...' : '保存中...')
      
      const userInfo = app.globalData.userInfo
      if (!userInfo) return

      const requestData = {
        ...newDiary,
        userId: userInfo.id
      }

      const res = await request({
        url: editingId ? `/api/diary/${editingId}` : '/api/diary/create',
        method: editingId ? 'PUT' : 'POST',
        data: requestData
      })

      if (res.success) {
        showToast(editingId ? '更新成功' : '保存成功')
        this.closeAddModal()
        this.loadDiaryList(true)
        this.loadStatsData()
      } else {
        throw new Error(res.message || '保存失败')
      }
    } catch (error) {
      showToast(error.message || '保存失败')
      console.error('保存日记失败:', error)
    } finally {
      hideLoading()
    }
  },

  // 删除日记
  deleteDiary(e) {
    const diaryId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条日记吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            showLoading('删除中...')
            
            const result = await request({
              url: `/api/diary/${diaryId}`,
              method: 'DELETE'
            })

            if (result.success) {
              showToast('删除成功')
              this.loadDiaryList(true)
              this.loadStatsData()
            }
          } catch (error) {
            showToast('删除失败')
            console.error('删除日记失败:', error)
          } finally {
            hideLoading()
          }
        }
      }
    })
  },

  // 查看日记详情
  viewDiaryDetail(e) {
    const diaryId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/diary-detail/diary-detail?id=${diaryId}`
    })
  },

  // 日历日期点击
  onCalendarDateTap(e) {
    const date = e.currentTarget.dataset.date
    this.setData({
      selectedDate: date
    })
    
    // 检查该日期是否有日记
    const diary = this.data.diaryList.find(item => item.date === date)
    if (diary) {
      this.viewDiaryDetail({ currentTarget: { dataset: { id: diary.id } } })
    } else {
      this.showAddDiary()
    }
  },

  // 导出日记数据
  async exportDiary() {
    try {
      showLoading('导出中...')
      
      const userInfo = app.globalData.userInfo
      if (!userInfo) return

      const res = await request({
        url: `/api/diary/export/${userInfo.id}`,
        method: 'GET'
      })

      if (res.success) {
        showToast('导出成功')
      }
    } catch (error) {
      showToast('导出失败')
      console.error('导出日记失败:', error)
    } finally {
      hideLoading()
    }
  },

  // 分享日记
  shareDiary(e) {
    const diaryId = e.currentTarget.dataset.id
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '我的护肤日记 - Skin-care护肤助手',
      path: '/pages/diary/diary',
      imageUrl: '/images/share-diary.jpg'
    }
  }
})