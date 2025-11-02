// 从用户个人列表移除产品云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('removeUserProduct 云函数调用开始', event)
    
    // 参数验证
    const { 
      userId,
      userProductId, // 用户产品记录ID
      removeType = 'soft' // soft: 软删除（标记为deleted），hard: 硬删除（物理删除）
    } = event
    
    if (!userId || !userProductId) {
      return {
        code: -1,
        message: '用户ID和产品记录ID不能为空',
        data: null
      }
    }
    
    // 权限验证：用户只能删除自己的产品
    if (userId !== wxContext.OPENID) {
      return {
        code: -1,
        message: '无权限删除其他用户的产品',
        data: null
      }
    }
    
    // 验证删除类型
    if (!['soft', 'hard'].includes(removeType)) {
      return {
        code: -1,
        message: '无效的删除类型',
        data: null
      }
    }
    
    // 查找要删除的产品记录
    const productResult = await db.collection('user_products')
      .where({
        _id: userProductId,
        userId: userId
      })
      .get()
    
    if (productResult.data.length === 0) {
      return {
        code: -1,
        message: '产品记录不存在或无权限删除',
        data: null
      }
    }
    
    const userProduct = productResult.data[0]
    
    // 检查产品是否已被删除
    if (userProduct.status === 'deleted') {
      return {
        code: -1,
        message: '产品已被删除',
        data: null
      }
    }
    
    let result
    
    if (removeType === 'soft') {
      // 软删除：标记为已删除状态
      result = await db.collection('user_products')
        .where({
          _id: userProductId,
          userId: userId
        })
        .update({
          data: {
            status: 'deleted',
            deletedAt: new Date(),
            updatedAt: new Date()
          }
        })
    } else {
      // 硬删除：物理删除记录
      result = await db.collection('user_products')
        .where({
          _id: userProductId,
          userId: userId
        })
        .remove()
    }
    
    if (result.stats.updated === 0 && result.stats.removed === 0) {
      return {
        code: -1,
        message: '删除失败，产品记录不存在',
        data: null
      }
    }
    
    // 更新用户产品统计
    await updateUserProductStats(userId)
    
    // 如果是从产品库添加的产品，更新产品使用统计
    if (userProduct.productId) {
      await updateProductUsageStats(userProduct.productId)
    }
    
    // 记录删除日志
    await logProductRemoval(userId, userProduct, removeType)
    
    console.log('removeUserProduct 删除成功', {
      userId,
      userProductId,
      productName: userProduct.productName,
      removeType
    })
    
    return {
      code: 0,
      message: removeType === 'soft' ? '产品已移除' : '产品已永久删除',
      data: {
        userProductId: userProductId,
        productName: userProduct.productName,
        brand: userProduct.brand,
        removeType: removeType,
        removedAt: new Date()
      }
    }
    
  } catch (error) {
    console.error('removeUserProduct 云函数执行失败:', error)
    return {
      code: -1,
      message: error.message || '删除产品失败',
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
    // 统计有多少用户添加了这个产品（排除已删除的）
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

/**
 * 记录产品删除日志
 * @param {string} userId 用户ID
 * @param {Object} userProduct 用户产品信息
 * @param {string} removeType 删除类型
 */
async function logProductRemoval(userId, userProduct, removeType) {
  try {
    await db.collection('user_product_logs').add({
      data: {
        userId: userId,
        userProductId: userProduct._id,
        productId: userProduct.productId,
        productName: userProduct.productName,
        brand: userProduct.brand,
        action: 'remove',
        removeType: removeType,
        originalData: userProduct,
        timestamp: new Date()
      }
    })
  } catch (error) {
    console.error('记录产品删除日志失败:', error)
  }
}