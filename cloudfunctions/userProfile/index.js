// 用户档案管理云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('userProfile 云函数调用开始', event)
    
    const { action, userId, profileData } = event
    
    if (!userId) {
      return {
        code: -1,
        message: '用户ID不能为空',
        data: null
      }
    }
    
    switch (action) {
      case 'get':
        return await getUserProfile(userId)
      case 'update':
        return await updateUserProfile(userId, profileData)
      case 'getStats':
        return await getUserStats(userId)
      default:
        return {
          code: -1,
          message: '不支持的操作类型',
          data: null
        }
    }
    
  } catch (error) {
    console.error('userProfile 云函数执行失败:', error)
    return {
      code: -1,
      message: error.message || '用户档案操作失败',
      data: null
    }
  }
}

// 获取用户档案
async function getUserProfile(userId) {
  try {
    const userResult = await db.collection('users').doc(userId).get()
    
    if (!userResult.data) {
      return {
        code: -1,
        message: '用户不存在',
        data: null
      }
    }
    
    const user = userResult.data
    
    // 获取用户的基本统计信息
    const stats = await getUserBasicStats(userId)
    
    const profileData = {
      _id: user._id,
      nickname: user.nickname || '',
      avatar: user.avatar || '',
      gender: user.gender || '',
      age: user.age || 0,
      skinType: user.skinType || 'normal', // dry, normal, oily, combination, sensitive
      skinConcerns: user.skinConcerns || [], // acne, wrinkles, pigmentation, sensitivity, etc.
      allergies: user.allergies || [],
      currentProducts: user.currentProducts || [],
      skinGoals: user.skinGoals || [],
      registrationDate: user.createTime,
      lastActiveDate: user.lastActiveDate || user.updateTime,
      stats: stats
    }
    
    console.log('getUserProfile 成功', { userId })
    
    return {
      code: 0,
      message: 'success',
      data: profileData
    }
    
  } catch (error) {
    console.error('获取用户档案失败:', error)
    return {
      code: -1,
      message: '获取用户档案失败',
      data: null
    }
  }
}

// 更新用户档案
async function updateUserProfile(userId, profileData) {
  try {
    if (!profileData) {
      return {
        code: -1,
        message: '更新数据不能为空',
        data: null
      }
    }
    
    // 验证数据格式
    const validatedData = validateProfileData(profileData)
    if (validatedData.error) {
      return {
        code: -1,
        message: validatedData.error,
        data: null
      }
    }
    
    // 更新用户信息
    const updateData = {
      ...validatedData.data,
      updateTime: new Date(),
      lastActiveDate: new Date()
    }
    
    await db.collection('users').doc(userId).update({
      data: updateData
    })
    
    // 获取更新后的用户档案
    const updatedProfile = await getUserProfile(userId)
    
    console.log('updateUserProfile 成功', { userId })
    
    return {
      code: 0,
      message: '用户档案更新成功',
      data: updatedProfile.data
    }
    
  } catch (error) {
    console.error('更新用户档案失败:', error)
    return {
      code: -1,
      message: '更新用户档案失败',
      data: null
    }
  }
}

// 获取用户统计信息
async function getUserStats(userId) {
  try {
    const stats = await getUserDetailedStats(userId)
    
    console.log('getUserStats 成功', { userId })
    
    return {
      code: 0,
      message: 'success',
      data: stats
    }
    
  } catch (error) {
    console.error('获取用户统计失败:', error)
    return {
      code: -1,
      message: '获取用户统计失败',
      data: null
    }
  }
}

// 获取基本统计信息
async function getUserBasicStats(userId) {
  try {
    // 获取日记统计
    const diaryCount = await db.collection('diaries')
      .where({ userId: userId })
      .count()
    
    // 获取检测统计
    const detectionCount = await db.collection('detections')
      .where({ userId: userId })
      .count()
    
    // 获取最近活动
    const recentDiary = await db.collection('diaries')
      .where({ userId: userId })
      .orderBy('date', 'desc')
      .limit(1)
      .get()
    
    const recentDetection = await db.collection('detections')
      .where({ userId: userId })
      .orderBy('detectionTime', 'desc')
      .limit(1)
      .get()
    
    return {
      totalDiaries: diaryCount.total,
      totalDetections: detectionCount.total,
      lastDiaryDate: recentDiary.data.length > 0 ? recentDiary.data[0].date : null,
      lastDetectionDate: recentDetection.data.length > 0 ? recentDetection.data[0].detectionTime : null
    }
    
  } catch (error) {
    console.warn('获取基本统计失败:', error)
    return {
      totalDiaries: 0,
      totalDetections: 0,
      lastDiaryDate: null,
      lastDetectionDate: null
    }
  }
}

// 获取详细统计信息
async function getUserDetailedStats(userId) {
  try {
    const basicStats = await getUserBasicStats(userId)
    
    // 获取最近30天的活动统计
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentDiaries = await db.collection('diaries')
      .where({
        userId: userId,
        date: _.gte(thirtyDaysAgo.toISOString().split('T')[0])
      })
      .get()
    
    const recentDetections = await db.collection('detections')
      .where({
        userId: userId,
        detectionTime: _.gte(thirtyDaysAgo)
      })
      .get()
    
    // 计算皮肤状态趋势
    const skinTrend = calculateSkinTrend(recentDiaries.data, recentDetections.data)
    
    // 计算使用频率最高的产品
    const topProducts = calculateTopProducts(recentDiaries.data)
    
    // 计算活跃度
    const activityLevel = calculateActivityLevel(recentDiaries.data.length, recentDetections.data.length)
    
    return {
      ...basicStats,
      recent30Days: {
        diaries: recentDiaries.data.length,
        detections: recentDetections.data.length,
        skinTrend: skinTrend,
        topProducts: topProducts,
        activityLevel: activityLevel
      },
      achievements: calculateAchievements(basicStats, recentDiaries.data, recentDetections.data)
    }
    
  } catch (error) {
    console.warn('获取详细统计失败:', error)
    return await getUserBasicStats(userId)
  }
}

