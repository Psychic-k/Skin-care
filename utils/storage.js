// utils/storage.js - 本地存储工具函数

/**
 * 存储键名常量
 */
const STORAGE_KEYS = {
  USER_INFO: 'userInfo',
  SEARCH_HISTORY: 'searchHistory',
  FAVORITE_PRODUCTS: 'favoriteProducts',
  FOLLOWED_BRANDS: 'followedBrands',
  VIEWED_PRODUCTS: 'viewedProducts',
  CART_ITEMS: 'cartItems',
  SETTINGS: 'settings',
  CACHE_DATA: 'cacheData'
}

/**
 * 本地存储管理类
 */
class StorageManager {
  /**
   * 设置存储数据
   * @param {string} key 存储键名
   * @param {any} value 存储值
   * @returns {boolean} 是否成功
   */
  static setItem(key, value) {
    try {
      const data = JSON.stringify(value)
      wx.setStorageSync(key, data)
      return true
    } catch (error) {
      console.error('存储数据失败:', error)
      return false
    }
  }

  /**
   * 获取存储数据
   * @param {string} key 存储键名
   * @param {any} defaultValue 默认值
   * @returns {any} 存储的数据
   */
  static getItem(key, defaultValue = null) {
    try {
      const data = wx.getStorageSync(key)
      if (data) {
        return JSON.parse(data)
      }
      return defaultValue
    } catch (error) {
      console.error('获取存储数据失败:', error)
      return defaultValue
    }
  }

  /**
   * 删除存储数据
   * @param {string} key 存储键名
   * @returns {boolean} 是否成功
   */
  static removeItem(key) {
    try {
      wx.removeStorageSync(key)
      return true
    } catch (error) {
      console.error('删除存储数据失败:', error)
      return false
    }
  }

  /**
   * 清空所有存储数据
   * @returns {boolean} 是否成功
   */
  static clear() {
    try {
      wx.clearStorageSync()
      return true
    } catch (error) {
      console.error('清空存储数据失败:', error)
      return false
    }
  }

  /**
   * 获取存储信息
   * @returns {Object} 存储信息
   */
  static getStorageInfo() {
    try {
      return wx.getStorageInfoSync()
    } catch (error) {
      console.error('获取存储信息失败:', error)
      return {
        keys: [],
        currentSize: 0,
        limitSize: 0
      }
    }
  }
}

/**
 * 用户信息存储
 */
class UserStorage {
  /**
   * 保存用户信息
   */
  static saveUserInfo(userInfo) {
    return StorageManager.setItem(STORAGE_KEYS.USER_INFO, {
      ...userInfo,
      lastLoginTime: Date.now()
    })
  }

  /**
   * 获取用户信息
   */
  static getUserInfo() {
    return StorageManager.getItem(STORAGE_KEYS.USER_INFO, {
      id: '',
      nickname: '',
      avatar: '',
      skinType: '',
      age: '',
      isLogin: false
    })
  }

  /**
   * 清除用户信息
   */
  static clearUserInfo() {
    return StorageManager.removeItem(STORAGE_KEYS.USER_INFO)
  }

  /**
   * 检查是否已登录
   */
  static isLoggedIn() {
    const userInfo = this.getUserInfo()
    return userInfo.isLogin && userInfo.id
  }

  /**
   * 用户登出
   */
  static logout() {
    return this.clearUserInfo()
  }

  /**
   * 保存皮肤档案
   */
  static setSkinProfile(profile) {
    return StorageManager.setItem('skinProfile', profile)
  }

  /**
   * 获取皮肤档案
   */
  static getSkinProfile() {
    return StorageManager.getItem('skinProfile', null)
  }

  /**
   * 添加检测记录
   */
  static addDetectionRecord(record) {
    const history = this.getDetectionHistory()
    history.unshift({
      ...record,
      timestamp: Date.now()
    })
    // 只保留最近50条记录
    if (history.length > 50) {
      history.splice(50)
    }
    return StorageManager.setItem('detectionHistory', history)
  }

  /**
   * 获取检测历史
   */
  static getDetectionHistory() {
    return StorageManager.getItem('detectionHistory', [])
  }
}

/**
 * 搜索历史存储
 */
