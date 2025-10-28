// 产品搜索云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('productsSearch 云函数调用开始', event)
    
    // 参数验证
    const { 
      keyword = '',
      category = '',
      brand = '',
      skinType = '',
      skinConcerns = [],
      priceRange = {},
      sortBy = 'relevance', // relevance, price_asc, price_desc, rating, newest
      page = 1,
      limit = 20
    } = event
    
    // 构建查询条件
    let whereCondition = {
      isActive: true
    }
    
    // 关键词搜索（产品名称、品牌、描述、成分）
    if (keyword && keyword.trim()) {
      const keywordTrim = keyword.trim()
      whereCondition = _.and([
        whereCondition,
        _.or([
          { name: db.RegExp({ regexp: keywordTrim, options: 'i' }) },
          { brand: db.RegExp({ regexp: keywordTrim, options: 'i' }) },
          { description: db.RegExp({ regexp: keywordTrim, options: 'i' }) },
          { 'ingredients.name': db.RegExp({ regexp: keywordTrim, options: 'i' }) },
          { 'ingredients.englishName': db.RegExp({ regexp: keywordTrim, options: 'i' }) },
          { tags: db.RegExp({ regexp: keywordTrim, options: 'i' }) }
        ])
      ])
    }
    
    // 分类筛选
    if (category) {
      whereCondition.category = category
    }
    
    // 品牌筛选
    if (brand) {
      whereCondition.brand = brand
    }
    
    // 肌肤类型筛选
    if (skinType) {
      whereCondition.suitableSkinTypes = _.in([skinType])
    }
    
    // 肌肤关注点筛选
    if (skinConcerns && skinConcerns.length > 0) {
      whereCondition.skinConcerns = _.in(skinConcerns)
    }
    
    // 价格范围筛选
    if (priceRange.min !== undefined || priceRange.max !== undefined) {
      let priceCondition = {}
      if (priceRange.min !== undefined) {
        priceCondition['price.min'] = _.gte(priceRange.min)
      }
      if (priceRange.max !== undefined) {
        priceCondition['price.max'] = _.lte(priceRange.max)
      }
      whereCondition = _.and([whereCondition, priceCondition])
    }
    
    // 构建排序条件
    let orderBy = 'updatedDate'
    let orderDirection = 'desc'
    
    switch (sortBy) {
      case 'price_asc':
        orderBy = 'price.min'
        orderDirection = 'asc'
        break
      case 'price_desc':
        orderBy = 'price.max'
        orderDirection = 'desc'
        break
      case 'rating':
        orderBy = 'ratings.average'
        orderDirection = 'desc'
        break
      case 'newest':
        orderBy = 'createdDate'
        orderDirection = 'desc'
        break
      case 'relevance':
      default:
        // 相关性排序，如果有关键词则按更新时间，否则按评分
        if (keyword && keyword.trim()) {
          orderBy = 'updatedDate'
          orderDirection = 'desc'
        } else {
          orderBy = 'ratings.average'
          orderDirection = 'desc'
        }
        break
    }
    
    // 计算跳过的记录数
    const skip = (page - 1) * limit
    
    // 执行搜索查询
    const searchResult = await db.collection('products')
      .where(whereCondition)
      .orderBy(orderBy, orderDirection)
      .skip(skip)
      .limit(limit)
      .get()
    
    // 获取总数（用于分页）
    const countResult = await db.collection('products')
      .where(whereCondition)
      .count()
    
    // 处理搜索结果
    const products = searchResult.data.map(product => {
      // 计算相关性得分（如果有关键词搜索）
      let relevanceScore = 0
      if (keyword && keyword.trim()) {
        relevanceScore = calculateRelevanceScore(product, keyword.trim())
      }
      
      // 计算匹配标签
      const matchTags = []
      if (skinType && product.suitableSkinTypes && product.suitableSkinTypes.includes(skinType)) {
        matchTags.push(`适合${skinType}肌`)
      }
      if (skinConcerns && skinConcerns.length > 0) {
        const matchingConcerns = product.skinConcerns.filter(concern => skinConcerns.includes(concern))
        matchTags.push(...matchingConcerns.map(concern => `针对${concern}`))
      }
      
      return {
        ...product,
        relevanceScore,
        matchTags,
        // 高亮关键词（简单实现）
        highlightedName: keyword ? highlightKeyword(product.name, keyword) : product.name,
        highlightedDescription: keyword ? highlightKeyword(product.description, keyword) : product.description
      }
    })
    
    // 如果是相关性排序且有关键词，重新按相关性得分排序
    if (sortBy === 'relevance' && keyword && keyword.trim()) {
      products.sort((a, b) => b.relevanceScore - a.relevanceScore)
    }
    
    // 获取搜索建议（相关品牌、分类等）
    const suggestions = await getSearchSuggestions(keyword, category, brand)
    
    console.log('productsSearch 搜索完成', {
      keyword,
      category,
      brand,
      total: countResult.total,
      returned: products.length,
      page,
      limit
    })
    
    return {
      code: 0,
      message: 'success',
      data: {
        products: products,
        pagination: {
          page: page,
          limit: limit,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit),
          hasMore: skip + products.length < countResult.total
        },
        searchInfo: {
          keyword,
          category,
          brand,
          skinType,
          skinConcerns,
          priceRange,
          sortBy,
          hasResults: products.length > 0
        },
        suggestions: suggestions
      }
    }
    
  } catch (error) {
    console.error('productsSearch 云函数执行失败:', error)
    return {
      code: -1,
      message: error.message || '产品搜索失败',
      data: null
    }
  }
}

