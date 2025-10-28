// 日记列表云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('diaryList 云函数调用开始', event)
    
    // 参数验证
    const { 
      userId,
      page = 1, 
      limit = 10, 
      filterType = 'all', 
      sortBy = 'date' 
    } = event
    
    if (!userId) {
      return {
        code: -1,
        message: '用户ID不能为空',
        data: null
      }
    }
    
    // 构建查询条件
    let whereCondition = {
      userId: userId
    }
    
    // 根据筛选类型添加条件
    if (filterType !== 'all') {
      switch (filterType) {
        case 'skincare':
          whereCondition['products.0'] = _.exists(true) // 有使用产品的记录
          break
        case 'mood':
          whereCondition.mood = _.gte(7) // 心情好的记录
          break
        case 'weather':
          whereCondition.weather = _.neq('rainy') // 非雨天记录
          break
      }
    }
    
    // 构建排序条件
    let orderBy = 'date'
    let orderDirection = 'desc'
    
    switch (sortBy) {
      case 'mood':
        orderBy = 'mood'
        orderDirection = 'desc'
        break
      case 'weather':
        orderBy = 'weather'
        orderDirection = 'asc'
        break
      case 'date':
      default:
        orderBy = 'date'
        orderDirection = 'desc'
        break
    }
    
    // 计算跳过的记录数
    const skip = (page - 1) * limit
    
    // 查询日记列表
    const diaryResult = await db.collection('diaries')
      .where(whereCondition)
      .orderBy(orderBy, orderDirection)
      .skip(skip)
      .limit(limit)
      .get()
    
    // 获取总数（用于分页）
    const countResult = await db.collection('diaries')
      .where(whereCondition)
      .count()
    
    // 处理产品信息 - 获取产品详情
    const diaries = diaryResult.data
    const productIds = []
    
    diaries.forEach(diary => {
      if (diary.products && diary.products.length > 0) {
        productIds.push(...diary.products)
      }
    })
    
    // 去重产品ID
    const uniqueProductIds = [...new Set(productIds)]
    let productsMap = {}
    
    if (uniqueProductIds.length > 0) {
      const productsResult = await db.collection('products')
        .where({
          _id: _.in(uniqueProductIds)
        })
        .get()
      
      productsResult.data.forEach(product => {
        productsMap[product._id] = product
      })
    }
    
    // 填充产品详情
    const enrichedDiaries = diaries.map(diary => {
      if (diary.products && diary.products.length > 0) {
        diary.productDetails = diary.products.map(productId => {
          return productsMap[productId] || { _id: productId, name: '未知产品' }
        })
      } else {
        diary.productDetails = []
      }
      return diary
    })
    
    console.log('diaryList 查询成功', {
      count: enrichedDiaries.length,
      total: countResult.total,
      page,
      limit
    })
    
    return {
      code: 0,
      message: 'success',
      data: {
        diaries: enrichedDiaries,
        pagination: {
          page: page,
          limit: limit,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit),
          hasMore: skip + enrichedDiaries.length < countResult.total
        },
        filters: {
          filterType,
          sortBy
        }
      }
    }
    
  } catch (error) {
    console.error('diaryList 云函数执行失败:', error)
    return {
      code: -1,
      message: error.message || '获取日记列表失败',
      data: null
    }
  }
}