// 验证档案数据
function validateProfileData(data) {
  const validatedData = {}
  
  // 验证昵称
  if (data.nickname !== undefined) {
    if (typeof data.nickname !== 'string' || data.nickname.length > 20) {
      return { error: '昵称格式不正确' }
    }
    validatedData.nickname = data.nickname
  }
  
  // 验证性别
  if (data.gender !== undefined) {
    if (!['male', 'female', 'other', ''].includes(data.gender)) {
      return { error: '性别参数不正确' }
    }
    validatedData.gender = data.gender
  }
  
  // 验证年龄
  if (data.age !== undefined) {
    if (typeof data.age !== 'number' || data.age < 0 || data.age > 120) {
      return { error: '年龄参数不正确' }
    }
    validatedData.age = data.age
  }
  
  // 验证肌肤类型
  if (data.skinType !== undefined) {
    const validSkinTypes = ['dry', 'normal', 'oily', 'combination', 'sensitive']
    if (!validSkinTypes.includes(data.skinType)) {
      return { error: '肌肤类型参数不正确' }
    }
    validatedData.skinType = data.skinType
  }
  
  // 验证肌肤问题
  if (data.skinConcerns !== undefined) {
    if (!Array.isArray(data.skinConcerns)) {
      return { error: '肌肤问题参数格式不正确' }
    }
    validatedData.skinConcerns = data.skinConcerns
  }
  
  // 验证过敏信息
  if (data.allergies !== undefined) {
    if (!Array.isArray(data.allergies)) {
      return { error: '过敏信息参数格式不正确' }
    }
    validatedData.allergies = data.allergies
  }
  
  // 验证当前使用产品
  if (data.currentProducts !== undefined) {
    if (!Array.isArray(data.currentProducts)) {
      return { error: '当前产品参数格式不正确' }
    }
    validatedData.currentProducts = data.currentProducts
  }
  
  // 验证护肤目标
  if (data.skinGoals !== undefined) {
    if (!Array.isArray(data.skinGoals)) {
      return { error: '护肤目标参数格式不正确' }
    }
    validatedData.skinGoals = data.skinGoals
  }
  
  // 验证头像
  if (data.avatar !== undefined) {
    if (typeof data.avatar !== 'string') {
      return { error: '头像参数格式不正确' }
    }
    validatedData.avatar = data.avatar
  }
  
  return { data: validatedData }
}

// 计算皮肤状态趋势
function calculateSkinTrend(diaries, detections) {
  if (diaries.length === 0 && detections.length === 0) {
    return 'stable'
  }
  
  // 基于日记中的皮肤状态评分计算趋势
  if (diaries.length >= 2) {
    const scores = diaries
      .filter(d => d.skinCondition)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(d => d.skinCondition)
    
    if (scores.length >= 2) {
      const recent = scores.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, scores.length)
      const older = scores.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, scores.length)
      
      const diff = recent - older
      if (diff > 1) return 'improving'
      if (diff < -1) return 'declining'
    }
  }
  
  return 'stable'
}

// 计算使用频率最高的产品
function calculateTopProducts(diaries) {
  const productCount = {}
  
  diaries.forEach(diary => {
    if (diary.products && diary.products.length > 0) {
      diary.products.forEach(productId => {
        productCount[productId] = (productCount[productId] || 0) + 1
      })
    }
  })
  
  return Object.entries(productCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([productId, count]) => ({ productId, count }))
}

// 计算活跃度
function calculateActivityLevel(diaryCount, detectionCount) {
  const totalActivity = diaryCount + detectionCount
  
  if (totalActivity >= 20) return 'high'
  if (totalActivity >= 10) return 'medium'
  if (totalActivity >= 3) return 'low'
  return 'inactive'
}

// 计算成就
function calculateAchievements(basicStats, recentDiaries, recentDetections) {
  const achievements = []
  
  // 日记相关成就
  if (basicStats.totalDiaries >= 30) {
    achievements.push({ type: 'diary_master', name: '日记达人', description: '已记录30天护肤日记' })
  } else if (basicStats.totalDiaries >= 7) {
    achievements.push({ type: 'diary_keeper', name: '坚持记录', description: '已记录7天护肤日记' })
  }
  
  // 检测相关成就
  if (basicStats.totalDetections >= 10) {

  }
  
  // 连续记录成就
  const consecutiveDays = calculateConsecutiveDays(recentDiaries)
  if (consecutiveDays >= 7) {
    achievements.push({ type: 'consistent', name: '持之以恒', description: `连续记录${consecutiveDays}天` })
  }
  
  return achievements
}

// 计算连续记录天数
function calculateConsecutiveDays(diaries) {
  if (diaries.length === 0) return 0
  
  const sortedDates = diaries
    .map(d => d.date)
    .sort()
    .reverse()
  
  let consecutive = 1
  const today = new Date().toISOString().split('T')[0]
  
  // 检查是否包含今天或昨天
  if (sortedDates[0] !== today) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    if (sortedDates[0] !== yesterday.toISOString().split('T')[0]) {
      return 0
    }
  }
  
  for (let i = 1; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i])
    const previousDate = new Date(sortedDates[i - 1])
    const diffTime = previousDate - currentDate
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      consecutive++
    } else {
      break
    }
  }
  
  return consecutive
}