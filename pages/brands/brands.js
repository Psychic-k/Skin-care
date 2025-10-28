// pages/brands/brands.js
Page({
  data: {
    // 用户权限
    userInfo: null,
    isLoggedIn: false,
    
    // 搜索相关
    searchKeyword: '',
    searchHistory: [],
    hotSearches: ['兰蔻', 'SK-II', '雅诗兰黛', 'La Mer', '资生堂', 'Olay'],
    showSearchBar: false,
    
    // 品牌列表
    brandList: [],
    filteredBrands: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    
    // 筛选条件
    filterOptions: {
      country: '', // 品牌国家：japan, korea, usa, france, germany, china
      priceRange: '', // 价格区间：budget, mid, luxury, premium
      category: '', // 品牌类别：skincare, makeup, fragrance, bodycare
      popularity: '' // 热度：hot, rising, classic
    },
    showFilterPanel: false,
    
    // 国家选项
    countries: [
      { value: '', label: '全部', icon: '🌍' },
      { value: 'japan', label: '日本', icon: '🇯🇵' },
      { value: 'korea', label: '韩国', icon: '🇰🇷' },
      { value: 'usa', label: '美国', icon: '🇺🇸' },
      { value: 'france', label: '法国', icon: '🇫🇷' },
      { value: 'germany', label: '德国', icon: '🇩🇪' },
      { value: 'china', label: '中国', icon: '🇨🇳' }
    ],
    
    // 价格区间选项
    priceRanges: [
      { value: '', label: '全部', icon: '💰' },
      { value: 'budget', label: '平价', icon: '💵' },
      { value: 'mid', label: '中端', icon: '💴' },
      { value: 'luxury', label: '高端', icon: '💎' },
      { value: 'premium', label: '奢华', icon: '👑' }
    ],
    
    // 品牌类别选项
    categories: [
      { value: '', label: '全部', icon: '🔍' },
      { value: 'skincare', label: '护肤', icon: '🧴' },
      { value: 'makeup', label: '彩妆', icon: '💄' },
      { value: 'fragrance', label: '香水', icon: '🌸' },
      { value: 'bodycare', label: '身体护理', icon: '🛁' }
    ],
    
    // 热度选项
    popularityOptions: [
      { value: '', label: '全部', icon: '🔍' },
      { value: 'hot', label: '热门', icon: '🔥' },
      { value: 'rising', label: '新兴', icon: '📈' },
      { value: 'classic', label: '经典', icon: '⭐' }
    ],
    
    // 排序选项
    sortOptions: [
      { value: 'name', label: '按名称' },
      { value: 'popularity', label: '按热度' },
      { value: 'founded', label: '按创立时间' },
      { value: 'products', label: '按产品数量' }
    ],
    currentSort: 'popularity',
    
    // 品牌详情弹窗
    showBrandDetail: false,
    selectedBrand: null,
    
    // 关注功能
    followedBrands: [],
    
    // 统计信息
    stats: {
      totalBrands: 0,
      skincareCount: 0,
      makeupCount: 0,
      fragranceCount: 0,
      bodycareCount: 0
    },
    
    // 品牌产品列表
    brandProducts: [],
    showBrandProducts: false,
    selectedBrandForProducts: null
  },

  onLoad(options) {
    console.log('品牌管理页面加载', options);
    this.checkUserPermission();
    this.loadInitialData();
  },

  onShow() {
    this.loadFollowedBrands();
  },

  onPullDownRefresh() {
    this.refreshData();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreBrands();
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
        this.loadBrandList(true),
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
      brandList: []
    });
    
    await this.loadInitialData();
    wx.stopPullDownRefresh();
  },

  // 加载品牌列表
  async loadBrandList(reset = false) {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      const page = reset ? 1 : this.data.page;
      const response = await this.mockBrandListAPI({
        page,
        pageSize: this.data.pageSize,
        keyword: this.data.searchKeyword,
        ...this.data.filterOptions
      });
      
      const newList = reset ? response.data : [...this.data.brandList, ...response.data];
      
      this.setData({
        brandList: newList,
        filteredBrands: newList,
        hasMore: response.hasMore,
        page: reset ? 2 : this.data.page + 1
      });
      
      this.applyFiltersAndSort();
    } catch (error) {
      console.error('加载品牌列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载更多品牌
  loadMoreBrands() {
    this.loadBrandList();
  },

  // 模拟品牌列表API
  mockBrandListAPI(params) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockBrands = [
          {
            id: 1,
            name: '兰蔻',
            englishName: 'Lancôme',
            logo: '/images/brands/lancome.png',
            country: 'france',
            founded: 1935,
            category: 'skincare',
            priceRange: 'luxury',
            popularity: 'hot',
            rating: 4.8,
            productCount: 156,
            followCount: 28500,
            description: '法国奢华美妆品牌，以其卓越的护肤和彩妆产品闻名于世。',
            specialties: ['抗衰老', '美白', '保湿'],
            hotProducts: ['小黑瓶精华', '粉水', '菁纯口红'],
            isFollowed: false
          },
          {
            id: 2,
            name: 'SK-II',
            englishName: 'SK-II',
            logo: '/images/brands/skii.png',
            country: 'japan',
            founded: 1980,
            category: 'skincare',
            priceRange: 'premium',
            popularity: 'classic',
            rating: 4.9,
            productCount: 45,
            followCount: 35200,
            description: '日本高端护肤品牌，以神仙水和Pitera™酵母精华著称。',
            specialties: ['抗衰老', '提亮肌肤', '改善肌理'],
            hotProducts: ['神仙水', '大红瓶面霜', '小灯泡精华'],
            isFollowed: false
          },
          {
            id: 3,
            name: '雅诗兰黛',
            englishName: 'Estée Lauder',
            logo: '/images/brands/esteelauder.png',
            country: 'usa',
            founded: 1946,
            category: 'skincare',
            priceRange: 'luxury',
            popularity: 'hot',
            rating: 4.7,
            productCount: 203,
            followCount: 42800,
            description: '美国知名化妆品集团，提供护肤、彩妆和香水产品。',
            specialties: ['抗衰老', '修复', '美白'],
            hotProducts: ['小棕瓶精华', 'DW粉底液', '红石榴系列'],
            isFollowed: false
          },
          {
            id: 4,
            name: 'La Mer',
            englishName: 'La Mer',
            logo: '/images/brands/lamer.png',
            country: 'usa',
            founded: 1965,
            category: 'skincare',
            priceRange: 'premium',
            popularity: 'classic',
            rating: 4.6,
            productCount: 32,
            followCount: 18900,
            description: '奢华护肤品牌，以海蓝之谜面霜和独特的Miracle Broth™活性精萃闻名。',
            specialties: ['奢华护肤', '修复', '抗衰老'],
            hotProducts: ['经典面霜', '精华液', '眼霜'],
            isFollowed: false
          },
          {
            id: 5,
            name: '资生堂',
            englishName: 'Shiseido',
            logo: '/images/brands/shiseido.png',
            country: 'japan',
            founded: 1872,
            category: 'skincare',
            priceRange: 'mid',
            popularity: 'classic',
            rating: 4.5,
            productCount: 312,
            followCount: 25600,
            description: '日本历史悠久的化妆品公司，融合东方美学与现代科技。',
            specialties: ['防晒', '抗衰老', '美白'],
            hotProducts: ['红腰子精华', '蓝胖子防晒', '百优面霜'],
            isFollowed: false
          },
          {
            id: 6,
            name: 'Olay',
            englishName: 'Olay',
            logo: '/images/brands/olay.png',
            country: 'usa',
            founded: 1952,
            category: 'skincare',
            priceRange: 'budget',
            popularity: 'hot',
            rating: 4.3,
            productCount: 89,
            followCount: 15200,
            description: '宝洁旗下护肤品牌，致力于为女性提供科学有效的护肤解决方案。',
            specialties: ['抗衰老', '保湿', '美白'],
            hotProducts: ['大红瓶面霜', '小白瓶精华', '多效修护霜'],
            isFollowed: false
          }
        ];
        
        // 模拟分页
        const start = (params.page - 1) * params.pageSize;
        const end = start + params.pageSize;
        const data = mockBrands.slice(start, end);
        
        resolve({
          data,
          hasMore: end < mockBrands.length,
          total: mockBrands.length
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
          totalBrands: 850,
          skincareCount: 420,
          makeupCount: 280,
          fragranceCount: 95,
          bodycareCount: 55
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
      brandList: []
    });
    
    this.loadBrandList(true);
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
    const history = wx.getStorageSync('brand_search_history') || [];
    this.setData({
      searchHistory: history.slice(0, 10)
    });
  },

  saveSearchHistory(keyword) {
    let history = wx.getStorageSync('brand_search_history') || [];
    
    history = history.filter(item => item !== keyword);
    history.unshift(keyword);
    history = history.slice(0, 20);
    
    wx.setStorageSync('brand_search_history', history);
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
          wx.removeStorageSync('brand_search_history');
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

  onCountryTap(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'filterOptions.country': value
    });
  },

  onPriceRangeTap(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'filterOptions.priceRange': value
    });
  },

  onCategoryTap(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'filterOptions.category': value
    });
  },

  onPopularityTap(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'filterOptions.popularity': value
    });
  },

  resetFilters() {
    this.setData({
      filterOptions: {
        country: '',
        priceRange: '',
        category: '',
        popularity: ''
      }
    });
  },

  confirmFilters() {
    this.setData({
      showFilterPanel: false,
      page: 1,
      hasMore: true,
      brandList: []
    });
    
    this.loadBrandList(true);
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
    let filtered = [...this.data.brandList];
    
    // 应用搜索关键词筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase();
      filtered = filtered.filter(brand => 
        brand.name.toLowerCase().includes(keyword) ||
        brand.englishName.toLowerCase().includes(keyword) ||
        brand.specialties.some(specialty => specialty.includes(keyword))
      );
    }
    
    // 应用筛选条件
    const { country, priceRange, category, popularity } = this.data.filterOptions;
    
    if (country) {
      filtered = filtered.filter(brand => brand.country === country);
    }
    
    if (priceRange) {
      filtered = filtered.filter(brand => brand.priceRange === priceRange);
    }
    
    if (category) {
      filtered = filtered.filter(brand => brand.category === category);
    }
    
    if (popularity) {
      filtered = filtered.filter(brand => brand.popularity === popularity);
    }
    
    // 应用排序
    this.sortBrands(filtered);
    
    this.setData({
      filteredBrands: filtered
    });
  },

  // 排序品牌
  sortBrands(brands) {
    const { currentSort } = this.data;
    
    brands.sort((a, b) => {
      switch (currentSort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'popularity':
          return b.followCount - a.followCount;
        case 'founded':
          return b.founded - a.founded;
        case 'products':
          return b.productCount - a.productCount;
        default:
          return 0;
      }
    });
  },

  // 品牌详情相关方法
  onBrandTap(e) {
    const brand = e.currentTarget.dataset.brand;
    this.setData({
      selectedBrand: brand,
      showBrandDetail: true
    });
  },

  closeBrandDetail() {
    this.setData({
      showBrandDetail: false,
      selectedBrand: null
    });
  },

  onDetailMaskTap() {
    this.closeBrandDetail();
  },

  // 关注功能
  loadFollowedBrands() {
    const followed = wx.getStorageSync('followed_brands') || [];
    this.setData({
      followedBrands: followed
    });
  },

  toggleFollow(e) {
    const brand = e.currentTarget.dataset.brand;
    let followed = [...this.data.followedBrands];
    
    const index = followed.findIndex(item => item.id === brand.id);
    
    if (index > -1) {
      // 取消关注
      followed.splice(index, 1);
      wx.showToast({
        title: '已取消关注',
        icon: 'success'
      });
    } else {
      // 添加关注
      followed.push(brand);
      wx.showToast({
        title: '已关注品牌',
        icon: 'success'
      });
    }
    
    wx.setStorageSync('followed_brands', followed);
    this.setData({
      followedBrands: followed
    });
    
    // 更新品牌列表中的关注状态
    this.updateBrandFollowStatus(brand.id, index === -1);
    
    // 模拟API调用
    this.mockToggleFollowAPI(brand.id, index === -1);
  },

  // 更新品牌关注状态
  updateBrandFollowStatus(brandId, isFollowed) {
    const brandList = this.data.brandList.map(brand => {
      if (brand.id === brandId) {
        return { ...brand, isFollowed };
      }
      return brand;
    });
    
    const filteredBrands = this.data.filteredBrands.map(brand => {
      if (brand.id === brandId) {
        return { ...brand, isFollowed };
      }
      return brand;
    });
    
    this.setData({
      brandList,
      filteredBrands
    });
  },

  // 模拟关注API
  mockToggleFollowAPI(brandId, isFollowed) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`品牌 ${brandId} ${isFollowed ? '关注' : '取消关注'} 成功`);
        resolve();
      }, 300);
    });
  },

  // 判断是否已关注
  isFollowed(brandId) {
    return this.data.followedBrands.some(item => item.id === brandId);
  },

  // 查看品牌产品
  async viewBrandProducts(e) {
    const brand = e.currentTarget.dataset.brand;
    
    this.setData({
      selectedBrandForProducts: brand,
      showBrandProducts: true
    });
    
    try {
      const products = await this.mockBrandProductsAPI(brand.id);
      this.setData({
        brandProducts: products
      });
    } catch (error) {
      console.error('加载品牌产品失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 模拟品牌产品API
  mockBrandProductsAPI(brandId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockProducts = [
          {
            id: 1,
            name: '小黑瓶精华',
            image: '/images/products/lancome-serum.png',
            price: 680,
            rating: 4.8,
            category: '精华'
          },
          {
            id: 2,
            name: '粉水爽肤水',
            image: '/images/products/lancome-toner.png',
            price: 320,
            rating: 4.6,
            category: '爽肤水'
          },
          {
            id: 3,
            name: '菁纯口红',
            image: '/images/products/lancome-lipstick.png',
            price: 280,
            rating: 4.9,
            category: '口红'
          }
        ];
        resolve(mockProducts);
      }, 500);
    });
  },

  closeBrandProducts() {
    this.setData({
      showBrandProducts: false,
      selectedBrandForProducts: null,
      brandProducts: []
    });
  },

  // 分享功能
  onShareBrand(e) {
    const brand = e.currentTarget.dataset.brand;
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
    
    return {
      title: `${brand.name} - 品牌详情`,
      path: `/pages/brands/brands?id=${brand.id}`,
      imageUrl: brand.logo
    };
  },

  // 跳转到产品页面
  goToProducts(e) {
    const brand = e.currentTarget.dataset.brand;
    wx.navigateTo({
      url: `/pages/products/products?brand=${brand.name}`
    });
  }
});