// 管理后台 - 产品数据管理页面
const cloudApi = require('../../utils/cloudApi')
Page({
  data: {
    // 权限检查
    isAdmin: false,
    
    // 搜索和筛选
    searchText: '',
    filterCategory: '',
    filterBrand: '',
    filterStatus: 'all', // all, active, inactive
    
    // 产品列表
    productList: [],
    filteredProducts: [],
    totalCount: 0,
    
    // 分页
    currentPage: 1,
    pageSize: 20,
    hasMore: true,
    
    // 选择模式
    isSelectMode: false,
    selectedProducts: [],
    
    // 统计数据
    statistics: {
      totalProducts: 0,
      activeProducts: 0,
      inactiveProducts: 0,
      totalBrands: 0,
      totalCategories: 0
    },
    
    // 分类和品牌选项
    categories: [
      '洁面', '爽肤水', '精华', '乳液', '面霜', '面膜', 
      '防晒', '卸妆', '眼霜', '唇部护理', '身体护理'
    ],
    brands: [],
    brandOptions: ['全部'],
    filterBrandIndex: 0,
    
    // 弹窗状态
    showProductDetail: false,
    showBatchActions: false,
    currentProduct: null,
    
    // 云函数测试相关
    showCloudFunctionTest: false,
    selectedCloudFunction: null,
    selectedFunctionIndex: 0,
    testParams: '',
    testResult: null,
    testLoading: false,
    testError: null,
    cloudFunctions: [
      {
        name: 'diaryStats',
        displayName: '日记统计',
        description: '获取用户日记统计数据',
        apiPath: '/api/diary/stats?userId={userId}',
        defaultParams: '{"userId": "user_001_id"}'
      },
      {
        name: 'getUserProducts',
        displayName: '用户产品',
        description: '获取用户的产品列表',
        apiPath: '/api/products/user-products',
        defaultParams: '{"userId": "user_001_id", "type": "all", "page": 1, "limit": 10}'
      },
      {
        name: 'productsSearch',
        displayName: '产品搜索',
        description: '搜索产品信息',
        apiPath: '/api/products/search',
        defaultParams: '{"keyword": "洁面", "page": 1, "limit": 10}'
      },
      {
        name: 'userProfile',
        displayName: '用户资料',
        description: '获取用户详细资料',
        apiPath: '/api/user/profile',
        defaultParams: '{"action": "get", "userId": "user_001_id"}'
      },
      {
        name: 'aiDetection',
        displayName: 'AI检测',
        description: '皮肤AI检测分析',
        apiPath: '/api/detection/analyze',
        defaultParams: '{"imageUrl": "https://example.com/test-image.jpg", "userId": "user_001_id", "detectionType": "comprehensive"}'
      },
      {
        name: 'diaryCreate',
        displayName: '创建日记',
        description: '创建护肤日记',
        apiPath: '/api/diary/create',
        defaultParams: '{"userId": "user_001_id", "date": "2024-01-01", "skinCondition": 8, "mood": "good", "weather": "sunny", "products": [], "notes": "这是一个测试日记", "photos": []}'
      },
      {
        name: 'diaryList',
        displayName: '日记列表',
        description: '获取用户日记列表',
        apiPath: '/api/diary/list?userId={userId}&page={page}&limit={limit}',
        defaultParams: '{"userId": "user_001_id", "page": 1, "limit": 10}'
      },
      {
        name: 'diaryUpdate',
        displayName: '更新日记',
        description: '更新护肤日记',
        apiPath: '/api/diary/update',
        defaultParams: '{"diaryId": "test_diary_id", "userId": "user_001_id", "date": "2024-01-01", "skinCondition": 9, "mood": "excellent", "weather": "cloudy", "products": [], "notes": "这是更新后的测试日记内容", "photos": []}'
      },
      {
        name: 'detectionHistory',
        displayName: '检测历史',
        description: '获取AI检测历史记录',
        apiPath: '/api/detection/history?userId={userId}&page={page}&limit={limit}',
        defaultParams: '{"userId": "user_001_id", "page": 1, "limit": 10}'
      },
      {
        name: 'getProductRecommendations',
        displayName: '产品推荐',
        description: '获取产品推荐',
        apiPath: '/api/products/recommendations',
        defaultParams: '{"skinType": "oily", "skinConcerns": ["acne", "pores"], "ageRange": "20-30", "budget": "medium", "category": "all", "limit": 10, "page": 1}'
      },
      {
        name: 'uploadFile',
        displayName: '文件上传',
        description: '上传文件到云存储',
        apiPath: '/api/upload/file',
        defaultParams: '{"fileName": "test-image.jpg", "fileType": "image/jpeg", "fileSize": 1024000, "category": "test", "description": "测试文件上传", "metadata": {"source": "admin_test"}}'
      },
      {
        name: 'getUserInfo',
        displayName: '用户信息',
        description: '获取用户基本信息',
        apiPath: '/api/user/info',
        defaultParams: '{"action": "get", "userId": "user_001_id"}'
      },
      {
        name: 'updateUserInfo',
        displayName: '更新用户信息',
        description: '更新用户基本信息',
        apiPath: '/api/user/profile',
        defaultParams: '{"action": "update", "userId": "user_001_id", "profileData": {"nickname": "测试用户", "avatar": "https://example.com/avatar.jpg"}}'
      }
    ],
    
    // 加载状态
    loading: false,
    listLoading: false,
    refreshing: false,

    // 标签页管理
    currentTab: 'products', // products, requests

    // 催更请求相关
    requestsList: [],
    filteredRequests: [],
    requestsCount: 0,
    pendingRequestsCount: 0,
    
    // 请求筛选
    requestSearchText: '',
    requestFilterStatus: 'all', // all, pending, approved, rejected
    requestFilterCategory: '',
    
    // 请求分页
    requestsCurrentPage: 1,
    requestsPageSize: 20,
    hasMoreRequests: true,
    requestsLoading: false,
    
    // 请求统计
    requestsStatistics: {
      totalRequests: 0,
      pendingRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0
    },
    
    // 请求弹窗
    showRequestDetail: false,
    currentRequest: null,
    showProcessModal: false,
    processAction: '', // approve, reject
    processFeedback: '',
    processLoading: false
  },

  onLoad() {
    this.checkAdminPermission();
    this.loadInitialData();
  },

  onShow() {
    if (this.data.isAdmin) {
      this.refreshData();
    }
  },

  onPullDownRefresh() {
    this.refreshData();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.listLoading) {
      this.loadMoreProducts();
    }
  },

  // 权限检查
  checkAdminPermission() {
    console.log('=== 管理员权限检查开始 ===');
    
    // 多种方式获取用户信息
    let userInfo = null;
    
    // 方式1: 直接从微信存储获取
    try {
      userInfo = wx.getStorageSync('userInfo');
      console.log('方式1 - 微信存储获取:', JSON.stringify(userInfo, null, 2));
    } catch (error) {
      console.error('方式1获取失败:', error);
    }
    
    // 方式2: 从全局App获取
    try {
      const app = getApp();
      const appUserInfo = app.getUserInfo();
      console.log('方式2 - App全局获取:', JSON.stringify(appUserInfo, null, 2));
      if (!userInfo && appUserInfo) {
        userInfo = appUserInfo;
      }
    } catch (error) {
      console.error('方式2获取失败:', error);
    }
    
    // 方式3: 从Auth工具获取
    try {
      const Auth = require('../../utils/auth.js');
      const authUserInfo = Auth.getUserInfo();
      console.log('方式3 - Auth工具获取:', JSON.stringify(authUserInfo, null, 2));
      if (!userInfo && authUserInfo) {
        userInfo = authUserInfo;
      }
    } catch (error) {
      console.error('方式3获取失败:', error);
    }
    
    console.log('最终用户信息:', JSON.stringify(userInfo, null, 2));
    console.log('用户信息类型:', typeof userInfo);
    console.log('用户信息是否存在:', !!userInfo);
    
    if (!userInfo) {
      console.log('权限检查失败: 用户信息不存在');
      this.showAdminSetupModal();
      return;
    }
    
    // 检查用户信息是否为字符串（需要解析）
    if (typeof userInfo === 'string') {
      try {
        userInfo = JSON.parse(userInfo);
        console.log('解析字符串后的用户信息:', JSON.stringify(userInfo, null, 2));
      } catch (error) {
        console.error('解析用户信息字符串失败:', error);
      }
    }
    
    // 详细检查role字段
    console.log('用户角色字段:', userInfo.role);
    console.log('用户角色类型:', typeof userInfo.role);
    console.log('用户角色长度:', userInfo.role ? userInfo.role.length : 'undefined');
    console.log('用户角色原始值:', JSON.stringify(userInfo.role));
    
    // 检查所有可能的role字段位置
    const possibleRoles = [
      userInfo.role,
      userInfo.Role,
      userInfo.ROLE,
      userInfo.user_role,
      userInfo.userRole,
      userInfo.type,
      userInfo.userType
    ];
    
    console.log('所有可能的角色字段:', possibleRoles);
    
    // 使用严格的字符串比较
    const roleStr = String(userInfo.role || '').trim().toLowerCase();
    console.log('处理后的角色字符串:', roleStr);
    console.log('是否等于admin:', roleStr === 'admin');
    
    // 多种方式验证管理员权限
    const isAdminStrict = userInfo.role === 'admin';
    const isAdminLoose = roleStr === 'admin';
    const isAdminOriginal = userInfo && userInfo.role === 'admin';
    const isAdminByType = userInfo.type === 'admin' || userInfo.userType === 'admin';
    const isDevAdmin = userInfo.isDev && userInfo.role === 'admin';
    
    console.log('严格比较结果:', isAdminStrict);
    console.log('宽松比较结果:', isAdminLoose);
    console.log('原始比较结果:', isAdminOriginal);
    console.log('类型字段比较结果:', isAdminByType);
    console.log('开发模式管理员结果:', isDevAdmin);
    
    const isAdmin = isAdminStrict || isAdminLoose || isAdminByType || isDevAdmin;
    console.log('最终权限判断结果:', isAdmin);
    
    if (!isAdmin) {
      console.log('权限检查失败: 用户不是管理员');
      console.log('=== 管理员权限检查结束 (失败) ===');
      this.showAdminSetupModal();
      return;
    }
    
    this.setData({ isAdmin: true });
    console.log('管理员权限验证通过');
    console.log('=== 管理员权限检查结束 (成功) ===');
  },

  // 显示管理员设置弹窗
  showAdminSetupModal() {
    wx.showModal({
      title: '权限不足',
      content: '您没有管理员权限。是否要临时设置为管理员？',
      confirmText: '设置管理员',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          this.setTempAdminPermission();
        } else {
          wx.navigateBack();
        }
      }
    });
  },

  // 设置临时管理员权限
  setTempAdminPermission() {
    const tempAdminInfo = {
      id: 'temp_admin_' + Date.now(),
      role: 'admin',
      nickname: '临时管理员',
      avatar: '/images/default-avatar.png',
      isDev: true,
      isLogin: true,
      isTempAdmin: true,
      createTime: Date.now()
    };
    
    // 保存到多个位置确保可访问
    wx.setStorageSync('userInfo', tempAdminInfo);
    
    const app = getApp();
    if (app && app.setUserInfo) {
      app.setUserInfo(tempAdminInfo);
    }
    
    console.log('临时管理员权限设置成功:', JSON.stringify(tempAdminInfo, null, 2));
    
    wx.showToast({
      title: '管理员权限已设置',
      icon: 'success',
      duration: 2000,
      complete: () => {
        // 重新检查权限
        setTimeout(() => {
          this.checkAdminPermission();
        }, 500);
      }
    });
  },

  // 加载初始数据
  async loadInitialData() {
    this.setData({ loading: true });
    
    try {
      await Promise.all([
        this.loadBrandList(),
        this.loadStatistics(),
        this.loadProductList(),
        this.loadRequestsList(),
        this.loadRequestsStatistics()
      ]);
    } catch (error) {
      console.error('加载初始数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ listLoading: false });
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({ 
      refreshing: true,
      currentPage: 1,
      productList: [],
      hasMore: true
    });
    
    try {
      await this.loadInitialData();
    } finally {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    }
  },

  // 加载品牌列表
  async loadBrandList() {
    try {
      const products = await cloudApi.queryData('products', {}, { limit: 1000 })
      const brandSet = new Set()
      products.forEach(p => { if (p.brand) brandSet.add(p.brand) })
      const brandOptions = ['全部', ...Array.from(brandSet)]
      this.setData({
        brands: Array.from(brandSet).map((name, idx) => ({ id: idx + 1, name })),
        brandOptions
      })
      return this.data.brands
    } catch (error) {
      console.error('加载品牌列表失败:', error)
      this.setData({ brands: [], brandOptions: ['全部'] })
      return []
    }
  },

  // 加载统计数据
  async loadStatistics() {
    try {
      const db = cloudApi.getDatabase()
      const totalRes = await db.collection('products').count()
      const activeRes = await db.collection('products').where({ isActive: true }).count()
      const inactiveRes = await db.collection('products').where({ isActive: false }).count()

      const sample = await cloudApi.queryData('products', {}, { limit: 1000 })
      const brandSet = new Set()
      const categorySet = new Set()
      sample.forEach(p => { if (p.brand) brandSet.add(p.brand); if (p.category) categorySet.add(p.category) })

      const statistics = {
        totalProducts: totalRes.total || 0,
        activeProducts: activeRes.total || 0,
        inactiveProducts: inactiveRes.total || 0,
        totalBrands: brandSet.size,
        totalCategories: categorySet.size
      }

      this.setData({ statistics })
      return statistics
    } catch (error) {
      console.error('加载统计数据失败:', error)
      const statistics = {
        totalProducts: 0,
        activeProducts: 0,
        inactiveProducts: 0,
        totalBrands: 0,
        totalCategories: 0
      }
      this.setData({ statistics })
      return statistics
    }
  },

  // 加载产品列表
  async loadProductList(loadMore = false) {
    if (this.data.listLoading) return;
    
    this.setData({ listLoading: true });
    
    try {
      const skip = loadMore 
        ? this.data.currentPage * this.data.pageSize 
        : (this.data.currentPage - 1) * this.data.pageSize
      
      // 查询产品数据
      const raw = await cloudApi.queryData('products', {}, {
        limit: this.data.pageSize,
        skip
      })

      // 查询总数（只在首次加载时查询）
      let totalCount = this.data.totalCount;
      if (!loadMore) {
        try {
          const db = cloudApi.getDatabase()
          const countRes = await db.collection('products').count()
          totalCount = countRes.total || 0
        } catch (countError) {
          console.warn('获取产品总数失败，使用统计数据:', countError)
          totalCount = this.data.statistics.totalProducts || 0
        }
      }

      const CATEGORY_MAP = {
        cleanser: '洁面',
        toner: '爽肤水',
        serum: '精华',
        emulsion: '乳液',
        moisturizer: '面霜',
        mask: '面膜',
        sunscreen: '防晒',
        makeup_remover: '卸妆',
        eye_cream: '眼霜',
        lip_care: '唇部护理',
        body_care: '身体护理'
      }

      // 兼容时间字段为字符串或 Date 对象，统一为 ISO 字符串
      const normalizeDate = (v) => {
        if (!v) return ''
        if (typeof v === 'string') return v
        try {
          if (v.toISOString) return v.toISOString()
        } catch (e) {}
        return ''
      }

      const normalized = raw.map(doc => ({
        id: doc._id || doc.id,
        name: doc.name || '未命名产品',
        brand: doc.brand || '未知品牌',
        category: doc.category || 'other',
        categoryDisplay: CATEGORY_MAP[doc.category] || doc.category || '其他',
        image: doc.image || doc.imageUrl || '/images/products/谷雨-淡斑瓶.png',
        price: typeof doc.price === 'object' ? (doc.price.min ?? doc.price.max ?? 0) : (doc.price ?? 0),
        status: doc.isActive === false ? 'inactive' : 'active',
        createTime: normalizeDate(doc.createdAt || doc.createdDate || doc.createTime),
        updateTime: normalizeDate(doc.updatedAt || doc.updatedDate || doc.updateTime),
        sales: doc.userCount || doc.sales || 0,
        rating: (doc.rating ?? (doc.ratings && doc.ratings.average)) || 0
      }))

      // 计算是否还有更多数据
      const currentTotal = loadMore ? this.data.productList.length + normalized.length : normalized.length
      const hasMore = currentTotal < totalCount

      if (loadMore) {
        this.setData({
          productList: [...this.data.productList, ...normalized],
          currentPage: this.data.currentPage + 1,
          hasMore
        })
      } else {
        // 首次加载时，重新生成品牌选项（基于所有产品）
        await this.loadBrandList()
        
        this.setData({
          productList: normalized,
          totalCount: totalCount,
          currentPage: 1,
          hasMore
        })
      }
      
      this.filterProducts();
    } catch (error) {
      console.error('加载产品列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 模拟产品列表API
  mockProductListAPI() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const products = [];
        const startIndex = (this.data.currentPage - 1) * this.data.pageSize;
        
        // 使用现有的两张PNG图片
        const availableImages = [
          '/images/products/谷雨-淡斑瓶.png',
          '/images/products/谷雨-美白奶罐.png'
        ];
        
        for (let i = 0; i < this.data.pageSize; i++) {
          const index = startIndex + i;
          if (index >= 156) break; // 总共156个产品
          
          products.push({
            id: index + 1,
            name: `护肤产品 ${index + 1}`,
            brand: this.data.brands[index % this.data.brands.length]?.name || '未知品牌',
            category: this.data.categories[index % this.data.categories.length],
            price: (Math.random() * 500 + 50).toFixed(2),
            image: availableImages[index % availableImages.length],
            status: Math.random() > 0.1 ? 'active' : 'inactive',
            createTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            updateTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            sales: Math.floor(Math.random() * 1000),
            rating: (Math.random() * 2 + 3).toFixed(1)
          });
        }
        
        resolve({
          products,
          total: 156,
          hasMore: startIndex + products.length < 156
        });
      }, 500);
    });
  },

  // 加载更多产品
  loadMoreProducts() {
    this.loadProductList(true);
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchText: e.detail.value });
    this.debounceFilter();
  },

  // 防抖筛选
  debounceFilter() {
    clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => {
      this.filterProducts();
    }, 300);
  },

  // 筛选产品（适配真实数据字段）
  filterProducts() {
    let filtered = [...this.data.productList];
    
    if (this.data.searchText) {
      const searchText = this.data.searchText.toLowerCase();
      filtered = filtered.filter(product => 
        (product.name || '').toLowerCase().includes(searchText) ||
        (product.brand || '').toLowerCase().includes(searchText)
      );
    }
    
    if (this.data.filterCategory) {
      filtered = filtered.filter(product => product.categoryDisplay === this.data.filterCategory);
    }
    
    if (this.data.filterBrand) {
      filtered = filtered.filter(product => product.brand === this.data.filterBrand);
    }
    
    if (this.data.filterStatus !== 'all') {
      filtered = filtered.filter(product => product.status === this.data.filterStatus);
    }
    
    this.setData({ filteredProducts: filtered });
  },

  // 分类筛选
  onCategoryChange(e) {
    const category = e.detail.value === '全部' ? '' : e.detail.value;
    this.setData({ filterCategory: category });
    this.filterProducts();
  },

  // 品牌筛选
  onBrandChange(e) {
    const index = parseInt(e.detail.value);
    const brand = index === 0 ? '' : this.data.brandOptions[index];
    this.setData({ 
      filterBrandIndex: index,
      filterBrand: brand 
    });
    this.filterProducts();
  },

  // 状态筛选
  onStatusChange(e) {
    this.setData({ filterStatus: e.detail.value });
    this.filterProducts();
  },

  // 清空筛选
  clearFilters() {
    this.setData({
      searchText: '',
      filterCategory: '',
      filterBrand: '',
      filterBrandIndex: 0,
      filterStatus: 'all'
    });
    this.filterProducts();
  },

  // 切换选择模式
  toggleSelectMode() {
    this.setData({
      isSelectMode: !this.data.isSelectMode,
      selectedProducts: []
    });
  },

  // 选择产品
  toggleProductSelect(e) {
    const productId = e.currentTarget.dataset.id;
    const selectedProducts = [...this.data.selectedProducts];
    const index = selectedProducts.indexOf(productId);
    
    if (index > -1) {
      selectedProducts.splice(index, 1);
    } else {
      selectedProducts.push(productId);
    }
    
    this.setData({ selectedProducts });
  },

  // 全选/取消全选
  toggleSelectAll() {
    const allSelected = this.data.selectedProducts.length === this.data.filteredProducts.length;
    const selectedProducts = allSelected ? [] : this.data.filteredProducts.map(p => p.id);
    this.setData({ selectedProducts });
  },

  // 查看产品详情
  viewProductDetail(e) {
    const productId = e.currentTarget.dataset.id;
    const product = this.data.filteredProducts.find(p => p.id === productId);
    
    this.setData({
      currentProduct: product,
      showProductDetail: true
    });
  },

  // 关闭产品详情
  closeProductDetail() {
    this.setData({
      showProductDetail: false,
      currentProduct: null
    });
  },

  // 编辑产品
  editProduct(e) {
    const productId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/admin/edit?id=${productId}`
    });
  },

  // 切换产品状态
  async toggleProductStatus(e) {
    const productId = e.currentTarget.dataset.id;
    const product = this.data.filteredProducts.find(p => p.id === productId);
    
    wx.showLoading({ title: '更新中...' });
    
    try {
      const newStatus = product.status === 'active' ? 'inactive' : 'active';
      await cloudApi.updateData('products', productId, { isActive: newStatus === 'active' })
      const updatedProducts = this.data.filteredProducts.map(p => 
        p.id === productId ? { ...p, status: newStatus } : p
      );
      this.setData({ filteredProducts: updatedProducts });
      wx.showToast({
        title: newStatus === 'active' ? '已启用' : '已禁用',
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 删除产品
  deleteProduct(e) {
    const productId = e.currentTarget.dataset.id;
    const product = this.data.filteredProducts.find(p => p.id === productId);
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除产品"${product.name}"吗？此操作不可恢复。`,
      confirmText: '删除',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          this.performDeleteProduct(productId);
        }
      }
    });
  },

  // 执行删除产品
  async performDeleteProduct(productId) {
    wx.showLoading({ title: '删除中...' });
    
    try {
      await cloudApi.deleteData('products', productId)
      const updatedProducts = this.data.filteredProducts.filter(p => p.id !== productId);
      this.setData({ filteredProducts: updatedProducts });
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: '删除失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 显示批量操作
  showBatchActions() {
    if (this.data.selectedProducts.length === 0) {
      wx.showToast({
        title: '请先选择产品',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ showBatchActions: true });
  },

  // 隐藏批量操作
  hideBatchActions() {
    this.setData({ showBatchActions: false });
  },

  // 批量启用
  async batchEnable() {
    await this.performBatchOperation('active', '启用');
  },

  // 批量禁用
  async batchDisable() {
    await this.performBatchOperation('inactive', '禁用');
  },

  // 批量删除
  batchDelete() {
    wx.showModal({
      title: '确认删除',
      content: `确定要删除选中的 ${this.data.selectedProducts.length} 个产品吗？此操作不可恢复。`,
      confirmText: '删除',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          this.performBatchDelete();
        }
      }
    });
  },

  // 执行批量操作
  async performBatchOperation(status, action) {
    wx.showLoading({ title: `${action}中...` });
    
    try {
      const updates = this.data.selectedProducts.map(id =>
        cloudApi.updateData('products', id, { isActive: status === 'active' })
      )
      await Promise.all(updates)
      
      const updatedProducts = this.data.filteredProducts.map(p => 
        this.data.selectedProducts.includes(p.id) ? { ...p, status } : p
      );
      
      this.setData({
        filteredProducts: updatedProducts,
        selectedProducts: [],
        isSelectMode: false,
        showBatchActions: false
      });
      
      wx.showToast({
        title: `批量${action}成功`,
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: `批量${action}失败`,
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 执行批量删除
  async performBatchDelete() {
    wx.showLoading({ title: '删除中...' });
    
    try {
      const deletes = this.data.selectedProducts.map(id => cloudApi.deleteData('products', id))
      await Promise.all(deletes)
      
      const updatedProducts = this.data.filteredProducts.filter(p => 
        !this.data.selectedProducts.includes(p.id)
      );
      
      this.setData({
        filteredProducts: updatedProducts,
        selectedProducts: [],
        isSelectMode: false,
        showBatchActions: false
      });
      
      wx.showToast({
        title: '批量删除成功',
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: '批量删除失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 导出数据
  exportData() {
    wx.showLoading({ title: '导出中...' });
    
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '导出成功',
        icon: 'success'
      });
      
      // 这里可以实现实际的导出逻辑
      console.log('导出产品数据:', this.data.filteredProducts);
    }, 2000);
  },

  // 跳转到上传页面
  goToUpload() {
    wx.navigateTo({
      url: '/pages/admin/upload'
    });
  },

  // 显示云函数测试弹窗
  showCloudFunctionTest() {
    console.log('showCloudFunctionTest 方法被调用');
    this.setData({ 
      showCloudFunctionTest: true,
      selectedCloudFunction: null,
      selectedFunctionIndex: 0,
      testParams: '',
      testResult: null,
      testLoading: false,
      testError: null
    });
    console.log('showCloudFunctionTest 数据设置完成:', this.data.showCloudFunctionTest);
  },

  // 隐藏云函数测试弹窗
  hideCloudFunctionTest() {
    this.setData({ showCloudFunctionTest: false });
  },

  // 选择云函数
  onCloudFunctionChange(e) {
    const index = e.detail.value;
    const cloudFunction = this.data.cloudFunctions[index];
    this.setData({ 
      selectedCloudFunction: cloudFunction,
      testParams: cloudFunction.defaultParams || ''
    });
  },

  // 测试参数输入
  onTestParamsInput(e) {
    this.setData({ testParams: e.detail.value });
  },

  // 开始测试云函数
  async startCloudFunctionTest() {
    if (!this.data.selectedCloudFunction) {
      wx.showToast({
        title: '请选择云函数',
        icon: 'none'
      });
      return;
    }

    this.setData({ 
      testLoading: true,
      testResult: null,
      testError: null
    });

    const startTime = Date.now();
    
    try {
      const cloudFunction = this.data.selectedCloudFunction;
      let result;
      
      // 根据云函数类型调用不同的测试方法
      switch (cloudFunction.name) {
        case 'diaryStats':
          result = await this.testDiaryStats();
          break;
        case 'getUserProducts':
          result = await this.testGetUserProducts();
          break;
        case 'productsSearch':
          result = await this.testProductsSearch();
          break;
        case 'userProfile':
          result = await this.testUserProfile();
          break;
        case 'aiDetection':
          result = await this.testAiDetection();
          break;
        case 'diaryCreate':
          result = await this.testDiaryCreate();
          break;
        case 'diaryList':
          result = await this.testDiaryList();
          break;
        case 'diaryUpdate':
          result = await this.testDiaryUpdate();
          break;
        case 'detectionHistory':
          result = await this.testDetectionHistory();
          break;
        case 'getProductRecommendations':
          result = await this.testGetProductRecommendations();
          break;
        case 'uploadFile':
          result = await this.testUploadFile();
          break;
        case 'getUserInfo':
          result = await this.testGetUserInfo();
          break;
        case 'updateUserInfo':
          result = await this.testUpdateUserInfo();
          break;
        default:
          throw new Error('未知的云函数类型');
      }

      const responseTime = Date.now() - startTime;
      
      this.setData({
        testResult: {
          success: true,
          responseTime,
          statusCode: result.code || 0,
          data: result,
          timestamp: new Date().toLocaleString()
        }
      });

      wx.showToast({
        title: '测试完成',
        icon: 'success'
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.setData({
        testResult: {
          success: false,
          responseTime,
          error: error.message || '测试失败',
          timestamp: new Date().toLocaleString()
        },
        testError: error.message || '测试失败'
      });

      wx.showToast({
        title: '测试失败',
        icon: 'error'
      });
    } finally {
      this.setData({ testLoading: false });
    }
  },

  // 清空测试结果
  clearTestResult() {
    this.setData({ 
      testResult: null,
      testError: null
    });
  },

  // 测试 diaryStats 云函数
  async testDiaryStats() {
    const request = require('../../utils/request.js');
    const testUserId = 'user_001_id';
    return await request.get('/api/diary/stats', {
      userId: testUserId
    });
  },

  // 测试 getUserProducts 云函数
  async testGetUserProducts() {
    const request = require('../../utils/request.js');
    const testUserId = 'user_001_id';
    return await request.get('/api/products/user-products', {
      userId: testUserId,
      type: 'all',
      page: 1,
      limit: 10
    });
  },

  // 测试 productsSearch 云函数
  async testProductsSearch() {
    const request = require('../../utils/request.js');
    return await request.get('/api/products/search', {
      keyword: '洁面',
      page: 1,
      limit: 10
    });
  },

  // 测试 userProfile 云函数
  async testUserProfile() {
    const request = require('../../utils/request.js');
    const testUserId = 'user_001_id';
    return await request.post('/api/user/profile', {
      action: 'get',
      userId: testUserId
    });
  },

  // 测试 aiDetection 云函数 (实际使用 detectionAnalyze)
  async testAiDetection() {
    const request = require('../../utils/request.js');
    return await request.post('/api/detection/analyze', {
      imageUrl: 'https://example.com/test-image.jpg',
      userId: 'user_001_id',
      detectionType: 'comprehensive'
    });
  },

  // 测试 diaryCreate 云函数
  async testDiaryCreate() {
    const request = require('../../utils/request.js');
    return await request.post('/api/diary/create', {
      userId: 'user_001_id',
      date: new Date().toISOString().split('T')[0],
      skinCondition: 8,
      mood: 'good',
      weather: 'sunny',
      products: [],
      notes: '这是一个测试日记',
      photos: []
    });
  },

  // 测试 diaryList 云函数
  async testDiaryList() {
    const request = require('../../utils/request.js');
    const testUserId = 'user_001_id';
    return await request.get('/api/diary/list', {
      userId: testUserId,
      page: 1,
      limit: 10
    });
  },

  // 测试 diaryUpdate 云函数
  async testDiaryUpdate() {
    const request = require('../../utils/request.js');
    return await request.post('/api/diary/update', {
      diaryId: 'test_diary_id',
      userId: 'user_001_id',
      date: new Date().toISOString().split('T')[0],
      skinCondition: 9,
      mood: 'excellent',
      weather: 'cloudy',
      products: [],
      notes: '这是更新后的测试日记内容',
      photos: []
    });
  },

  // 测试 detectionHistory 云函数
  async testDetectionHistory() {
    const request = require('../../utils/request.js');
    const testUserId = 'user_001_id';
    return await request.get('/api/detection/history', {
      userId: testUserId,
      page: 1,
      limit: 10
    });
  },

  // 测试 getProductRecommendations 云函数
  async testGetProductRecommendations() {
    const request = require('../../utils/request.js');
    return await request.post('/api/products/recommendations', {
      skinType: 'oily',
      skinConcerns: ['acne', 'pores'],
      ageRange: '20-30',
      budget: 'medium',
      category: 'all',
      limit: 10,
      page: 1
    });
  },

  // 测试 uploadFile 云函数
  async testUploadFile() {
    const request = require('../../utils/request.js');
    return await request.post('/api/upload/file', {
      fileName: 'test-image.jpg',
      fileType: 'image/jpeg',
      fileSize: 1024000,
      category: 'test',
      description: '测试文件上传',
      metadata: {
        source: 'admin_test'
      }
    });
  },

  // 测试 getUserInfo 云函数
  async testGetUserInfo() {
    const request = require('../../utils/request.js');
    const testUserId = 'user_001_id';
    return await request.post('/api/user/info', {
      action: 'get',
      userId: testUserId
    });
  },

  // 测试 updateUserInfo 云函数 (实际使用 userProfile 的 update 操作)
  async testUpdateUserInfo() {
    const request = require('../../utils/request.js');
    return await request.post('/api/user/profile', {
      action: 'update',
      userId: 'user_001_id',
      profileData: {
        nickname: '测试用户',
        avatar: 'https://example.com/avatar.jpg'
      }
    });
  },

  // ==================== 标签页管理 ====================
  
  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
    
    if (tab === 'requests' && this.data.requestsList.length === 0) {
      this.loadRequestsList();
    }
  },

  // ==================== 催更请求管理 ====================
  
  // 加载催更请求列表
  async loadRequestsList() {
    if (this.data.requestsLoading) return;
    
    this.setData({ requestsLoading: true });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'getProductRequests',
        data: {
          page: this.data.requestsCurrentPage,
          limit: this.data.requestsPageSize,
          status: this.data.requestFilterStatus === 'all' ? undefined : this.data.requestFilterStatus,
          category: this.data.requestFilterCategory || undefined
        }
      });

      if (result.result && result.result.code === 0) {
        const requests = result.result.data?.requests || [];
        const total = result.result.data?.total || 0;
        
        // 如果是第一页，替换数据；否则追加数据
        const newRequests = this.data.requestsCurrentPage === 1 ? 
          requests : [...this.data.requestsList, ...requests];
        
        this.setData({
          requestsList: newRequests,
          requestsCount: total,
          hasMoreRequests: requests.length === this.data.requestsPageSize
        });
        
        this.filterRequests();
      } else {
        throw new Error(result.result.message || '获取催更请求失败');
      }
    } catch (error) {
      console.error('加载催更请求失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ requestsLoading: false });
    }
  },

  // 加载催更请求统计
  async loadRequestsStatistics() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getProductRequests',
        data: {
          page: 1,
          limit: 1,
          getStatistics: true
        }
      });

      if (result.result && result.result.code === 0 && result.result.data && result.result.data.statistics) {
        const stats = result.result.data.statistics;
        this.setData({
          requestsStatistics: {
            totalRequests: stats.total || 0,
            pendingRequests: stats.pending || 0,
            approvedRequests: stats.approved || 0,
            rejectedRequests: stats.rejected || 0
          },
          pendingRequestsCount: stats.pending || 0
        });
      }
    } catch (error) {
      console.error('加载催更请求统计失败:', error);
    }
  },

  // 筛选催更请求
  filterRequests() {
    let filtered = [...this.data.requestsList];
    
    // 搜索筛选
    if (this.data.requestSearchText) {
      const searchText = this.data.requestSearchText.toLowerCase();
      filtered = filtered.filter(request => 
        request.productName.toLowerCase().includes(searchText) ||
        request.brand.toLowerCase().includes(searchText) ||
        (request.userNickname && request.userNickname.toLowerCase().includes(searchText))
      );
    }
    
    // 状态筛选
    if (this.data.requestFilterStatus !== 'all') {
      filtered = filtered.filter(request => request.status === this.data.requestFilterStatus);
    }
    
    // 分类筛选
    if (this.data.requestFilterCategory) {
      filtered = filtered.filter(request => request.category === this.data.requestFilterCategory);
    }
    
    this.setData({ filteredRequests: filtered });
  },

  // 搜索输入
  onRequestSearchInput(e) {
    this.setData({ requestSearchText: e.detail.value });
    this.filterRequests();
  },

  // 状态筛选变化
  onRequestStatusChange(e) {
    const statusOptions = ['all', 'pending', 'approved', 'rejected'];
    const status = statusOptions[e.detail.value];
    this.setData({ requestFilterStatus: status });
    this.filterRequests();
  },

  // 分类筛选变化
  onRequestCategoryChange(e) {
    const category = e.detail.value === 0 ? '' : this.data.categories[e.detail.value - 1];
    this.setData({ requestFilterCategory: category });
    this.filterRequests();
  },

  // 清空请求筛选
  clearRequestFilters() {
    this.setData({
      requestSearchText: '',
      requestFilterStatus: 'all',
      requestFilterCategory: ''
    });
    this.filterRequests();
  },

  // 加载更多请求
  loadMoreRequests() {
    if (this.data.hasMoreRequests && !this.data.requestsLoading) {
      this.setData({ 
        requestsCurrentPage: this.data.requestsCurrentPage + 1 
      });
      this.loadRequestsList();
    }
  },

  // 查看请求详情
  viewRequestDetail(e) {
    const requestId = e.currentTarget.dataset.id;
    const request = this.data.requestsList.find(r => r.id === requestId);
    if (request) {
      this.setData({
        currentRequest: request,
        showRequestDetail: true
      });
    }
  },

  // 关闭请求详情
  closeRequestDetail() {
    this.setData({
      showRequestDetail: false,
      currentRequest: null
    });
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    const images = this.data.currentRequest.images || [];
    wx.previewImage({
      current: url,
      urls: images
    });
  },

  // 快速通过请求
  approveRequest(e) {
    const requestId = e.currentTarget.dataset.id;
    const request = this.data.requestsList.find(r => r.id === requestId);
    if (request) {
      this.setData({
        currentRequest: request,
        processAction: 'approve',
        processFeedback: '',
        showProcessModal: true
      });
    }
  },

  // 快速拒绝请求
  rejectRequest(e) {
    const requestId = e.currentTarget.dataset.id;
    const request = this.data.requestsList.find(r => r.id === requestId);
    if (request) {
      this.setData({
        currentRequest: request,
        processAction: 'reject',
        processFeedback: '',
        showProcessModal: true
      });
    }
  },

  // 显示处理弹窗
  showProcessModal(e) {
    const action = e.currentTarget.dataset.action;
    this.setData({
      processAction: action,
      processFeedback: '',
      showProcessModal: true
    });
  },

  // 隐藏处理弹窗
  hideProcessModal() {
    this.setData({
      showProcessModal: false,
      processAction: '',
      processFeedback: ''
    });
  },

  // 处理反馈输入
  onProcessFeedbackInput(e) {
    this.setData({ processFeedback: e.detail.value });
  },

  // 确认处理请求
  async confirmProcessRequest() {
    if (this.data.processLoading) return;
    
    const { currentRequest, processAction, processFeedback } = this.data;
    
    if (!currentRequest) {
      wx.showToast({
        title: '请求信息错误',
        icon: 'error'
      });
      return;
    }

    this.setData({ processLoading: true });

    try {
      const result = await wx.cloud.callFunction({
        name: 'processProductRequest',
        data: {
          requestId: currentRequest.id,
          action: processAction,
          adminFeedback: processFeedback || undefined
        }
      });

      if (result.result && result.result.code === 0) {
        wx.showToast({
          title: processAction === 'approve' ? '已通过请求' : '已拒绝请求',
          icon: 'success'
        });

        // 更新本地数据
        const updatedRequests = this.data.requestsList.map(request => {
          if (request.id === currentRequest.id) {
            return {
              ...request,
              status: processAction === 'approve' ? 'approved' : 'rejected',
              adminFeedback: processFeedback,
              processTime: new Date().toISOString()
            };
          }
          return request;
        });

        this.setData({
          requestsList: updatedRequests,
          showProcessModal: false,
          showRequestDetail: false,
          currentRequest: null,
          processAction: '',
          processFeedback: ''
        });

        this.filterRequests();
        this.loadRequestsStatistics();
      } else {
        throw new Error(result.result.message || '处理请求失败');
      }
    } catch (error) {
      console.error('处理请求失败:', error);
      wx.showToast({
        title: '处理失败',
        icon: 'error'
      });
    } finally {
      this.setData({ processLoading: false });
    }
  }
});