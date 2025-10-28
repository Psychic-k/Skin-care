// utils/common.js - 通用工具函数

/**
 * 格式化工具类
 */
class FormatUtils {
  /**
   * 格式化价格
   * @param {number} price 价格
   * @param {string} currency 货币符号
   * @returns {string} 格式化后的价格
   */
  static formatPrice(price, currency = '¥') {
    if (typeof price !== 'number' || isNaN(price)) {
      return `${currency}0.00`
    }
    return `${currency}${price.toFixed(2)}`
  }

  /**
   * 格式化数字（添加千分位分隔符）
   * @param {number} num 数字
   * @returns {string} 格式化后的数字
   */
  static formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) {
      return '0'
    }
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  /**
   * 格式化文件大小
   * @param {number} bytes 字节数
   * @returns {string} 格式化后的文件大小
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 格式化时间
   * @param {Date|string|number} date 日期
   * @param {string} format 格式
   * @returns {string} 格式化后的时间
   */
  static formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = new Date(date)
    if (isNaN(d.getTime())) {
      return ''
    }

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds)
  }

  /**
   * 格式化相对时间
   * @param {Date|string|number} date 日期
   * @returns {string} 相对时间描述
   */
  static formatRelativeTime(date) {
    const now = new Date()
    const target = new Date(date)
    const diff = now.getTime() - target.getTime()

    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour
    const week = 7 * day
    const month = 30 * day
    const year = 365 * day

    if (diff < minute) {
      return '刚刚'
    } else if (diff < hour) {
      return `${Math.floor(diff / minute)}分钟前`
    } else if (diff < day) {
      return `${Math.floor(diff / hour)}小时前`
    } else if (diff < week) {
      return `${Math.floor(diff / day)}天前`
    } else if (diff < month) {
      return `${Math.floor(diff / week)}周前`
    } else if (diff < year) {
      return `${Math.floor(diff / month)}个月前`
    } else {
      return `${Math.floor(diff / year)}年前`
    }
  }

  /**
   * 截断文本
   * @param {string} text 文本
   * @param {number} maxLength 最大长度
   * @param {string} suffix 后缀
   * @returns {string} 截断后的文本
   */
  static truncateText(text, maxLength = 50, suffix = '...') {
    if (!text || text.length <= maxLength) {
      return text || ''
    }
    return text.substring(0, maxLength) + suffix
  }

  /**
   * 格式化评分星星
   * @param {number} rating 评分
   * @param {number} maxRating 最大评分
   * @returns {Array} 星星数组
   */
  static formatRatingStars(rating, maxRating = 5) {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < maxRating; i++) {
      if (i < fullStars) {
        stars.push('full')
      } else if (i === fullStars && hasHalfStar) {
        stars.push('half')
      } else {
        stars.push('empty')
      }
    }

    return stars
  }
}

/**
 * 验证工具类
 */
