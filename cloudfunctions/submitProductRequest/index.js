// 提交产品催更请求云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('submitProductRequest 云函数调用开始', event)
    
    // 参数验证
    const { 
      userId,
      productName, // 必填，产品名称
      brand, // 必填，品牌
      category, // 必填，分类
      description, // 可选，产品描述
      image, // 可选，产品图片（base64或云存储路径）
      purchaseChannel, // 可选，购买渠道
      price, // 可选，价格
      reason, // 可选，催更原因
      contactInfo // 可选，联系方式
    } = event
    
    // 必填参数验证
    if (!userId || !productName || !brand || !category) {
      return {
        code: -1,
        message: '用户ID、产品名称、品牌和分类不能为空',
        data: null
      }
    }
    
    // 权限验证：用户只能提交自己的请求
    if (userId !== wxContext.OPENID) {
      return {
        code: -1,
        message: '无权限提交其他用户的请求',
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
    
    // 检查是否已存在相同的催更请求
    const existingRequest = await db.collection('product_requests')
      .where({
        userId: userId,
        productName: productName,
        brand: brand,
        status: _.in(['pending', 'processing']) // 只检查待处理和处理中的请求
      })
      .get()
    
    if (existingRequest.data.length > 0) {
      return {
        code: -1,
        message: '您已提交过相同产品的催更请求，请等待处理',
        data: {
          existingRequest: existingRequest.data[0]
        }
      }
    }
    
    // 检查用户今日提交请求数量限制
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const todayRequests = await db.collection('product_requests')
      .where({
        userId: userId,
        createdAt: _.gte(today).and(_.lt(tomorrow))
      })
      .count()
    
    const dailyLimit = 5 // 每日最多提交5个请求
    if (todayRequests.total >= dailyLimit) {
      return {
        code: -1,
        message: `每日最多可提交${dailyLimit}个催更请求，请明日再试`,
        data: null
      }
    }
    
    // 获取用户信息
    const userResult = await db.collection('users')
      .where({
        _id: userId
      })
      .get()
    
    const userInfo = userResult.data.length > 0 ? userResult.data[0] : {}
    
    // 处理图片上传（如果是base64格式）
    let imageUrl = image
    if (image && image.startsWith('data:image/')) {
      try {
        imageUrl = await uploadImageToCloud(image, `product-request-${Date.now()}`)
      } catch (uploadError) {
        console.error('图片上传失败:', uploadError)
        // 图片上传失败不影响请求提交，继续使用原始数据
      }
    }
    
    // 构建催更请求数据
    const now = new Date()
    const requestData = {
      userId: userId,
      userInfo: {
        nickName: userInfo.nickName || '匿名用户',
        avatarUrl: userInfo.avatarUrl || ''
      },
      productName: productName,
      brand: brand,
      category: category,
      description: description || '',
      image: imageUrl || '',
      purchaseChannel: purchaseChannel || '',
      price: price || null,
      reason: reason || '',
      contactInfo: contactInfo || '',
      status: 'pending', // pending, processing, approved, rejected, completed
      priority: 'normal', // low, normal, high, urgent
      adminNotes: '', // 管理员备注
      processedBy: null, // 处理人员ID
      processedAt: null, // 处理时间
      createdAt: now,
      updatedAt: now
    }
    
    // 添加到数据库
    const result = await db.collection('product_requests').add({
      data: requestData
    })
    
    // 更新用户催更统计
    await updateUserRequestStats(userId)
    
    // 发送通知给管理员（可选）
    await notifyAdminsNewRequest(result._id, requestData)
    
    console.log('submitProductRequest 提交成功', {
      userId,
      requestId: result._id,
      productName,
      brand
    })
    
    return {
      code: 0,
      message: '催更请求提交成功，我们会尽快处理',
      data: {
        requestId: result._id,
        ...requestData,
        estimatedProcessTime: '1-3个工作日'
      }
    }
    
  } catch (error) {
    console.error('submitProductRequest 云函数执行失败:', error)
    return {
      code: -1,
      message: error.message || '提交催更请求失败',
      data: null
    }
  }
}

/**
 * 上传图片到云存储
 * @param {string} base64Data base64图片数据
 * @param {string} fileName 文件名
 * @returns {string} 云存储文件路径
 */
async function uploadImageToCloud(base64Data, fileName) {
  try {
    // 解析base64数据
    const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/)
    if (!matches) {
      throw new Error('无效的base64图片格式')
    }
    
    const imageType = matches[1]
    const imageBuffer = Buffer.from(matches[2], 'base64')
    
    // 上传到云存储
    const uploadResult = await cloud.uploadFile({
      cloudPath: `product-requests/${fileName}.${imageType}`,
      fileContent: imageBuffer
    })
    
    return uploadResult.fileID
    
  } catch (error) {
    console.error('上传图片到云存储失败:', error)
    throw error
  }
}

/**
 * 更新用户催更请求统计
 * @param {string} userId 用户ID
 */
async function updateUserRequestStats(userId) {
  try {
    const stats = await db.collection('product_requests')
      .where({
        userId: userId
      })
      .get()
    
    const requestStats = {
      total: stats.data.length,
      pending: stats.data.filter(r => r.status === 'pending').length,
      processing: stats.data.filter(r => r.status === 'processing').length,
      approved: stats.data.filter(r => r.status === 'approved').length,
      rejected: stats.data.filter(r => r.status === 'rejected').length,
      completed: stats.data.filter(r => r.status === 'completed').length
    }
    
    // 更新用户表中的请求统计
    await db.collection('users')
      .where({
        _id: userId
      })
      .update({
        data: {
          requestStats: requestStats,
          updatedAt: new Date()
        }
      })
    
  } catch (error) {
    console.error('更新用户催更统计失败:', error)
  }
}

/**
 * 通知管理员有新的催更请求
 * @param {string} requestId 请求ID
 * @param {Object} requestData 请求数据
 */
async function notifyAdminsNewRequest(requestId, requestData) {
  try {
    // 获取管理员列表
    const admins = await db.collection('users')
      .where({
        role: 'admin'
      })
      .get()
    
    // 为每个管理员创建通知
    const notifications = admins.data.map(admin => ({
      userId: admin._id,
      type: 'product_request',
      title: '新的产品催更请求',
      content: `用户请求添加产品：${requestData.brand} ${requestData.productName}`,
      data: {
        requestId: requestId,
        productName: requestData.productName,
        brand: requestData.brand
      },
      isRead: false,
      createdAt: new Date()
    }))
    
    if (notifications.length > 0) {
      await db.collection('notifications').add({
        data: notifications
      })
    }
    
  } catch (error) {
    console.error('通知管理员失败:', error)
  }
}