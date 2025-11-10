// 处理产品催更请求云函数（管理员用）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('processProductRequest 云函数调用开始', event)
    
    // 参数验证
    const { 
      requestId, // 必填，请求ID
      action, // 必填，操作类型：approve, reject, complete, update_priority, add_note
      data // 可选，操作相关数据
    } = event

    // 统一鉴权：后台操作仅允许管理员，强制用 OPENID 识别操作者
    const adminUserId = wxContext.OPENID
    
    if (!requestId || !action) {
      return {
        code: -1,
        message: '管理员用户ID、请求ID和操作类型不能为空',
        data: null
      }
    }
    
    // 权限验证：检查是否为管理员
    const adminResult = await db.collection('users')
      .where({
        _id: adminUserId,
        role: 'admin'
      })
      .get()
    
    if (adminResult.data.length === 0) {
      return {
        code: -1,
        message: '无管理员权限',
        data: null
      }
    }
    
    const adminInfo = adminResult.data[0]
    
    // 查找要处理的请求
    const requestResult = await db.collection('product_requests')
      .where({
        _id: requestId
      })
      .get()
    
    if (requestResult.data.length === 0) {
      return {
        code: -1,
        message: '请求不存在',
        data: null
      }
    }
    
    const request = requestResult.data[0]
    
    // 根据操作类型处理请求
    let updateData = {}
    let resultMessage = ''
    let shouldCreateProduct = false
    
    switch (action) {
      case 'approve':
        // 批准请求
        if (request.status !== 'pending' && request.status !== 'processing') {
          return {
            code: -1,
            message: '只能批准待处理或处理中的请求',
            data: null
          }
        }
        
        updateData = {
          status: 'approved',
          processedBy: adminUserId,
          processedAt: new Date(),
          adminNotes: data?.notes || '',
          updatedAt: new Date()
        }
        
        resultMessage = '请求已批准'
        shouldCreateProduct = true
        break
        
      case 'reject':
        // 拒绝请求
        if (request.status !== 'pending' && request.status !== 'processing') {
          return {
            code: -1,
            message: '只能拒绝待处理或处理中的请求',
            data: null
          }
        }
        
        if (!data?.reason) {
          return {
            code: -1,
            message: '拒绝请求时必须提供拒绝原因',
            data: null
          }
        }
        
        updateData = {
          status: 'rejected',
          processedBy: adminUserId,
          processedAt: new Date(),
          adminNotes: data.reason,
          updatedAt: new Date()
        }
        
        resultMessage = '请求已拒绝'
        break
        
      case 'complete':
        // 完成请求（产品已添加到数据库）
        if (request.status !== 'approved') {
          return {
            code: -1,
            message: '只能完成已批准的请求',
            data: null
          }
        }
        
        updateData = {
          status: 'completed',
          completedAt: new Date(),
          adminNotes: request.adminNotes + (data?.notes ? `\n完成备注：${data.notes}` : ''),
          updatedAt: new Date()
        }
        
        resultMessage = '请求已完成'
        break
        
      case 'update_priority':
        // 更新优先级
        const validPriorities = ['low', 'normal', 'high', 'urgent']
        if (!data?.priority || !validPriorities.includes(data.priority)) {
          return {
            code: -1,
            message: '无效的优先级',
            data: null
          }
        }
        
        updateData = {
          priority: data.priority,
          adminNotes: request.adminNotes + `\n优先级更新为：${data.priority}`,
          updatedAt: new Date()
        }
        
        resultMessage = `优先级已更新为：${data.priority}`
        break
        
      case 'add_note':
        // 添加管理员备注
        if (!data?.note) {
          return {
            code: -1,
            message: '备注内容不能为空',
            data: null
          }
        }
        
        updateData = {
          adminNotes: request.adminNotes + `\n${new Date().toLocaleString()}：${data.note}`,
          updatedAt: new Date()
        }
        
        resultMessage = '备注已添加'
        break
        
      case 'start_processing':
        // 开始处理
        if (request.status !== 'pending') {
          return {
            code: -1,
            message: '只能开始处理待处理的请求',
            data: null
          }
        }
        
        updateData = {
          status: 'processing',
          processedBy: adminUserId,
          adminNotes: request.adminNotes + `\n开始处理时间：${new Date().toLocaleString()}`,
          updatedAt: new Date()
        }
        
        resultMessage = '已开始处理请求'
        break
        
      default:
        return {
          code: -1,
          message: '无效的操作类型',
          data: null
        }
    }
    
    // 更新请求状态
    const updateResult = await db.collection('product_requests')
      .where({
        _id: requestId
      })
      .update({
        data: updateData
      })
    
    if (updateResult.stats.updated === 0) {
      return {
        code: -1,
        message: '更新请求失败',
        data: null
      }
    }
    
    // 如果批准了请求，自动创建产品到产品库
    let newProduct = null
    if (shouldCreateProduct) {
      try {
        newProduct = await createProductFromRequest(request, adminUserId)
      } catch (createError) {
        console.error('自动创建产品失败:', createError)
        // 创建产品失败不影响请求处理，记录日志即可
      }
    }
    
    // 记录处理日志
    await logRequestProcessing(requestId, request, adminUserId, action, data)
    
    // 通知用户处理结果
    await notifyUserRequestProcessed(request.userId, request, action, updateData.adminNotes)
    
    // 获取更新后的请求信息
    const updatedRequestResult = await db.collection('product_requests')
      .where({
        _id: requestId
      })
      .get()
    
    const updatedRequest = updatedRequestResult.data[0]
    
    console.log('processProductRequest 处理成功', {
      adminUserId,
      requestId,
      action,
      productName: request.productName
    })
    
    return {
      code: 0,
      message: resultMessage,
      data: {
        request: updatedRequest,
        newProduct: newProduct,
        processorInfo: {
          nickName: adminInfo.nickName || '管理员',
          avatarUrl: adminInfo.avatarUrl || ''
        }
      }
    }
    
  } catch (error) {
    console.error('processProductRequest 云函数执行失败:', error)
    return {
      code: -1,
      message: error.message || '处理请求失败',
      data: null
    }
  }
}

