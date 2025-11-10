// 获取用户个人护肤品列表云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('getUserOwnedProducts 云函数调用开始', event)
    
    // 参数验证
    const { 
      category = 'all', // all, cleanser, toner, serum, moisturizer, sunscreen, mask, other
      status = 'all', // all, active, used_up, expired
      page = 1,
      limit = 20,
      keyword = '' // 搜索关键词
    } = event

    // 统一鉴权：使用 OPENID 作为用户标识
    const userId = wxContext.OPENID
    
    if (!userId) {
      return {
        code: -1,
        message: '用户ID不能为空',
        data: null
      }
    }
    
    // 权限验证：用户只能查看自己的产品
    if (userId !== wxContext.OPENID) {
      return {
        code: -1,
        message: '无权限访问其他用户的产品列表',
        data: null
      }
    }
    
    // 构建查询条件
    let whereCondition = {
      userId: userId
    }
    
    // 按分类筛选
    if (category !== 'all') {
      whereCondition.category = category
    }
    
    // 按状态筛选
    if (status !== 'all') {
      whereCondition.status = status
    }
    
    // 关键词搜索
    if (keyword) {
      whereCondition.$or = [
        { productName: new RegExp(keyword, 'i') },
        { brand: new RegExp(keyword, 'i') },
        { notes: new RegExp(keyword, 'i') }
      ]
    }
    
    // 获取总数
    const countResult = await db.collection('user_products')
      .where(whereCondition)
      .count()
    
    const total = countResult.total
    
    // 分页查询
    const skip = (page - 1) * limit
    const result = await db.collection('user_products')
      .where(whereCondition)
      .orderBy('addedDate', 'desc')
      .orderBy('_id', 'desc')
      .skip(skip)
      .limit(limit)
      .get()
    
    // 获取关联的产品详细信息
    const userProducts = result.data
    const productIds = userProducts
      .filter(item => item.productId)
      .map(item => item.productId)
    
    let productsMap = {}
    if (productIds.length > 0) {
      const productsResult = await db.collection('products')
        .where({
          _id: _.in(productIds)
        })
        .get()
      
      productsResult.data.forEach(product => {
        productsMap[product._id] = product
      })
    }
    
    // 合并用户产品信息和产品详细信息
    const enrichedProducts = userProducts.map(userProduct => {
      const productDetail = productsMap[userProduct.productId] || {}
      
      return {
        ...userProduct,
        // 产品基本信息
        productDetail: {
          name: productDetail.name || userProduct.productName,
          brand: productDetail.brand || userProduct.brand,
          image: productDetail.image || userProduct.image,
          category: productDetail.category || userProduct.category,
          price: productDetail.price,
          rating: productDetail.rating,
          description: productDetail.description
        },
        // 计算使用进度
        usageProgress: calculateUsageProgress(userProduct),
        // 计算剩余天数
        remainingDays: calculateRemainingDays(userProduct),
        // 是否即将用完
        isRunningOut: isProductRunningOut(userProduct),
        // 是否已过期
        isExpired: isProductExpired(userProduct)
      }
    })
    
    // 统计信息
    const stats = {
      total: total,
      active: 0,
      usedUp: 0,
      expired: 0,
      runningOut: 0
    }
    
    enrichedProducts.forEach(product => {
      if (product.status === 'active') stats.active++
      else if (product.status === 'used_up') stats.usedUp++
      else if (product.status === 'expired') stats.expired++
      
      if (product.isRunningOut) stats.runningOut++
    })
    
    console.log('getUserOwnedProducts 查询成功', {
      userId,
      category,
      status,
      total,
      returned: enrichedProducts.length
    })
    
    return {
      code: 0,
      message: 'success',
      data: {
        products: enrichedProducts,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + enrichedProducts.length < total
        },
        stats: stats
      }
    }
    
  } catch (error) {
    console.error('getUserOwnedProducts 云函数执行失败:', error)
    return {
      code: -1,
      message: error.message || '获取用户产品列表失败',
      data: null
    }
  }
}

/**
 * 计算产品使用进度
 * @param {Object} userProduct 用户产品信息
 * @returns {number} 使用进度百分比 (0-100)
 */
function calculateUsageProgress(userProduct) {
  if (!userProduct.totalCapacity || userProduct.totalCapacity <= 0) {
    return 0
  }
  
  const remainingCapacity = userProduct.remainingCapacity || 0
  const usedCapacity = userProduct.totalCapacity - remainingCapacity
  
  return Math.round((usedCapacity / userProduct.totalCapacity) * 100)
}

/**
 * 计算产品剩余使用天数
 * @param {Object} userProduct 用户产品信息
 * @returns {number} 剩余天数，-1表示无法计算
 */
function calculateRemainingDays(userProduct) {
  if (!userProduct.remainingCapacity || !userProduct.dailyUsage || userProduct.dailyUsage <= 0) {
    return -1
  }
  
  return Math.ceil(userProduct.remainingCapacity / userProduct.dailyUsage)
}

/**
 * 判断产品是否即将用完
 * @param {Object} userProduct 用户产品信息
 * @returns {boolean} 是否即将用完
 */
function isProductRunningOut(userProduct) {
  const remainingDays = calculateRemainingDays(userProduct)
  return remainingDays > 0 && remainingDays <= 7 // 7天内用完算即将用完
}

/**
 * 判断产品是否已过期
 * @param {Object} userProduct 用户产品信息
 * @returns {boolean} 是否已过期
 */
function isProductExpired(userProduct) {
  if (!userProduct.expiryDate) {
    return false
  }
  
  const now = new Date()
  const expiryDate = new Date(userProduct.expiryDate)
  
  return now > expiryDate
}