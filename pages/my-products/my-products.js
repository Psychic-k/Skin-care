// pages/my-products/my-products.js
const app = getApp();

Page({
  data: {
    // 产品列表数据
    products: [],
    totalCount: 0,
    usedCount: 0,
    favoriteCount: 0,
    
    // 分页数据
    currentPage: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    loadingMore: false,
    
    // 搜索和筛选
    searchKeyword: '',
    activeFilters: [],
    filterOptions: {
      category: '',
      status: '',
      sort: 'addedDate_desc'
    },
    
    // 筛选选项
    categoryOptions: [
      { label: '全部分类', value: '' },
      { label: '洁面', value: 'cleanser' },
      { label: '爽肤水', value: 'toner' },
      { label: '精华', value: 'serum' },
      { label: '乳液面霜', value: 'moisturizer' },
      { label: '防晒', value: 'sunscreen' },
      { label: '面膜', value: 'mask' },
      { label: '套装', value: 'skincare_set' }
    ],
    statusOptions: [
      { label: '全部状态', value: '' },
      { label: '已使用', value: 'used' },
      { label: '收藏', value: 'favorite' },
      { label: '未使用', value: 'unused' }
    ],
    sortOptions: [
      { label: '最近添加', value: 'addedDate_desc' },
      { label: '最早添加', value: 'addedDate_asc' },
      { label: '产品名称', value: 'name_asc' },
      { label: '品牌名称', value: 'brand_asc' }
    ],
    
    // 弹窗状态
    showAddModal: false,
    showFilterModal: false,
    showMenuModal: false,
    selectedProduct: null,
    
    // 用户信息
    userInfo: null
  },

  onLoad: function (options) {
    this.getUserInfo();
  },

  onShow: function () {
    // 页面显示时刷新数据
    this.refreshData();
  },

  onPullDownRefresh: function () {
    this.refreshData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMore();
    }
  },

  // 获取用户信息
  getUserInfo: function() {
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({ userInfo });
      this.loadProducts();
    } else {
      // 如果没有用户信息，尝试登录
      app.login().then(() => {
        this.setData({ userInfo: app.globalData.userInfo });
        this.loadProducts();
      }).catch(err => {
        console.error('用户登录失败:', err);
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
      });
    }
  },

  // 刷新数据
  refreshData: function() {
    this.setData({
      currentPage: 1,
      products: [],
      hasMore: true
    });
    return this.loadProducts();
  },

  // 加载产品列表
  loadProducts: function() {
    if (this.data.loading) return Promise.resolve();
    
    this.setData({ loading: true });
    
    const { userInfo, currentPage, pageSize, searchKeyword, filterOptions } = this.data;
    
    if (!userInfo || !userInfo.userId) {
      this.setData({ loading: false });
      return Promise.reject('用户信息不完整');
    }

    return wx.cloud.callFunction({
      name: 'getUserOwnedProducts',
      data: {
        userId: userInfo.userId,
        page: currentPage,
        limit: pageSize,
        search: searchKeyword,
        category: filterOptions.category,
        status: filterOptions.status,
        sort: filterOptions.sort
      }
    }).then(res => {
      console.log('获取用户产品列表成功:', res);
      
      if (res.result && res.result.success) {
        const { products, total, stats } = res.result.data;
        
        // 处理产品数据
        const processedProducts = products.map(product => ({
          ...product,
          addedDateDisplay: this.formatDate(product.addedDate),
          categoryDisplay: this.getCategoryDisplay(product.category),
          isFavorite: product.status === 'favorite',
          isUsed: product.status === 'used'
        }));

        this.setData({
          products: currentPage === 1 ? processedProducts : [...this.data.products, ...processedProducts],
          totalCount: stats.total || 0,
          usedCount: stats.used || 0,
          favoriteCount: stats.favorite || 0,
          hasMore: products.length === pageSize,
          loading: false
        });
      } else {
        throw new Error(res.result?.error || '获取产品列表失败');
      }
    }).catch(err => {
      console.error('获取产品列表失败:', err);
      this.setData({ loading: false });
      
      // 显示备用数据或错误提示
      if (this.data.products.length === 0) {
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 加载更多
  loadMore: function() {
    if (this.data.loadingMore || !this.data.hasMore) return;
    
    this.setData({ 
      loadingMore: true,
      currentPage: this.data.currentPage + 1
    });
    
    this.loadProducts().finally(() => {
      this.setData({ loadingMore: false });
    });
  },

  // 搜索输入
  onSearchInput: function(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  // 搜索确认
  onSearchConfirm: function() {
    this.refreshData();
  },

  // 显示添加选项
  showAddOptions: function() {
    this.setData({ showAddModal: true });
  },

  // 隐藏添加弹窗
  hideAddModal: function() {
    this.setData({ showAddModal: false });
  },

  // 从现有产品选择
  selectFromExisting: function() {
    this.hideAddModal();
    wx.navigateTo({
      url: '/pages/product-selector/product-selector'
    });
  },

  // 产品催更
  requestNewProduct: function() {
    this.hideAddModal();
    wx.navigateTo({
      url: '/pages/product-request/product-request'
    });
  },

  // 显示筛选弹窗
  showFilterModal: function() {
    this.setData({ showFilterModal: true });
  },

  // 隐藏筛选弹窗
  hideFilterModal: function() {
    this.setData({ showFilterModal: false });
  },

  // 选择筛选选项
  selectFilterOption: function(e) {
    const { type, value } = e.currentTarget.dataset;
    const filterOptions = { ...this.data.filterOptions };
    filterOptions[type] = filterOptions[type] === value ? '' : value;
    this.setData({ filterOptions });
  },

  // 重置筛选
  resetFilters: function() {
    this.setData({
      filterOptions: {
        category: '',
        status: '',
        sort: 'addedDate_desc'
      }
    });
  },

  // 应用筛选
  applyFilters: function() {
    this.updateActiveFilters();
    this.hideFilterModal();
    this.refreshData();
  },

  // 更新活跃筛选标签
  updateActiveFilters: function() {
    const { filterOptions, categoryOptions, statusOptions, sortOptions } = this.data;
    const activeFilters = [];

    if (filterOptions.category) {
      const option = categoryOptions.find(item => item.value === filterOptions.category);
      if (option) {
        activeFilters.push({ type: 'category', value: filterOptions.category, label: option.label });
      }
    }

    if (filterOptions.status) {
      const option = statusOptions.find(item => item.value === filterOptions.status);
      if (option) {
        activeFilters.push({ type: 'status', value: filterOptions.status, label: option.label });
      }
    }

    if (filterOptions.sort !== 'addedDate_desc') {
      const option = sortOptions.find(item => item.value === filterOptions.sort);
      if (option) {
        activeFilters.push({ type: 'sort', value: filterOptions.sort, label: option.label });
      }
    }

    this.setData({ activeFilters });
  },

  // 移除筛选标签
  removeFilter: function(e) {
    const index = e.currentTarget.dataset.index;
    const filter = this.data.activeFilters[index];
    const filterOptions = { ...this.data.filterOptions };
    
    if (filter.type === 'sort') {
      filterOptions.sort = 'addedDate_desc';
    } else {
      filterOptions[filter.type] = '';
    }
    
    this.setData({ filterOptions });
    this.updateActiveFilters();
    this.refreshData();
  },

  // 清空所有筛选
  clearAllFilters: function() {
    this.setData({
      filterOptions: {
        category: '',
        status: '',
        sort: 'addedDate_desc'
      },
      activeFilters: []
    });
    this.refreshData();
  },

  // 查看产品详情
  viewProductDetail: function(e) {
    const product = e.currentTarget.dataset.product;
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${product._id}&source=my-products`
    });
  },

  // 切换收藏状态
  toggleFavorite: function(e) {
    const productId = e.currentTarget.dataset.id;
    const product = this.data.products.find(p => p._id === productId);
    
    if (!product) return;

    const newStatus = product.isFavorite ? 'unused' : 'favorite';
    this.updateProductStatus(productId, newStatus);
  },

  // 显示产品菜单
  showProductMenu: function(e) {
    const product = e.currentTarget.dataset.product;
    this.setData({
      selectedProduct: product,
      showMenuModal: true
    });
  },

  // 隐藏产品菜单
  hideMenuModal: function() {
    this.setData({
      showMenuModal: false,
      selectedProduct: null
    });
  },

  // 编辑产品
  editProduct: function() {
    const product = this.data.selectedProduct;
    this.hideMenuModal();
    
    wx.navigateTo({
      url: `/pages/product-edit/product-edit?id=${product._id}`
    });
  },

  // 标记为已使用
  markAsUsed: function() {
    const product = this.data.selectedProduct;
    const newStatus = product.isUsed ? 'unused' : 'used';
    this.hideMenuModal();
    this.updateProductStatus(product._id, newStatus);
  },

  // 移除产品
  removeProduct: function() {
    const product = this.data.selectedProduct;
    this.hideMenuModal();
    
    wx.showModal({
      title: '确认移除',
      content: `确定要从我的用品中移除"${product.name}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.deleteProduct(product._id);
        }
      }
    });
  },

  // 更新产品状态
  updateProductStatus: function(productId, status) {
    wx.showLoading({ title: '更新中...' });
    
    wx.cloud.callFunction({
      name: 'updateUserProduct',
      data: {
        userId: this.data.userInfo.userId,
        productId: productId,
        status: status
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        // 更新本地数据
        const products = this.data.products.map(product => {
          if (product._id === productId) {
            return {
              ...product,
              status: status,
              isFavorite: status === 'favorite',
              isUsed: status === 'used'
            };
          }
          return product;
        });
        
        this.setData({ products });
        this.updateStats();
        
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
      } else {
        throw new Error(res.result?.error || '更新失败');
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('更新产品状态失败:', err);
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
    });
  },

  // 删除产品
  deleteProduct: function(productId) {
    wx.showLoading({ title: '删除中...' });
    
    wx.cloud.callFunction({
      name: 'removeUserProduct',
      data: {
        userId: this.data.userInfo.userId,
        productId: productId
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        // 从本地数据中移除
        const products = this.data.products.filter(product => product._id !== productId);
        this.setData({ products });
        this.updateStats();
        
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
      } else {
        throw new Error(res.result?.error || '删除失败');
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('删除产品失败:', err);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    });
  },

  // 更新统计数据
  updateStats: function() {
    const { products } = this.data;
    const stats = {
      total: products.length,
      used: products.filter(p => p.isUsed).length,
      favorite: products.filter(p => p.isFavorite).length
    };
    
    this.setData({
      totalCount: stats.total,
      usedCount: stats.used,
      favoriteCount: stats.favorite
    });
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
    } else if (days < 30) {
      return `${Math.floor(days / 7)}周前`;
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  },

  // 获取分类显示名称
  getCategoryDisplay: function(category) {
    const categoryMap = {
      'cleanser': '洁面',
      'toner': '爽肤水',
      'serum': '精华',
      'moisturizer': '乳液面霜',
      'sunscreen': '防晒',
      'mask': '面膜',
      'skincare_set': '套装'
    };
    return categoryMap[category] || category;
  }
});