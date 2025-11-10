// pages/product-detail/product-detail.js
Page({
  data: {
    // 产品基本信息
    product: null,
    productId: null,
    loading: true,
    
    // 用户信息
    userInfo: null,
    isLoggedIn: false,
    
    // 产品图片
    currentImageIndex: 0,
    
    // 标签页
    currentTab: 0,
    tabs: [
      { id: 0, name: '产品详情', icon: '📋' },
      { id: 1, name: '成分分析', icon: '🧪' },
      { id: 2, name: '用户评价', icon: '💬' },
      { id: 3, name: '相关推荐', icon: '🔍' }
    ],
    
    // 成分分析
    ingredients: [],
    ingredientStats: {
      safe: 0,
      caution: 0,
      danger: 0,
      total: 0
    },
    showIngredientDetail: false,
    selectedIngredient: null,
    
    // 用户评价
    reviews: [],
    reviewStats: {
      totalCount: 0,
      averageRating: 0,
      ratingDistribution: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0
      }
    },
    reviewPage: 1,
    reviewPageSize: 10,
    hasMoreReviews: true,
    showReviewModal: false,
    
    // 相关推荐
    relatedProducts: [],
    
    // 收藏状态
    isFavorited: false,
    
    // 分享功能
    shareInfo: null,
    
    // 购买相关
    selectedSku: null,
    showSkuModal: false,
    quantity: 1,
    
    // 评价筛选
    reviewFilter: 'all', // all, 5, 4, 3, 2, 1, withImages
    
    // 图片预览
    showImagePreview: false,
    previewImages: []
  },

  onLoad(options) {
    console.log('产品详情页面加载', options);
    
    const productId = options.id || options.productId;
    if (productId) {
      this.setData({ productId });
      this.checkUserPermission();
      this.loadProductDetail(productId);
    } else {
      wx.showToast({
        title: '产品ID不存在',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  onShow() {
    this.loadFavoriteStatus();
  },

  onShareAppMessage() {
    const { product } = this.data;
    if (!product) return {};
    
    return {
      title: `${product.name} - 护肤产品详情`,
      path: `/pages/product-detail/product-detail?id=${product.id}`,
      imageUrl: (product.images && product.images[0]) ? product.images[0] : (product.image || '')
    };
  },

  onShareTimeline() {
    const { product } = this.data;
    if (!product) return {};
    
    return {
      title: `${product.name} - ${product.brand}`,
      imageUrl: product.images && product.images[0] ? product.images[0] : ''
    };
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

  // 加载产品详情
  async loadProductDetail(productId) {
    this.setData({ loading: true });
    
    try {
      const product = await this.mockProductDetailAPI(productId);
      const ingredients = await this.mockProductIngredientsAPI(productId);
      const reviews = await this.mockProductReviewsAPI(productId, 1);
      const relatedProducts = await this.mockRelatedProductsAPI(productId);
      
      // 计算成分统计
      const ingredientStats = this.calculateIngredientStats(ingredients);
      
      // 计算评价统计
      const reviewStats = this.calculateReviewStats(reviews.list);
      
      const normalizeImagePath = (img) => {
        if (!img) return '';
        return img.replace(/^\.\//, '/').replace(/^images\//, '/images/');
      };

      const primaryImage = product.image || (Array.isArray(product.images) ? product.images[0] : '');
      const normalizedPrimary = normalizeImagePath(primaryImage);
      const normalizedImages = (Array.isArray(product.images) && product.images.length > 0)
        ? product.images.map(normalizeImagePath)
        : (normalizedPrimary ? [normalizedPrimary] : ['/images/products/谷雨-淡斑瓶.png']);

      const normalizedProduct = {
        ...product,
        image: normalizedPrimary || '/images/products/谷雨-淡斑瓶.png',
        images: normalizedImages,
        // 预计算展示字段，避免在 WXML 中调用方法
        discountText: (product.discount && product.discount < 1) ? `${(product.discount * 10).toFixed(1)}折` : ''
      };

      this.setData({
        product: normalizedProduct,
        ingredients,
        ingredientStats,
        reviews: reviews.list,
        reviewStats,
        hasMoreReviews: reviews.hasMore,
        relatedProducts,
        previewImages: normalizedImages
      });
      
    } catch (error) {
      console.error('加载产品详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 模拟产品详情API
  mockProductDetailAPI(productId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockProduct = {
          id: productId,
          name: 'SK-II 神仙水精华露',
          brand: 'SK-II',
          englishName: 'Facial Treatment Essence',
          images: [
            '/images/products/谷雨-淡斑瓶.png',
            '/images/products/光感美白系列-第三代美白奶罐.png',
            '/images/products/氨基酸洁面系列-氨基酸洁面乳.png'
          ],
          price: 1299,
          originalPrice: 1599,
          discount: 0.81,
          rating: 4.8,
          reviewCount: 2856,
          salesCount: 15420,
          category: '精华',
          skinTypes: ['干性', '混合性', '敏感性'],
          effects: ['保湿', '提亮', '抗衰老', '改善肌理'],
          volume: '230ml',
          origin: '日本',
          shelfLife: '3年',
          description: 'SK-II神仙水，蕴含超过90%的PITERA™酵母精华，能够调理肌肤纹理，提升肌肤透明感，让肌肤呈现健康光泽。',
          features: [
            '含有90%以上的PITERA™酵母精华',
            '改善肌肤纹理，提升透明感',
            '增强肌肤天然更新能力',
            '适合多种肌肤类型使用',
            '无添加香料、色素'
          ],
          usage: [
            '洁面后，取适量于掌心',
            '轻拍至面部和颈部',
            '避开眼部周围',
            '早晚使用效果更佳'
          ],
          precautions: [
            '如有过敏反应请停止使用',
            '避免接触眼部',
            '请存放在阴凉干燥处',
            '开封后请尽快使用'
          ],
          skus: [
            {
              id: 1,
              volume: '75ml',
              price: 699,
              originalPrice: 899,
              stock: 50
            },
            {
              id: 2,
              volume: '150ml',
              price: 999,
              originalPrice: 1299,
              stock: 30
            },
            {
              id: 3,
              volume: '230ml',
              price: 1299,
              originalPrice: 1599,
              stock: 20
            }
          ]
        };
        resolve(mockProduct);
      }, 800);
    });
  },

  // 模拟产品成分API
  mockProductIngredientsAPI(productId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockIngredients = [
          {
            id: 1,
            name: 'PITERA™酵母精华',
            englishName: 'Pitera',
            concentration: '90%+',
            safetyLevel: 'safe',
            effects: ['保湿', '提亮', '抗衰老'],
            description: 'SK-II独有的酵母精华，含有多种维生素、氨基酸和矿物质，能够改善肌肤纹理。',
            function: '核心活性成分'
          },
          {
            id: 2,
            name: '丁二醇',
            englishName: 'Butylene Glycol',
            concentration: '5-10%',
            safetyLevel: 'safe',
            effects: ['保湿', '溶剂'],
            description: '多元醇类保湿剂，具有良好的保湿效果和溶解性。',
            function: '保湿剂'
          },
          {
            id: 3,
            name: '戊二醇',
            englishName: 'Pentylene Glycol',
            concentration: '1-5%',
            safetyLevel: 'safe',
            effects: ['保湿', '防腐'],
            description: '多功能添加剂，具有保湿和轻微防腐作用。',
            function: '保湿剂/防腐剂'
          },
          {
            id: 4,
            name: '水',
            englishName: 'Water',
            concentration: '基础',
            safetyLevel: 'safe',
            effects: ['溶剂'],
            description: '化妆品基础溶剂。',
            function: '溶剂'
          },
          {
            id: 5,
            name: '苯氧乙醇',
            englishName: 'Phenoxyethanol',
            concentration: '<1%',
            safetyLevel: 'caution',
            effects: ['防腐'],
            description: '常用防腐剂，浓度较低时安全性较好，但敏感肌需注意。',
            function: '防腐剂'
          }
        ];
        resolve(mockIngredients);
      }, 600);
    });
  },

  // 模拟产品评价API
  mockProductReviewsAPI(productId, page) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockReviews = [
          {
            id: 1,
            userId: 'user001',
            userName: '小仙女***',
            avatar: '/images/avatars/user1.png',
            rating: 5,
            content: '用了一个月，皮肤真的变好了！质地清爽不粘腻，吸收很快，肌肤变得更加透亮有光泽。',
            images: ['/images/reviews/review1-1.png', '/images/reviews/review1-2.png'],
            createTime: '2024-01-15',
            skinType: '混合性',
            age: '25-30',
            likeCount: 128,
            isLiked: false,
            tags: ['效果好', '质地清爽', '吸收快']
          },
          {
            id: 2,
            userId: 'user002',
            userName: '护肤达人***',
            avatar: '/images/avatars/user2.png',
            rating: 4,
            content: '神仙水确实名不虚传，用了两周就能感觉到肌肤状态的改善。价格有点贵，但效果值得。',
            images: [],
            createTime: '2024-01-10',
            skinType: '干性',
            age: '30-35',
            likeCount: 89,
            isLiked: false,
            tags: ['效果明显', '价格偏高']
          },
          {
            id: 3,
            userId: 'user003',
            userName: '美妆小白***',
            avatar: '/images/avatars/user3.png',
            rating: 5,
            content: '第一次用SK-II的产品，真的被惊艳到了！肌肤变得水润有弹性，毛孔也细腻了很多。',
            images: ['/images/reviews/review3-1.png'],
            createTime: '2024-01-08',
            skinType: '敏感性',
            age: '20-25',
            likeCount: 156,
            isLiked: true,
            tags: ['初次使用', '效果惊艳', '改善毛孔']
          }
        ];
        
        resolve({
          list: mockReviews,
          hasMore: page < 3,
          total: 2856
        });
      }, 500);
    });
  },

  // 模拟相关产品API
  mockRelatedProductsAPI(productId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockProducts = [
          {
            id: 101,
            name: 'SK-II 大红瓶面霜',
            brand: 'SK-II',
            image: '/images/products/skii-cream.png',
            price: 1899,
            originalPrice: 2299,
            rating: 4.7,
            reviewCount: 1245
          },
          {
            id: 102,
            name: 'SK-II 小灯泡精华',
            brand: 'SK-II',
            image: '/images/products/skii-serum.png',
            price: 1599,
            originalPrice: 1899,
            rating: 4.9,
            reviewCount: 856
          },
          {
            id: 103,
            name: 'SK-II 前男友面膜',
            brand: 'SK-II',
            image: '/images/products/skii-mask.png',
            price: 899,
            originalPrice: 1099,
            rating: 4.8,
            reviewCount: 2341
          },
          {
            id: 104,
            name: 'SK-II 清莹露',
            brand: 'SK-II',
            image: '/images/products/skii-toner.png',
            price: 799,
            originalPrice: 999,
            rating: 4.6,
            reviewCount: 678
          }
        ];
        resolve(mockProducts);
      }, 400);
    });
  },

  // 计算成分统计
  calculateIngredientStats(ingredients) {
    const stats = {
      safe: 0,
      caution: 0,
      danger: 0,
      total: ingredients.length
    };
    
    ingredients.forEach(ingredient => {
      if (ingredient.safetyLevel === 'safe') {
        stats.safe++;
      } else if (ingredient.safetyLevel === 'caution') {
        stats.caution++;
      } else if (ingredient.safetyLevel === 'danger') {
        stats.danger++;
      }
    });
    
    return stats;
  },

  // 计算评价统计
  calculateReviewStats(reviews) {
    const stats = {
      totalCount: reviews.length,
      averageRating: 0,
      ratingDistribution: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0
      }
    };
    
    if (reviews.length === 0) return stats;
    
    let totalRating = 0;
    reviews.forEach(review => {
      totalRating += review.rating;
      stats.ratingDistribution[review.rating]++;
    });
    
    stats.averageRating = (totalRating / reviews.length).toFixed(1);
    
    return stats;
  },

  // 图片轮播
  onImageChange(e) {
    this.setData({
      currentImageIndex: e.detail.current
    });
  },

  // 图片预览
  previewImage(e) {
    const index = e.currentTarget.dataset.index || 0;
    wx.previewImage({
      current: this.data.previewImages[index],
      urls: this.data.previewImages
    });
  },

  // 标签页切换
  switchTab(e) {
    const tabId = e.currentTarget.dataset.tab;
    this.setData({
      currentTab: tabId
    });
    
    // 如果切换到评价标签页且还没有加载评价，则加载
    if (tabId === 2 && this.data.reviews.length === 0) {
      this.loadProductReviews();
    }
  },

  // 加载更多评价
  async loadProductReviews() {
    if (!this.data.hasMoreReviews) return;
    
    try {
      const reviews = await this.mockProductReviewsAPI(this.data.productId, this.data.reviewPage + 1);
      
      this.setData({
        reviews: [...this.data.reviews, ...reviews.list],
        reviewPage: this.data.reviewPage + 1,
        hasMoreReviews: reviews.hasMore
      });
    } catch (error) {
      console.error('加载评价失败:', error);
    }
  },

  // 成分详情
  showIngredientDetail(e) {
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

  // 收藏功能
  loadFavoriteStatus() {
    const favorites = wx.getStorageSync('favorite_products') || [];
    const isFavorited = favorites.some(item => item.id === this.data.productId);
    this.setData({ isFavorited });
  },

  toggleFavorite() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    let favorites = wx.getStorageSync('favorite_products') || [];
    const productId = this.data.productId;
    const product = this.data.product;
    
    const index = favorites.findIndex(item => item.id === productId);
    
    if (index > -1) {
      // 取消收藏
      favorites.splice(index, 1);
      this.setData({ isFavorited: false });
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      });
    } else {
      // 添加收藏
      favorites.push({
        id: productId,
        name: product.name,
        brand: product.brand,
        image: product.images[0],
        price: product.price,
        rating: product.rating
      });
      this.setData({ isFavorited: true });
      wx.showToast({
        title: '已添加收藏',
        icon: 'success'
      });
    }
    
    wx.setStorageSync('favorite_products', favorites);
  },

  // 评价点赞
  toggleReviewLike(e) {
    const reviewId = e.currentTarget.dataset.reviewId;
    const reviews = this.data.reviews.map(review => {
      if (review.id === reviewId) {
        return {
          ...review,
          isLiked: !review.isLiked,
          likeCount: review.isLiked ? review.likeCount - 1 : review.likeCount + 1
        };
      }
      return review;
    });
    
    this.setData({ reviews });
  },

  // 评价筛选
  filterReviews(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({
      reviewFilter: filter,
      reviewPage: 1,
      reviews: []
    });
    
    // 重新加载评价
    this.loadProductReviews();
  },

  // 查看相关产品
  viewRelatedProduct(e) {
    const productId = e.currentTarget.dataset.productId;
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${productId}`
    });
  },

  // 规格选择
  showSkuModal() {
    this.setData({
      showSkuModal: true
    });
  },

  closeSkuModal() {
    this.setData({
      showSkuModal: false
    });
  },

  selectSku(e) {
    const sku = e.currentTarget.dataset.sku;
    this.setData({
      selectedSku: sku
    });
  },

  // 数量调整
  decreaseQuantity() {
    if (this.data.quantity > 1) {
      this.setData({
        quantity: this.data.quantity - 1
      });
    }
  },

  increaseQuantity() {
    const maxQuantity = this.data.selectedSku ? this.data.selectedSku.stock : 99;
    if (this.data.quantity < maxQuantity) {
      this.setData({
        quantity: this.data.quantity + 1
      });
    }
  },

  // 立即购买
  buyNow() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 加入购物车
  addToCart() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.showToast({
      title: '已加入购物车',
      icon: 'success'
    });
    
    this.closeSkuModal();
  },

  // 客服咨询
  contactService() {
    wx.showToast({
      title: '客服功能开发中',
      icon: 'none'
    })
  },

  // 图片加载错误处理
  onImageError(e) {
    const { index, type } = e.currentTarget.dataset
    console.warn('图片加载失败:', e.detail)
    
    // 设置默认占位图
    const defaultImage = '/images/placeholder-product.png'
    
    if (type === 'product-detail' && typeof index !== 'undefined') {
      const updatePath = `product.images[${index}]`
      this.setData({
        [updatePath]: defaultImage
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
  }
});