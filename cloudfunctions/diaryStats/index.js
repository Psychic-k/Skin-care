// 日记统计云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('diaryStats 云函数调用开始', event)
    
    // 参数验证
    const { userId } = event
    
    if (!userId) {
      return {
        code: -1,
        message: '用户ID不能为空',
        data: null
      }
    }
    
    // 获取当前时间信息
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentDate = now.getDate()
    
    // 本月开始时间
    const monthStart = new Date(currentYear, currentMonth - 1, 1)
    const monthStartStr = monthStart.toISOString().split('T')[0]
    
    // 本年开始时间
    const yearStart = new Date(currentYear, 0, 1)
    const yearStartStr = yearStart.toISOString().split('T')[0]
    
    // 查询用户所有日记
    const allDiariesResult = await db.collection('diaries')
      .where({
        userId: userId
      })
      .orderBy('date', 'desc')
      .get()
    
    const allDiaries = allDiariesResult.data
    
    // 基础统计
    const totalCount = allDiaries.length
    
    // 本月日记统计
    const thisMonthDiaries = allDiaries.filter(diary => {
      return diary.date >= monthStartStr
    })
    const thisMonthCount = thisMonthDiaries.length
    
    // 本年日记统计
    const thisYearDiaries = allDiaries.filter(diary => {
      return diary.date >= yearStartStr
    })
    const thisYearCount = thisYearDiaries.length
    
    // 计算连续记录天数
    let consecutiveDays = 0
    if (allDiaries.length > 0) {
      const sortedDates = allDiaries.map(diary => diary.date).sort((a, b) => b.localeCompare(a))
      const today = now.toISOString().split('T')[0]
      
      // 从今天开始往前计算连续天数
      let checkDate = new Date(today)
      let dateStr = checkDate.toISOString().split('T')[0]
      
      while (sortedDates.includes(dateStr)) {
        consecutiveDays++
        checkDate.setDate(checkDate.getDate() - 1)
        dateStr = checkDate.toISOString().split('T')[0]
      }
    }
    
    // 平均肌肤状态统计
    let avgSkinCondition = {
      moisture: 0,
      oiliness: 0,
      sensitivity: 0,
      breakouts: 0,
      overall: 0
    }
    
    if (allDiaries.length > 0) {
      const validDiaries = allDiaries.filter(diary => diary.skinCondition)
      if (validDiaries.length > 0) {
        const totals = validDiaries.reduce((acc, diary) => {
          const condition = diary.skinCondition
          acc.moisture += condition.moisture || 0
          acc.oiliness += condition.oiliness || 0
          acc.sensitivity += condition.sensitivity || 0
          acc.breakouts += condition.breakouts || 0
          acc.overall += condition.overall || 0
          return acc
        }, { moisture: 0, oiliness: 0, sensitivity: 0, breakouts: 0, overall: 0 })
        
        const count = validDiaries.length
        avgSkinCondition = {
          moisture: Math.round((totals.moisture / count) * 10) / 10,
          oiliness: Math.round((totals.oiliness / count) * 10) / 10,
          sensitivity: Math.round((totals.sensitivity / count) * 10) / 10,
          breakouts: Math.round((totals.breakouts / count) * 10) / 10,
          overall: Math.round((totals.overall / count) * 10) / 10
        }
      }
    }
    
    // 心情统计
    const moodStats = {
      good: 0,
      neutral: 0,
      bad: 0
    }
    
    allDiaries.forEach(diary => {
      if (diary.mood) {
        if (moodStats.hasOwnProperty(diary.mood)) {
          moodStats[diary.mood]++
        }
      }
    })
    
    // 最常使用的产品统计（前5名）
    const productUsage = {}
    allDiaries.forEach(diary => {
      if (diary.morningRoutine) {
        diary.morningRoutine.forEach(product => {
          const key = product.productId || product.productName
          if (key) {
            productUsage[key] = (productUsage[key] || 0) + 1
          }
        })
      }
      if (diary.eveningRoutine) {
        diary.eveningRoutine.forEach(product => {
          const key = product.productId || product.productName
          if (key) {
            productUsage[key] = (productUsage[key] || 0) + 1
          }
        })
      }
    })
    
    const topProducts = Object.entries(productUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([productId, count]) => ({
        productId,
        usageCount: count
      }))
    
    // 最近7天的记录情况
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const hasDiary = allDiaries.some(diary => diary.date === dateStr)
      last7Days.push({
        date: dateStr,
        hasDiary
      })
    }
    
    console.log('diaryStats 统计完成', {
      userId,
      totalCount,
      thisMonthCount,
      consecutiveDays
    })
    
    return {
      code: 0,
      message: 'success',
      data: {
        basic: {
          totalCount,
          thisMonthCount,
          thisYearCount,
          consecutiveDays
        },
        skinCondition: avgSkinCondition,
        mood: moodStats,
        topProducts,
        last7Days,
        summary: {
          averageEntriesPerMonth: thisYearCount > 0 ? Math.round((thisYearCount / currentMonth) * 10) / 10 : 0,
          completionRate: Math.round((consecutiveDays / 30) * 100), // 基于30天计算完成率
          skinTrend: avgSkinCondition.overall >= 7 ? 'improving' : avgSkinCondition.overall >= 5 ? 'stable' : 'needs_attention'
        }
      }
    }
    
  } catch (error) {
    console.error('diaryStats 云函数执行失败:', error)
    return {
      code: -1,
      message: error.message || '获取日记统计失败',
      data: null
    }
  }
}