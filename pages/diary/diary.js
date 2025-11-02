// pages/diary/diary.js
const app = getApp()
const request = require('../../utils/request')
const { showToast, showLoading, hideLoading, formatDate } = require('../../utils/utils')
const Auth = require('../../utils/auth')

Page({
  data: {
    // 日记列表
    diaryList: [],
    currentPage: 1,
    hasMore: true,
    isLoading: false,
    isLoadingMore: false,
    
    // 当前视图模式
    viewMode: 'list', // list, calendar, chart
    
    // 日历相关
    currentDate: '',
    selectedDate: '',
    calendarData: {},
    calendarDays: [],
    currentYear: 0,
    currentMonth: 0,
    
    // 筛选条件
    filterType: 'all', // all, skincare, mood, weather
    sortBy: 'date', // date, mood, weather
    
    // 新增日记
    showAddModal: false,
    newDiary: {
      date: '',
      morningRoutine: [],
      eveningRoutine: [],
      skinCondition: {
        moisture: 3,
        oiliness: 3,
        sensitivity: 3,
        breakouts: 3,
        overall: 3
      },
      mood: 'neutral',
      weather: {
        temperature: 20,
        humidity: 60,
        condition: 'sunny'
      },
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
    currentRoutineType: 'morning', // morning 或 evening
    
    // 天气选项
    weatherOptions: [
      { id: 'sunny', name: '晴天', icon: '☀️' },
      { id: 'cloudy', name: '多云', icon: '☁️' },
      { id: 'rainy', name: '雨天', icon: '🌧️' },
      { id: 'snowy', name: '雪天', icon: '❄️' },
      { id: 'windy', name: '大风', icon: '💨' },
      { id: 'foggy', name: '雾霾', icon: '🌫️' }
    ],
    
    // 心情选项
    moodOptions: [
      { id: 'excellent', name: '极好', icon: '😍', color: '#4CAF50' },
      { id: 'good', name: '很好', icon: '😊', color: '#8BC34A' },
      { id: 'neutral', name: '一般', icon: '😐', color: '#FFC107' },
      { id: 'bad', name: '不好', icon: '😔', color: '#FF9800' },
      { id: 'terrible', name: '很差', icon: '😢', color: '#F44336' }
    ],
    
    // 统计数据
    statsData: null,
    
    // 用户信息
    userInfo: null,
    
    // 草稿保存
    draftTimer: null,
    hasDraft: false,
    
    // 搜索相关
    searchTimer: null,
    
    // UI状态
    loadError: false,
    isLoadingProducts: false,
    searchSuggestions: [],
    selectedCategory: 'all',
    productCategories: ['洁面', '爽肤水', '精华', '乳液', '面霜', '防晒', '面膜'],
    
    // 新的选择框状态
    showMorningSelector: false,
    showEveningSelector: false,
    morningSearchText: '',
    eveningSearchText: '',
    filteredMorningProducts: [],
    filteredEveningProducts: []
  },

  // 获取天气信息的辅助方法
  getWeatherInfo(weatherId, type) {
    const weather = this.data.weatherOptions.find(function(w) {
      return w.id === weatherId;
    });
    return weather ? weather[type] : '';
  },

  onLoad(options) {
    // 检查登录状态
    if (!Auth.isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '护肤日记功能需要登录后使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            })
          } else {
            wx.switchTab({
              url: '/pages/index/index'
            })
          }
        }
      })
      return
    }

    // 首先清除可能包含UI状态的错误草稿数据
    this.clearCorruptedDraft()
    
    // 确保页面加载时所有弹窗都是关闭状态
    this.setData({
      showProductModal: false,
      showAddModal: false,
      showMorningSelector: false,
      showEveningSelector: false
    })
    
    this.getUserInfo()
    this.initDate()
    this.loadDiaryList()
    this.loadAvailableProducts()
    this.loadStatsData()
    this.checkDraft()
    
    // 添加登录状态变化监听器
    this.loginStatusListener = (isLoggedIn, userInfo) => {
      console.log('护肤日记页面收到登录状态变化通知:', isLoggedIn);
      this.setData({
        userInfo: userInfo
      });
      if (isLoggedIn) {
        // 用户登录，重新加载数据
        this.loadDiaryList(true);
        this.loadStatsData();
      } else {
        // 用户退出登录，清空数据
        this.setData({
          diaryList: [],
          statsData: null
        });
      }
    };
    getApp().addLoginStatusListener(this.loginStatusListener);
  },

  onShow() {
    // 检查登录状态
    if (!Auth.isLoggedIn()) {
      return
    }
    
    // 页面显示时刷新数据并确保所有弹窗都关闭
    this.setData({
      showProductModal: false,
      showAddModal: false,
      showMorningSelector: false,
      showEveningSelector: false
    })
    this.loadDiaryList()
  },

  onUnload() {
    // 移除登录状态监听器
    if (this.loginStatusListener) {
      getApp().removeLoginStatusListener(this.loginStatusListener);
    }
  },

  onPullDownRefresh() {
    this.loadDiaryList(true)
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoadingMore) {
      this.loadMoreDiary()
    }
  },

  // 获取用户信息
  getUserInfo() {
    // 再次检查登录状态
    if (!Auth.isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '护肤日记功能需要登录后使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            })
          } else {
            wx.switchTab({
              url: '/pages/index/index'
            })
          }
        }
      })
      return
    }

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

  // 加载日记列表（优化版本）
  async loadDiaryList(refresh = false) {
    try {
      // 防止重复加载
      if (this.data.isLoading) {
        return
      }

      this.setData({ isLoading: true })

      if (refresh) {
        this.setData({
          currentPage: 1,
          hasMore: true,
          diaryList: []
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

      // 使用云函数调用，支持缓存和重试
      const res = await request.callCloudFunction('diaryList', {
        userId: userInfo.id,
        page: refresh ? 1 : this.data.currentPage,
        limit: 10,
        filterType: this.data.filterType,
        sortBy: this.data.sortBy
      }, {
        useCache: true,
        cacheTime: 2 * 60 * 1000, // 2分钟缓存
        maxRetries: 2
      })

      console.log('日记列表API响应:', res)

      if (res && res.code === 0) {
        const newList = res.data.diaries || []
        
        // 使用批量更新减少渲染次数
        const updateData = {
          diaryList: refresh ? newList : [...this.data.diaryList, ...newList],
          hasMore: newList.length >= 10,
          currentPage: refresh ? 2 : this.data.currentPage + 1
        }
        
        this.setData(updateData)
        
        // 异步更新日历数据，不阻塞主流程
        setTimeout(() => {
          this.updateCalendarData(newList)
        }, 0)
        
        console.log('日记列表加载成功，数量:', newList.length)
      } else {
        console.error('日记列表API返回错误:', res)
        showToast(res?.message || '加载失败')
      }
    } catch (error) {
      console.error('加载日记列表失败:', error)
      showToast('网络连接失败，请检查网络设置')
    } finally {
      this.setData({ isLoading: false })
      hideLoading()
    }
  },

  // 加载更多日记（防抖动版本）
  loadMoreDiary() {
    if (this.data.isLoadingMore || !this.data.hasMore) {
      return
    }
    
    this.setData({ isLoadingMore: true })
    
    // 防抖动处理
    if (this.loadMoreTimer) {
      clearTimeout(this.loadMoreTimer)
    }
    
    this.loadMoreTimer = setTimeout(async () => {
      try {
        await this.loadDiaryList()
      } finally {
        this.setData({ isLoadingMore: false })
      }
    }, 300)
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
      console.log('开始加载可用产品列表')
      
      // 获取用户信息
      const userInfo = app.globalData.userInfo
      if (!userInfo || !userInfo.id) {
        console.error('用户信息不存在，无法加载产品')
        // 使用本地模拟数据作为备选
        this.loadFallbackProducts()
        return
      }

      // 调用云函数获取用户产品
      const res = await wx.cloud.callFunction({
        name: 'getUserProducts',
        data: {
          userId: userInfo.id,
          type: 'all',
          page: 1,
          limit: 100
        }
      })

      console.log('getUserProducts 云函数返回结果:', res)

      if (res.result && res.result.code === 0) {
        const rawProducts = res.result.data.products || []
        console.log('成功获取产品列表，数量:', rawProducts.length)
        
        // 转换数据格式以匹配UI组件期望的字段
        const products = rawProducts.map(product => ({
          id: product._id || product.id,
          name: product.name,
          brand: product.brand,
          image: product.imageUrl || product.image || 'https://via.placeholder.com/100x100?text=产品',
          category: product.category,
          price: product.price?.min || product.price || 0
        }))
        
        this.setData({
          availableProducts: products,
          filteredProducts: products,
          filteredMorningProducts: products,
          filteredEveningProducts: products
        })
      } else {
        console.error('云函数调用失败:', res.result)
        // 使用本地模拟数据作为备选
        this.loadFallbackProducts()
      }
    } catch (error) {
      console.error('加载产品列表失败:', error)
      // 使用本地模拟数据作为备选
      this.loadFallbackProducts()
    }
  },

  // 备选产品数据加载
  loadFallbackProducts() {
    console.log('使用备选产品数据')
    const fallbackProducts = [
      {
        id: 'product_1',
        name: '温和洁面乳',
        brand: '兰蔻',
        image: 'https://via.placeholder.com/100x100?text=洁面乳',
        category: 'cleanser',
        price: 280
      },
      {
        id: 'product_2', 
        name: '保湿爽肤水',
        brand: '雅诗兰黛',
        image: 'https://via.placeholder.com/100x100?text=爽肤水',
        category: 'toner',
        price: 350
      },
      {
        id: 'product_3',
        name: '维C精华液',
        brand: '倩碧',
        image: 'https://via.placeholder.com/100x100?text=精华液',
        category: 'serum', 
        price: 420
      },
      {
        id: 'product_4',
        name: '保湿面霜',
        brand: '兰蔻',
        image: 'https://via.placeholder.com/100x100?text=面霜',
        category: 'moisturizer',
        price: 480
      },
      {
        id: 'product_5',
        name: '防晒霜SPF50',
        brand: '雅诗兰黛',
        image: 'https://via.placeholder.com/100x100?text=防晒霜',
        category: 'sunscreen',
        price: 320
      }
    ]
    
    this.setData({
      availableProducts: fallbackProducts,
      filteredProducts: fallbackProducts,
      filteredMorningProducts: fallbackProducts,
      filteredEveningProducts: fallbackProducts
    })
  },

  // 加载统计数据
  async loadStatsData() {
    try {
      showLoading('加载统计数据...')
      
      const userInfo = app.globalData.userInfo
      if (!userInfo) {
        hideLoading()
        return
      }

      // 调用云函数获取统计数据
      const res = await wx.cloud.callFunction({
        name: 'diaryStats',
        data: {
          userId: userInfo.id
        }
      })

      hideLoading()

      if (res.result && res.result.success) {
        this.setData({
          statsData: res.result.data
        })
      } else {
        showToast('加载统计数据失败')
      }
    } catch (error) {
      hideLoading()
      console.error('加载统计数据失败:', error)
      showToast('加载统计数据失败')
    }
  },

  // 切换视图模式
  switchViewMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      viewMode: mode
    })
    
    // 如果切换到日历视图，生成日历数据
    if (mode === 'calendar') {
      this.generateCalendarData()
    }
    
    // 如果切换到统计视图，加载统计数据
    if (mode === 'chart') {
      this.loadStatsData()
    }
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
        morningRoutine: [],
        eveningRoutine: [],
        skinCondition: {
          moisture: 5,
          oiliness: 5,
          sensitivity: 5,
          breakouts: 5,
          overall: 5
        },
        mood: 'neutral',
        weather: {
          temperature: 20,
          humidity: 60,
          condition: 'sunny'
        },
        notes: '',
        photos: []
      }
    })
  },

  // 编辑日记
  editDiary(e) {
    const diaryId = e.currentTarget.dataset.id
    const diary = this.data.diaryList.find(item => (item.id === diaryId) || (item._id === diaryId))
    
    if (diary) {
      this.setData({
        showAddModal: true,
        editingId: diaryId,
        newDiary: {
          date: diary.date,
          morningRoutine: diary.morningRoutine || [],
          eveningRoutine: diary.eveningRoutine || [],
          skinCondition: diary.skinCondition || {
            moisture: 5,
            oiliness: 5,
            sensitivity: 5,
            breakouts: 5,
            overall: 5
          },
          mood: diary.mood || 'neutral',
          weather: diary.weather || {
            temperature: 20,
            humidity: 60,
            condition: 'sunny'
          },
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

  // 空处理函数：用于 catchtap 拦截事件冒泡
  noop() {
    // intentionally empty
  },

  // 选择日期
  onDateChange(e) {
    const date = e.detail.value
    this.setData({
      'newDiary.date': date
    })
  },

  // 肌肤状态变化
  onSkinConditionTap(e) {
    const field = e.currentTarget.dataset.field;
    const currentValue = this.data.newDiary.skinCondition[field];
    // 循环切换1-5等级
    const newValue = currentValue >= 5 ? 1 : currentValue + 1;
    this.setData({
      [`newDiary.skinCondition.${field}`]: newValue
    });
  },

  // 心情选择
  selectMood(e) {
    const mood = e.currentTarget.dataset.mood;
    this.setData({
      'newDiary.mood': mood
    });
  },

  // 选择天气状况
  selectWeatherCondition(e) {
    const condition = e.currentTarget.dataset.condition;
    this.setData({
      'newDiary.weather.condition': condition
    });
  },

  // 温度变化
  onTemperatureChange(e) {
    this.setData({
      'newDiary.weather.temperature': e.detail.value
    });
  },

  // 湿度变化
  onHumidityChange(e) {
    this.setData({
      'newDiary.weather.humidity': e.detail.value
    });
  },

  // 显示产品选择弹窗（指定早晚护肤）
  async showProductSelector(e) {
    const routineType = e.currentTarget.dataset.type || 'morning'
    
    // 获取当前已选择的产品ID，避免重复选择
    const currentRoutine = this.data.newDiary[`${routineType}Routine`] || []
    const currentProductIds = currentRoutine.map(item => item.productId)
    
    this.setData({
      showProductModal: true,
      currentRoutineType: routineType,
      selectedProducts: [],
      productSearchText: ''
    })
    
    // 如果还没有加载产品数据，则加载
    if (this.data.availableProducts.length === 0) {
      console.log('产品数据为空，开始加载产品列表')
      await this.loadAvailableProducts()
    }
    
    // 标记已选择的产品并设置筛选后的产品列表
    const availableProducts = this.data.availableProducts.map(product => ({
      ...product,
      selected: currentProductIds.includes(product.id)
    }))
    
    this.setData({
      filteredProducts: availableProducts
    })
  },

  // 确认产品选择
  confirmProducts() {
    const { selectedProducts, currentRoutineType, availableProducts } = this.data
    
    if (selectedProducts.length === 0) {
      wx.showToast({
        title: '请选择至少一个产品',
        icon: 'none'
      })
      return
    }
    
    // 构建护肤步骤数组
    const routineProducts = selectedProducts.map(productId => {
      const product = availableProducts.find(p => p.id === productId)
      return {
        productId: productId,
        productName: product ? product.name : '未知产品',
        productBrand: product ? product.brand : '',
        productCategory: product ? product.category : '',
        usage: '适量',
        notes: ''
      }
    })
    
    const currentRoutine = this.data.newDiary[`${currentRoutineType}Routine`] || []
    const updatedRoutine = [...currentRoutine, ...routineProducts]
    
    this.setData({
      [`newDiary.${currentRoutineType}Routine`]: updatedRoutine,
      showProductModal: false
    })
    
    wx.showToast({
      title: `已添加${selectedProducts.length}个产品`,
      icon: 'success'
    })
  },

  // 更新产品使用量
  onUsageInput(e) {
    const { routine, index } = e.currentTarget.dataset
    const value = e.detail.value
    const routineKey = `newDiary.${routine}Routine[${index}].usage`
    this.setData({
      [routineKey]: value
    })
  },

  // 更新产品使用感受
  onProductNotesInput(e) {
    const { routine, index } = e.currentTarget.dataset
    const value = e.detail.value
    const routineKey = `newDiary.${routine}Routine[${index}].notes`
    this.setData({
      [routineKey]: value
    })
    // 自动保存草稿
    this.autoSaveDraft()
  },

  // 删除护肤步骤中的产品
  removeProductFromRoutine(e) {
    const { routine, index } = e.currentTarget.dataset
    const currentRoutine = [...this.data.newDiary[`${routine}Routine`]]
    currentRoutine.splice(index, 1)
    this.setData({
      [`newDiary.${routine}Routine`]: currentRoutine
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
  // 产品搜索（防抖动版本）
  onProductSearch(e) {
    const searchText = e.detail.value.toLowerCase()
    this.setData({
      productSearchText: searchText
    })
    
    // 清除之前的搜索定时器
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
    }
    
    // 防抖动处理
    this.searchTimer = setTimeout(() => {
      this.performProductSearch(searchText)
    }, 300)
  },

  // 执行产品搜索
  performProductSearch(searchText) {
    if (searchText.trim() === '') {
      this.setData({
        filteredProducts: [...this.data.availableProducts]
      })
    } else {
      const filtered = this.data.availableProducts.filter(product => {
        const nameMatch = product.name.toLowerCase().includes(searchText)
        const brandMatch = product.brand.toLowerCase().includes(searchText)
        const categoryMatch = product.category && product.category.toLowerCase().includes(searchText)
        
        return nameMatch || brandMatch || categoryMatch
      })
      
      this.setData({
        filteredProducts: filtered
      })
      
      // 记录搜索历史（可选）
      if (searchText.length > 1) {
        this.recordSearchHistory(searchText)
      }
    }
  },

  // 记录搜索历史
  recordSearchHistory(searchText) {
    try {
      const { SearchStorage } = require('../../utils/storage')
      SearchStorage.addSearchHistory(searchText)
    } catch (error) {
      console.warn('记录搜索历史失败:', error)
    }
  },

  // 检查是否有草稿
  checkDraft() {
    try {
      const { StorageManager } = require('../../utils/storage')
      const draft = StorageManager.getItem('diary_draft')
      
      if (draft && draft.date) {
        this.setData({ hasDraft: true })
        
        // 询问是否恢复草稿
        wx.showModal({
          title: '发现草稿',
          content: `发现${draft.date}的日记草稿，是否恢复？`,
          confirmText: '恢复',
          cancelText: '删除',
          success: (res) => {
            if (res.confirm) {
              this.restoreDraft(draft)
            } else {
              this.clearDraft()
            }
          }
        })
      }
    } catch (error) {
      console.warn('检查草稿失败:', error)
    }
  },

  // 恢复草稿
  restoreDraft(draft) {
    // 恢复草稿时，严格只恢复日记内容，完全排除UI状态
    const cleanDraft = {
      date: draft.date || '',
      morningRoutine: draft.morningRoutine || [],
      eveningRoutine: draft.eveningRoutine || [],
      skinCondition: draft.skinCondition || {
        moisture: 5,
        oiliness: 5,
        sensitivity: 5,
        breakouts: 5,
        overall: 5
      },
      mood: draft.mood || 'neutral',
      weather: draft.weather || {
        temperature: 20,
        humidity: 60,
        condition: 'sunny'
      },
      notes: draft.notes || '',
      photos: draft.photos || []
    }
    
    this.setData({
      showAddModal: true,
      newDiary: cleanDraft,
      hasDraft: true,
      // 确保产品选择弹窗关闭
      showProductModal: false
    })
    showToast('草稿已恢复')
  },

  // 保存草稿
  saveDraft() {
    try {
      const { StorageManager } = require('../../utils/storage')
      const { newDiary } = this.data
      
      // 只有在有内容时才保存草稿
      if (this.isDiaryNotEmpty(newDiary)) {
        // 保存草稿时，只保存日记内容，严格过滤掉所有UI状态字段
        const draftData = {
          date: newDiary.date,
          morningRoutine: newDiary.morningRoutine,
          eveningRoutine: newDiary.eveningRoutine,
          skinCondition: newDiary.skinCondition,
          mood: newDiary.mood,
          weather: newDiary.weather,
          notes: newDiary.notes,
          photos: newDiary.photos,
          draftTime: Date.now()
        }
        StorageManager.setItem('diary_draft', draftData)
        console.log('草稿已保存')
      }
    } catch (error) {
      console.warn('保存草稿失败:', error)
    }
  },

  // 清除草稿
  clearDraft() {
    try {
      const { StorageManager } = require('../../utils/storage')
      StorageManager.removeItem('diary_draft')
      this.setData({ hasDraft: false })
      console.log('草稿已清除')
    } catch (error) {
      console.warn('清除草稿失败:', error)
    }
  },

  // 清除可能包含UI状态的错误草稿数据
  clearCorruptedDraft() {
    try {
      const { StorageManager } = require('../../utils/storage')
      const draft = StorageManager.getItem('diary_draft')
      
      if (draft && (draft.showProductModal || draft.showAddModal)) {
        console.log('发现包含UI状态的草稿，正在清除...')
        // 如果草稿包含UI状态，清除整个草稿
        StorageManager.removeItem('diary_draft')
        console.log('已清除包含UI状态的错误草稿')
      }
    } catch (error) {
      console.warn('清除错误草稿失败:', error)
      // 如果出现任何错误，直接清除草稿以确保安全
      try {
        const { StorageManager } = require('../../utils/storage')
        StorageManager.removeItem('diary_draft')
      } catch (e) {
        console.error('强制清除草稿失败:', e)
      }
    }
  },

  // 检查日记是否有内容
  isDiaryNotEmpty(diary) {
    return diary.notes.trim() !== '' ||
           diary.morningRoutine.length > 0 ||
           diary.eveningRoutine.length > 0 ||
           diary.photos.length > 0 ||
           diary.mood !== 'neutral' ||
           diary.skinCondition.overall !== 5
  },

  // 自动保存草稿
  autoSaveDraft() {
    // 清除之前的定时器
    if (this.draftTimer) {
      clearTimeout(this.draftTimer)
    }
    
    // 延迟保存，避免频繁操作
    this.draftTimer = setTimeout(() => {
      this.saveDraft()
    }, 2000)
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
    
    // 检查是否已在当前护肤步骤中
    const currentRoutine = this.data.currentRoutineType === 'morning' ? 
      this.data.newDiary.morningRoutine : this.data.newDiary.eveningRoutine;
    const isInCurrentRoutine = currentRoutine.some(item => item.productId === productId);
    
    if (isInCurrentRoutine) {
      wx.showToast({
        title: '该产品已在当前护肤步骤中',
        icon: 'none'
      });
      return;
    }
    
    if (index > -1) {
      selectedProducts.splice(index, 1)
    } else {
      selectedProducts.push(productId)
    }
    
    this.setData({
      selectedProducts
    })
  },

  // 输入备注
  onNotesInput(e) {
    this.setData({
      'newDiary.notes': e.detail.value
    })
    // 自动保存草稿
    this.autoSaveDraft()
  },

  // 选择照片（带压缩优化）
  async choosePhotos() {
    try {
      showLoading('处理图片中...')
      
      const res = await new Promise((resolve, reject) => {
        wx.chooseImage({
          count: 3 - this.data.newDiary.photos.length,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: reject
        })
      })

      // 压缩图片
      const compressedPhotos = await this.compressImages(res.tempFilePaths)
      const photos = [...this.data.newDiary.photos, ...compressedPhotos]
      
      this.setData({
        'newDiary.photos': photos
      })
      
      hideLoading()
      showToast('图片添加成功')
    } catch (error) {
      hideLoading()
      console.error('选择图片失败:', error)
      showToast('图片处理失败，请重试')
    }
  },

  // 图片压缩
  async compressImages(imagePaths) {
    const compressedPaths = []
    
    for (const imagePath of imagePaths) {
      try {
        // 获取图片信息
        const imageInfo = await new Promise((resolve, reject) => {
          wx.getImageInfo({
            src: imagePath,
            success: resolve,
            fail: reject
          })
        })

        // 如果图片过大，进行压缩
        if (imageInfo.width > 1200 || imageInfo.height > 1200) {
          const canvas = wx.createCanvasContext('imageCanvas', this)
          const maxSize = 1200
          let { width, height } = imageInfo
          
          // 计算压缩比例
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width
              width = maxSize
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height
              height = maxSize
            }
          }

          // 绘制压缩后的图片
          canvas.drawImage(imagePath, 0, 0, width, height)
          canvas.draw(false, async () => {
            try {
              const compressedPath = await new Promise((resolve, reject) => {
                wx.canvasToTempFilePath({
                  canvasId: 'imageCanvas',
                  destWidth: width,
                  destHeight: height,
                  quality: 0.8,
                  success: (res) => resolve(res.tempFilePath),
                  fail: reject
                }, this)
              })
              compressedPaths.push(compressedPath)
            } catch (error) {
              console.warn('图片压缩失败，使用原图:', error)
              compressedPaths.push(imagePath)
            }
          })
        } else {
          compressedPaths.push(imagePath)
        }
      } catch (error) {
        console.warn('获取图片信息失败，使用原图:', error)
        compressedPaths.push(imagePath)
      }
    }
    
    return compressedPaths
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

  // 表单验证
  validateForm() {
    const { newDiary } = this.data
    
    // 验证日期
    if (!newDiary.date) {
      showToast('请选择日期')
      return false
    }
    
    // 验证日期不能是未来
    const selectedDate = new Date(newDiary.date)
    const today = new Date()
    today.setHours(23, 59, 59, 999) // 设置为今天的最后一刻
    
    if (selectedDate > today) {
      showToast('不能选择未来的日期')
      return false
    }
    
    // 验证备注长度
    if (newDiary.notes && newDiary.notes.length > 200) {
      showToast('备注不能超过200字')
      return false
    }
    
    // 验证照片数量
    if (newDiary.photos && newDiary.photos.length > 3) {
      showToast('最多只能上传3张照片')
      return false
    }
    
    // 验证肌肤状态数值范围
    const { skinCondition } = newDiary
    const skinFields = ['moisture', 'oiliness', 'sensitivity', 'breakouts', 'overall']
    for (let field of skinFields) {
      if (skinCondition[field] < 1 || skinCondition[field] > 10) {
        showToast(`${field}评分必须在1-10之间`)
        return false
      }
    }
    
    // 验证天气数据
    const { weather } = newDiary
    if (weather.temperature < -50 || weather.temperature > 60) {
      showToast('温度范围应在-50°C到60°C之间')
      return false
    }
    
    if (weather.humidity < 0 || weather.humidity > 100) {
      showToast('湿度范围应在0%到100%之间')
      return false
    }
    
    return true
  },

  // 保存日记
  async saveDiary() {
    try {
      const { newDiary, editingId } = this.data
      
      // 表单验证
      if (!this.validateForm()) {
        return
      }
      
      showLoading(editingId ? '更新中...' : '保存中...')
      
      const userInfo = app.globalData.userInfo
      if (!userInfo) return

      const requestData = {
        ...newDiary,
        userId: userInfo.id
      }

      const res = editingId 
        ? await request.put(`/api/diary/${editingId}`, requestData)
        : await request.post('/api/diary/create', requestData)

      if (res.success) {
        showToast(editingId ? '更新成功' : '保存成功')
        // 清除草稿
        this.clearDraft()
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
    if (!diaryId) {
      console.error('删除失败：未获取到日记ID', e)
      showToast('删除失败：记录ID异常')
      return
    }
    
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条日记吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            showLoading('删除中...')
            const userId = (this.data.userInfo && (this.data.userInfo._id || this.data.userInfo.id)) || ''
            const result = await request.delete(`/api/diary/${diaryId}`, { diaryId, userId })

            if (result.code === 0 || result.success) {
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

  // 生成日历数据
  generateCalendarData() {
    const currentDate = new Date(this.data.currentDate)
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // 获取第一天是星期几（0=周日，1=周一...）
    const firstDayWeek = firstDay.getDay()
    
    // 获取当月天数
    const daysInMonth = lastDay.getDate()
    
    // 生成日历网格数据
    const calendarDays = []
    
    // 添加上个月的日期（填充空白）
    const prevMonth = new Date(year, month - 1, 0)
    const prevMonthDays = prevMonth.getDate()
    for (let i = firstDayWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i
      const date = this.formatDate(new Date(year, month - 1, day))
      calendarDays.push({
        day: day,
        date: date,
        isCurrentMonth: false,
        isToday: false,
        hasDiary: this.data.calendarData[date] ? true : false,
        diaryData: this.data.calendarData[date] || null
      })
    }
    
    // 添加当月的日期
    const today = this.formatDate(new Date())
    for (let day = 1; day <= daysInMonth; day++) {
      const date = this.formatDate(new Date(year, month, day))
      const isToday = date === today
      calendarDays.push({
        day: day,
        date: date,
        isCurrentMonth: true,
        isToday: isToday,
        hasDiary: this.data.calendarData[date] ? true : false,
        diaryData: this.data.calendarData[date] || null
      })
    }
    
    // 添加下个月的日期（填充到42个格子，6行7列）
    const remainingDays = 42 - calendarDays.length
    for (let day = 1; day <= remainingDays; day++) {
      const date = this.formatDate(new Date(year, month + 1, day))
      calendarDays.push({
        day: day,
        date: date,
        isCurrentMonth: false,
        isToday: false,
        hasDiary: this.data.calendarData[date] ? true : false,
        diaryData: this.data.calendarData[date] || null
      })
    }
    
    this.setData({
      calendarDays: calendarDays,
      currentYear: year,
      currentMonth: month + 1
    })
  },

  // 切换到上个月
  prevMonth() {
    const currentDate = new Date(this.data.currentDate)
    currentDate.setMonth(currentDate.getMonth() - 1)
    const newDate = this.formatDate(currentDate)
    
    this.setData({
      currentDate: newDate
    })
    
    this.generateCalendarData()
  },

  // 切换到下个月
  nextMonth() {
    const currentDate = new Date(this.data.currentDate)
    currentDate.setMonth(currentDate.getMonth() + 1)
    const newDate = this.formatDate(currentDate)
    
    this.setData({
      currentDate: newDate
    })
    
    this.generateCalendarData()
  },

  // 回到今天
  goToToday() {
    const today = this.formatDate(new Date())
    this.setData({
      currentDate: today,
      selectedDate: today
    })
    
    this.generateCalendarData()
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
      const idForNav = diary._id || diary.id
      this.viewDiaryDetail({ currentTarget: { dataset: { id: idForNav } } })
    } else {
      this.showAddDiary()
    }
  },

  // 获取心情对应的颜色
  getMoodColor(mood) {
    const moodOption = this.data.moodOptions.find(option => option.id === mood)
    return moodOption ? moodOption.color : '#FFC107'
  },

  // 获取肌肤状态平均值
  getSkinConditionAverage(skinCondition) {
    if (typeof skinCondition === 'number') {
      return skinCondition
    }
    if (typeof skinCondition === 'object' && skinCondition) {
      const values = Object.values(skinCondition).filter(val => typeof val === 'number')
      return values.length > 0 ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length) : 5
    }
    return 5
  },

  // 显示导出选项
  showExportOptions() {
    wx.showActionSheet({
      itemList: ['导出为Excel', '导出为PDF', '本地备份', '云端备份'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.exportDiary('excel')
            break
          case 1:
            this.exportDiary('pdf')
            break
          case 2:
            this.createLocalBackup()
            break
          case 3:
            this.createCloudBackup()
            break
        }
      }
    })
  },

  // 导出日记数据
  async exportDiary(format = 'excel') {
    try {
      showLoading('导出中...')
      
      const userInfo = app.globalData.userInfo
      if (!userInfo) {
        showToast('请先登录')
        return
      }

      // 获取所有日记数据
      const res = await request.callCloudFunction('getDiaryList', {
        userId: userInfo.id,
        page: 1,
        pageSize: 9999, // 获取所有数据
        exportMode: true
      })

      if (res.success && res.data) {
        const exportData = this.formatExportData(res.data, format)
        
        if (format === 'excel') {
          await this.exportToExcel(exportData)
        } else if (format === 'pdf') {
          await this.exportToPDF(exportData)
        }
        
        showToast('导出成功')
      } else {
        throw new Error(res.message || '获取数据失败')
      }
    } catch (error) {
      showToast(error.message || '导出失败')
      console.error('导出日记失败:', error)
    } finally {
      hideLoading()
    }
  },

  // 格式化导出数据
  formatExportData(diaries, format) {
    return diaries.map(diary => {
      const morningProducts = diary.morningRoutine?.map(p => `${p.name}(${p.usage || ''})`).join(', ') || '无'
      const eveningProducts = diary.eveningRoutine?.map(p => `${p.name}(${p.usage || ''})`).join(', ') || '无'
      const skinScore = this.getSkinConditionAverage(diary.skinCondition)
      const moodInfo = this.moodOptions.find(m => m.id === diary.mood)
      const weatherInfo = this.weatherOptions.find(w => w.id === diary.weather?.condition)

      return {
        日期: diary.date,
        早间护肤: morningProducts,
        晚间护肤: eveningProducts,
        肌肤状态: `${skinScore}/10`,
        水分: diary.skinCondition?.moisture || 0,
        油分: diary.skinCondition?.oiliness || 0,
        敏感度: diary.skinCondition?.sensitivity || 0,
        痘痘: diary.skinCondition?.breakouts || 0,
        心情: moodInfo?.name || '未知',
        天气: weatherInfo?.name || '未知',
        温度: `${diary.weather?.temperature || 0}°C`,
        湿度: `${diary.weather?.humidity || 0}%`,
        备注: diary.notes || '无',
        照片数量: diary.photos?.length || 0
      }
    })
  },

  // 导出为Excel格式
  async exportToExcel(data) {
    try {
      // 创建CSV格式数据
      const headers = Object.keys(data[0] || {})
      let csvContent = headers.join(',') + '\n'
      
      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header] || ''
          // 处理包含逗号的值
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        })
        csvContent += values.join(',') + '\n'
      })

      // 保存文件
      const fileName = `护肤日记_${formatDate(new Date(), 'YYYY-MM-DD')}.csv`
      
      wx.saveFile({
        tempFilePath: csvContent,
        success: (res) => {
          wx.showModal({
            title: '导出成功',
            content: `文件已保存到: ${res.savedFilePath}`,
            showCancel: false
          })
        },
        fail: (error) => {
          console.error('保存文件失败:', error)
          // 尝试分享文件
          this.shareExportData(csvContent, fileName)
        }
      })
    } catch (error) {
      console.error('导出Excel失败:', error)
      throw error
    }
  },

  // 导出为PDF格式（简化版）
  async exportToPDF(data) {
    try {
      // 创建文本格式的报告
      let pdfContent = '护肤日记报告\n'
      pdfContent += `导出时间: ${formatDate(new Date())}\n`
      pdfContent += `总记录数: ${data.length}\n\n`
      
      data.forEach((diary, index) => {
        pdfContent += `${index + 1}. ${diary.日期}\n`
        pdfContent += `   早间护肤: ${diary.早间护肤}\n`
        pdfContent += `   晚间护肤: ${diary.晚间护肤}\n`
        pdfContent += `   肌肤状态: ${diary.肌肤状态}\n`
        pdfContent += `   心情: ${diary.心情}\n`
        pdfContent += `   天气: ${diary.天气} ${diary.温度} 湿度${diary.湿度}\n`
        if (diary.备注 !== '无') {
          pdfContent += `   备注: ${diary.备注}\n`
        }
        pdfContent += '\n'
      })

      const fileName = `护肤日记报告_${formatDate(new Date(), 'YYYY-MM-DD')}.txt`
      this.shareExportData(pdfContent, fileName)
    } catch (error) {
      console.error('导出PDF失败:', error)
      throw error
    }
  },

  // 分享导出数据
  shareExportData(content, fileName) {
    wx.showModal({
      title: '导出完成',
      content: '是否要分享导出的数据？',
      success: (res) => {
        if (res.confirm) {
          // 这里可以实现分享功能
          wx.showToast({
            title: '请通过其他方式分享',
            icon: 'none'
          })
        }
      }
    })
  },

  // 创建本地备份
  async createLocalBackup() {
    try {
      showLoading('创建备份中...')
      
      const userInfo = app.globalData.userInfo
      if (!userInfo) {
        showToast('请先登录')
        return
      }

      // 获取所有本地数据
      const diaryData = this.data.diaryList
      const backupData = {
        version: '1.0',
        timestamp: Date.now(),
        userId: userInfo.id,
        diaries: diaryData,
        settings: wx.getStorageSync('app_settings') || {},
        userPreferences: wx.getStorageSync('user_preferences') || {}
      }

      // 保存到本地存储
      const backupKey = `backup_${formatDate(new Date(), 'YYYY-MM-DD_HH-mm-ss')}`
      wx.setStorageSync(backupKey, backupData)
      
      // 记录备份历史
      let backupHistory = wx.getStorageSync('backup_history') || []
      backupHistory.unshift({
        key: backupKey,
        timestamp: Date.now(),
        size: JSON.stringify(backupData).length,
        count: diaryData.length
      })
      
      // 只保留最近10个备份
      if (backupHistory.length > 10) {
        const oldBackups = backupHistory.slice(10)
        oldBackups.forEach(backup => {
          wx.removeStorageSync(backup.key)
        })
        backupHistory = backupHistory.slice(0, 10)
      }
      
      wx.setStorageSync('backup_history', backupHistory)
      
      showToast('本地备份创建成功')
    } catch (error) {
      showToast('备份失败')
      console.error('创建本地备份失败:', error)
    } finally {
      hideLoading()
    }
  },

  // 创建云端备份
  async createCloudBackup() {
    try {
      showLoading('上传备份中...')
      
      const userInfo = app.globalData.userInfo
      if (!userInfo) {
        showToast('请先登录')
        return
      }

      const backupData = {
        userId: userInfo.id,
        timestamp: Date.now(),
        diaries: this.data.diaryList,
        settings: wx.getStorageSync('app_settings') || {},
        userPreferences: wx.getStorageSync('user_preferences') || {}
      }

      const res = await request.callCloudFunction('createBackup', backupData)
      
      if (res.success) {
        showToast('云端备份创建成功')
      } else {
        throw new Error(res.message || '备份失败')
      }
    } catch (error) {
      showToast(error.message || '云端备份失败')
      console.error('创建云端备份失败:', error)
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
  },

  // 清除搜索
  clearSearch() {
    this.setData({
      productSearchText: '',
      searchSuggestions: [],
      filteredProducts: this.data.availableProducts
    })
  },

  // 选择搜索建议
  selectSuggestion(e) {
    const text = e.currentTarget.dataset.text
    this.setData({
      productSearchText: text,
      searchSuggestions: []
    })
    this.performProductSearch(text)
  },

  // 选择产品分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      selectedCategory: category
    })
    this.filterProductsByCategory(category)
  },

  // 按分类筛选产品
  filterProductsByCategory(category) {
    const { availableProducts } = this.data
    let filtered = availableProducts
    
    if (category !== 'all') {
      filtered = availableProducts.filter(product => 
        product.category === category
      )
    }
    
    this.setData({
      filteredProducts: filtered
    })
  },

  // 恢复草稿（从头部按钮触发）
  restoreDraft() {
    try {
      const draft = wx.getStorageSync('diary_draft')
      if (draft) {
        wx.showModal({
          title: '恢复草稿',
          content: '发现未完成的日记草稿，是否恢复？',
          success: (res) => {
            if (res.confirm) {
              // 严格过滤草稿数据，只保留日记内容
              const cleanDraft = {
                date: draft.date || '',
                morningRoutine: draft.morningRoutine || [],
                eveningRoutine: draft.eveningRoutine || [],
                skinCondition: draft.skinCondition || {
                  moisture: 5,
                  oiliness: 5,
                  sensitivity: 5,
                  breakouts: 5,
                  overall: 5
                },
                mood: draft.mood || 'neutral',
                weather: draft.weather || {
                  temperature: 20,
                  humidity: 60,
                  condition: 'sunny'
                },
                notes: draft.notes || '',
                photos: draft.photos || []
              }
              
              this.setData({
                newDiary: cleanDraft,
                showAddModal: true,
                hasDraft: false,
                // 确保产品选择弹窗关闭
                showProductModal: false
              })
              showToast('草稿已恢复')
            }
          }
        })
      }
    } catch (error) {
      console.error('恢复草稿失败:', error)
    }
  },

  // 新的选择框相关方法
  
  // 切换产品选择框显示状态
  toggleProductSelector(e) {
    const type = e.currentTarget.dataset.type
    const showKey = `show${type.charAt(0).toUpperCase() + type.slice(1)}Selector`
    const currentShow = this.data[showKey]
    
    // 如果还没有加载产品数据，则先加载
    if (this.data.availableProducts.length === 0) {
      this.loadAvailableProducts()
    }
    
    // 更新已选产品的状态
    this.updateProductSelectionStatus(type)
    
    this.setData({
      [showKey]: !currentShow,
      // 关闭另一个选择框
      [`show${type === 'morning' ? 'Evening' : 'Morning'}Selector`]: false
    })
  },

  // 更新产品选择状态
  updateProductSelectionStatus(type) {
    const currentRoutine = this.data.newDiary[`${type}Routine`] || []
    const currentProductIds = currentRoutine.map(item => item.productId)
    
    const updatedProducts = this.data.availableProducts.map(product => ({
      ...product,
      selected: currentProductIds.includes(product.id)
    }))
    
    this.setData({
      [`filtered${type.charAt(0).toUpperCase() + type.slice(1)}Products`]: updatedProducts
    })
  },

  // 切换产品选择状态
  toggleProductSelection(e) {
    const product = e.currentTarget.dataset.product
    const type = e.currentTarget.dataset.type
    const productId = product.id
    
    // 检查是否已在当前护肤步骤中
    const currentRoutine = this.data.newDiary[`${type}Routine`] || []
    const existingIndex = currentRoutine.findIndex(item => item.productId === productId)
    
    if (existingIndex > -1) {
      // 如果已存在，则移除
      currentRoutine.splice(existingIndex, 1)
      wx.showToast({
        title: '已移除产品',
        icon: 'success'
      })
    } else {
      // 如果不存在，则添加
      const newProduct = {
        productId: productId,
        productName: product.name,
        productBrand: product.brand,
        productCategory: product.category,
        usage: '适量',
        notes: ''
      }
      currentRoutine.push(newProduct)
      wx.showToast({
        title: '已添加产品',
        icon: 'success'
      })
    }
    
    // 更新数据
    this.setData({
      [`newDiary.${type}Routine`]: currentRoutine
    })
    
    // 更新产品选择状态
    this.updateProductSelectionStatus(type)
    
    // 自动保存草稿
    this.autoSaveDraft()
  },

  // 早间产品搜索
  onMorningProductSearch(e) {
    const searchText = e.detail.value.toLowerCase()
    this.setData({
      morningSearchText: searchText
    })
    
    this.performProductFilter('morning', searchText)
  },

  // 晚间产品搜索
  onEveningProductSearch(e) {
    const searchText = e.detail.value.toLowerCase()
    this.setData({
      eveningSearchText: searchText
    })
    
    this.performProductFilter('evening', searchText)
  },

  // 执行产品筛选
  performProductFilter(type, searchText) {
    const currentRoutine = this.data.newDiary[`${type}Routine`] || []
    const currentProductIds = currentRoutine.map(item => item.productId)
    
    let filtered = this.data.availableProducts.map(product => ({
      ...product,
      selected: currentProductIds.includes(product.id)
    }))
    
    if (searchText.trim() !== '') {
      filtered = filtered.filter(product => {
        const nameMatch = product.name.toLowerCase().includes(searchText)
        const brandMatch = product.brand.toLowerCase().includes(searchText)
        const categoryMatch = product.category && product.category.toLowerCase().includes(searchText)
        
        return nameMatch || brandMatch || categoryMatch
      })
    }
    
    this.setData({
      [`filtered${type.charAt(0).toUpperCase() + type.slice(1)}Products`]: filtered
    })
  }
})