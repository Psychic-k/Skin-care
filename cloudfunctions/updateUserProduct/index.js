// 更新用户个人产品信息云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('updateUserProduct 云函数调用开始', event)
    
    // 参数验证
    const { 
      userProductId, // 必填，用户产品记录ID
      updateData // 必填，要更新的数据
    } = event

    // 统一鉴权：使用 OPENID 作为用户标识
    const userId = wxContext.OPENID
    
    if (!userProductId || !updateData) {
      return {
        code: -1,
        message: '用户ID、产品记录ID和更新数据不能为空',
        data: null
      }
    }
    
    // 权限验证：用户只能更新自己的产品
    if (userId !== wxContext.OPENID) {
      return {
        code: -1,
        message: '无权限更新其他用户的产品',
        data: null
      }
    }
    
    // 查找要更新的产品记录
    const productResult = await db.collection('user_products')
      .where({
        _id: userProductId,
        userId: userId
      })
      .get()
    
    if (productResult.data.length === 0) {
      return {
        code: -1,
        message: '产品记录不存在或无权限更新',
        data: null
      }
    }
    
    const currentProduct = productResult.data[0]
    
    // 检查产品是否已被删除
    if (currentProduct.status === 'deleted') {
      return {
        code: -1,
        message: '无法更新已删除的产品',
        data: null
      }
    }
    
    // 验证更新数据的有效性
    const validationResult = validateUpdateData(updateData, currentProduct)
    if (!validationResult.valid) {
      return {
        code: -1,
        message: validationResult.message,
        data: null
      }
    }
    
    // 构建更新数据
    const now = new Date()
    const finalUpdateData = {
      ...updateData,
      updatedAt: now
    }
    
    // 如果更新了容量信息，重新计算状态
    if (updateData.remainingCapacity !== undefined || updateData.totalCapacity !== undefined) {
      const newRemainingCapacity = updateData.remainingCapacity !== undefined 
        ? updateData.remainingCapacity 
        : currentProduct.remainingCapacity
      
      const newTotalCapacity = updateData.totalCapacity !== undefined 
        ? updateData.totalCapacity 
        : currentProduct.totalCapacity
      
      // 自动更新状态
      if (newRemainingCapacity <= 0) {
        finalUpdateData.status = 'used_up'
        finalUpdateData.usedUpDate = now
      } else if (currentProduct.status === 'used_up' && newRemainingCapacity > 0) {
        finalUpdateData.status = 'active'
        finalUpdateData.usedUpDate = null
      }
    }
    
    // 如果更新了过期日期，检查是否过期
    if (updateData.expiryDate !== undefined) {
      const expiryDate = new Date(updateData.expiryDate)
      if (expiryDate < now) {
        finalUpdateData.status = 'expired'
      } else if (currentProduct.status === 'expired') {
        finalUpdateData.status = 'active'
      }
    }
    
    // 记录使用历史（如果更新了剩余容量）
    if (updateData.remainingCapacity !== undefined && 
        updateData.remainingCapacity !== currentProduct.remainingCapacity) {
      
      const usageRecord = {
        date: now,
        previousCapacity: currentProduct.remainingCapacity || 0,
        newCapacity: updateData.remainingCapacity,
        usedAmount: (currentProduct.remainingCapacity || 0) - updateData.remainingCapacity,
        notes: updateData.usageNotes || ''
      }
      
      const currentHistory = currentProduct.usageHistory || []
      finalUpdateData.usageHistory = [...currentHistory, usageRecord]
    }
    
    // 执行更新
    const result = await db.collection('user_products')
      .where({
        _id: userProductId,
        userId: userId
      })
      .update({
        data: finalUpdateData
      })
    
    if (result.stats.updated === 0) {
      return {
        code: -1,
        message: '更新失败，产品记录不存在',
        data: null
      }
    }
    
    // 获取更新后的产品信息
    const updatedProductResult = await db.collection('user_products')
      .where({
        _id: userProductId
      })
      .get()
    
    const updatedProduct = updatedProductResult.data[0]
    
    // 更新用户产品统计
    await updateUserProductStats(userId)
    
    // 记录更新日志
    await logProductUpdate(userId, userProductId, currentProduct, finalUpdateData)
    
    console.log('updateUserProduct 更新成功', {
      userId,
      userProductId,
      productName: updatedProduct.productName,
      updatedFields: Object.keys(updateData)
    })
    
    return {
      code: 0,
      message: '产品信息更新成功',
      data: {
        ...updatedProduct,
        // 计算使用进度
        usageProgress: calculateUsageProgress(updatedProduct),
        // 计算剩余天数
        remainingDays: calculateRemainingDays(updatedProduct),
        // 是否即将用完
        isRunningOut: isProductRunningOut(updatedProduct),
        // 是否已过期
        isExpired: isProductExpired(updatedProduct)
      }
    }
    
  } catch (error) {
    console.error('updateUserProduct 云函数执行失败:', error)
    return {
      code: -1,
      message: error.message || '更新产品信息失败',
      data: null
    }
  }
}

/**
 * 验证更新数据的有效性
 * @param {Object} updateData 更新数据
 * @param {Object} currentProduct 当前产品数据
 * @returns {Object} 验证结果
 */
function validateUpdateData(updateData, currentProduct) {
  // 不允许更新的字段
  const forbiddenFields = ['_id', 'userId', 'createdAt']
  for (const field of forbiddenFields) {
    if (updateData.hasOwnProperty(field)) {
      return {
        valid: false,
        message: `不允许更新字段: ${field}`
      }
    }
  }
  
  // 验证分类
  if (updateData.category) {
    const validCategories = ['cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen', 'mask', 'other']
    if (!validCategories.includes(updateData.category)) {
      return {
        valid: false,
        message: '无效的产品分类'
      }
    }
  }
  
  // 验证状态
  if (updateData.status) {
    const validStatuses = ['active', 'used_up', 'expired', 'deleted']
    if (!validStatuses.includes(updateData.status)) {
      return {
        valid: false,
        message: '无效的产品状态'
      }
    }
  }
  
  // 验证容量数据
  if (updateData.totalCapacity !== undefined && updateData.totalCapacity < 0) {
    return {
      valid: false,
      message: '总容量不能为负数'
    }
  }
  
  if (updateData.remainingCapacity !== undefined && updateData.remainingCapacity < 0) {
    return {
      valid: false,
      message: '剩余容量不能为负数'
    }
  }
  
  if (updateData.dailyUsage !== undefined && updateData.dailyUsage < 0) {
    return {
      valid: false,
      message: '每日用量不能为负数'
    }
  }
  
  // 验证日期格式
  const dateFields = ['purchaseDate', 'expiryDate']
  for (const field of dateFields) {
    if (updateData[field] && isNaN(new Date(updateData[field]).getTime())) {
      return {
        valid: false,
        message: `无效的日期格式: ${field}`
      }
    }
  }
  
  return { valid: true }
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
 * 记录产品更新日志
 * @param {string} userId 用户ID
 * @param {string} userProductId 用户产品ID
 * @param {Object} beforeData 更新前数据
 * @param {Object} updateData 更新数据
 */
async function logProductUpdate(userId, userProductId, beforeData, updateData) {
  try {
    await db.collection('user_product_logs').add({
      data: {
        userId: userId,
        userProductId: userProductId,
        productId: beforeData.productId,
        productName: beforeData.productName,
        brand: beforeData.brand,
        action: 'update',
        beforeData: beforeData,
        updateData: updateData,
        timestamp: new Date()
      }
    })
  } catch (error) {
    console.error('记录产品更新日志失败:', error)
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