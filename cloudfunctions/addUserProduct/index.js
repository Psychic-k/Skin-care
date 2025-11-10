// 添加产品到用户个人列表云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('addUserProduct 云函数调用开始', event)
    
    // 参数验证
    const { 
      productId, // 可选，如果是从产品库选择的产品
      productName, // 必填，产品名称
      brand, // 必填，品牌
      category, // 必填，分类
      image, // 可选，产品图片
      purchaseDate, // 可选，购买日期
      expiryDate, // 可选，过期日期
      totalCapacity, // 可选，总容量
      remainingCapacity, // 可选，剩余容量
      dailyUsage, // 可选，每日用量
      price, // 可选，购买价格
      purchaseChannel, // 可选，购买渠道
      notes, // 可选，备注
      tags // 可选，标签数组
    } = event

    // 统一鉴权：强制使用 OPENID，不信任前端 userId
    const userId = wxContext.OPENID

    // 必填参数验证
    if (!productName || !brand || !category) {
      return {
        code: -1,
        message: '用户ID、产品名称、品牌和分类不能为空',
        data: null
      }
    }
    
    // 权限验证：用户只能添加到自己的列表
    if (userId !== wxContext.OPENID) {
      return {
        code: -1,
        message: '无权限添加产品到其他用户列表',
        data: null
      }
    }
    
    // 验证分类是否有效
    const validCategories = ['cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen', 'mask', 'other']
    if (!validCategories.includes(category)) {
      return {
        code: -1,
        message: '无效的产品分类',
        data: null
      }
    }
    
    // 检查是否已存在相同产品
    const existingProduct = await db.collection('user_products')
      .where({
        userId: userId,
        productName: productName,
        brand: brand,
        status: _.neq('deleted') // 排除已删除的产品
      })
      .get()
    
    if (existingProduct.data.length > 0) {
      return {
        code: -1,
        message: '该产品已存在于您的列表中',
        data: {
          existingProduct: existingProduct.data[0]
        }
      }
    }
    
    // 如果提供了productId，验证产品是否存在
    let productDetail = null
    if (productId) {
      const productResult = await db.collection('products')
        .where({
          _id: productId
        })
        .get()
      
      if (productResult.data.length === 0) {
        return {
          code: -1,
          message: '指定的产品不存在',
          data: null
        }
      }
      
      productDetail = productResult.data[0]
    }
    
    // 构建用户产品数据
    const now = new Date()
    const userProductData = {
      userId: userId,
      productId: productId || null,
      productName: productName,
      brand: brand,
      category: category,
      image: image || (productDetail ? productDetail.image : null),
      status: 'active', // active, used_up, expired, deleted
      addedDate: now,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      totalCapacity: totalCapacity || null,
      remainingCapacity: remainingCapacity || totalCapacity || null,
      dailyUsage: dailyUsage || null,
      price: price || null,
      purchaseChannel: purchaseChannel || null,
      notes: notes || '',
      tags: tags || [],
      usageHistory: [], // 使用历史记录
      createdAt: now,
      updatedAt: now
    }
    
    // 添加到数据库
    const result = await db.collection('user_products').add({
      data: userProductData
    })
    
    // 更新用户统计信息
    await updateUserProductStats(userId)
    
    // 如果是从产品库添加的，更新产品的使用统计
    if (productId) {
      await updateProductUsageStats(productId)
    }
    
    console.log('addUserProduct 添加成功', {
      userId,
      productId: result._id,
      productName,
      brand
    })
    
    return {
      code: 0,
      message: '产品添加成功',
      data: {
        _id: result._id,
        ...userProductData
      }
    }
    
  } catch (error) {
    console.error('addUserProduct 云函数执行失败:', error)
    return {
      code: -1,
      message: error.message || '添加产品失败',
      data: null
    }
  }
}

/**
 * 更新用户产品统计信息
 * @param {string} userId 用户ID
 */
async function updateUserProductStats(userId) {
  try {
    const stats = await db.collection('user_products')
      .where({
        userId: userId,
        status: _.neq('deleted')
      })
      .get()
    
    const productStats = {
      total: stats.data.length,
      active: stats.data.filter(p => p.status === 'active').length,
      usedUp: stats.data.filter(p => p.status === 'used_up').length,
      expired: stats.data.filter(p => p.status === 'expired').length
    }
    
    // 更新用户表中的产品统计
    await db.collection('users')
      .where({
        _id: userId
      })
      .update({
        data: {
          productStats: productStats,
          updatedAt: new Date()
        }
      })
    
  } catch (error) {
    console.error('更新用户产品统计失败:', error)
  }
}

/**
 * 更新产品使用统计
 * @param {string} productId 产品ID
 */
async function updateProductUsageStats(productId) {
  try {
    // 统计有多少用户添加了这个产品
    const userCount = await db.collection('user_products')
      .where({
        productId: productId,
        status: _.neq('deleted')
      })
      .count()
    
    // 更新产品表中的使用统计
    await db.collection('products')
      .where({
        _id: productId
      })
      .update({
        data: {
          userCount: userCount.total,
          updatedAt: new Date()
        }
      })
    
  } catch (error) {
    console.error('更新产品使用统计失败:', error)
  }
}