class ValidationUtils {
  /**
   * 验证手机号
   * @param {string} phone 手机号
   * @returns {boolean} 是否有效
   */
  static isValidPhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
  }

  /**
   * 验证邮箱
   * @param {string} email 邮箱
   * @returns {boolean} 是否有效
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * 验证身份证号
   * @param {string} idCard 身份证号
   * @returns {boolean} 是否有效
   */
  static isValidIdCard(idCard) {
    const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
    return idCardRegex.test(idCard)
  }

  /**
   * 验证密码强度
   * @param {string} password 密码
   * @returns {Object} 验证结果
   */
  static validatePassword(password) {
    const result = {
      isValid: false,
      strength: 'weak',
      message: ''
    }

    if (!password) {
      result.message = '密码不能为空'
      return result
    }

    if (password.length < 6) {
      result.message = '密码长度至少6位'
      return result
    }

    if (password.length > 20) {
      result.message = '密码长度不能超过20位'
      return result
    }

    let score = 0
    
    // 包含小写字母
    if (/[a-z]/.test(password)) score++
    
    // 包含大写字母
    if (/[A-Z]/.test(password)) score++
    
    // 包含数字
    if (/\d/.test(password)) score++
    
    // 包含特殊字符
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++

    if (score >= 3) {
      result.strength = 'strong'
      result.isValid = true
      result.message = '密码强度：强'
    } else if (score >= 2) {
      result.strength = 'medium'
      result.isValid = true
      result.message = '密码强度：中等'
    } else {
      result.strength = 'weak'
      result.isValid = false
      result.message = '密码强度太弱，请包含字母、数字或特殊字符'
    }

    return result
  }

  /**
   * 验证URL
   * @param {string} url URL地址
   * @returns {boolean} 是否有效
   */
  static isValidUrl(url) {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

/**
 * 数组工具类
 */
class ArrayUtils {
  /**
   * 数组去重
   * @param {Array} arr 数组
   * @param {string} key 去重键名（对象数组）
   * @returns {Array} 去重后的数组
   */
  static unique(arr, key = null) {
    if (!Array.isArray(arr)) return []
    
    if (key) {
      const seen = new Set()
      return arr.filter(item => {
        const value = item[key]
        if (seen.has(value)) {
          return false
        }
        seen.add(value)
        return true
      })
    }
    
    return [...new Set(arr)]
  }

  /**
   * 数组分组
   * @param {Array} arr 数组
   * @param {string|Function} key 分组键名或函数
   * @returns {Object} 分组结果
   */
  static groupBy(arr, key) {
    if (!Array.isArray(arr)) return {}
    
    return arr.reduce((groups, item) => {
      const groupKey = typeof key === 'function' ? key(item) : item[key]
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(item)
      return groups
    }, {})
  }

  /**
   * 数组排序
   * @param {Array} arr 数组
   * @param {string} key 排序键名
   * @param {string} order 排序方向 asc/desc
   * @returns {Array} 排序后的数组
   */
  static sortBy(arr, key, order = 'asc') {
    if (!Array.isArray(arr)) return []
    
    return [...arr].sort((a, b) => {
      const aValue = a[key]
      const bValue = b[key]
      
      if (aValue < bValue) {
        return order === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return order === 'asc' ? 1 : -1
      }
      return 0
    })
  }

  /**
   * 数组分页
   * @param {Array} arr 数组
   * @param {number} page 页码
   * @param {number} pageSize 每页数量
   * @returns {Object} 分页结果
   */
  static paginate(arr, page = 1, pageSize = 10) {
    if (!Array.isArray(arr)) {
      return {
        data: [],
        total: 0,
        page: 1,
        pageSize,
        totalPages: 0,
        hasMore: false
      }
    }

    const total = arr.length
    const totalPages = Math.ceil(total / pageSize)
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const data = arr.slice(startIndex, endIndex)

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages
    }
  }
}

/**
 * 对象工具类
 */
class ObjectUtils {
  /**
   * 深拷贝
   * @param {any} obj 对象
   * @returns {any} 拷贝后的对象
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime())
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item))
    }

    if (typeof obj === 'object') {
      const cloned = {}
      Object.keys(obj).forEach(key => {
        cloned[key] = this.deepClone(obj[key])
      })
      return cloned
    }

    return obj
  }

  /**
   * 对象合并
   * @param {Object} target 目标对象
   * @param {...Object} sources 源对象
   * @returns {Object} 合并后的对象
   */
  static merge(target, ...sources) {
    if (!target) target = {}
    
    sources.forEach(source => {
      if (source) {
        Object.keys(source).forEach(key => {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            target[key] = this.merge(target[key] || {}, source[key])
          } else {
            target[key] = source[key]
          }
        })
      }
    })
    
    return target
  }

  /**
   * 获取嵌套属性值
   * @param {Object} obj 对象
   * @param {string} path 属性路径
   * @param {any} defaultValue 默认值
   * @returns {any} 属性值
   */
  static get(obj, path, defaultValue = undefined) {
    if (!obj || !path) return defaultValue
    
    const keys = path.split('.')
    let result = obj
    
    for (const key of keys) {
      if (result === null || result === undefined || !(key in result)) {
        return defaultValue
      }
      result = result[key]
    }
    
    return result
  }

  /**
   * 设置嵌套属性值
   * @param {Object} obj 对象
   * @param {string} path 属性路径
   * @param {any} value 属性值
   * @returns {Object} 对象
   */
  static set(obj, path, value) {
    if (!obj || !path) return obj
    
    const keys = path.split('.')
    let current = obj
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }
    
    current[keys[keys.length - 1]] = value
    return obj
  }

  /**
   * 过滤对象属性
   * @param {Object} obj 对象
   * @param {Array} keys 保留的键名
   * @returns {Object} 过滤后的对象
   */
  static pick(obj, keys) {
    if (!obj || !Array.isArray(keys)) return {}
    
    const result = {}
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key]
      }
    })
    return result
  }

  /**
   * 排除对象属性
   * @param {Object} obj 对象
   * @param {Array} keys 排除的键名
   * @returns {Object} 排除后的对象
   */
  static omit(obj, keys) {
    if (!obj) return {}
    if (!Array.isArray(keys)) return { ...obj }
    
    const result = { ...obj }
    keys.forEach(key => {
      delete result[key]
    })
    return result
  }
}

/**
 * 字符串工具类
 */
