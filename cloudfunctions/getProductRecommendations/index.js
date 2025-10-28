// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const { OPENID } = wxContext
    const { 
      skinType, 
      skinConcerns = [], 
      ageRange, 
      budget, 
      category,
      limit = 10,
      page = 1 
    } = event
    
    console.log('产品推荐请求参数:', { skinType, skinConcerns, ageRange, budget, category, limit, page })
    
    // 构建查询条件
    let queryConditions = {}
    
    // 根据产品类别筛选
    if (category && category !== 'all') {
      queryConditions.category = category
    }
    
    // 根据预算筛选
    if (budget) {
      if (budget === 'low') {
        queryConditions.price = db.command.lte(100)
      } else if (budget === 'medium') {
        queryConditions.price = db.command.and([
          db.command.gt(100),
          db.command.lte(300)
        ])
      } else if (budget === 'high') {
        queryConditions.price = db.command.gt(300)
      }
    }
    
    // 查询产品
    let productsQuery = db.collection('products')
    
    if (Object.keys(queryConditions).length > 0) {
      productsQuery = productsQuery.where(queryConditions)
    }
    
    // 分页查询
    const skip = (page - 1) * limit
    const productsResult = await productsQuery
      .skip(skip)
      .limit(limit)
      .get()
    
    let products = productsResult.data
    
    // 如果没有找到产品，返回默认推荐
    if (products.length === 0) {
      const defaultResult = await db.collection('products')
        .orderBy('rating', 'desc')
        .limit(limit)
        .get()
      products = defaultResult.data
    }
    
    // 根据用户肌肤类型和关注点进行智能推荐排序
    if (skinType || skinConcerns.length > 0) {
      products = products.map(product => {
        let score = product.rating || 4.0 // 基础评分
        
        // 根据肌肤类型匹配度加分
        if (skinType && product.suitableSkinTypes && product.suitableSkinTypes.includes(skinType)) {
          score += 1.0
        }
        
        // 根据肌肤关注点匹配度加分
        if (skinConcerns.length > 0 && product.targetConcerns) {
          const matchingConcerns = skinConcerns.filter(concern => 
            product.targetConcerns.includes(concern)
          )
          score += matchingConcerns.length * 0.5
        }
        
        // 根据年龄段匹配度加分
        if (ageRange && product.ageRange && product.ageRange.includes(ageRange)) {
          score += 0.5
        }
        
        return {
          ...product,
          recommendScore: score
        }
      })
      
      // 按推荐分数排序
      products.sort((a, b) => b.recommendScore - a.recommendScore)
    }
    
    // 获取总数（用于分页）
    const totalResult = await db.collection('products').count()
    const total = totalResult.total
    
    // 为每个产品添加推荐理由
    const recommendedProducts = products.map(product => {
      const reasons = []
      
      if (skinType && product.suitableSkinTypes && product.suitableSkinTypes.includes(skinType)) {
        reasons.push(`适合${skinType}肌肤`)
      }
      
      if (skinConcerns.length > 0 && product.targetConcerns) {
        const matchingConcerns = skinConcerns.filter(concern => 
          product.targetConcerns.includes(concern)
        )
        if (matchingConcerns.length > 0) {
          reasons.push(`针对${matchingConcerns.join('、')}问题`)
        }
      }
      
      if (product.rating >= 4.5) {
        reasons.push('高评分产品')
      }
      
      if (product.salesVolume >= 1000) {
        reasons.push('热销产品')
      }
      
      if (reasons.length === 0) {
        reasons.push('优质推荐')
      }
      
      return {
        ...product,
        recommendReasons: reasons
      }
    })
    
    // 记录推荐日志（可选）
    try {
      await db.collection('recommendation_logs').add({
        data: {
          userId: OPENID,
          requestParams: {
            skinType,
            skinConcerns,
            ageRange,
            budget,
            category
          },
          resultCount: recommendedProducts.length,
          createTime: new Date()
        }
      })
    } catch (logError) {
      console.warn('记录推荐日志失败:', logError)
    }
    
    return {
      success: true,
      data: {
        products: recommendedProducts,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: Math.ceil(total / limit)
        },
        filters: {
          skinType,
          skinConcerns,
          ageRange,
          budget,
          category
        }
      },
      message: '获取产品推荐成功'
    }
    
  } catch (error) {
    console.error('获取产品推荐失败:', error)
    return {
      success: false,
      error: error.message,
      message: '获取产品推荐失败，请重试'
    }
  }
}