/**
 * 从催更请求创建产品到产品库
 * @param {Object} request 催更请求数据
 * @param {string} adminUserId 管理员用户ID
 * @returns {Object} 创建的产品信息
 */
async function createProductFromRequest(request, adminUserId) {
  try {
    // 检查产品是否已存在
    const existingProduct = await db.collection('products')
      .where({
        name: request.productName,
        brand: request.brand
      })
      .get()
    
    if (existingProduct.data.length > 0) {
      return existingProduct.data[0]
    }
    
    // 创建新产品
    const productData = {
      name: request.productName,
      brand: request.brand,
      category: request.category,
      description: request.description || '',
      image: request.image || '',
      price: request.price || null,
      rating: 0,
      reviewCount: 0,
      userCount: 0,
      suitableSkinTypes: ['all'], // 默认适合所有肌肤类型
      targetConcerns: [],
      ingredients: [],
      usage: '',
      capacity: '',
      origin: 'user_request', // 标记来源为用户催更
      requestId: request._id,
      createdBy: adminUserId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const result = await db.collection('products').add({
      data: productData
    })
    
    return {
      _id: result._id,
      ...productData
    }
    
  } catch (error) {
    console.error('从催更请求创建产品失败:', error)
    throw error
  }
}

/**
 * 记录请求处理日志
 * @param {string} requestId 请求ID
 * @param {Object} request 请求数据
 * @param {string} adminUserId 管理员用户ID
 * @param {string} action 操作类型
 * @param {Object} data 操作数据
 */
async function logRequestProcessing(requestId, request, adminUserId, action, data) {
  try {
    await db.collection('product_request_logs').add({
      data: {
        requestId: requestId,
        userId: request.userId,
        adminUserId: adminUserId,
        action: action,
        actionData: data || {},
        productName: request.productName,
        brand: request.brand,
        beforeStatus: request.status,
        timestamp: new Date()
      }
    })
  } catch (error) {
    console.error('记录请求处理日志失败:', error)
  }
}

/**
 * 通知用户请求处理结果
 * @param {string} userId 用户ID
 * @param {Object} request 请求数据
 * @param {string} action 操作类型
 * @param {string} adminNotes 管理员备注
 */
async function notifyUserRequestProcessed(userId, request, action, adminNotes) {
  try {
    let title = ''
    let content = ''
    
    switch (action) {
      case 'approve':
        title = '产品催更请求已批准'
        content = `您的产品催更请求"${request.brand} ${request.productName}"已被批准，我们将尽快添加到产品库中。`
        break
      case 'reject':
        title = '产品催更请求已拒绝'
        content = `很抱歉，您的产品催更请求"${request.brand} ${request.productName}"已被拒绝。原因：${adminNotes}`
        break
      case 'complete':
        title = '产品催更请求已完成'
        content = `您的产品催更请求"${request.brand} ${request.productName}"已完成，产品已添加到产品库中。`
        break
      default:
        return // 其他操作不发送通知
    }
    
    await db.collection('notifications').add({
      data: {
        userId: userId,
        type: 'product_request_update',
        title: title,
        content: content,
        data: {
          requestId: request._id,
          productName: request.productName,
          brand: request.brand,
          action: action
        },
        isRead: false,
        createdAt: new Date()
      }
    })
    
  } catch (error) {
    console.error('通知用户失败:', error)
  }
}