// utils/ingredientAggregator.js
// 成分聚合器 - 从产品数据中提取和聚合成分信息

/**
 * 成分聚合器类
 * 负责从产品数据中提取成分信息，生成统一的成分索引
 */
class IngredientAggregator {
  constructor() {
    this.ingredientMap = new Map(); // 成分映射表
    this.aliasMap = new Map(); // 别名映射表
    this.productMap = new Map(); // 产品映射表
  }

  /**
   * 初始化别名映射
   */
  initializeAliasMap() {
    // 常见成分别名映射
    const aliases = {
      '透明质酸': ['玻尿酸', '透明质酸钠', 'Hyaluronic Acid', 'Sodium Hyaluronate'],
      '烟酰胺': ['维生素B3', 'Niacinamide', 'Nicotinamide'],
      '水杨酸': ['BHA', 'Salicylic Acid', 'β-羟基酸'],
      '维生素C': ['抗坏血酸', 'Vitamin C', 'Ascorbic Acid', 'L-抗坏血酸'],
      '视黄醇': ['维生素A', 'Retinol', 'Vitamin A'],
      '神经酰胺': ['分子钉', 'Ceramide'],
      '甘油': ['丙三醇', 'Glycerin', 'Glycerol'],
      '角鲨烷': ['角鲨烯', 'Squalane', 'Squalene'],
      '泛醇': ['维生素B5', 'Panthenol', 'Pro-Vitamin B5'],
      '凝血酸': ['氨甲环酸', 'Tranexamic Acid'],
      '光甘草定': ['甘草提取物', 'Glabridin', 'Licorice Extract']
    };

    // 构建别名映射表
    Object.entries(aliases).forEach(([standard, aliasList]) => {
      aliasList.forEach(alias => {
        this.aliasMap.set(alias.toLowerCase(), standard);
      });
      // 标准名称也映射到自己
      this.aliasMap.set(standard.toLowerCase(), standard);
    });
  }

  /**
   * 标准化成分名称
   * @param {string} name - 原始成分名称
   * @returns {string} 标准化后的成分名称
   */
  normalizeIngredientName(name) {
    if (!name) return '';
    
    const lowerName = name.toLowerCase().trim();
    return this.aliasMap.get(lowerName) || name.trim();
  }