class StringUtils {
  /**
   * 生成随机字符串
   * @param {number} length 长度
   * @param {string} chars 字符集
   * @returns {string} 随机字符串
   */
  static random(length = 8, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * 首字母大写
   * @param {string} str 字符串
   * @returns {string} 处理后的字符串
   */
  static capitalize(str) {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  /**
   * 驼峰命名转换
   * @param {string} str 字符串
   * @returns {string} 驼峰命名字符串
   */
  static camelCase(str) {
    if (!str) return ''
    return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
  }

  /**
   * 短横线命名转换
   * @param {string} str 字符串
   * @returns {string} 短横线命名字符串
   */
  static kebabCase(str) {
    if (!str) return ''
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
  }

  /**
   * 移除HTML标签
   * @param {string} html HTML字符串
   * @returns {string} 纯文本
   */
  static stripHtml(html) {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '')
  }

  /**
   * 转义HTML字符
   * @param {string} str 字符串
   * @returns {string} 转义后的字符串
   */
  static escapeHtml(str) {
    if (!str) return ''
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return str.replace(/[&<>"']/g, char => map[char])
  }
}

/**
 * 防抖函数
 * @param {Function} func 函数
 * @param {number} delay 延迟时间
 * @returns {Function} 防抖函数
 */
function debounce(func, delay = 300) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

/**
 * 节流函数
 * @param {Function} func 函数
 * @param {number} delay 延迟时间
 * @returns {Function} 节流函数
 */
function throttle(func, delay = 300) {
  let lastTime = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastTime >= delay) {
      lastTime = now
      func.apply(this, args)
    }
  }
}

/**
 * 异步延迟函数
 * @param {number} ms 延迟毫秒数
 * @returns {Promise} Promise对象
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 重试函数
 * @param {Function} func 函数
 * @param {number} maxRetries 最大重试次数
 * @param {number} delay 重试间隔
 * @returns {Promise} Promise对象
 */
async function retry(func, maxRetries = 3, delay = 1000) {
  let lastError
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await func()
    } catch (error) {
      lastError = error
      if (i < maxRetries) {
        await sleep(delay)
      }
    }
  }
  
  throw lastError
}

/**
 * 获取设备信息
 * @returns {Promise} 设备信息
 */
function getDeviceInfo() {
  return new Promise((resolve) => {
    wx.getSystemInfo({
      success: (res) => {
        resolve({
          brand: res.brand,
          model: res.model,
          system: res.system,
          platform: res.platform,
          version: res.version,
          SDKVersion: res.SDKVersion,
          screenWidth: res.screenWidth,
          screenHeight: res.screenHeight,
          windowWidth: res.windowWidth,
          windowHeight: res.windowHeight,
          pixelRatio: res.pixelRatio,
          statusBarHeight: res.statusBarHeight,
          safeArea: res.safeArea
        })
      },
      fail: () => {
        resolve({})
      }
    })
  })
}

/**
 * 显示提示信息
 * @param {string} title 提示内容
 * @param {string} icon 图标类型
 * @param {number} duration 显示时长
 */
function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({
    title,
    icon,
    duration
  })
}

/**
 * 显示加载提示
 * @param {string} title 提示内容
 */
function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  })
}

/**
 * 隐藏加载提示
 */
function hideLoading() {
  wx.hideLoading()
}

/**
 * 显示确认对话框
 * @param {string} content 内容
 * @param {string} title 标题
 * @returns {Promise} Promise对象
 */
function showConfirm(content, title = '提示') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm)
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}

/**
 * 页面跳转
 * @param {string} url 页面路径
 * @param {Object} params 参数
 */
function navigateTo(url, params = {}) {
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')
  
  const fullUrl = queryString ? `${url}?${queryString}` : url
  
  wx.navigateTo({
    url: fullUrl,
    fail: (error) => {
      console.error('页面跳转失败:', error)
      showToast('页面跳转失败')
    }
  })
}

/**
 * 页面重定向
 * @param {string} url 页面路径
 * @param {Object} params 参数
 */
function redirectTo(url, params = {}) {
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')
  
  const fullUrl = queryString ? `${url}?${queryString}` : url
  
  wx.redirectTo({
    url: fullUrl,
    fail: (error) => {
      console.error('页面重定向失败:', error)
      showToast('页面跳转失败')
    }
  })
}

/**
 * 返回上一页
 * @param {number} delta 返回层数
 */
function navigateBack(delta = 1) {
  wx.navigateBack({
    delta,
    fail: (error) => {
      console.error('页面返回失败:', error)
    }
  })
}

module.exports = {
  FormatUtils,
  ValidationUtils,
  ArrayUtils,
  ObjectUtils,
  StringUtils,
  debounce,
  throttle,
  sleep,
  retry,
  getDeviceInfo,
  showToast,
  showLoading,
  hideLoading,
  showConfirm,
  navigateTo,
  redirectTo,
  navigateBack
}