// 计算相关性得分
function calculateRelevanceScore(product, keyword) {
  let score = 0
  const keywordLower = keyword.toLowerCase()
  
  // 产品名称匹配（权重最高）
  if (product.name && product.name.toLowerCase().includes(keywordLower)) {
    score += 50
    // 完全匹配加分
    if (product.name.toLowerCase() === keywordLower) {
      score += 30
    }
  }
  
  // 品牌匹配
  if (product.brand && product.brand.toLowerCase().includes(keywordLower)) {
    score += 30
  }
  
  // 描述匹配
  if (product.description && product.description.toLowerCase().includes(keywordLower)) {
    score += 20
  }
  
  // 成分匹配
  if (product.ingredients) {
    product.ingredients.forEach(ingredient => {
      if (ingredient.name && ingredient.name.toLowerCase().includes(keywordLower)) {
        score += 15
      }
      if (ingredient.englishName && ingredient.englishName.toLowerCase().includes(keywordLower)) {
        score += 15
      }
    })
  }
  
  // 标签匹配
  if (product.tags) {
    product.tags.forEach(tag => {
      if (tag.toLowerCase().includes(keywordLower)) {
        score += 10
      }
    })
  }
  
  // 评分加成
  if (product.ratings && product.ratings.average) {
    score += product.ratings.average * 2
  }
  
  return score
}

// 高亮关键词
function highlightKeyword(text, keyword) {
  if (!text || !keyword) return text
  
  const regex = new RegExp(`(${keyword})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

// 获取搜索建议
async function getSearchSuggestions(keyword, category, brand) {
  try {
    const suggestions = {
      brands: [],
      categories: [],
      relatedKeywords: []
    }
    
    // 获取热门品牌
    const brandsResult = await db.collection('products')
      .where({ isActive: true })
      .field({ brand: true })
      .get()
    
    const brandCounts = {}
    brandsResult.data.forEach(product => {
      if (product.brand) {
        brandCounts[product.brand] = (brandCounts[product.brand] || 0) + 1
      }
    })
    
    suggestions.brands = Object.entries(brandCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([brand, count]) => ({ name: brand, count }))
    
    // 获取热门分类
    const categoriesResult = await db.collection('products')
      .where({ isActive: true })
      .field({ category: true })
      .get()
    
    const categoryCounts = {}
    categoriesResult.data.forEach(product => {
      if (product.category) {
        categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1
      }
    })
    
    suggestions.categories = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([category, count]) => ({ name: category, count }))
    
    // 相关关键词（基于标签）
    if (keyword) {
      const tagsResult = await db.collection('products')
        .where({
          isActive: true,
          tags: db.RegExp({ regexp: keyword, options: 'i' })
        })
        .field({ tags: true })
        .get()
      
      const relatedTags = new Set()
      tagsResult.data.forEach(product => {
        if (product.tags) {
          product.tags.forEach(tag => {
            if (tag.toLowerCase().includes(keyword.toLowerCase()) && tag !== keyword) {
              relatedTags.add(tag)
            }
          })
        }
      })
      
      suggestions.relatedKeywords = Array.from(relatedTags).slice(0, 5)
    }
    
    return suggestions
    
  } catch (error) {
    console.error('获取搜索建议失败:', error)
    return {
      brands: [],
      categories: [],
      relatedKeywords: []
    }
  }
}