class SearchStorage {
  /**
   * 添加搜索历史
   */
  static addSearchHistory(keyword) {
    if (!keyword || keyword.trim() === '') return

    const history = this.getSearchHistory()
    const trimmedKeyword = keyword.trim()
    
    // 移除重复项
    const filteredHistory = history.filter(item => item !== trimmedKeyword)
    
    // 添加到开头
    filteredHistory.unshift(trimmedKeyword)
    
    // 限制数量
    const maxHistory = 10
    const newHistory = filteredHistory.slice(0, maxHistory)
    
    return StorageManager.setItem(STORAGE_KEYS.SEARCH_HISTORY, newHistory)
  }

  /**
   * 获取搜索历史
   */
  static getSearchHistory() {
    return StorageManager.getItem(STORAGE_KEYS.SEARCH_HISTORY, [])
  }

  /**
   * 删除搜索历史项
   */
  static removeSearchHistory(keyword) {
    const history = this.getSearchHistory()
    const newHistory = history.filter(item => item !== keyword)
    return StorageManager.setItem(STORAGE_KEYS.SEARCH_HISTORY, newHistory)
  }

  /**
   * 清空搜索历史
   */
  static clearSearchHistory() {
    return StorageManager.setItem(STORAGE_KEYS.SEARCH_HISTORY, [])
  }
}

/**
 * 收藏产品存储
 */
class FavoriteStorage {
  /**
   * 添加收藏产品
   */
  static addFavorite(productId) {
    const favorites = this.getFavorites()
    if (!favorites.includes(productId)) {
      favorites.push(productId)
      return StorageManager.setItem(STORAGE_KEYS.FAVORITE_PRODUCTS, favorites)
    }
    return true
  }

  /**
   * 移除收藏产品
   */
  static removeFavorite(productId) {
    const favorites = this.getFavorites()
    const newFavorites = favorites.filter(id => id !== productId)
    return StorageManager.setItem(STORAGE_KEYS.FAVORITE_PRODUCTS, newFavorites)
  }

  /**
   * 获取收藏产品列表
   */
  static getFavorites() {
    return StorageManager.getItem(STORAGE_KEYS.FAVORITE_PRODUCTS, [])
  }

  /**
   * 检查是否已收藏
   */
  static isFavorited(productId) {
    const favorites = this.getFavorites()
    return favorites.includes(productId)
  }

  /**
   * 切换收藏状态
   */
  static toggleFavorite(productId) {
    if (this.isFavorited(productId)) {
      return this.removeFavorite(productId)
    } else {
      return this.addFavorite(productId)
    }
  }

  /**
   * 清空收藏
   */
  static clearFavorites() {
    return StorageManager.setItem(STORAGE_KEYS.FAVORITE_PRODUCTS, [])
  }
}

/**
 * 关注品牌存储
 */
class FollowStorage {
  /**
   * 关注品牌
   */
  static followBrand(brandId) {
    const follows = this.getFollows()
    if (!follows.includes(brandId)) {
      follows.push(brandId)
      return StorageManager.setItem(STORAGE_KEYS.FOLLOWED_BRANDS, follows)
    }
    return true
  }

  /**
   * 取消关注品牌
   */
  static unfollowBrand(brandId) {
    const follows = this.getFollows()
    const newFollows = follows.filter(id => id !== brandId)
    return StorageManager.setItem(STORAGE_KEYS.FOLLOWED_BRANDS, newFollows)
  }

  /**
   * 获取关注品牌列表
   */
  static getFollows() {
    return StorageManager.getItem(STORAGE_KEYS.FOLLOWED_BRANDS, [])
  }

  /**
   * 检查是否已关注
   */
  static isFollowed(brandId) {
    const follows = this.getFollows()
    return follows.includes(brandId)
  }

  /**
   * 切换关注状态
   */
  static toggleFollow(brandId) {
    if (this.isFollowed(brandId)) {
      return this.unfollowBrand(brandId)
    } else {
      return this.followBrand(brandId)
    }
  }

  /**
   * 清空关注
   */
  static clearFollows() {
    return StorageManager.setItem(STORAGE_KEYS.FOLLOWED_BRANDS, [])
  }
}

