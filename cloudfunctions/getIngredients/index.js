// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 内置成分别名数据
const INGREDIENT_ALIASES = {
  "透明质酸": ["玻尿酸", "Hyaluronic Acid", "Sodium Hyaluronate"],
  "烟酰胺": ["维生素B3", "Niacinamide", "Nicotinamide"],
  "水杨酸": ["BHA", "Salicylic Acid", "β-羟基酸"],
  "果酸": ["AHA", "Alpha Hydroxy Acid", "甘醇酸", "乳酸"],
  "维生素C": ["抗坏血酸", "Vitamin C", "L-Ascorbic Acid", "维C"],
  "视黄醇": ["维生素A", "Retinol", "A醇"],
  "神经酰胺": ["分子钉", "Ceramide"],
  "胶原蛋白": ["Collagen"],
  "咖啡因": ["Caffeine"],
  "尿囊素": ["Allantoin"],
  "泛醇": ["维生素B5", "Panthenol", "Pro-Vitamin B5"],
  "角鲨烷": ["Squalane"],
  "甘油": ["Glycerin", "Glycerol"],
  "生育酚": ["维生素E", "Vitamin E", "Tocopherol"]
}

// 内置成分模板数据
const INGREDIENT_TEMPLATES = {
  "透明质酸": {
    englishName: "Hyaluronic Acid",
    category: "保湿剂",
    safetyLevel: "安全",
    effects: ["深层保湿", "锁水", "抗衰老"],
    description: "强效保湿成分，能够结合自身重量1000倍的水分，为肌肤提供深层持久的保湿效果。",
    usage: "适合所有肌肤类型，建议在爽肤水后使用",
    precautions: "无特殊注意事项，孕妇可用",
    concentrationRange: "0.1-2%",
    pH: "6.0-7.0"
  },
  "烟酰胺": {
    englishName: "Niacinamide",
    category: "功效成分",
    safetyLevel: "安全",
    effects: ["美白淡斑", "控油", "收缩毛孔", "抗炎"],
    description: "维生素B3的活性形式，具有多重护肤功效，能够改善肌肤质地和肤色不均。",
    usage: "建议晚间使用，可与其他成分叠加",
    precautions: "初次使用建议从低浓度开始",
    concentrationRange: "2-10%",
    pH: "5.0-7.0"
  },
  "水杨酸": {
    englishName: "Salicylic Acid",
    category: "去角质剂",
    safetyLevel: "需注意",
    effects: ["去角质", "疏通毛孔", "抗痘", "改善黑头"],
    description: "脂溶性β-羟基酸，能够深入毛孔清洁，有效改善痘痘和黑头问题。",
    usage: "建议晚间使用，需要防晒",
    precautions: "敏感肌慎用，孕妇避免使用",
    concentrationRange: "0.5-2%",
    pH: "3.0-4.0"
  },
  "维生素C": {
    englishName: "Vitamin C",
    category: "抗氧化剂",
    safetyLevel: "需注意",
    effects: ["抗氧化", "美白", "促进胶原蛋白合成", "淡化色斑"],
    description: "强效抗氧化成分，能够对抗自由基损伤，促进肌肤新陈代谢。",
    usage: "建议早晨使用，需要防晒",
    precautions: "光敏性成分，使用后需防晒",
    concentrationRange: "5-20%",
    pH: "3.0-4.0"
  }
}

// 成分聚合器类
class IngredientAggregator {
  constructor() {
    this.ingredientMap = new Map()
  }

  // 标准化成分名称
  normalizeIngredientName(name) {
    if (!name) return ''
    
    // 查找别名映射
    for (const [standard, aliases] of Object.entries(INGREDIENT_ALIASES)) {
      if (aliases.includes(name) || name === standard) {
        return standard
      }
    }
    
    return name.trim()
  }

  // 生成成分ID
  generateIngredientId(name) {
    return name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').toLowerCase()
  }

  // 聚合产品中的成分
  aggregateIngredients(products) {
    this.ingredientMap.clear()

    products.forEach(product => {
      if (!product.ingredients || !Array.isArray(product.ingredients)) return

      product.ingredients.forEach(ingredient => {
        const standardName = this.normalizeIngredientName(ingredient.name)
        if (!standardName) return

        const id = this.generateIngredientId(standardName)
        
        if (!this.ingredientMap.has(id)) {
          // 创建新的成分记录
          const template = INGREDIENT_TEMPLATES[standardName] || {}
          
          this.ingredientMap.set(id, {
            id,
            name: standardName,
            englishName: ingredient.englishName || template.englishName || '',
            category: template.category || '其他',
            safetyLevel: ingredient.safetyLevel || template.safetyLevel || '未知',
            safetyScore: this.getSafetyScore(ingredient.safetyLevel || template.safetyLevel),
            effects: template.effects || ingredient.function ? [ingredient.function] : [],
            description: template.description || ingredient.description || '',
            usage: template.usage || '',
            precautions: template.precautions || '',
            concentrationRange: template.concentrationRange || '',
            pH: template.pH || '',
            concentrations: [],
            popularity: 0,
            relatedProducts: []
          })
        }

        const aggregatedIngredient = this.ingredientMap.get(id)
        
        // 更新浓度信息
        if (ingredient.concentration) {
          aggregatedIngredient.concentrations.push(parseFloat(ingredient.concentration))
        }

        // 增加受欢迎程度
        aggregatedIngredient.popularity += 1

        // 添加关联产品
        const productInfo = {
          name: product.name,
          brand: product.brand,
          category: product.category,
          concentration: ingredient.concentration || '',
          function: ingredient.function || '',
          imageUrl: product.imageUrl || ''
        }
        
        aggregatedIngredient.relatedProducts.push(productInfo)
      })
    })

    // 计算平均浓度和浓度范围
    this.ingredientMap.forEach(ingredient => {
      if (ingredient.concentrations.length > 0) {
        const min = Math.min(...ingredient.concentrations)
        const max = Math.max(...ingredient.concentrations)
        const avg = ingredient.concentrations.reduce((a, b) => a + b, 0) / ingredient.concentrations.length
        
        ingredient.avgConcentration = avg.toFixed(2)
        ingredient.concentrationRange = ingredient.concentrationRange || `${min}%-${max}%`
      }
      
      // 清理临时数据
      delete ingredient.concentrations
    })

    return Array.from(this.ingredientMap.values())
  }

