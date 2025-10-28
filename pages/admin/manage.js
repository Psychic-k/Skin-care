// 管理后台 - 产品数据管理页面
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
    
    // 加载状态
    loading: false,
    refreshing: false
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
    if (this.data.hasMore && !this.data.loading) {
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
        this.loadProductList()
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
    // 模拟API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        const brands = [
          { id: 1, name: '兰蔻', logo: '/images/brands/lancome.jpg' },
          { id: 2, name: '雅诗兰黛', logo: '/images/brands/estee.jpg' },
          { id: 3, name: '欧莱雅', logo: '/images/brands/loreal.jpg' },
          { id: 4, name: '资生堂', logo: '/images/brands/shiseido.jpg' },
          { id: 5, name: 'SK-II', logo: '/images/brands/skii.jpg' }
        ];
        const brandOptions = ['全部'].concat(brands.map(b => b.name));
        this.setData({ 
          brands,
          brandOptions
        });
        resolve(brands);
      }, 300);
    });
  },

  // 加载统计数据
  async loadStatistics() {
    // 模拟API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        const statistics = {
          totalProducts: 156,
          activeProducts: 142,
          inactiveProducts: 14,
          totalBrands: 25,
          totalCategories: 11
        };
        this.setData({ statistics });
        resolve(statistics);
      }, 200);
    });
  },

  // 加载产品列表
  async loadProductList(loadMore = false) {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      // 模拟API调用
      const response = await this.mockProductListAPI();
      
      if (loadMore) {
        this.setData({
          productList: [...this.data.productList, ...response.products],
          currentPage: this.data.currentPage + 1,
          hasMore: response.hasMore
        });
      } else {
        this.setData({
          productList: response.products,
          totalCount: response.total,
          currentPage: 1,
          hasMore: response.hasMore
        });
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

  // 筛选产品
  filterProducts() {
    let filtered = [...this.data.productList];
    
    // 搜索筛选
    if (this.data.searchText) {
      const searchText = this.data.searchText.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchText) ||
        product.brand.toLowerCase().includes(searchText)
      );
    }
    
    // 分类筛选
    if (this.data.filterCategory) {
      filtered = filtered.filter(product => product.category === this.data.filterCategory);
    }
    
    // 品牌筛选
    if (this.data.filterBrand) {
      filtered = filtered.filter(product => product.brand === this.data.filterBrand);
    }
    
    // 状态筛选
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
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newStatus = product.status === 'active' ? 'inactive' : 'active';
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
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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
  }
});