/**
 * 浏览历史存储
 */
class ViewHistoryStorage {
  /**
   * 添加浏览记录
   */
  static addViewHistory(product) {
    const history = this.getViewHistory()
    
    // 移除重复项
    const filteredHistory = history.filter(item => item.id !== product.id)
    
    // 添加到开头
    filteredHistory.unshift({
      ...product,
      viewTime: Date.now()
    })
    
    // 限制数量
    const maxHistory = 50
    const newHistory = filteredHistory.slice(0, maxHistory)
    
    return StorageManager.setItem(STORAGE_KEYS.VIEWED_PRODUCTS, newHistory)
  }

  /**
   * 获取浏览历史
   */
  static getViewHistory() {
    return StorageManager.getItem(STORAGE_KEYS.VIEWED_PRODUCTS, [])
  }

  /**
   * 删除浏览记录
   */
  static removeViewHistory(productId) {
    const history = this.getViewHistory()
    const newHistory = history.filter(item => item.id !== productId)
    return StorageManager.setItem(STORAGE_KEYS.VIEWED_PRODUCTS, newHistory)
  }

  /**
   * 清空浏览历史
   */
  static clearViewHistory() {
    return StorageManager.setItem(STORAGE_KEYS.VIEWED_PRODUCTS, [])
  }
}

/**
 * 购物车存储
 */
class CartStorage {
  /**
   * 添加到购物车
   */
  static addToCart(product, quantity = 1, sku = null) {
    const cartItems = this.getCartItems()
    const itemKey = sku ? `${product.id}_${sku.id}` : product.id
    
    const existingItem = cartItems.find(item => item.key === itemKey)
    
    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      cartItems.push({
        key: itemKey,
        product,
        sku,
        quantity,
        addTime: Date.now()
      })
    }
    
    return StorageManager.setItem(STORAGE_KEYS.CART_ITEMS, cartItems)
  }

  /**
   * 更新购物车商品数量
   */
  static updateCartQuantity(itemKey, quantity) {
    const cartItems = this.getCartItems()
    const item = cartItems.find(item => item.key === itemKey)
    
    if (item) {
      if (quantity <= 0) {
        return this.removeFromCart(itemKey)
      } else {
        item.quantity = quantity
        return StorageManager.setItem(STORAGE_KEYS.CART_ITEMS, cartItems)
      }
    }
    
    return false
  }

  /**
   * 从购物车移除
   */
  static removeFromCart(itemKey) {
    const cartItems = this.getCartItems()
    const newCartItems = cartItems.filter(item => item.key !== itemKey)
    return StorageManager.setItem(STORAGE_KEYS.CART_ITEMS, newCartItems)
  }

  /**
   * 获取购物车商品
   */
  static getCartItems() {
    return StorageManager.getItem(STORAGE_KEYS.CART_ITEMS, [])
  }

  /**
   * 获取购物车商品数量
   */
  static getCartCount() {
    const cartItems = this.getCartItems()
    return cartItems.reduce((total, item) => total + item.quantity, 0)
  }

  /**
   * 清空购物车
   */
  static clearCart() {
    return StorageManager.setItem(STORAGE_KEYS.CART_ITEMS, [])
  }
}

/**
 * 应用设置存储
 */
class SettingsStorage {
  /**
   * 保存设置
   */
  static saveSettings(settings) {
    const currentSettings = this.getSettings()
    const newSettings = { ...currentSettings, ...settings }
    return StorageManager.setItem(STORAGE_KEYS.SETTINGS, newSettings)
  }

  /**
   * 获取设置
   */
  static getSettings() {
    return StorageManager.getItem(STORAGE_KEYS.SETTINGS, {
      theme: 'light',
      language: 'zh-CN',
      notifications: true,
      autoPlay: true,
      dataUsage: 'wifi'
    })
  }

  /**
   * 获取单个设置
   */
  static getSetting(key, defaultValue = null) {
    const settings = this.getSettings()
    return settings[key] !== undefined ? settings[key] : defaultValue
  }

  /**
   * 重置设置
   */
  static resetSettings() {
    return StorageManager.removeItem(STORAGE_KEYS.SETTINGS)
  }
}

/**
 * 缓存数据存储
 */