  // 获取安全等级分数
  getSafetyScore(safetyLevel) {
    const scoreMap = {
      '安全': 5,
      '较安全': 4,
      '一般': 3,
      '需注意': 2,
      '谨慎使用': 1,
      '未知': 0
    }
    return scoreMap[safetyLevel] || 0
  }

  // 搜索成分
  searchIngredients(ingredients, keyword) {
    if (!keyword) return ingredients
    
    const lowerKeyword = keyword.toLowerCase()
    return ingredients.filter(ingredient => 
      ingredient.name.toLowerCase().includes(lowerKeyword) ||
      ingredient.englishName.toLowerCase().includes(lowerKeyword) ||
      ingredient.effects.some(effect => effect.toLowerCase().includes(lowerKeyword)) ||
      ingredient.description.toLowerCase().includes(lowerKeyword)
    )
  }

  // 筛选成分
  filterIngredients(ingredients, filters) {
    let filtered = ingredients

    if (filters.safetyLevel && filters.safetyLevel.length > 0) {
      filtered = filtered.filter(ingredient => 
        filters.safetyLevel.includes(ingredient.safetyLevel)
      )
    }

    if (filters.category && filters.category.length > 0) {
      filtered = filtered.filter(ingredient => 
        filters.category.includes(ingredient.category)
      )
    }

    if (filters.effects && filters.effects.length > 0) {
      filtered = filtered.filter(ingredient => 
        ingredient.effects.some(effect => filters.effects.includes(effect))
      )
    }

    return filtered
  }

  // 排序成分
  sortIngredients(ingredients, sortBy, sortOrder = 'asc') {
    const sorted = [...ingredients]
    
    sorted.sort((a, b) => {
      let valueA, valueB
      
      switch (sortBy) {
        case 'name':
          valueA = a.name
          valueB = b.name
          break
        case 'safety':
          valueA = a.safetyScore
          valueB = b.safetyScore
          break
        case 'popularity':
          valueA = a.popularity
          valueB = b.popularity
          break
        default:
          return 0
      }
      
      if (typeof valueA === 'string') {
        return sortOrder === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA)
      } else {
        return sortOrder === 'asc' 
          ? valueA - valueB
          : valueB - valueA
      }
    })
    
    return sorted
  }
}

// 云函数主入口
exports.main = async (event, context) => {
  try {
    console.log('getIngredients 云函数开始执行', event)
    
    const { 
      page = 1, 
      pageSize = 20, 
      keyword = '', 
      filters = {}, 
      sortBy = 'name', 
      sortOrder = 'asc' 
    } = event

    // 获取所有产品数据
    console.log('开始查询产品数据')
    const productsResult = await db.collection('products').get()
    const products = productsResult.data
    
    console.log(`获取到 ${products.length} 个产品`)

    // 创建聚合器并处理数据
    const aggregator = new IngredientAggregator()
    let ingredients = aggregator.aggregateIngredients(products)
    
    console.log(`聚合得到 ${ingredients.length} 个成分`)

    // 搜索
    if (keyword) {
      ingredients = aggregator.searchIngredients(ingredients, keyword)
      console.log(`搜索后剩余 ${ingredients.length} 个成分`)
    }

    // 筛选
    if (Object.keys(filters).length > 0) {
      ingredients = aggregator.filterIngredients(ingredients, filters)
      console.log(`筛选后剩余 ${ingredients.length} 个成分`)
    }

    // 排序
    ingredients = aggregator.sortIngredients(ingredients, sortBy, sortOrder)

    // 分页
    const total = ingredients.length
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedIngredients = ingredients.slice(startIndex, endIndex)

    // 统计信息
    const stats = {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: endIndex < total
    }

    console.log('云函数执行完成', stats)

    return {
      success: true,
      data: paginatedIngredients,
      stats,
      message: '获取成分列表成功'
    }

  } catch (error) {
    console.error('getIngredients 云函数执行错误:', error)
    
    return {
      success: false,
      data: [],
      stats: { total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false },
      message: '获取成分列表失败: ' + error.message
    }
  }
}