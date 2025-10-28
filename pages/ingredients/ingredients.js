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
    console.log('成分数据库页面加载', options);
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
  async loadIngredientList(reset = false) {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      const page = reset ? 1 : this.data.page;
      const response = await this.mockIngredientListAPI({
        page,
        pageSize: this.data.pageSize,
        keyword: this.data.searchKeyword,
        ...this.data.filterOptions
      });
      
      const newList = reset ? response.data : [...this.data.ingredientList, ...response.data];
      
      this.setData({
        ingredientList: newList,
        filteredIngredients: newList,
        hasMore: response.hasMore,
        page: reset ? 2 : this.data.page + 1
      });
      
      this.applyFiltersAndSort();
    } catch (error) {
      console.error('加载成分列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载更多成分
  loadMoreIngredients() {
    this.loadIngredientList();
  },

  // 模拟成分列表API
  mockIngredientListAPI(params) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockIngredients = [
          {
            id: 1,
            name: '透明质酸',
            englishName: 'Hyaluronic Acid',
            safetyLevel: 'safe',
            safetyScore: 9.5,
            category: 'active',
            effects: ['保湿', '抗衰', '修复'],
            description: '透明质酸是一种天然保湿因子，能够结合自身重量1000倍的水分，为肌肤提供深层保湿。',
            usage: '适用于所有肌肤类型，建议在爽肤水后使用。',
            precautions: '敏感肌肤首次使用建议先做过敏测试。',
            concentration: '0.1-2%',
            pH: '6.0-7.0',
            popularity: 95,
            products: ['兰蔻小黑瓶', 'SK-II神仙水', '雅诗兰黛小棕瓶']
          },
          {
            id: 2,
            name: '烟酰胺',
            englishName: 'Niacinamide',
            safetyLevel: 'safe',
            safetyScore: 9.0,
            category: 'active',
            effects: ['美白', '控油', '收缩毛孔'],
            description: '烟酰胺是维生素B3的一种形式，具有美白、控油、收缩毛孔等多重功效。',
            usage: '建议晚间使用，浓度不宜过高。',
            precautions: '初次使用可能出现轻微刺激，建议从低浓度开始。',
            concentration: '2-10%',
            pH: '5.0-7.0',
            popularity: 88,
            products: ['The Ordinary烟酰胺精华', 'Paula\'s Choice 2%烟酰胺']
          },
          {
            id: 3,
            name: '水杨酸',
            englishName: 'Salicylic Acid',
            safetyLevel: 'caution',
            safetyScore: 7.5,
            category: 'active',
            effects: ['祛痘', '去角质', '收缩毛孔'],
            description: '水杨酸是一种β-羟基酸，能够深入毛孔清洁，有效改善痘痘和黑头问题。',
            usage: '建议晚间使用，需要做好防晒。',
            precautions: '孕妇慎用，敏感肌肤需谨慎使用，可能引起干燥和刺激。',
            concentration: '0.5-2%',
            pH: '3.0-4.0',
            popularity: 82,
            products: ['Paula\'s Choice 2%水杨酸', 'CeraVe水杨酸洁面']
          },
          {
            id: 4,
            name: '维生素C',
            englishName: 'Vitamin C',
            safetyLevel: 'safe',
            safetyScore: 8.5,
            category: 'active',
            effects: ['美白', '抗氧化', '抗衰'],
            description: '维生素C是强效的抗氧化剂，能够抑制黑色素生成，提亮肌肤。',
            usage: '建议早晨使用，需要做好防晒。',
            precautions: '光敏性成分，使用后必须防晒，开封后需冷藏保存。',
            concentration: '5-20%',
            pH: '3.0-4.0',
            popularity: 90,
            products: ['修丽可CE精华', 'The Ordinary维C精华']
          },
          {
            id: 5,
            name: '视黄醇',
            englishName: 'Retinol',
            safetyLevel: 'caution',
            safetyScore: 7.0,
            category: 'active',
            effects: ['抗衰', '去角质', '改善细纹'],
            description: '视黄醇是维生素A的一种形式，是公认的抗衰老金标准成分。',
            usage: '建议晚间使用，需要建立耐受性。',
            precautions: '孕妇禁用，初次使用需要建立耐受，可能引起脱皮和刺激。',
            concentration: '0.1-1%',
            pH: '5.5-6.5',
            popularity: 85,
            products: ['露得清A醇面霜', 'The Ordinary视黄醇精华']
          }
        ];
        
        // 模拟分页
        const start = (params.page - 1) * params.pageSize;
        const end = start + params.pageSize;
        const data = mockIngredients.slice(start, end);
        
        resolve({
          data,
          hasMore: end < mockIngredients.length,
          total: mockIngredients.length
        });
      }, 500);
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
  }
});