class CacheStorage {
  /**
   * 设置缓存
   */
  static setCache(key, data, expireTime = 30 * 60 * 1000) { // 默认30分钟
    const cacheData = {
      data,
      expireTime: Date.now() + expireTime,
      createTime: Date.now()
    }
    
    const allCache = StorageManager.getItem(STORAGE_KEYS.CACHE_DATA, {})
    allCache[key] = cacheData
    
    return StorageManager.setItem(STORAGE_KEYS.CACHE_DATA, allCache)
  }

  /**
   * 获取缓存
   */
  static getCache(key) {
    const allCache = StorageManager.getItem(STORAGE_KEYS.CACHE_DATA, {})
    const cacheItem = allCache[key]
    
    if (!cacheItem) {
      return null
    }
    
    // 检查是否过期
    if (Date.now() > cacheItem.expireTime) {
      this.removeCache(key)
      return null
    }
    
    return cacheItem.data
  }

  /**
   * 删除缓存
   */
  static removeCache(key) {
    const allCache = StorageManager.getItem(STORAGE_KEYS.CACHE_DATA, {})
    delete allCache[key]
    return StorageManager.setItem(STORAGE_KEYS.CACHE_DATA, allCache)
  }

  /**
   * 清理过期缓存
   */
  static clearExpiredCache() {
    const allCache = StorageManager.getItem(STORAGE_KEYS.CACHE_DATA, {})
    const now = Date.now()
    
    Object.keys(allCache).forEach(key => {
      if (now > allCache[key].expireTime) {
        delete allCache[key]
      }
    })
    
    return StorageManager.setItem(STORAGE_KEYS.CACHE_DATA, allCache)
  }

  /**
   * 清空所有缓存
   */
  static clearAllCache() {
    return StorageManager.setItem(STORAGE_KEYS.CACHE_DATA, {})
  }
}

/**
 * 数据迁移工具
 */
class DataMigration {
  /**
   * 检查数据版本
   */
  static checkDataVersion() {
    const currentVersion = '1.0.0'
    const storedVersion = StorageManager.getItem('dataVersion', '0.0.0')
    
    if (storedVersion !== currentVersion) {
      this.migrateData(storedVersion, currentVersion)
      StorageManager.setItem('dataVersion', currentVersion)
    }
  }

  /**
   * 数据迁移
   */
  static migrateData(fromVersion, toVersion) {
    console.log(`数据迁移: ${fromVersion} -> ${toVersion}`)
    
    // 根据版本执行相应的迁移逻辑
    if (fromVersion === '0.0.0') {
      // 初始化默认数据
      this.initializeDefaultData()
    }
  }

  /**
   * 初始化默认数据
   */
  static initializeDefaultData() {
    // 初始化默认设置
    if (!StorageManager.getItem(STORAGE_KEYS.SETTINGS)) {
      SettingsStorage.saveSettings({})
    }
    
    // 初始化空数组
    const arrayKeys = [
      STORAGE_KEYS.SEARCH_HISTORY,
      STORAGE_KEYS.FAVORITE_PRODUCTS,
      STORAGE_KEYS.FOLLOWED_BRANDS,
      STORAGE_KEYS.VIEWED_PRODUCTS,
      STORAGE_KEYS.CART_ITEMS
    ]
    
    arrayKeys.forEach(key => {
      if (!StorageManager.getItem(key)) {
        StorageManager.setItem(key, [])
      }
    })
  }
}

// 方案一：直接导出 UserStorage 类，保持向后兼容
module.exports = UserStorage;

// 同时保留其他类的导出，以便其他地方使用
module.exports.STORAGE_KEYS = STORAGE_KEYS;
module.exports.StorageManager = StorageManager;
module.exports.UserStorage = UserStorage;
module.exports.SearchStorage = SearchStorage;
module.exports.FavoriteStorage = FavoriteStorage;
module.exports.FollowStorage = FollowStorage;
module.exports.ViewHistoryStorage = ViewHistoryStorage;
module.exports.CartStorage = CartStorage;
module.exports.SettingsStorage = SettingsStorage;
module.exports.CacheStorage = CacheStorage;
module.exports.DataMigration = DataMigration;