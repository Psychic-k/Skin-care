/**
 * 云开发API封装工具
 * 统一管理所有云函数调用和云数据库操作
 */

class CloudApi {
  constructor() {
    this.isCloudEnabled = false
    this.init()
  }

  /**
   * 初始化云开发
   */
  init() {
    try {
      if (wx.cloud) {
        this.isCloudEnabled = getApp().globalData.cloudEnabled || false
        console.log('云开发状态:', this.isCloudEnabled)
      } else {
        console.warn('云开发不可用')
      }
    } catch (error) {
      console.error('云开发初始化失败:', error)
    }
  }

  /**
   * 检查云开发是否可用
   */
  checkCloudAvailable() {
    if (!this.isCloudEnabled) {
      throw new Error('云开发服务不可用，请检查网络连接')
    }
  }

  /**
   * 用户登录
   * @param {Object} userInfo - 用户信息
   * @returns {Promise} 登录结果
   */
  async login(userInfo = {}) {
    try {
      this.checkCloudAvailable()
      
      wx.showLoading({
        title: '登录中...',
        mask: true
      })

      const result = await wx.cloud.callFunction({
        name: 'login',
        data: {
          userInfo: userInfo
        }
      })

      wx.hideLoading()

      if (result.result && result.result.code === 0) {
        const user = result.result.data?.user || {}
        const normalizedUser = {
          ...user,
          nickName: user.nickName || user.nickname || '微信用户',
          avatarUrl: user.avatarUrl || user.avatar || '/images/default-avatar.png',
          isLogin: true
        }
        wx.setStorageSync('userInfo', normalizedUser)
        wx.setStorageSync('openid', result.result.data.openid)
        return { code: 0, message: '登录成功', data: { user: normalizedUser, openid: result.result.data.openid } }
      } else if (result.result && result.result.success) {
        // 兼容旧版云函数返回结构 { success, data }
        const user = (result.result.data && result.result.data.user) ? result.result.data.user : {}
        const normalizedUser = {
          ...user,
          nickName: user.nickName || user.nickname || '微信用户',
          avatarUrl: user.avatarUrl || user.avatar || '/images/default-avatar.png',
          isLogin: true
        }
        const openid = (result.result.data && result.result.data.openid) ? result.result.data.openid : (normalizedUser.openid || '')
        wx.setStorageSync('userInfo', normalizedUser)
        if (openid) wx.setStorageSync('openid', openid)
        return { code: 0, message: '登录成功', data: { user: normalizedUser, openid } }
      } else {
        throw new Error((result.result && result.result.message) || '登录失败')
      }
    } catch (error) {
      wx.hideLoading()
      console.error('登录失败:', error)
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      })
      throw error
    }
  }

  /**
   * 获取用户信息
   * @param {String} userId - 用户ID（可选）
   * @returns {Promise} 用户信息
   */
  async getUserInfo(userId = null) {
    try {
      this.checkCloudAvailable()

      const result = await wx.cloud.callFunction({
        name: 'getUserInfo',
        data: {
          userId: userId
        }
      })

      if (result.result && result.result.code === 0) {
        const data = result.result.data || {}
        const user = data.user || data
        return {
          ...user,
          nickName: user.nickName || user.nickname || '微信用户',
          avatarUrl: user.avatarUrl || user.avatar || '/images/default-avatar.png'
        }
      } else if (result.result && (result.result.success || result.result.data)) {
        // 兼容旧版返回结构
        const data = result.result.data || {}
        const user = data.user || data
        return {
          ...user,
          nickName: user.nickName || user.nickname || '微信用户',
          avatarUrl: user.avatarUrl || user.avatar || '/images/default-avatar.png'
        }
      } else {
        throw new Error((result.result && result.result.message) || '获取用户信息失败')
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      wx.showToast({
        title: error.message || '获取用户信息失败',
        icon: 'none'
      })
      throw error
    }
  }

  /**
   * 获取产品推荐
   * @param {Object} params - 推荐参数
   * @returns {Promise} 推荐结果
   */
  async getProductRecommendations(params = {}) {
    try {
      this.checkCloudAvailable()

      wx.showLoading({
        title: '获取推荐中...',
        mask: true
      })

      const result = await wx.cloud.callFunction({
        name: 'getProductRecommendations',
        data: params
      })

      wx.hideLoading()

      if (result.result.success) {
        return result.result.data
      } else {
        throw new Error(result.result.message || '获取推荐失败')
      }
    } catch (error) {
      wx.hideLoading()
      console.error('获取产品推荐失败:', error)
      wx.showToast({
        title: error.message || '获取推荐失败',
        icon: 'none'
      })
      throw error
    }
  }

  /**
   * 上传文件
   * @param {String} filePath - 本地文件路径
   * @param {String} cloudPath - 云端文件路径
   * @returns {Promise} 上传结果
   */
  async uploadFile(filePath, cloudPath) {
    try {
      this.checkCloudAvailable()

      wx.showLoading({
        title: '上传中...',
        mask: true
      })

      const result = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath
      })

      wx.hideLoading()

      if (result.fileID) {
        return {
          success: true,
          fileID: result.fileID,
          message: '上传成功'
        }
      } else {
        throw new Error('上传失败')
      }
    } catch (error) {
      wx.hideLoading()
      console.error('文件上传失败:', error)
      wx.showToast({
        title: error.message || '上传失败',
        icon: 'none'
      })
      throw error
    }
  }

  /**
   * 删除文件
   * @param {Array} fileList - 文件ID列表
   * @returns {Promise} 删除结果
   */
  async deleteFile(fileList) {
    try {
      this.checkCloudAvailable()

      const result = await wx.cloud.deleteFile({
        fileList: fileList
      })

      return result
    } catch (error) {
      console.error('文件删除失败:', error)
      throw error
    }
  }

  /**
   * 获取数据库引用
   * @returns {Object} 数据库引用
   */
  getDatabase() {
    try {
      this.checkCloudAvailable()
      return wx.cloud.database()
    } catch (error) {
      console.error('获取数据库引用失败:', error)
      throw error
    }
  }

  /**
   * 查询数据
   * @param {String} collection - 集合名称
   * @param {Object} where - 查询条件
   * @param {Object} options - 查询选项
   * @returns {Promise} 查询结果
   */
  async queryData(collection, where = {}, options = {}) {
    try {
      this.checkCloudAvailable()
      
      const db = this.getDatabase()
      let query = db.collection(collection)

      // 添加查询条件
      if (Object.keys(where).length > 0) {
        query = query.where(where)
      }

      // 添加排序
      if (options.orderBy) {
        query = query.orderBy(options.orderBy.field, options.orderBy.order || 'asc')
      }

      // 添加限制
      if (options.limit) {
        query = query.limit(options.limit)
      }

      // 添加跳过
      if (options.skip) {
        query = query.skip(options.skip)
      }

      const result = await query.get()
      return result.data
    } catch (error) {
      console.error('查询数据失败:', error)
      throw error
    }
  }

  /**
   * 添加数据
   * @param {String} collection - 集合名称
   * @param {Object} data - 数据
   * @returns {Promise} 添加结果
   */
  async addData(collection, data) {
    try {
      this.checkCloudAvailable()
      
      const db = this.getDatabase()
      const result = await db.collection(collection).add({
        data: {
          ...data,
          createTime: new Date(),
          updateTime: new Date()
        }
      })

      return result
    } catch (error) {
      console.error('添加数据失败:', error)
      throw error
    }
  }

  /**
   * 更新数据
   * @param {String} collection - 集合名称
   * @param {String} id - 文档ID
   * @param {Object} data - 更新数据
   * @returns {Promise} 更新结果
   */
  async updateData(collection, id, data) {
    try {
      this.checkCloudAvailable()
      
      const db = this.getDatabase()
      const result = await db.collection(collection).doc(id).update({
        data: {
          ...data,
          updateTime: new Date()
        }
      })

      return result
    } catch (error) {
      console.error('更新数据失败:', error)
      throw error
    }
  }

  /**
   * 删除数据
   * @param {String} collection - 集合名称
   * @param {String} id - 文档ID
   * @returns {Promise} 删除结果
   */
  async deleteData(collection, id) {
    try {
      this.checkCloudAvailable()
      
      const db = this.getDatabase()
      const result = await db.collection(collection).doc(id).remove()

      return result
    } catch (error) {
      console.error('删除数据失败:', error)
      throw error
    }
  }

  /**
   * 获取临时链接
   * @param {Array} fileList - 文件ID列表
   * @returns {Promise} 临时链接
   */
  async getTempFileURL(fileList) {
    try {
      this.checkCloudAvailable()

      const result = await wx.cloud.getTempFileURL({
        fileList: fileList
      })

      return result.fileList
    } catch (error) {
      console.error('获取临时链接失败:', error)
      throw error
    }
  }
}

// 创建单例实例
const cloudApi = new CloudApi()

module.exports = cloudApi