  /**
   * 生成成分ID
   * @param {string} name - 成分名称
   * @returns {string} 成分ID
   */
  generateIngredientId(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * 确定成分类别
   * @param {string} name - 成分名称
   * @param {string} func - 成分功能
   * @returns {string} 成分类别
   */
  determineCategory(name, func) {
    const activeIngredients = [
      '透明质酸', '烟酰胺', '水杨酸', '维生素C', '视黄醇', 
      '光甘草定', '凝血酸', '山参提取物', '胶原蛋白肽'
    ];
    
    const preservatives = [
      '苯氧乙醇', '甲基异噻唑啉酮', '苯甲酸钠', '山梨酸钾'
    ];
    
    const surfactants = [
      '椰油酰甘氨酸钾', '氨基酸表活', '月桂醇聚醚硫酸酯钠'
    ];
    
    const emulsifiers = [
      '聚甘油-3甲基葡糖二硬脂酸酯', '鲸蜡硬脂醇', '甘油硬脂酸酯'
    ];

    if (activeIngredients.some(ingredient => name.includes(ingredient))) {
      return 'active';
    } else if (preservatives.some(ingredient => name.includes(ingredient))) {
      return 'preservative';
    } else if (surfactants.some(ingredient => name.includes(ingredient))) {
      return 'surfactant';
    } else if (emulsifiers.some(ingredient => name.includes(ingredient))) {
      return 'emulsifier';
    }
    
    return 'active'; // 默认为活性成分
  }

  /**
   * 确定功效类型
   * @param {string} func - 成分功能
   * @param {string} description - 成分描述
   * @returns {string[]} 功效类型数组
   */
  determineEffectTypes(func, description) {
    const text = `${func || ''} ${description || ''}`.toLowerCase();
    const effects = [];

    if (text.includes('保湿') || text.includes('补水') || text.includes('锁水')) {
      effects.push('moisturizing');
    }
    if (text.includes('抗衰') || text.includes('抗老') || text.includes('紧致') || text.includes('细纹')) {
      effects.push('anti-aging');
    }
    if (text.includes('美白') || text.includes('提亮') || text.includes('淡斑')) {
      effects.push('whitening');
    }
    if (text.includes('祛痘') || text.includes('控油') || text.includes('收缩毛孔')) {
      effects.push('acne');
    }
    if (text.includes('敏感') || text.includes('舒缓') || text.includes('修护')) {
      effects.push('sensitive');
    }

    return effects.length > 0 ? effects : ['moisturizing'];
  }

  /**
   * 聚合单个产品的成分
   * @param {Object} product - 产品对象
   */
  aggregateProductIngredients(product) {
    if (!product || !product.ingredients) return;

    // 存储产品信息
    this.productMap.set(product.name || 'Unknown Product', {
      name: product.name,
      brand: product.brand,
      category: product.category,
      imageUrl: product.imageUrl,
      price: product.price
    });

    // 处理成分列表
    product.ingredients.forEach((ingredient, index) => {
      const standardName = this.normalizeIngredientName(ingredient.name);
      const ingredientId = this.generateIngredientId(standardName);

      if (this.ingredientMap.has(ingredientId)) {
        // 更新现有成分
        const existing = this.ingredientMap.get(ingredientId);
        
        // 更新浓度范围
        if (ingredient.concentration) {
          const concentration = parseFloat(ingredient.concentration.replace('%', ''));
          if (!isNaN(concentration)) {
            existing.concentrationRange.min = Math.min(existing.concentrationRange.min, concentration);
            existing.concentrationRange.max = Math.max(existing.concentrationRange.max, concentration);
          }
        }

        // 合并功效
        const newEffects = this.determineEffectTypes(ingredient.function, ingredient.description);
        newEffects.forEach(effect => {
          if (!existing.effects.includes(effect)) {
            existing.effects.push(effect);
          }
        });

        // 添加关联产品
        if (!existing.relatedProducts.some(p => p.name === product.name)) {
          existing.relatedProducts.push({
            name: product.name,
            brand: product.brand,
            category: product.category,
            imageUrl: product.imageUrl,
            concentration: ingredient.concentration,
            function: ingredient.function
          });
        }

        // 更新受欢迎程度
        existing.popularity = existing.relatedProducts.length;

      } else {
        // 创建新成分
        const concentration = ingredient.concentration ? 
          parseFloat(ingredient.concentration.replace('%', '')) : 0;

        const newIngredient = {
          id: ingredientId,
          name: standardName,
          englishName: ingredient.englishName || '',
          safetyLevel: ingredient.safetyLevel || 'safe',
          safetyScore: this.calculateSafetyScore(ingredient.safetyLevel),
          category: this.determineCategory(standardName, ingredient.function),
          effects: this.determineEffectTypes(ingredient.function, ingredient.description),
          description: ingredient.description || `${standardName}是一种护肤成分`,
          usage: this.generateUsageInfo(ingredient.function),
          precautions: this.generatePrecautions(ingredient.safetyLevel, standardName),
          concentrationRange: {
            min: isNaN(concentration) ? 0 : concentration,
            max: isNaN(concentration) ? 0 : concentration
          },
          pH: this.estimatePH(standardName),
          popularity: 1,
          relatedProducts: [{
            name: product.name,
            brand: product.brand,
            category: product.category,
            imageUrl: product.imageUrl,
            concentration: ingredient.concentration,
            function: ingredient.function
          }]
        };

        this.ingredientMap.set(ingredientId, newIngredient);
      }
    });
  }

  /**
   * 计算安全评分
   * @param {string} safetyLevel - 安全等级
   * @returns {number} 安全评分
   */
  calculateSafetyScore(safetyLevel) {
    switch (safetyLevel) {
      case 'safe': return 9.0;
      case 'caution': return 7.0;
      case 'danger': return 4.0;
      default: return 8.0;
    }
  }

  /**
   * 生成使用建议
   * @param {string} func - 成分功能
   * @returns {string} 使用建议
   */
  generateUsageInfo(func) {
    if (!func) return '请遵循产品说明使用';
    
    if (func.includes('美白') || func.includes('提亮')) {
      return '建议晚间使用，使用后需要做好防晒';
    } else if (func.includes('去角质') || func.includes('祛痘')) {
      return '建议从低浓度开始，逐步建立耐受性';
    } else if (func.includes('保湿')) {
      return '适用于所有肌肤类型，建议在爽肤水后使用';
    }
    
    return '请根据产品说明正确使用';
  }

  /**
   * 生成注意事项
   * @param {string} safetyLevel - 安全等级
   * @param {string} name - 成分名称
   * @returns {string} 注意事项
   */
  generatePrecautions(safetyLevel, name) {
    if (safetyLevel === 'danger') {
      return '该成分存在一定风险，敏感肌肤慎用，建议咨询专业人士';
    } else if (safetyLevel === 'caution') {
      return '初次使用建议先做过敏测试，如有不适请停止使用';
    } else if (name.includes('酸')) {
      return '酸类成分可能引起刺激，建议从低浓度开始使用';
    }
    
    return '一般情况下安全，敏感肌肤首次使用建议先做过敏测试';
  }

  /**
   * 估算pH值
   * @param {string} name - 成分名称
   * @returns {string} pH范围
   */
  estimatePH(name) {
    if (name.includes('酸')) {
      return '3.0-5.0';
    } else if (name.includes('透明质酸') || name.includes('烟酰胺')) {
      return '5.0-7.0';
    }
    return '6.0-7.0';
  }

  /**
   * 从产品数据聚合所有成分
   * @param {Array} products - 产品数组
   * @returns {Array} 聚合后的成分数组
   */
  aggregateFromProducts(products) {
    // 初始化别名映射
    this.initializeAliasMap();
    
    // 清空现有数据
    this.ingredientMap.clear();
    this.productMap.clear();

    // 聚合所有产品的成分
    products.forEach(product => {
      this.aggregateProductIngredients(product);
    });

    // 转换为数组并排序
    const ingredients = Array.from(this.ingredientMap.values());
    
    // 按受欢迎程度排序
    ingredients.sort((a, b) => b.popularity - a.popularity);

    return ingredients;
  }

  /**
   * 获取成分统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const ingredients = Array.from(this.ingredientMap.values());
    
    return {
      totalIngredients: ingredients.length,
      safeCount: ingredients.filter(i => i.safetyLevel === 'safe').length,
      cautionCount: ingredients.filter(i => i.safetyLevel === 'caution').length,
      dangerCount: ingredients.filter(i => i.safetyLevel === 'danger').length,
      categoryStats: {
        active: ingredients.filter(i => i.category === 'active').length,
        preservative: ingredients.filter(i => i.category === 'preservative').length,
        surfactant: ingredients.filter(i => i.category === 'surfactant').length,
        emulsifier: ingredients.filter(i => i.category === 'emulsifier').length
      }
    };
  }
}

// 导出单例实例和类
const ingredientAggregator = new IngredientAggregator();

module.exports = {
  IngredientAggregator,
  aggregateFromProducts: ingredientAggregator.aggregateFromProducts.bind(ingredientAggregator),
  getStats: ingredientAggregator.getStats.bind(ingredientAggregator)
};