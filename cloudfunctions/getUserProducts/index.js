// 获取用户产品云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('getUserProducts 云函数调用开始', event)
    
    // 参数验证
    const { 
      userId,
      type = 'all', // all, favorites, used, recommended
      page = 1,
      limit = 20
    } = event
    
    if (!userId) {
      return {
        code: -1,
        message: '用户ID不能为空',
        data: null
      }
    }
    
    let products = []
    let total = 0
    
    if (type === 'used' || type === 'all') {
      // 从用户日记中获取使用过的产品
      const diariesResult = await db.collection('diaries')
        .where({
          userId: userId
        })
        .get()
      
      const usedProductIds = new Set()
      const productUsageCount = {}
      
      diariesResult.data.forEach(diary => {
        // 统计早间护肤产品
        if (diary.morningRoutine && Array.isArray(diary.morningRoutine)) {
          diary.morningRoutine.forEach(product => {
            const productId = product.productId
            if (productId) {
              usedProductIds.add(productId)
              productUsageCount[productId] = (productUsageCount[productId] || 0) + 1
            }
          })
        }
        
        // 统计晚间护肤产品
        if (diary.eveningRoutine && Array.isArray(diary.eveningRoutine)) {
          diary.eveningRoutine.forEach(product => {
            const productId = product.productId
            if (productId) {
              usedProductIds.add(productId)
              productUsageCount[productId] = (productUsageCount[productId] || 0) + 1
            }
          })
        }
      })
      
      if (usedProductIds.size > 0) {
        // 获取产品详细信息
        const productsResult = await db.collection('products')
          .where({
            _id: _.in([...usedProductIds])
          })
          .get()
        
        // 添加使用次数信息
        const usedProducts = productsResult.data.map(product => ({
          ...product,
          usageCount: productUsageCount[product._id] || 0,
          productType: 'used',
          lastUsed: diariesResult.data
            .filter(diary => {
              const morningProducts = (diary.morningRoutine || []).map(p => p.productId)
              const eveningProducts = (diary.eveningRoutine || []).map(p => p.productId)
              return morningProducts.includes(product._id) || eveningProducts.includes(product._id)
            })
            .sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null
        }))
        
        products = products.concat(usedProducts)
      }
    }
    
    if (type === 'favorites' || type === 'all') {
      // 获取用户收藏的产品（从用户表中的favorites字段）
      const userResult = await db.collection('users')
        .where({
          _id: userId
        })
        .get()
      
      if (userResult.data.length > 0 && userResult.data[0].favorites) {
        const favoriteIds = userResult.data[0].favorites
        
        if (favoriteIds.length > 0) {
          const favoritesResult = await db.collection('products')
            .where({
              _id: _.in(favoriteIds)
            })
            .get()
          
          const favoriteProducts = favoritesResult.data.map(product => ({
            ...product,
            productType: 'favorite',
            favoriteDate: userResult.data[0].favoriteDate || null
          }))
          
          products = products.concat(favoriteProducts)
        }
      }
    }
    
    if (type === 'recommended' || type === 'all') {
      // 基于用户肌肤类型和关注点推荐产品
      const userResult = await db.collection('users')
        .where({
          _id: userId
        })
        .get()
      
      if (userResult.data.length > 0) {
        const user = userResult.data[0]
        const skinType = user.skinType
        const skinConcerns = user.skinConcerns || []
        
        // 构建推荐查询条件
        let recommendQuery = {}
        
        if (skinType) {
          recommendQuery['suitableSkinTypes'] = _.in([skinType, 'all'])
        }
        
        if (skinConcerns.length > 0) {
          recommendQuery['targetConcerns'] = _.in(skinConcerns)
        }
        
        const recommendedResult = await db.collection('products')
          .where(recommendQuery)
          .orderBy('rating', 'desc')
          .limit(10)
          .get()
        
        const recommendedProducts = recommendedResult.data.map(product => ({
          ...product,
          productType: 'recommended',
          matchScore: this.calculateMatchScore(product, user)
        }))
        
        products = products.concat(recommendedProducts)
      }
    }
    
    // 去重（同一产品可能既被使用过又被收藏）
    const uniqueProducts = []
    const seenIds = new Set()
    
    products.forEach(product => {
      if (!seenIds.has(product._id)) {
        seenIds.add(product._id)
        
        // 合并产品类型
        const sameProducts = products.filter(p => p._id === product._id)
        const types = [...new Set(sameProducts.map(p => p.productType))]
        
        uniqueProducts.push({
          ...product,
          productTypes: types,
          usageCount: sameProducts.find(p => p.usageCount)?.usageCount || 0,
          lastUsed: sameProducts.find(p => p.lastUsed)?.lastUsed || null,
          favoriteDate: sameProducts.find(p => p.favoriteDate)?.favoriteDate || null,
          matchScore: sameProducts.find(p => p.matchScore)?.matchScore || 0
        })
      }
    })
    
    // 排序
    uniqueProducts.sort((a, b) => {
      // 优先显示收藏的产品
      if (a.productTypes.includes('favorite') && !b.productTypes.includes('favorite')) return -1
      if (!a.productTypes.includes('favorite') && b.productTypes.includes('favorite')) return 1
      
      // 然后按使用次数排序
      if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount
      
      // 最后按推荐匹配度排序
      return b.matchScore - a.matchScore
    })
    
    total = uniqueProducts.length
    
    // 分页
    const skip = (page - 1) * limit
    const paginatedProducts = uniqueProducts.slice(skip, skip + limit)
    
    console.log('getUserProducts 查询成功', {
      userId,
      type,
      total,
      returned: paginatedProducts.length
    })
    
    return {
      code: 0,
      message: 'success',
      data: {
        products: paginatedProducts,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + paginatedProducts.length < total
        },
        summary: {
          usedCount: uniqueProducts.filter(p => p.productTypes.includes('used')).length,
          favoriteCount: uniqueProducts.filter(p => p.productTypes.includes('favorite')).length,
          recommendedCount: uniqueProducts.filter(p => p.productTypes.includes('recommended')).length
        }
      }
    }
    
  } catch (error) {
    console.error('getUserProducts 云函数执行失败:', error)
    return {
      code: -1,
      message: error.message || '获取用户产品失败',
      data: null
    }
  }
}

// 计算产品与用户的匹配度
function calculateMatchScore(product, user) {
  let score = 0
  
  // 肌肤类型匹配
  if (product.suitableSkinTypes && product.suitableSkinTypes.includes(user.skinType)) {
    score += 30
  }
  
  // 关注点匹配
  if (product.targetConcerns && user.skinConcerns) {
    const matchingConcerns = product.targetConcerns.filter(concern => 
      user.skinConcerns.includes(concern)
    )
    score += matchingConcerns.length * 20
  }
  
  // 评分加成
  if (product.rating) {
    score += product.rating * 5
  }
  
  // 价格适中加成（假设用户偏好中等价位）
  if (product.price && product.price >= 50 && product.price <= 300) {
    score += 10
  }
  
  return Math.min(score, 100) // 最高100分
}