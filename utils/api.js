// utils/api.js - API接口模拟和网络请求工具

/**
 * 网络请求基础配置
 */
const API_CONFIG = {
  baseURL: 'https://api.skincare.com',
  timeout: 10000,
  retryCount: 3
}

/**
 * 通用网络请求函数
 * @param {Object} options 请求配置
 * @returns {Promise} 请求结果
 */
function request(options) {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      method: 'GET',
      timeout: API_CONFIG.timeout,
      header: {
        'Content-Type': 'application/json'
      }
    }

    const requestOptions = Object.assign({}, defaultOptions, options)

    wx.request({
      ...requestOptions,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(new Error(`请求失败: ${res.statusCode}`))
        }
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

/**
 * GET请求
 */
function get(url, data = {}) {
  const queryString = Object.keys(data)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join('&')
  
  const fullUrl = queryString ? `${url}?${queryString}` : url
  
  return request({
    url: fullUrl,
    method: 'GET'
  })
}

/**
 * POST请求
 */
function post(url, data = {}) {
  return request({
    url,
    method: 'POST',
    data
  })
}

/**
 * PUT请求
 */
function put(url, data = {}) {
  return request({
    url,
    method: 'PUT',
    data
  })
}

/**
 * DELETE请求
 */
function del(url, data = {}) {
  return request({
    url,
    method: 'DELETE',
    data
  })
}

/**
 * 文件上传
 */
function uploadFile(filePath, formData = {}) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${API_CONFIG.baseURL}/upload`,
      filePath,
      name: 'file',
      formData,
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          resolve(data)
        } catch (error) {
          reject(new Error('上传响应解析失败'))
        }
      },
      fail: reject
    })
  })
}

/**
 * 模拟API响应数据生成器
 */
class MockDataGenerator {
  /**
   * 生成随机ID
   */
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * 生成随机评分
   */
  static generateRating(min = 3.0, max = 5.0) {
    return Math.round((Math.random() * (max - min) + min) * 10) / 10
  }

  /**
   * 生成随机价格
   */
  static generatePrice(min = 50, max = 500) {
    return Math.round(Math.random() * (max - min) + min)
  }

  /**
   * 生成随机日期
   */
  static generateDate(daysAgo = 30) {
    const date = new Date()
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo))
    return date.toISOString().split('T')[0]
  }

  /**
   * 生成产品数据
   */
  static generateProduct(id) {
    const brands = ['兰蔻', '雅诗兰黛', '欧莱雅', '资生堂', '倩碧', '科颜氏', '娇韵诗', '海蓝之谜']
    const categories = ['洁面', '爽肤水', '精华', '面霜', '防晒', '面膜', '眼霜', '卸妆']
    const skinTypes = ['干性', '油性', '混合性', '敏感性', '中性']
    const effects = ['保湿', '美白', '抗衰老', '控油', '舒缓', '紧致', '修复', '防护']

    const brand = brands[Math.floor(Math.random() * brands.length)]
    const category = categories[Math.floor(Math.random() * categories.length)]
    const effect = effects[Math.floor(Math.random() * effects.length)]

    return {
      id: id || this.generateId(),
      name: `${brand}${effect}${category}`,
      englishName: `${brand} ${effect} ${category}`,
      brand,
      category,
      price: this.generatePrice(),
      originalPrice: this.generatePrice(100, 600),
      rating: this.generateRating(),
      reviewCount: Math.floor(Math.random() * 1000) + 50,
      salesCount: Math.floor(Math.random() * 5000) + 100,
      images: [
        'https://via.placeholder.com/400x400/f0f0f0/666?text=Product1',
        'https://via.placeholder.com/400x400/f0f0f0/666?text=Product2',
        'https://via.placeholder.com/400x400/f0f0f0/666?text=Product3'
      ],
      description: `这是一款专为${skinTypes[Math.floor(Math.random() * skinTypes.length)]}肌肤设计的${effect}${category}，采用先进的护肤科技，温和有效地改善肌肤状态。`,
      specifications: {
        volume: '50ml',
        origin: '法国',
        shelfLife: '3年',
        skinType: skinTypes[Math.floor(Math.random() * skinTypes.length)]
      },
      features: [
        `深层${effect}，改善肌肤质感`,
        '温和配方，适合敏感肌肤',
        '快速吸收，不油腻',
        '持久保湿，24小时呵护'
      ],
      usage: [
        '清洁面部后，取适量产品',
        '轻柔按摩至完全吸收',
        '建议早晚使用，效果更佳',
        '使用后请注意防晒'
      ],
      precautions: [
        '仅供外用，避免接触眼部',
        '如有过敏反应请立即停用',
        '请存放在阴凉干燥处',
        '儿童请在成人监护下使用'
      ],
      tags: [category, effect, brand],
      isFavorited: false,
      createdAt: this.generateDate(90),
      updatedAt: this.generateDate(30)
    }
  }

  /**
   * 生成成分数据
   */
  static generateIngredient(id) {
    const ingredients = [
      { name: '透明质酸', english: 'Hyaluronic Acid', safety: 'safe', effects: ['保湿', '锁水'] },
      { name: '烟酰胺', english: 'Niacinamide', safety: 'safe', effects: ['美白', '控油'] },
      { name: '水杨酸', english: 'Salicylic Acid', safety: 'caution', effects: ['去角质', '控油'] },
      { name: '视黄醇', english: 'Retinol', safety: 'caution', effects: ['抗衰老', '紧致'] },
      { name: '果酸', english: 'AHA', safety: 'caution', effects: ['去角质', '美白'] },
      { name: '维生素C', english: 'Vitamin C', safety: 'safe', effects: ['美白', '抗氧化'] },
      { name: '神经酰胺', english: 'Ceramide', safety: 'safe', effects: ['修复', '保湿'] },
      { name: '胜肽', english: 'Peptide', safety: 'safe', effects: ['抗衰老', '紧致'] }
    ]

    const ingredient = ingredients[Math.floor(Math.random() * ingredients.length)]
    
    return {
      id: id || this.generateId(),
      name: ingredient.name,
      englishName: ingredient.english,
      concentration: `${Math.random() * 10 + 0.1}%`,
      safetyLevel: ingredient.safety,
      function: '活性成分',
      effects: ingredient.effects,
      description: `${ingredient.name}是一种重要的护肤成分，具有${ingredient.effects.join('、')}等功效。经过科学验证，安全性等级为${ingredient.safety === 'safe' ? '安全' : ingredient.safety === 'caution' ? '需注意' : '危险'}。`,
      usage: `建议在${ingredient.safety === 'caution' ? '晚间' : '早晚'}使用，${ingredient.safety === 'caution' ? '需要建立耐受性' : '可以日常使用'}。`,
      precautions: ingredient.safety === 'caution' ? ['初次使用建议少量试用', '避免与其他酸性成分同时使用', '使用期间注意防晒'] : ['按照产品说明使用', '如有不适请停止使用'],
      relatedProducts: []
    }
  }

  /**
   * 生成品牌数据
   */
  static generateBrand(id) {
    const brands = [
      { name: '兰蔻', english: 'Lancôme', country: '法国', founded: 1935 },
      { name: '雅诗兰黛', english: 'Estée Lauder', country: '美国', founded: 1946 },
      { name: '欧莱雅', english: "L'Oréal", country: '法国', founded: 1909 },
      { name: '资生堂', english: 'Shiseido', country: '日本', founded: 1872 },
      { name: '倩碧', english: 'Clinique', country: '美国', founded: 1968 }
    ]

    const brand = brands[Math.floor(Math.random() * brands.length)]
    
    return {
      id: id || this.generateId(),
      name: brand.name,
      englishName: brand.english,
      country: brand.country,
      founded: brand.founded,
      logo: 'https://via.placeholder.com/100x100/f0f0f0/666?text=Logo',
      rating: this.generateRating(4.0, 5.0),
      productCount: Math.floor(Math.random() * 200) + 50,
      followCount: Math.floor(Math.random() * 10000) + 1000,
      description: `${brand.name}是来自${brand.country}的知名护肤品牌，成立于${brand.founded}年，以其卓越的品质和创新的科技在全球享有盛誉。`,
      specialties: ['护肤', '彩妆', '香水'],
      isFollowed: false,
      createdAt: this.generateDate(365),
      updatedAt: this.generateDate(30)
    }
  }

  /**
   * 生成用户评价数据
   */
  static generateReview(productId) {
    const userNames = ['小美', '护肤达人', '美妆博主', '敏感肌女孩', '油皮救星', '干皮妹妹']
    const skinTypes = ['干性', '油性', '混合性', '敏感性', '中性']
    const ages = ['18-25', '26-30', '31-35', '36-40', '40+']
    const reviewTags = ['效果好', '温和不刺激', '性价比高', '包装精美', '味道好闻', '吸收快', '不油腻']

    return {
      id: this.generateId(),
      productId,
      userId: this.generateId(),
      userName: userNames[Math.floor(Math.random() * userNames.length)],
      userAvatar: 'https://via.placeholder.com/80x80/f0f0f0/666?text=User',
      skinType: skinTypes[Math.floor(Math.random() * skinTypes.length)],
      age: ages[Math.floor(Math.random() * ages.length)],
      rating: Math.floor(Math.random() * 5) + 1,
      content: '这款产品使用感受很不错，质地轻薄好吸收，用了一段时间后肌肤状态有明显改善。包装也很精美，值得推荐！',
      images: Math.random() > 0.5 ? [
        'https://via.placeholder.com/150x150/f0f0f0/666?text=Review1',
        'https://via.placeholder.com/150x150/f0f0f0/666?text=Review2'
      ] : [],
      tags: reviewTags.slice(0, Math.floor(Math.random() * 3) + 1),
      likeCount: Math.floor(Math.random() * 50),
      isLiked: false,
      createdAt: this.generateDate(60),
      updatedAt: this.generateDate(30)
    }
  }
}

/**
 * 产品相关API
 */
const ProductAPI = {
  /**
   * 获取产品列表
   */
  getProductList(params = {}) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const { page = 1, pageSize = 10, keyword = '', category = '', brand = '', sortBy = 'default' } = params
        
        const products = Array.from({ length: pageSize }, (_, index) => 
          MockDataGenerator.generateProduct(`product_${page}_${index}`)
        )

        // 模拟筛选
        let filteredProducts = products
        if (keyword) {
          filteredProducts = products.filter(p => 
            p.name.includes(keyword) || p.brand.includes(keyword)
          )
        }
        if (category) {
          filteredProducts = filteredProducts.filter(p => p.category === category)
        }
        if (brand) {
          filteredProducts = filteredProducts.filter(p => p.brand === brand)
        }

        // 模拟排序
        if (sortBy === 'price_asc') {
          filteredProducts.sort((a, b) => a.price - b.price)
        } else if (sortBy === 'price_desc') {
          filteredProducts.sort((a, b) => b.price - a.price)
        } else if (sortBy === 'rating') {
          filteredProducts.sort((a, b) => b.rating - a.rating)
        } else if (sortBy === 'sales') {
          filteredProducts.sort((a, b) => b.salesCount - a.salesCount)
        }

        resolve({
          code: 200,
          message: 'success',
          data: {
            list: filteredProducts,
            total: 1000,
            page,
            pageSize,
            hasMore: page < 10
          }
        })
      }, 500)
    })
  },

  /**
   * 获取产品详情
   */
  getProductDetail(productId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const product = MockDataGenerator.generateProduct(productId)
        resolve({
          code: 200,
          message: 'success',
          data: product
        })
      }, 300)
    })
  },

  /**
   * 获取产品成分
   */
  getProductIngredients(productId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const ingredients = Array.from({ length: 8 }, (_, index) => 
          MockDataGenerator.generateIngredient(`ingredient_${productId}_${index}`)
        )
        
        resolve({
          code: 200,
          message: 'success',
          data: ingredients
        })
      }, 400)
    })
  },

  /**
   * 获取产品评价
   */
  getProductReviews(productId, params = {}) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const { page = 1, pageSize = 10, rating = 0 } = params
        
        let reviews = Array.from({ length: pageSize }, () => 
          MockDataGenerator.generateReview(productId)
        )

        if (rating > 0) {
          reviews = reviews.filter(r => r.rating === rating)
        }

        resolve({
          code: 200,
          message: 'success',
          data: {
            list: reviews,
            total: 500,
            page,
            pageSize,
            hasMore: page < 5
          }
        })
      }, 400)
    })
  },

  /**
   * 获取相关产品
   */
  getRelatedProducts(productId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const products = Array.from({ length: 6 }, (_, index) => 
          MockDataGenerator.generateProduct(`related_${productId}_${index}`)
        )
        
        resolve({
          code: 200,
          message: 'success',
          data: products
        })
      }, 300)
    })
  },

  /**
   * 收藏/取消收藏产品
   */
  toggleFavorite(productId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          code: 200,
          message: 'success',
          data: {
            isFavorited: Math.random() > 0.5
          }
        })
      }, 200)
    })
  }
}

/**
 * 成分相关API
 */
const IngredientAPI = {
  /**
   * 获取成分列表
   */
  getIngredientList(params = {}) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const { page = 1, pageSize = 10, keyword = '', safetyLevel = '', effectType = '' } = params
        
        const ingredients = Array.from({ length: pageSize }, (_, index) => 
          MockDataGenerator.generateIngredient(`ingredient_${page}_${index}`)
        )

        resolve({
          code: 200,
          message: 'success',
          data: {
            list: ingredients,
            total: 800,
            page,
            pageSize,
            hasMore: page < 8
          }
        })
      }, 400)
    })
  },

  /**
   * 获取成分详情
   */
  getIngredientDetail(ingredientId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const ingredient = MockDataGenerator.generateIngredient(ingredientId)
        resolve({
          code: 200,
          message: 'success',
          data: ingredient
        })
      }, 300)
    })
  },

  /**
   * 获取成分统计
   */
  getIngredientStats() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          code: 200,
          message: 'success',
          data: {
            total: 800,
            safe: 650,
            caution: 120,
            danger: 30
          }
        })
      }, 200)
    })
  }
}

/**
 * 品牌相关API
 */
const BrandAPI = {
  /**
   * 获取品牌列表
   */
  getBrandList(params = {}) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const { page = 1, pageSize = 10, keyword = '', country = '', category = '' } = params
        
        const brands = Array.from({ length: pageSize }, (_, index) => 
          MockDataGenerator.generateBrand(`brand_${page}_${index}`)
        )

        resolve({
          code: 200,
          message: 'success',
          data: {
            list: brands,
            total: 200,
            page,
            pageSize,
            hasMore: page < 5
          }
        })
      }, 400)
    })
  },

  /**
   * 获取品牌详情
   */
  getBrandDetail(brandId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const brand = MockDataGenerator.generateBrand(brandId)
        resolve({
          code: 200,
          message: 'success',
          data: brand
        })
      }, 300)
    })
  },

  /**
   * 获取品牌产品
   */
  getBrandProducts(brandId, params = {}) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const { page = 1, pageSize = 10 } = params
        
        const products = Array.from({ length: pageSize }, (_, index) => 
          MockDataGenerator.generateProduct(`brand_product_${brandId}_${index}`)
        )

        resolve({
          code: 200,
          message: 'success',
          data: {
            list: products,
            total: 50,
            page,
            pageSize,
            hasMore: page < 3
          }
        })
      }, 400)
    })
  },

  /**
   * 关注/取消关注品牌
   */
  toggleFollow(brandId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          code: 200,
          message: 'success',
          data: {
            isFollowed: Math.random() > 0.5
          }
        })
      }, 200)
    })
  },

  /**
   * 获取品牌统计
   */
  getBrandStats() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          code: 200,
          message: 'success',
          data: {
            total: 200,
            skincare: 120,
            makeup: 50,
            fragrance: 30
          }
        })
      }, 200)
    })
  }
}

/**
 * 用户相关API
 */
const UserAPI = {
  /**
   * 获取用户信息
   */
  getUserInfo() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          code: 200,
          message: 'success',
          data: {
            id: 'user_001',
            nickname: '护肤小达人',
            avatar: 'https://via.placeholder.com/100x100/f0f0f0/666?text=User',
            skinType: '混合性',
            age: '25-30',
            favoriteCount: 25,
            reviewCount: 12,
            followCount: 8
          }
        })
      }, 300)
    })
  },

  /**
   * 获取用户收藏
   */
  getUserFavorites(params = {}) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const { page = 1, pageSize = 10 } = params
        
        const products = Array.from({ length: pageSize }, (_, index) => 
          MockDataGenerator.generateProduct(`favorite_${page}_${index}`)
        )

        resolve({
          code: 200,
          message: 'success',
          data: {
            list: products,
            total: 25,
            page,
            pageSize,
            hasMore: page < 3
          }
        })
      }, 400)
    })
  }
}

/**
 * 搜索相关API
 */
const SearchAPI = {
  /**
   * 获取热门搜索
   */
  getHotSearches() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          code: 200,
          message: 'success',
          data: ['兰蔻', '雅诗兰黛', '精华', '面霜', '防晒', '美白', '保湿', '抗衰老']
        })
      }, 200)
    })
  },

  /**
   * 获取搜索建议
   */
  getSearchSuggestions(keyword) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const suggestions = [
          `${keyword}精华`,
          `${keyword}面霜`,
          `${keyword}洁面`,
          `${keyword}爽肤水`
        ].slice(0, 4)

        resolve({
          code: 200,
          message: 'success',
          data: suggestions
        })
      }, 100)
    })
  }
}

module.exports = {
  request,
  get,
  post,
  put,
  del,
  uploadFile,
  MockDataGenerator,
  ProductAPI,
  IngredientAPI,
  BrandAPI,
  UserAPI,
  SearchAPI
}