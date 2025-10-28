// 获取检测历史记录云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('detectionHistory 云函数调用开始', event)
    
    // 参数验证
    const { 
      userId,
      page = 1,
      limit = 10,
      detectionType = 'all', // all, comprehensive, acne, wrinkle, moisture, oil
      startDate,
      endDate,
      sortBy = 'time' // time, score
    } = event
    
    if (!userId) {
      return {
        code: -1,
        message: '用户ID不能为空',
        data: null
      }
    }
    
    // 构建查询条件
    let whereCondition = {
      userId: userId
    }
    
    // 按检测类型筛选
    if (detectionType !== 'all') {
      whereCondition.detectionType = detectionType
    }
    
    // 按日期范围筛选
    if (startDate || endDate) {
      whereCondition.detectionTime = {}
      if (startDate) {
        whereCondition.detectionTime[_.gte] = new Date(startDate)
      }
      if (endDate) {
        whereCondition.detectionTime[_.lte] = new Date(endDate)
      }
    }
    
    // 构建排序条件
    let orderBy = 'detectionTime'
    let orderDirection = 'desc'
    
    if (sortBy === 'score') {
      orderBy = 'analysisResult.overall.score'
      orderDirection = 'desc'
    }
    
    // 计算跳过的记录数
    const skip = (page - 1) * limit
    
    // 查询检测历史
    const historyResult = await db.collection('detections')
      .where(whereCondition)
      .orderBy(orderBy, orderDirection)
      .skip(skip)
      .limit(limit)
      .get()
    
    // 获取总数（用于分页）
    const countResult = await db.collection('detections')
      .where(whereCondition)
      .count()
    
    // 处理检测记录数据
    const detections = historyResult.data.map(detection => {
      return {
        _id: detection._id,
        detectionType: detection.detectionType,
        detectionTime: detection.detectionTime,
        imageUrl: detection.imageUrl,
        analysisResult: detection.analysisResult,
        // 提取关键指标用于列表显示
        summary: {
          overallScore: detection.analysisResult?.overall?.score || 0,
          level: detection.analysisResult?.overall?.level || 'unknown',
          mainIssues: extractMainIssues(detection.analysisResult)
        }
      }
    })
    
    // 计算统计信息
    const stats = await calculateDetectionStats(userId, whereCondition)
    
    console.log('detectionHistory 查询成功', {
      count: detections.length,
      total: countResult.total,
      page,
      limit
    })
    
    return {
      code: 0,
      message: 'success',
      data: {
        detections: detections,
        pagination: {
          page: page,
          limit: limit,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit),
          hasMore: skip + detections.length < countResult.total
        },
        filters: {
          detectionType,
          startDate,
          endDate,
          sortBy
        },
        stats: stats
      }
    }
    
  } catch (error) {
    console.error('detectionHistory 云函数执行失败:', error)
    return {
      code: -1,
      message: error.message || '获取检测历史失败',
      data: null
    }
  }
}

// 提取主要问题
function extractMainIssues(analysisResult) {
  const issues = []
  
  if (!analysisResult) return issues
  
  // 检查痘痘问题
  if (analysisResult.acne && analysisResult.acne.count > 2) {
    issues.push({
      type: 'acne',
      severity: analysisResult.acne.severity,
      description: `${analysisResult.acne.count}个痘痘`
    })
  }
  
  // 检查水分问题
  if (analysisResult.moisture && analysisResult.moisture.level < 60) {
    issues.push({
      type: 'moisture',
      severity: 'moderate',
      description: '缺水'
    })
  }
  
  // 检查出油问题
  if (analysisResult.oiliness && analysisResult.oiliness.level > 70) {
    issues.push({
      type: 'oil',
      severity: 'moderate',
      description: '出油过多'
    })
  }
  
  // 检查皱纹问题
  if (analysisResult.wrinkles && analysisResult.wrinkles.score < 70) {
    issues.push({
      type: 'wrinkle',
      severity: analysisResult.wrinkles.severity,
      description: '细纹明显'
    })
  }
  
  return issues
}

// 计算检测统计信息
async function calculateDetectionStats(userId, baseCondition) {
  try {
    // 获取最近30天的检测记录
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentCondition = {
      ...baseCondition,
      detectionTime: _.gte(thirtyDaysAgo)
    }
    
    const recentDetections = await db.collection('detections')
      .where(recentCondition)
      .orderBy('detectionTime', 'desc')
      .get()
    
    const stats = {
      totalDetections: 0,
      recentDetections: recentDetections.data.length,
      averageScore: 0,
      trend: 'stable', // improving, stable, declining
      lastDetectionDate: null,
      detectionTypes: {}
    }
    
    if (recentDetections.data.length > 0) {
      // 计算平均分数
      const scores = recentDetections.data
        .map(d => d.analysisResult?.overall?.score || 0)
        .filter(score => score > 0)
      
      if (scores.length > 0) {
        stats.averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      }
      
      // 计算趋势
      if (scores.length >= 2) {
        const recentScore = scores[0]
        const olderScore = scores[scores.length - 1]
        const diff = recentScore - olderScore
        
        if (diff > 5) {
          stats.trend = 'improving'
        } else if (diff < -5) {
          stats.trend = 'declining'
        }
      }
      
      // 最后检测日期
      stats.lastDetectionDate = recentDetections.data[0].detectionTime
      
      // 检测类型统计
      recentDetections.data.forEach(detection => {
        const type = detection.detectionType || 'comprehensive'
        stats.detectionTypes[type] = (stats.detectionTypes[type] || 0) + 1
      })
    }
    
    return stats
    
  } catch (error) {
    console.warn('计算检测统计失败:', error)
    return {
      totalDetections: 0,
      recentDetections: 0,
      averageScore: 0,
      trend: 'stable',
      lastDetectionDate: null,
      detectionTypes: {}
    }
  }
}