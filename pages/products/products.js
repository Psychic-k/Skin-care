// pages/products/products.js
const app = getApp()
const cloudApi = require('../../utils/cloudApi')

Page({
  data: {
    // 当前标签页
    currentTab: 'products', // products, ingredients, brands, favorites
    
    // 产品列表
    productList: [],
    filteredProducts: [],
    currentPage: 1,
    hasMore: true,
    loading: false,
    
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
    userInfo: null,
    
    // 排序选项
    sortOptions: [
      { id: 'default', name: '默认排序' },
      { id: 'price_asc', name: '价格从低到高' },
      { id: 'price_desc', name: '价格从高到低' },
      { id: 'rating', name: '评分最高' },
      { id: 'sales', name: '销量最高' },
      { id: 'newest', name: '最新上架' }
    ],
    currentSort: 'default'
  },

  onLoad(options) {
    this.getUserInfo()
    this.loadInitialData()
    this.loadSearchHistory()
    
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
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreData()
    }
  },

  // 获取用户信息
  async getUserInfo() {
    try {
      // 先从本地存储获取
      const localUserInfo = wx.getStorageSync('userInfo') || app.globalData.userInfo
      if (localUserInfo) {
        this.setData({ userInfo: localUserInfo })
      }

      // 如果云开发可用，从云端获取最新用户信息
      if (app.globalData.cloudEnabled) {
        const cloudUserInfo = await cloudApi.getUserInfo()
        this.setData({ userInfo: cloudUserInfo })
        wx.setStorageSync('userInfo', cloudUserInfo)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      // 使用本地存储的用户信息作为备用
      const localUserInfo = wx.getStorageSync('userInfo') || app.globalData.userInfo
      if (localUserInfo) {
        this.setData({ userInfo: localUserInfo })
      }
    }
  },

  // 加载初始数据
  async loadInitialData() {
    try {
      await Promise.all([
        this.loadProductList(true),
        this.loadBrandList(true),
        this.loadHotSearches()
      ])
    } catch (error) {
      console.error('加载初始数据失败:', error)
    }
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    
    // 清空对应标签页的数据列表，防止数据累积
    const clearData = {}
    switch (tab) {
      case 'products':
        clearData.productList = []
        clearData.filteredProducts = []
        break
      case 'ingredients':
        clearData.ingredientList = []
        break
      case 'brands':
        clearData.brandList = []
        break
      case 'favorites':
        clearData.favoriteList = []
        break
    }
    
    this.setData({
      currentTab: tab,
      currentPage: 1,
      hasMore: true,
      ...clearData
    })
    
    // 传递 refresh = true 确保数据重新加载
    this.loadTabData(tab, true)
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

  // 加载产品列表 - 使用云开发API
  async loadProductList(refresh = false) {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      if (refresh) {
        this.setData({
          currentPage: 1,
          hasMore: true
        })
      }
      
      // 构建推荐参数
      const recommendParams = {
        skinType: this.data.userInfo?.skinType || null,
        skinConcerns: this.data.userInfo?.skinConcerns || [],
        ageRange: this.data.userInfo?.ageRange || null,
        budget: this.data.filterOptions.priceRange !== 'all' ? this.data.filterOptions.priceRange : null,
        category: this.data.filterOptions.category !== 'all' ? this.data.filterOptions.category : null,
        limit: 10,
        page: this.data.currentPage
      }

      let response
      if (app.globalData.cloudEnabled) {
        // 使用云开发API获取产品推荐
        response = await cloudApi.getProductRecommendations(recommendParams)
        
        const normalizedProducts = this.normalizeProductList(response.products)
        
        if (refresh) {
          this.setData({
            productList: normalizedProducts,
            currentPage: 2,
            hasMore: response.pagination.page < response.pagination.totalPages
          })
        } else {
          this.setData({
            productList: [...this.data.productList, ...normalizedProducts],
            currentPage: this.data.currentPage + 1,
            hasMore: response.pagination.page < response.pagination.totalPages
          })
        }
      } else {
        // 云开发不可用时使用模拟数据
        response = await this.mockProductListAPI()
        
        const normalizedProducts = this.normalizeProductList(response.products)
        
        if (refresh) {
          this.setData({
            productList: normalizedProducts,
            currentPage: 2,
            hasMore: response.hasMore
          })
        } else {
          this.setData({
            productList: [...this.data.productList, ...normalizedProducts],
            currentPage: this.data.currentPage + 1,
            hasMore: response.hasMore
          })
        }
      }
      
      this.applyFiltersAndSort()
    } catch (error) {
      console.error('加载产品列表失败:', error)
      
      // 错误时使用模拟数据作为备用
      try {
        const response = await this.mockProductListAPI()
        
        const normalizedProducts = this.normalizeProductList(response.products)
        
        if (refresh) {
          this.setData({
            productList: normalizedProducts,
            currentPage: 2,
            hasMore: response.hasMore
          })
        } else {
          this.setData({
            productList: [...this.data.productList, ...normalizedProducts],
            currentPage: this.data.currentPage + 1,
            hasMore: response.hasMore
          })
        }
        
        this.applyFiltersAndSort()
      } catch (mockError) {
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  // 模拟产品列表API
  mockProductListAPI() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const products = []
        const startIndex = (this.data.currentPage - 1) * 10
        
        for (let i = 0; i < 10; i++) {
          const index = startIndex + i
          if (index >= 50) break // 总共50个产品
          
          products.push({
            id: index + 1,
            name: `护肤产品 ${index + 1}`,
            brand: ['兰蔻', '雅诗兰黛', '欧莱雅', '资生堂', 'SK-II'][index % 5],
            category: this.data.categories[index % this.data.categories.length].id,
            categoryName: this.data.categories[index % this.data.categories.length].name,
            price: (Math.random() * 500 + 50).toFixed(2),
            originalPrice: (Math.random() * 600 + 100).toFixed(2),
            image: `https://picsum.photos/300/300?random=${index + 1}`,
            rating: (Math.random() * 2 + 3).toFixed(1),
            sales: Math.floor(Math.random() * 1000),
            description: `这是一款优质的护肤产品，适合各种肌肤类型使用。`,
            skinTypes: ['dry', 'oily', 'combination'][Math.floor(Math.random() * 3)],
            effects: ['保湿', '美白', '抗衰老'][Math.floor(Math.random() * 3)],
            ingredients: ['玻尿酸', '烟酰胺', '维C'][Math.floor(Math.random() * 3)],
            isFavorite: Math.random() > 0.7,
            isNew: Math.random() > 0.8,
            isHot: Math.random() > 0.7,
            discount: Math.random() > 0.6 ? Math.floor(Math.random() * 30 + 10) : 0
          })
        }
        
        resolve({
          products,
          hasMore: startIndex + products.length < 50
        })
      }, 500)
    })
  },

  // 加载成分列表
  async loadIngredientList(refresh = false) {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      let response
      
      // 优先尝试调用云函数
      if (app.globalData && app.globalData.cloudEnabled && wx.cloud) {
        try {
          console.log('🔍 产品页面-成分列表：尝试调用云函数 getIngredients')
          
          const cloudResult = await wx.cloud.callFunction({
            name: 'getIngredients',
            data: {
              page: refresh ? 1 : this.data.currentPage,
              limit: 10,
              category: 'all',
              safetyLevel: 'all',
              effectType: 'all',
              sortBy: 'name'
            }
          })
          
          console.log('✅ 产品页面-成分列表：云函数调用成功', cloudResult)
          
          if (cloudResult.result && cloudResult.result.success) {
            response = {
              ingredients: cloudResult.result.data || [],
              hasMore: cloudResult.result.pagination ? 
                cloudResult.result.pagination.page < cloudResult.result.pagination.totalPages : false
            }
            
            wx.showToast({
              title: '云端数据加载成功',
              icon: 'success',
              duration: 1500
            })
          } else {
            throw new Error('云函数返回数据格式错误')
          }
        } catch (cloudError) {
          console.error('❌ 产品页面-成分列表：云函数调用失败，降级到本地数据', cloudError)
          
          wx.showToast({
            title: '使用本地数据',
            icon: 'none',
            duration: 1500
          })
          
          // 降级到模拟数据
          response = await this.mockIngredientListAPI()
        }
      } else {
        console.log('⚠️ 产品页面-成分列表：云开发未启用，使用本地数据')
        
        wx.showToast({
          title: '使用本地数据',
          icon: 'none',
          duration: 1500
        })
        
        // 使用模拟数据
        response = await this.mockIngredientListAPI()
      }
      
      if (refresh) {
        this.setData({
          ingredientList: response.ingredients,
          currentPage: 2,
          hasMore: response.hasMore
        })
      } else {
        this.setData({
          ingredientList: [...this.data.ingredientList, ...response.ingredients],
          currentPage: this.data.currentPage + 1,
          hasMore: response.hasMore
        })
      }
    } catch (error) {
      console.error('💥 产品页面-成分列表：加载失败', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 模拟成分列表API
  mockIngredientListAPI() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const ingredients = [
          {
            id: 1,
            name: '玻尿酸',
            englishName: 'Hyaluronic Acid',
            safetyLevel: 'safe',
            safetyScore: 9.2,
            effects: ['保湿', '锁水', '抗衰老'],
            description: '强效保湿成分，能够吸收自身重量1000倍的水分',
            usage: '适合所有肌肤类型，建议晚间使用',
            precautions: '无特殊注意事项'
          },
          {
            id: 2,
            name: '烟酰胺',
            englishName: 'Niacinamide',
            safetyLevel: 'safe',
            safetyScore: 8.8,
            effects: ['美白', '控油', '收缩毛孔'],
            description: '维生素B3的一种形式，具有多重护肤功效',
            usage: '建议浓度不超过10%，可日夜使用',
            precautions: '初次使用建议从低浓度开始'
          }
        ]
        
        resolve({
          ingredients,
          hasMore: false
        })
      }, 300)
    })
  },

  // 加载品牌列表
  async loadBrandList(refresh = false) {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      // 模拟API调用
      const response = await this.mockBrandListAPI()
      
      if (refresh) {
        this.setData({
          brandList: response.brands,
          currentPage: 2,
          hasMore: response.hasMore
        })
      } else {
        this.setData({
          brandList: [...this.data.brandList, ...response.brands],
          currentPage: this.data.currentPage + 1,
          hasMore: response.hasMore
        })
      }
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 模拟品牌列表API
  mockBrandListAPI() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const brands = [
          {
            id: 1,
            name: '兰蔻',
            englishName: 'Lancôme',
            logo: 'https://picsum.photos/100/100?random=101',
            country: '法国',
            founded: 1935,
            description: '法国高端化妆品品牌，以其奢华和优雅著称',
            productCount: 156,
            rating: 4.8,
            isPopular: true
          },
          {
            id: 2,
            name: '雅诗兰黛',
            englishName: 'Estée Lauder',
            logo: 'https://picsum.photos/100/100?random=102',
            country: '美国',
            founded: 1946,
            description: '美国知名化妆品品牌，专注于护肤和彩妆',
            productCount: 203,
            rating: 4.7,
            isPopular: true
          }
        ]
        
        resolve({
          brands,
          hasMore: false
        })
      }, 300)
    })
  },

  // 加载收藏列表
  async loadFavoriteList(refresh = false) {
    if (!this.data.userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      // 模拟API调用
      const favoriteProducts = this.data.productList.filter(p => p.isFavorite)
      
      this.setData({
        favoriteList: favoriteProducts,
        hasMore: false
      })
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
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
    this.applyFiltersAndSort()
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    this.debounceSearch()
  },

  // 防抖搜索
  debounceSearch() {
    clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => {
      this.applyFiltersAndSort()
    }, 300)
  },

  // 执行搜索
  performSearch() {
    const keyword = this.data.searchKeyword.trim()
    if (keyword) {
      this.saveSearchHistory(keyword)
    }
    this.applyFiltersAndSort()
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

  // 应用筛选和排序
  applyFiltersAndSort() {
    let filtered = [...this.data.productList]
    
    // 搜索筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase()
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(keyword) ||
        product.brand.toLowerCase().includes(keyword) ||
        product.description.toLowerCase().includes(keyword)
      )
    }
    
    // 分类筛选
    if (this.data.filterOptions.category !== 'all') {
      filtered = filtered.filter(product => product.category === this.data.filterOptions.category)
    }
    
    // 品牌筛选
    if (this.data.filterOptions.brand !== 'all') {
      filtered = filtered.filter(product => product.brand === this.data.filterOptions.brand)
    }
    
    // 价格筛选
    if (this.data.filterOptions.priceRange !== 'all') {
      filtered = filtered.filter(product => {
        const price = parseFloat(product.price)
        switch (this.data.filterOptions.priceRange) {
          case 'low':
            return price < 100
          case 'medium':
            return price >= 100 && price <= 500
          case 'high':
            return price > 500
          default:
            return true
        }
      })
    }
    
    // 排序
    this.sortProducts(filtered)
    
    this.setData({
      filteredProducts: filtered
    })
  },

  // 排序产品
  sortProducts(products) {
    switch (this.data.currentSort) {
      case 'price_asc':
        products.sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
        break
      case 'price_desc':
        products.sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
        break
      case 'rating':
        products.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
        break
      case 'sales':
        products.sort((a, b) => b.sales - a.sales)
        break
      case 'newest':
        products.sort((a, b) => b.id - a.id)
        break
      default:
        // 默认排序保持原有顺序
        break
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

  // 筛选条件改变
  onFilterChange(e) {
    const { type, value } = e.currentTarget.dataset
    this.setData({
      [`filterOptions.${type}`]: value
    })
  },

  // 应用筛选
  applyFilter() {
    this.hideFilterPanel()
    this.applyFiltersAndSort()
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
    this.applyFiltersAndSort()
  },

  // 排序改变
  onSortChange(e) {
    const sortType = e.detail.value
    const selectedSort = this.data.sortOptions[sortType]
    this.setData({
      currentSort: selectedSort.id
    })
    this.applyFiltersAndSort()
  },

  // 查看产品详情
  viewProductDetail(e) {
    const productId = e.currentTarget.dataset.id
    const product = this.data.filteredProducts.find(p => String(p.id) === String(productId))
    
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

  // 切换收藏状态
  async toggleFavorite(e) {
    const productId = e.currentTarget.dataset.id
    
    if (!this.data.userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    try {
      // 更新本地状态
      const updatedProducts = this.data.productList.map(product => {
        if (product.id === productId) {
          return { ...product, isFavorite: !product.isFavorite }
        }
        return product
      })
      
      this.setData({
        productList: updatedProducts
      })
      
      this.applyFiltersAndSort()
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500))
      
      wx.showToast({
        title: '操作成功',
        icon: 'success'
      })
    } catch (error) {
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      })
    }
  },

  // 查看成分详情
  viewIngredientDetail(e) {
    const ingredientId = e.currentTarget.dataset.id
    const ingredient = this.data.ingredientList.find(i => i.id === ingredientId)
    
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

  // 查看品牌详情
  viewBrandDetail(e) {
    const brandId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/brand/detail?id=${brandId}`
    })
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    let history = wx.getStorageSync('searchHistory') || []
    
    // 移除重复项
    history = history.filter(item => item !== keyword)
    
    // 添加到开头
    history.unshift(keyword)
    
    // 限制历史记录数量
    if (history.length > 10) {
      history = history.slice(0, 10)
    }
    
    wx.setStorageSync('searchHistory', history)
    this.setData({
      searchHistory: history
    })
  },

  // 加载搜索历史
  loadSearchHistory() {
    const history = wx.getStorageSync('searchHistory') || []
    this.setData({
      searchHistory: history
    })
  },

  // 清空搜索历史
  clearSearchHistory() {
    wx.removeStorageSync('searchHistory')
    this.setData({
      searchHistory: []
    })
  },

  // 加载热门搜索
  async loadHotSearches() {
    // 模拟API调用
    const hotSearches = ['玻尿酸', '烟酰胺', '维C', '水杨酸', '视黄醇', '神经酰胺']
    this.setData({
      hotSearches
    })
  },

  // 分享产品
  shareProduct(e) {
    const productId = e.currentTarget.dataset.id
    const product = this.data.filteredProducts.find(p => p.id === productId)
    
    if (product) {
      return {
        title: product.name,
        path: `/pages/product/detail?id=${productId}`,
        imageUrl: product.image
      }
    }
  },

  // 图片加载错误处理
  onImageError(e) {
    const { index, type } = e.currentTarget.dataset
    console.warn('图片加载失败:', e.detail)
    
    // 设置默认占位图
    const defaultImage = '/images/placeholder-product.png'
    
    if (type === 'product' && typeof index !== 'undefined') {
      const updatePath = `filteredProducts[${index}].image`
      this.setData({
        [updatePath]: defaultImage
      })
    } else if (type === 'ingredient' && typeof index !== 'undefined') {
      const updatePath = `ingredientList[${index}].image`
      this.setData({
        [updatePath]: defaultImage
      })
    } else if (type === 'brand' && typeof index !== 'undefined') {
      const updatePath = `brandList[${index}].logo`
      this.setData({
        [updatePath]: defaultImage
      })
    } else if (type === 'product-detail') {
      this.setData({
        'selectedProduct.image': defaultImage
      })
    }
    
    // 显示用户友好的提示（仅在开发环境显示）
    if (wx.getSystemInfoSync().platform === 'devtools') {
      wx.showToast({
        title: '图片加载失败，已使用默认图片',
        icon: 'none',
        duration: 1500
      })
    }
  },

  // 规范化产品字段，确保 UI 展示稳定
  normalizeProductList(products = []) {
    const normalizeImagePath = (img) => {
      if (!img) return ''
      
      // 如果是云存储URL，直接返回
      if (img.startsWith('cloud://')) {
        return img
      }
      
      // 如果是HTTP/HTTPS URL，直接返回
      if (img.startsWith('http://') || img.startsWith('https://')) {
        return img
      }
      
      // 处理本地路径：将 './images/...' 或 'images/...' 统一为 '/images/...'
      return img.replace(/^\.\//, '/').replace(/^images\//, '/images/')
    }

    const mapCategoryName = (categoryId) => {
      const found = this.data.categories.find(c => c.id === categoryId)
      return found ? found.name : (typeof categoryId === 'string' ? categoryId : '')
    }

    return products.map((p, idx) => {
      // 价格：支持 number / string / 对象({amount|value|min|low|avg|price})
      let price
      if (typeof p.price === 'number') {
        price = p.price.toFixed(2)
      } else if (typeof p.price === 'string') {
        price = p.price
      } else if (p.price && typeof p.price === 'object') {
        const candidate = p.price.amount ?? p.price.value ?? p.price.min ?? p.price.low ?? p.price.avg ?? p.price.price
        price = (Number(candidate) || 0).toFixed(2)
      } else {
        price = '0.00'
      }

      // 原价同样处理
      let originalPrice
      if (typeof p.originalPrice === 'number') {
        originalPrice = p.originalPrice.toFixed(2)
      } else if (typeof p.originalPrice === 'string') {
        originalPrice = p.originalPrice
      } else if (p.originalPrice && typeof p.originalPrice === 'object') {
        const cand = p.originalPrice.amount ?? p.originalPrice.value ?? p.originalPrice.avg ?? p.originalPrice.price
        originalPrice = (Number(cand) || Number(price)).toFixed(2)
      } else {
        originalPrice = price
      }

      // 评分：支持 number / string / 对象({average|score})
      let rating
      if (typeof p.rating === 'number') {
        rating = p.rating.toFixed(1)
      } else if (typeof p.rating === 'string') {
        rating = (parseFloat(p.rating) || 0).toFixed(1)
      } else if (p.rating && typeof p.rating === 'object') {
        const r = p.rating.average ?? p.rating.score
        rating = (parseFloat(r) || 0).toFixed(1)
      } else if (p.ratings && typeof p.ratings === 'object') {
        const r = p.ratings.average ?? p.ratings.score
        rating = (parseFloat(r) || 0).toFixed(1)
      } else {
        rating = '0.0'
      }

      // 销量：统一到 sales
      const sales = p.sales ?? p.salesVolume ?? p.salesCount ?? (p.ratings?.count ?? 0)

      // 展示字段：数组/对象转为字符串，兼容数据源
      const effects = Array.isArray(p.effects)
        ? p.effects.join('、')
        : (p.effects ?? p.mainEffects ?? '')

      // 原始 ingredients 可能是对象数组，优先使用 coreIngredients
      const coreIngredientNames = Array.isArray(p.coreIngredients)
        ? p.coreIngredients.map(i => (typeof i === 'string' ? i : (i?.name || i?.englishName || ''))).filter(Boolean)
        : []
      const ingredientNames = Array.isArray(p.ingredients)
        ? p.ingredients.map(i => (typeof i === 'string' ? i : (i?.name || i?.englishName || ''))).filter(Boolean)
        : []
      const ingredients = coreIngredientNames.length > 0
        ? coreIngredientNames.join('、')
        : (ingredientNames.length > 0 ? ingredientNames.join('、') : (typeof p.ingredients === 'string' ? p.ingredients : ''))

      const skinTypeMap = {
        dry: '干性肌肤',
        oily: '油性肌肤',
        combination: '混合性肌肤',
        sensitive: '敏感性肌肤',
        normal: '中性肌肤',
        mature: '熟龄肌肤'
      }
      let skinTypes
      if (Array.isArray(p.skinTypes)) {
        skinTypes = p.skinTypes.join('、')
      } else if (typeof p.skinTypes === 'string') {
        skinTypes = p.skinTypes
      } else if (typeof p.suitableSkinTypesDisplay === 'string') {
        skinTypes = p.suitableSkinTypesDisplay
      } else if (Array.isArray(p.suitableSkinTypes)) {
        skinTypes = p.suitableSkinTypes.map(s => skinTypeMap[s] || s).join('、')
      } else {
        skinTypes = ''
      }

      const categoryName = p.categoryName ?? mapCategoryName(p.category)

      // 统一并兼容图片字段
      const primaryImage = p.image ?? p.imageUrl ?? (Array.isArray(p.images) ? p.images[0] : '')
      const image = normalizeImagePath(primaryImage)
      const images = Array.isArray(p.images) && p.images.length > 0
        ? p.images.map(normalizeImagePath)
        : (image ? [image] : [])

      // 唯一ID：兼容云数据库的 _id，或生成稳定回退
      const id = p.id ?? p._id ?? `${p.brand || 'brand'}-${p.name || 'product'}-${idx}`

      return {
        ...p,
        id,
        image,
        images,
        price,
        originalPrice,
        rating,
        sales,
        effects,
        ingredients,
        skinTypes,
        categoryName
      }
    })
  }
})