// pages/ingredients/ingredients.js
Page({
  data: {
    // 用户权限
    userInfo: null,
    isLoggedIn: false,
    
    // 搜索相关
    searchKeyword: '',
    searchHistory: [],
    hotSearches: ['透明质酸', '烟酰胺', '水杨酸', '维生素C', '视黄醇', '神经酰胺'],
    showSearchBar: false,
    
    // 成分列表
    ingredientList: [],
    filteredIngredients: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    
    // 筛选条件
    filterOptions: {
      safetyLevel: '', // 安全等级：safe, caution, danger
      effectType: '', // 功效类型：moisturizing, anti-aging, whitening, acne, sensitive
      category: '' // 成分类别：active, preservative, surfactant, emulsifier
    },
    showFilterPanel: false,
    
    // 安全等级选项
    safetyLevels: [
      { value: '', label: '全部', icon: '🔍' },
      { value: 'safe', label: '安全', icon: '✅' },
      { value: 'caution', label: '注意', icon: '⚠️' },
      { value: 'danger', label: '危险', icon: '❌' }
    ],
    
    // 功效类型选项
    effectTypes: [
      { value: '', label: '全部', icon: '🔍' },
      { value: 'moisturizing', label: '保湿', icon: '💧' },
      { value: 'anti-aging', label: '抗衰', icon: '⏰' },
      { value: 'whitening', label: '美白', icon: '✨' },
      { value: 'acne', label: '祛痘', icon: '🎯' },
      { value: 'sensitive', label: '敏感肌', icon: '🌸' }
    ],
    
    // 成分类别选项
    categories: [
      { value: '', label: '全部', icon: '🔍' },
      { value: 'active', label: '活性成分', icon: '⚡' },
      { value: 'preservative', label: '防腐剂', icon: '🛡️' },
      { value: 'surfactant', label: '表面活性剂', icon: '🧼' },
      { value: 'emulsifier', label: '乳化剂', icon: '🥛' }
    ],
    
    // 排序选项
    sortOptions: [
      { value: 'name', label: '按名称' },
      { value: 'safety', label: '按安全性' },
      { value: 'popularity', label: '按热度' }
    ],
    currentSort: 'name',
    
    // 成分详情弹窗
    showIngredientDetail: false,
    selectedIngredient: null,
    
    // 收藏功能
    favoriteIngredients: [],
    
    // 统计信息
    stats: {
      totalIngredients: 0,
      safeCount: 0,
      cautionCount: 0,
      dangerCount: 0
    }
  },

  onLoad(options) {
    console.log('🚀🚀🚀 成分数据库页面开始加载 🚀🚀🚀', options);
    
    // 显示页面加载提示
    wx.showToast({
      title: '成分页面已加载',
      icon: 'success',
      duration: 2000
    });
    
    // 添加云开发状态检查日志
    const app = getApp();
    console.log('=== 云开发状态检查 ===');
    console.log('app.globalData:', app.globalData);
    console.log('cloudEnabled:', app.globalData?.cloudEnabled);
    console.log('wx.cloud 是否存在:', typeof wx.cloud !== 'undefined');
    console.log('========================');
    
    // 显示云开发状态提示
    setTimeout(() => {
      const cloudStatus = app.globalData?.cloudEnabled ? '已启用' : '未启用';
      wx.showToast({
        title: `云开发${cloudStatus}`,
        icon: app.globalData?.cloudEnabled ? 'success' : 'none',
        duration: 2000
      });
    }, 500);
    
    this.checkUserPermission();
    this.loadInitialData();
  },

  onShow() {
    this.loadFavoriteIngredients();
  },

  onPullDownRefresh() {
    this.refreshData();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreIngredients();
    }
  },

  // 检查用户权限
  checkUserPermission() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo,
        isLoggedIn: true
      });
    }
  },

  // 加载初始数据
  async loadInitialData() {
    this.setData({ loading: true });
    
    try {
      await Promise.all([
        this.loadIngredientList(true),
        this.loadStats(),
        this.loadSearchHistory()
      ]);
    } catch (error) {
      console.error('加载初始数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({
      page: 1,
      hasMore: true,
      ingredientList: []
    });
    
    await this.loadInitialData();
    wx.stopPullDownRefresh();
  },

  // 加载成分列表
  async loadIngredientList(isRefresh = false) {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      const params = {
        keyword: this.data.searchKeyword,
        safetyLevel: this.data.filterOptions.safetyLevel,
        effectType: this.data.filterOptions.effectType,
        category: this.data.filterOptions.category
      };
      
      const result = await this.getAggregatedIngredients(params);
      
      // 应用排序
      const sortedIngredients = this.sortIngredients(result.data, this.data.currentSort);
      
      this.setData({
        ingredientList: sortedIngredients,
        filteredIngredients: sortedIngredients,
        page: 1,
        hasMore: false, // 聚合数据一次性加载完成
        loading: false
      });
      
    } catch (error) {
      console.error('加载成分列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 加载更多成分
  loadMoreIngredients() {
    this.loadIngredientList();
  },

  // 获取聚合后的成分数据
  async getAggregatedIngredients(params) {
    console.log('🔍🔍🔍 getAggregatedIngredients 开始 🔍🔍🔍');
    console.log('传入参数:', params);
    
    // 显示数据加载开始提示
    wx.showToast({
      title: '开始加载成分数据',
      icon: 'loading',
      duration: 1000
    });
    
    try {
      // 优先尝试调用云函数
      const app = getApp();
      console.log('获取 app 实例:', app);
      console.log('app.globalData:', app.globalData);
      console.log('cloudEnabled 状态:', app.globalData?.cloudEnabled);
      
      if (app.globalData.cloudEnabled) {
        console.log('✅ 云开发已启用，尝试调用云函数');
        
        // 显示云函数调用提示
        wx.showToast({
          title: '使用云函数获取数据',
          icon: 'loading',
          duration: 1500
        });
        
        try {
          console.log('📞 调用 getIngredients 云函数，参数:', params);
          console.log('wx.cloud 对象:', wx.cloud);
          
          const cloudParams = {
            keyword: params.keyword || '',
            safetyLevel: params.safetyLevel || '',
            effectType: params.effectType || '',
            category: params.category || '',
            sortBy: this.data.currentSort || 'name',
            page: this.data.page || 1,
            pageSize: this.data.pageSize || 20
          };
          console.log('云函数调用参数:', cloudParams);
          
          const result = await wx.cloud.callFunction({
            name: 'getIngredients',
            data: cloudParams
          });
          
          console.log('📥 云函数调用结果:', result);
          console.log('result.result:', result.result);
          
          if (result.result && result.result.success) {
            console.log('✅ 云函数调用成功，返回数据');
            
            // 显示成功提示
            wx.showToast({
              title: '云函数数据加载成功',
              icon: 'success',
              duration: 1500
            });
            
            const returnData = {
              data: result.result.data.ingredients || [],
              total: result.result.data.total || 0
            };
            console.log('返回的数据结构:', returnData);
            console.log('=== 使用云函数数据 ===');
            return returnData;
          } else {
            console.warn('⚠️ 云函数返回失败，使用本地聚合器:', result.result);
            throw new Error(result.result?.message || '云函数调用失败');
          }
        } catch (cloudError) {
          console.error('❌ 云函数调用失败，降级到本地聚合器:', cloudError);
          console.log('=== 降级到本地聚合器 ===');
          
          // 显示降级提示
          wx.showToast({
            title: '云函数失败，使用本地数据',
            icon: 'none',
            duration: 2000
          });
          
          // 降级到本地聚合器
          return await this.getLocalAggregatedIngredients(params);
        }
      } else {
        console.log('❌ 云开发未启用，使用本地聚合器');
        console.log('=== 使用本地聚合器 ===');
        
        // 显示本地数据源提示
        wx.showToast({
          title: '使用本地数据源',
          icon: 'none',
          duration: 1500
        });
        
        return await this.getLocalAggregatedIngredients(params);
      }
    } catch (error) {
      console.error('❌ 获取聚合成分数据失败:', error);
      throw error;
    }
  },

  // 本地聚合器方法（作为降级方案）
  async getLocalAggregatedIngredients(params) {
    try {
      // 加载产品数据
      const products = await this.loadProductData();
      
      // 使用成分聚合器处理数据
      const { aggregateFromProducts } = require('../../utils/ingredientAggregator');
      const aggregatedIngredients = aggregateFromProducts(products);
      
      // 应用筛选条件
      let filteredIngredients = aggregatedIngredients;
      
      if (params.keyword) {
        const keyword = params.keyword.toLowerCase();
        filteredIngredients = filteredIngredients.filter(ingredient => 
          ingredient.name.toLowerCase().includes(keyword) ||
          ingredient.englishName.toLowerCase().includes(keyword) ||
          ingredient.effects.some(effect => effect.includes(keyword))
        );
      }
      
      if (params.safetyLevel) {
        filteredIngredients = filteredIngredients.filter(ingredient => 
          ingredient.safetyLevel === params.safetyLevel
        );
      }
      
      if (params.effectType) {
        filteredIngredients = filteredIngredients.filter(ingredient => 
          ingredient.effects.includes(params.effectType)
        );
      }
      
      if (params.category) {
        filteredIngredients = filteredIngredients.filter(ingredient => 
          ingredient.category === params.category
        );
      }
      
      return {
        data: filteredIngredients,
        total: filteredIngredients.length
      };
    } catch (error) {
      console.error('本地聚合器处理失败:', error);
      throw error;
    }
  },

  // 加载产品数据
  async loadProductData() {
    return new Promise((resolve, reject) => {
      // 检查是否启用云开发
      const app = getApp();
      if (app.globalData.cloudEnabled) {
        // 从云数据库加载
        this.loadProductsFromCloud()
          .then(products => resolve(products))
          .catch(error => {
            console.error('从云端加载产品数据失败，使用本地数据:', error);
            this.loadProductsFromLocal()
              .then(products => resolve(products))
              .catch(localError => reject(localError));
          });
      } else {
        // 从本地文件加载
        this.loadProductsFromLocal()
          .then(products => resolve(products))
          .catch(error => reject(error));
      }
    });
  },

  // 从云数据库加载产品
  async loadProductsFromCloud() {
    const cloudApi = require('../../utils/cloudApi');
    try {
      const response = await cloudApi.getProductRecommendations({
        category: '',
        budget: { min: 0, max: 10000 },
        skinType: '',
        concerns: [],
        ageRange: '',
        page: 1,
        pageSize: 1000 // 获取所有产品
      });
      return response.products || [];
    } catch (error) {
      console.error('云端产品数据加载失败:', error);
      throw error;
    }
  },

  // 从本地文件加载产品
  async loadProductsFromLocal() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: '/data_test/products.json',
        method: 'GET',
        success: (res) => {
          if (res.statusCode === 200) {
            try {
              // 解析JSON Lines格式
              const lines = res.data.split('\n').filter(line => line.trim());
              const products = lines.map(line => JSON.parse(line));
              resolve(products);
            } catch (parseError) {
              console.error('解析产品数据失败:', parseError);
              reject(parseError);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        },
        fail: (error) => {
          console.error('加载本地产品数据失败:', error);
          reject(error);
        }
      });
    });
  },

  // 加载统计信息
  async loadStats() {
    try {
      const stats = await this.mockStatsAPI();
      this.setData({ stats });
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  },

  // 模拟统计API
  mockStatsAPI() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          totalIngredients: 1250,
          safeCount: 980,
          cautionCount: 220,
          dangerCount: 50
        });
      }, 300);
    });
  },

  // 搜索相关方法
  toggleSearchBar() {
    this.setData({
      showSearchBar: !this.data.showSearchBar
    });
  },

  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  onSearchConfirm() {
    this.performSearch();
  },

  performSearch() {
    const keyword = this.data.searchKeyword.trim();
    if (!keyword) return;
    
    this.saveSearchHistory(keyword);
    this.setData({
      page: 1,
      hasMore: true,
      ingredientList: []
    });
    
    this.loadIngredientList(true);
  },

  onHotSearchTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({
      searchKeyword: keyword
    });
    this.performSearch();
  },

  onHistoryItemTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({
      searchKeyword: keyword
    });
    this.performSearch();
  },

  // 搜索历史管理
  loadSearchHistory() {
    const history = wx.getStorageSync('ingredient_search_history') || [];
    this.setData({
      searchHistory: history.slice(0, 10) // 最多显示10条
    });
  },

  saveSearchHistory(keyword) {
    let history = wx.getStorageSync('ingredient_search_history') || [];
    
    // 移除重复项
    history = history.filter(item => item !== keyword);
    
    // 添加到开头
    history.unshift(keyword);
    
    // 限制数量
    history = history.slice(0, 20);
    
    wx.setStorageSync('ingredient_search_history', history);
    this.setData({
      searchHistory: history.slice(0, 10)
    });
  },

  clearSearchHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('ingredient_search_history');
          this.setData({
            searchHistory: []
          });
        }
      }
    });
  },

  // 筛选相关方法
  toggleFilterPanel() {
    this.setData({
      showFilterPanel: !this.data.showFilterPanel
    });
  },

  onFilterMaskTap() {
    this.setData({
      showFilterPanel: false
    });
  },

  onSafetyLevelTap(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'filterOptions.safetyLevel': value
    });
  },

  onEffectTypeTap(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'filterOptions.effectType': value
    });
  },

  onCategoryTap(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'filterOptions.category': value
    });
  },

  resetFilters() {
    this.setData({
      filterOptions: {
        safetyLevel: '',
        effectType: '',
        category: ''
      }
    });
  },

  confirmFilters() {
    this.setData({
      showFilterPanel: false,
      page: 1,
      hasMore: true,
      ingredientList: []
    });
    
    this.loadIngredientList(true);
  },

  // 排序方法
  onSortChange(e) {
    const sortValue = e.detail.value;
    const currentSort = this.data.sortOptions[sortValue].value;
    
    this.setData({
      currentSort
    });
    
    this.applyFiltersAndSort();
  },

  // 应用筛选和排序
  applyFiltersAndSort() {
    let filtered = [...this.data.ingredientList];
    
    // 应用搜索关键词筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase();
      filtered = filtered.filter(ingredient => 
        ingredient.name.toLowerCase().includes(keyword) ||
        ingredient.englishName.toLowerCase().includes(keyword) ||
        ingredient.effects.some(effect => effect.includes(keyword))
      );
    }
    
    // 应用筛选条件
    const { safetyLevel, effectType, category } = this.data.filterOptions;
    
    if (safetyLevel) {
      filtered = filtered.filter(ingredient => ingredient.safetyLevel === safetyLevel);
    }
    
    if (effectType) {
      filtered = filtered.filter(ingredient => 
        ingredient.effects.some(effect => {
          const effectMap = {
            'moisturizing': '保湿',
            'anti-aging': '抗衰',
            'whitening': '美白',
            'acne': '祛痘',
            'sensitive': '敏感肌'
          };
          return effect.includes(effectMap[effectType]);
        })
      );
    }
    
    if (category) {
      filtered = filtered.filter(ingredient => ingredient.category === category);
    }
    
    // 应用排序
    this.sortIngredients(filtered);
    
    this.setData({
      filteredIngredients: filtered
    });
  },

  // 排序成分
  sortIngredients(ingredients) {
    const { currentSort } = this.data;
    
    ingredients.sort((a, b) => {
      switch (currentSort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'safety':
          return b.safetyScore - a.safetyScore;
        case 'popularity':
          return b.popularity - a.popularity;
        default:
          return 0;
      }
    });
  },

  // 成分详情相关方法
  onIngredientTap(e) {
    const ingredient = e.currentTarget.dataset.ingredient;
    this.setData({
      selectedIngredient: ingredient,
      showIngredientDetail: true
    });
  },

  closeIngredientDetail() {
    this.setData({
      showIngredientDetail: false,
      selectedIngredient: null
    });
  },

  onDetailMaskTap() {
    this.closeIngredientDetail();
  },

  // 收藏功能
  loadFavoriteIngredients() {
    const favorites = wx.getStorageSync('favorite_ingredients') || [];
    this.setData({
      favoriteIngredients: favorites
    });
  },

  toggleFavorite(e) {
    const ingredient = e.currentTarget.dataset.ingredient;
    let favorites = [...this.data.favoriteIngredients];
    
    const index = favorites.findIndex(item => item.id === ingredient.id);
    
    if (index > -1) {
      // 取消收藏
      favorites.splice(index, 1);
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      });
    } else {
      // 添加收藏
      favorites.push(ingredient);
      wx.showToast({
        title: '已添加收藏',
        icon: 'success'
      });
    }
    
    wx.setStorageSync('favorite_ingredients', favorites);
    this.setData({
      favoriteIngredients: favorites
    });
    
    // 模拟API调用
    this.mockToggleFavoriteAPI(ingredient.id, index === -1);
  },

  // 模拟收藏API
  mockToggleFavoriteAPI(ingredientId, isFavorite) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`成分 ${ingredientId} ${isFavorite ? '收藏' : '取消收藏'} 成功`);
        resolve();
      }, 300);
    });
  },

  // 判断是否已收藏
  isFavorite(ingredientId) {
    return this.data.favoriteIngredients.some(item => item.id === ingredientId);
  },

  // 分享功能
  onShareIngredient(e) {
    const ingredient = e.currentTarget.dataset.ingredient;
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
    
    return {
      title: `${ingredient.name} - 成分安全性分析`,
      path: `/pages/ingredients/ingredients?id=${ingredient.id}`,
      imageUrl: '/images/ingredient-share.png'
    };
  },

  // 查看相关产品
  viewRelatedProducts(e) {
    const ingredient = e.currentTarget.dataset.ingredient;
    wx.navigateTo({
      url: `/pages/products/products?ingredient=${ingredient.name}`
    });
  },

  // 点击产品项
  onProductTap(e) {
    const product = e.currentTarget.dataset.product;
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?name=${encodeURIComponent(product.name)}`
    });
  },

  // 查看所有相关产品
  viewAllRelatedProducts(e) {
    const ingredient = e.currentTarget.dataset.ingredient;
    wx.navigateTo({
      url: `/pages/products/products?ingredient=${encodeURIComponent(ingredient.name)}`
    });
  }
});