// pages/products/products.js
const app = getApp()
const { request } = require('../../utils/request')
const { showToast, showLoading, hideLoading, formatDate } = require('../../utils/utils')

Page({
  data: {
    // 当前标签页
    currentTab: 'products', // products, ingredients, brands, favorites
    
    // 产品列表
    productList: [],
    currentPage: 1,
    hasMore: true,
    
    // 成分列表
    ingredientList: [],
    
    // 品牌列表
    brandList: [],
    
    // 收藏列表
    favoriteList: [],
    
    // 搜索相关
    searchKeyword: '',
    showSearch: false,
    searchHistory: [],
    hotSearches: ['玻尿酸', '烟酰胺', '维C', '水杨酸', '视黄醇'],
    
    // 筛选条件
    filterOptions: {
      category: 'all', // all, cleanser, toner, serum, moisturizer, sunscreen
      skinType: 'all', // all, dry, oily, combination, sensitive, normal
      priceRange: 'all', // all, low, medium, high
      brand: 'all'
    },
    showFilter: false,
    
    // 分类选项
    categories: [
      { id: 'all', name: '全部', icon: '🏷️' },
      { id: 'cleanser', name: '洁面', icon: '🧼' },
      { id: 'toner', name: '爽肤水', icon: '💧' },
      { id: 'serum', name: '精华', icon: '✨' },
      { id: 'moisturizer', name: '面霜', icon: '🧴' },
      { id: 'sunscreen', name: '防晒', icon: '☀️' },
      { id: 'mask', name: '面膜', icon: '🎭' }
    ],
    
    // 肌肤类型选项
    skinTypes: [
      { id: 'all', name: '全部肌肤' },
      { id: 'dry', name: '干性肌肤' },
      { id: 'oily', name: '油性肌肤' },
      { id: 'combination', name: '混合性肌肤' },
      { id: 'sensitive', name: '敏感性肌肤' },
      { id: 'normal', name: '中性肌肤' }
    ],
    
    // 价格区间
    priceRanges: [
      { id: 'all', name: '全部价格' },
      { id: 'low', name: '100元以下' },
      { id: 'medium', name: '100-500元' },
      { id: 'high', name: '500元以上' }
    ],
    
    // 产品详情
    selectedProduct: null,
    showProductDetail: false,
    
    // 成分详情
    selectedIngredient: null,
    showIngredientDetail: false,
    
    // 用户信息
    userInfo: null
  },

  onLoad(options) {
    this.getUserInfo()
    this.loadProductList()
    this.loadSearchHistory()
    this.loadHotSearches()
    
    // 检查传入的标签页参数
    if (options.tab) {
      this.setData({
        currentTab: options.tab
      })
      this.loadTabData(options.tab)
    }
  },

  onShow() {
    // 页面显示时刷新收藏状态
    if (this.data.currentTab === 'favorites') {
      this.loadFavoriteList()
    }
  },

  onPullDownRefresh() {
    this.loadTabData(this.data.currentTab, true)
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    if (this.data.hasMore) {
      this.loadMoreData()
    }
  },

  // 获取用户信息
  getUserInfo() {
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({ userInfo })
    }
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      currentTab: tab,
      currentPage: 1,
      hasMore: true
    })
    this.loadTabData(tab)
  },

  // 加载标签页数据
  loadTabData(tab, refresh = false) {
    switch (tab) {
      case 'products':
        this.loadProductList(refresh)
        break
      case 'ingredients':
        this.loadIngredientList(refresh)
        break
      case 'brands':
        this.loadBrandList(refresh)
        break
      case 'favorites':
        this.loadFavoriteList(refresh)
        break
    }
  },

  // 加载产品列表
  async loadProductList(refresh = false) {
    try {
      if (refresh) {
        this.setData({
          currentPage: 1,
          hasMore: true
        })
      }
      
      showLoading('加载中...')
      
      const res = await request({
        url: '/api/products/list',
        method: 'GET',
        data: {
          page: refresh ? 1 : this.data.currentPage,
          limit: 10,
          keyword: this.data.searchKeyword,
          ...this.data.filterOptions
        }
      })

      if (res.success) {
        const newList = res.data.products || []
        this.setData({
          productList: refresh ? newList : [...this.data.productList, ...newList],
          hasMore: newList.length >= 10,
          currentPage: refresh ? 2 : this.data.currentPage + 1
        })
      }
    } catch (error) {
      showToast('加载失败')
      console.error('加载产品列表失败:', error)
    } finally {
      hideLoading()
    }
  },

  // 加载成分列表
  async loadIngredientList(refresh = false) {
    try {
      showLoading('加载中...')
      
      const res = await request({
        url: '/api/ingredients/list',
        method: 'GET',
        data: {
          page: refresh ? 1 : this.data.currentPage,
          limit: 20,
          keyword: this.data.searchKeyword
        }
      })

      if (res.success) {
        const newList = res.data.ingredients || []
        this.setData({
          ingredientList: refresh ? newList : [...this.data.ingredientList, ...newList],
          hasMore: newList.length >= 20,
          currentPage: refresh ? 2 : this.data.currentPage + 1
        })
      }
    } catch (error) {
      showToast('加载失败')
      console.error('加载成分列表失败:', error)
    } finally {
      hideLoading()
    }
  },

  // 加载品牌列表
  async loadBrandList(refresh = false) {
    try {
      showLoading('加载中...')
      
      const res = await request({
        url: '/api/brands/list',
        method: 'GET',
        data: {
          page: refresh ? 1 : this.data.currentPage,
          limit: 15,
          keyword: this.data.searchKeyword
        }
      })

      if (res.success) {
        const newList = res.data.brands || []
        this.setData({
          brandList: refresh ? newList : [...this.data.brandList, ...newList],
          hasMore: newList.length >= 15,
          currentPage: refresh ? 2 : this.data.currentPage + 1
        })
      }
    } catch (error) {
      showToast('加载失败')
      console.error('加载品牌列表失败:', error)
    } finally {
      hideLoading()
    }
  },

  // 加载收藏列表
  async loadFavoriteList(refresh = false) {
    try {
      const userInfo = app.globalData.userInfo
      if (!userInfo) return

      showLoading('加载中...')
      
      const res = await request({
        url: `/api/favorites/list/${userInfo.id}`,
        method: 'GET',
        data: {
          page: refresh ? 1 : this.data.currentPage,
          limit: 10
        }
      })

      if (res.success) {
        const newList = res.data.favorites || []
        this.setData({
          favoriteList: refresh ? newList : [...this.data.favoriteList, ...newList],
          hasMore: newList.length >= 10,
          currentPage: refresh ? 2 : this.data.currentPage + 1
        })
      }
    } catch (error) {
      showToast('加载失败')
      console.error('加载收藏列表失败:', error)
    } finally {
      hideLoading()
    }
  },

  // 加载更多数据
  loadMoreData() {
    this.loadTabData(this.data.currentTab)
  },

  // 显示搜索
  showSearchBar() {
    this.setData({
      showSearch: true
    })
  },

  // 隐藏搜索
  hideSearchBar() {
    this.setData({
      showSearch: false,
      searchKeyword: ''
    })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
  },

  // 执行搜索
  performSearch() {
    const keyword = this.data.searchKeyword.trim()
    if (!keyword) return

    // 保存搜索历史
    this.saveSearchHistory(keyword)
    
    // 重新加载数据
    this.setData({
      currentPage: 1,
      hasMore: true
    })
    this.loadTabData(this.data.currentTab, true)
  },

  // 热门搜索点击
  onHotSearchTap(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({
      searchKeyword: keyword
    })
    this.performSearch()
  },

  // 搜索历史点击
  onSearchHistoryTap(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({
      searchKeyword: keyword
    })
    this.performSearch()
  },

  // 清空搜索历史
  clearSearchHistory() {
    wx.removeStorageSync('searchHistory')
    this.setData({
      searchHistory: []
    })
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    let history = this.data.searchHistory
    
    // 移除重复项
    history = history.filter(item => item !== keyword)
    
    // 添加到开头
    history.unshift(keyword)
    
    // 限制数量
    if (history.length > 10) {
      history = history.slice(0, 10)
    }
    
    this.setData({
      searchHistory: history
    })
    
    wx.setStorageSync('searchHistory', history)
  },

  // 加载搜索历史
  loadSearchHistory() {
    const history = wx.getStorageSync('searchHistory') || []
    this.setData({
      searchHistory: history
    })
  },

  // 加载热门搜索
  async loadHotSearches() {
    try {
      const res = await request({
        url: '/api/search/hot',
        method: 'GET'
      })

      if (res.success) {
        this.setData({
          hotSearches: res.data.keywords || this.data.hotSearches
        })
      }
    } catch (error) {
      console.error('加载热门搜索失败:', error)
    }
  },

  // 显示筛选
  showFilterPanel() {
    this.setData({
      showFilter: true
    })
  },

  // 隐藏筛选
  hideFilterPanel() {
    this.setData({
      showFilter: false
    })
  },

  // 选择筛选条件
  selectFilter(e) {
    const { type, value } = e.currentTarget.dataset
    this.setData({
      [`filterOptions.${type}`]: value
    })
  },

  // 重置筛选
  resetFilter() {
    this.setData({
      filterOptions: {
        category: 'all',
        skinType: 'all',
        priceRange: 'all',
        brand: 'all'
      }
    })
  },

  // 应用筛选
  applyFilter() {
    this.setData({
      showFilter: false,
      currentPage: 1,
      hasMore: true
    })
    this.loadTabData(this.data.currentTab, true)
  },

  // 查看产品详情
  viewProductDetail(e) {
    const productId = e.currentTarget.dataset.id
    const product = this.data.productList.find(item => item.id === productId)
    
    if (product) {
      this.setData({
        selectedProduct: product,
        showProductDetail: true
      })
    }
  },

  // 关闭产品详情
  closeProductDetail() {
    this.setData({
      showProductDetail: false,
      selectedProduct: null
    })
  },

  // 查看成分详情
  viewIngredientDetail(e) {
    const ingredientId = e.currentTarget.dataset.id
    const ingredient = this.data.ingredientList.find(item => item.id === ingredientId)
    
    if (ingredient) {
      this.setData({
        selectedIngredient: ingredient,
        showIngredientDetail: true
      })
    }
  },

  // 关闭成分详情
  closeIngredientDetail() {
    this.setData({
      showIngredientDetail: false,
      selectedIngredient: null
    })
  },

  // 收藏/取消收藏产品
  async toggleFavorite(e) {
    const productId = e.currentTarget.dataset.id
    const userInfo = app.globalData.userInfo
    
    if (!userInfo) {
      wx.navigateTo({
        url: '/pages/login/login'
      })
      return
    }

    try {
      const res = await request({
        url: '/api/favorites/toggle',
        method: 'POST',
        data: {
          userId: userInfo.id,
          productId: productId,
          type: 'product'
        }
      })

      if (res.success) {
        showToast(res.data.isFavorited ? '已收藏' : '已取消收藏')
        
        // 更新产品列表中的收藏状态
        const productList = this.data.productList.map(item => {
          if (item.id === productId) {
            return { ...item, isFavorited: res.data.isFavorited }
          }
          return item
        })
        
        this.setData({ productList })
        
        // 如果在收藏页面，刷新列表
        if (this.data.currentTab === 'favorites') {
          this.loadFavoriteList(true)
        }
      }
    } catch (error) {
      showToast('操作失败')
      console.error('收藏操作失败:', error)
    }
  },

  // 查看品牌详情
  viewBrandDetail(e) {
    const brandId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/brand-detail/brand-detail?id=${brandId}`
    })
  },

  // 查看产品完整信息
  viewFullProduct(e) {
    const productId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${productId}`
    })
  },

  // 分享产品
  shareProduct(e) {
    const productId = e.currentTarget.dataset.id
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '护肤产品知识库 - Skin-care护肤助手',
      path: '/pages/products/products',
      imageUrl: '/images/share-products.jpg'
    }
  }
})