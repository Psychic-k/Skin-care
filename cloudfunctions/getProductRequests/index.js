// 获取产品催更请求云函数（管理员用）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('getProductRequests 云函数调用开始', event)
    
    // 参数验证
    const { 
      adminUserId,
      status = 'all', // all, pending, processing, approved, rejected, completed
      priority = 'all', // all, low, normal, high, urgent
      category = 'all', // all, cleanser, toner, serum, moisturizer, sunscreen, mask, other
      page = 1,
      limit = 20,
      keyword = '', // 搜索关键词
      sortBy = 'createdAt', // createdAt, updatedAt, priority
      sortOrder = 'desc' // asc, desc
    } = event
    
    if (!adminUserId) {
      return {
        code: -1,
        message: '管理员用户ID不能为空',
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
    
    // 构建查询条件
    let whereCondition = {}
    
    // 按状态筛选
    if (status !== 'all') {
      whereCondition.status = status
    }
    
    // 按优先级筛选
    if (priority !== 'all') {
      whereCondition.priority = priority
    }
    
    // 按分类筛选
    if (category !== 'all') {
      whereCondition.category = category
    }
    
    // 关键词搜索
    if (keyword) {
      whereCondition.$or = [
        { productName: new RegExp(keyword, 'i') },
        { brand: new RegExp(keyword, 'i') },
        { description: new RegExp(keyword, 'i') },
        { reason: new RegExp(keyword, 'i') },
        { 'userInfo.nickName': new RegExp(keyword, 'i') }
      ]
    }
    
    // 获取总数
    const countResult = await db.collection('product_requests')
      .where(whereCondition)
      .count()
    
    const total = countResult.total
    
    // 构建排序条件
    let orderBy = 'createdAt'
    let orderDirection = 'desc'
    
    if (['createdAt', 'updatedAt'].includes(sortBy)) {
      orderBy = sortBy
    } else if (sortBy === 'priority') {
      // 优先级排序：urgent > high > normal > low
      orderBy = 'priority'
    }
    
    if (sortOrder === 'asc') {
      orderDirection = 'asc'
    }
    
    // 分页查询
    const skip = (page - 1) * limit
    let query = db.collection('product_requests')
      .where(whereCondition)
      .orderBy(orderBy, orderDirection)
    
    // 如果按优先级排序，需要特殊处理
    if (sortBy === 'priority') {
      query = query.orderBy('createdAt', 'desc') // 同优先级按创建时间排序
    }
    
    const result = await query
      .skip(skip)
      .limit(limit)
      .get()
    
    const requests = result.data
    
    // 获取处理人员信息
    const processorIds = requests
      .filter(req => req.processedBy)
      .map(req => req.processedBy)
    
    let processorsMap = {}
    if (processorIds.length > 0) {
      const processorsResult = await db.collection('users')
        .where({
          _id: _.in([...new Set(processorIds)])
        })
        .get()
      
      processorsResult.data.forEach(user => {
        processorsMap[user._id] = {
          nickName: user.nickName || '管理员',
          avatarUrl: user.avatarUrl || ''
        }
      })
    }
    
    // 丰富请求数据
    const enrichedRequests = requests.map(request => {
      const processor = processorsMap[request.processedBy] || null
      
      return {
        ...request,
        processorInfo: processor,
        // 计算处理时长
        processingDuration: request.processedAt 
          ? Math.ceil((new Date(request.processedAt) - new Date(request.createdAt)) / (1000 * 60 * 60 * 24))
          : null,
        // 计算等待时长
        waitingDuration: request.status === 'pending' 
          ? Math.ceil((new Date() - new Date(request.createdAt)) / (1000 * 60 * 60 * 24))
          : null,
        // 是否超时（超过3天未处理）
        isOverdue: request.status === 'pending' && 
          (new Date() - new Date(request.createdAt)) > (3 * 24 * 60 * 60 * 1000)
      }
    })
    
    // 统计信息
    const allRequests = await db.collection('product_requests').get()
    const stats = {
      total: total,
      pending: allRequests.data.filter(r => r.status === 'pending').length,
      processing: allRequests.data.filter(r => r.status === 'processing').length,
      approved: allRequests.data.filter(r => r.status === 'approved').length,
      rejected: allRequests.data.filter(r => r.status === 'rejected').length,
      completed: allRequests.data.filter(r => r.status === 'completed').length,
      overdue: allRequests.data.filter(r => 
        r.status === 'pending' && 
        (new Date() - new Date(r.createdAt)) > (3 * 24 * 60 * 60 * 1000)
      ).length
    }
    
    // 分类统计
    const categoryStats = {}
    const validCategories = ['cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen', 'mask', 'other']
    validCategories.forEach(cat => {
      categoryStats[cat] = allRequests.data.filter(r => r.category === cat).length
    })
    
    // 优先级统计
    const priorityStats = {
      low: allRequests.data.filter(r => r.priority === 'low').length,
      normal: allRequests.data.filter(r => r.priority === 'normal').length,
      high: allRequests.data.filter(r => r.priority === 'high').length,
      urgent: allRequests.data.filter(r => r.priority === 'urgent').length
    }
    
    console.log('getProductRequests 查询成功', {
      adminUserId,
      status,
      priority,
      total,
      returned: enrichedRequests.length
    })
    
    return {
      code: 0,
      message: 'success',
      data: {
        requests: enrichedRequests,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + enrichedRequests.length < total
        },
        stats: stats,
        categoryStats: categoryStats,
        priorityStats: priorityStats
      }
    }
    
  } catch (error) {
    console.error('getProductRequests 云函数执行失败:', error)
    return {
      code: -1,
      message: error.message || '获取产品催更请求失败',
      data: null
    }
  }
}