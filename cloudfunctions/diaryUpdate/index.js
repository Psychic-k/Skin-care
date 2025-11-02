// 更新日记云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('diaryUpdate 云函数调用开始', event)
    
    // 参数验证
    const { 
      diaryId,
      userId,
      date,
      morningRoutine = [],
      eveningRoutine = [],
      skinCondition,
      mood,
      weather,
      notes = '',
      photos = []
    } = event
    
    // 必填字段验证
    if (!diaryId) {
      return {
        code: -1,
        message: '日记ID不能为空',
        data: null
      }
    }
    
    if (!userId) {
      return {
        code: -1,
        message: '用户ID不能为空',
        data: null
      }
    }
    
    // 检查日记是否存在
    const existingDiary = await db.collection('diaries')
      .doc(diaryId)
      .get()
    
    if (!existingDiary.data) {
      return {
        code: -1,
        message: '日记不存在',
        data: null
      }
    }
    
    // 权限检查：确保用户只能编辑自己的日记
    if (existingDiary.data.userId !== userId) {
      return {
        code: -1,
        message: '无权限编辑此日记',
        data: null
      }
    }
    
    // 数据类型验证
    // 验证日期格式
    if (date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(date)) {
        return {
          code: -1,
          message: '日期格式不正确，应为YYYY-MM-DD',
          data: null
        }
      }
      
      // 验证日期不能是未来时间
      const inputDate = new Date(date)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      
      if (inputDate > today) {
        return {
          code: -1,
          message: '不能选择未来的日期',
          data: null
        }
      }
    }
    
    // 验证肌肤状态数据结构
    if (skinCondition) {
      const requiredFields = ['moisture', 'oiliness', 'sensitivity', 'breakouts', 'overall']
      for (const field of requiredFields) {
        if (skinCondition[field] === undefined || skinCondition[field] < 1 || skinCondition[field] > 10) {
          return {
            code: -1,
            message: `肌肤状态${field}评分必须在1-10之间`,
            data: null
          }
        }
      }
    }
    
    // 验证心情数据
    const validMoods = ['excellent', 'good', 'neutral', 'bad', 'terrible']
    if (mood && !validMoods.includes(mood)) {
      return {
        code: -1,
        message: '心情状态值无效',
        data: null
      }
    }
    
    // 验证天气数据结构
    if (weather) {
      const validConditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'foggy']
      if (weather.condition && !validConditions.includes(weather.condition)) {
        return {
          code: -1,
          message: '天气状况值无效',
          data: null
        }
      }
      
      if (weather.temperature !== undefined && (weather.temperature < -50 || weather.temperature > 60)) {
        return {
          code: -1,
          message: '温度值超出合理范围',
          data: null
        }
      }
      
      if (weather.humidity !== undefined && (weather.humidity < 0 || weather.humidity > 100)) {
        return {
          code: -1,
          message: '湿度值必须在0-100之间',
          data: null
        }
      }
    }
    
    // 验证备注长度
    if (notes && notes.length > 500) {
      return {
        code: -1,
        message: '备注内容不能超过500字符',
        data: null
      }
    }
    
    // 验证照片数量
    if (photos && photos.length > 3) {
      return {
        code: -1,
        message: '最多只能上传3张照片',
        data: null
      }
    }
    
    // 如果更新日期，检查新日期是否与其他日记冲突
    if (date && date !== existingDiary.data.date) {
      const conflictDiary = await db.collection('diaries')
        .where({
          userId: userId,
          date: date,
          _id: db.command.neq(diaryId)
        })
        .get()
      
      if (conflictDiary.data.length > 0) {
        return {
          code: -1,
          message: '该日期已有其他日记记录',
          data: null
        }
      }
    }
    
    // 验证护肤步骤中的产品ID
    const allProductIds = [
      ...(morningRoutine || []).map(item => item.productId),
      ...(eveningRoutine || []).map(item => item.productId)
    ].filter(Boolean)
    
    if (allProductIds.length > 0) {
      const productsResult = await db.collection('products')
        .where({
          _id: db.command.in(allProductIds)
        })
        .get()
      
      const validProductIds = productsResult.data.map(p => p._id)
      
      // 检查是否有无效的产品ID
      const invalidProductIds = allProductIds.filter(id => !validProductIds.includes(id))
      if (invalidProductIds.length > 0) {
        return {
          code: -1,
          message: `包含无效的产品ID: ${invalidProductIds.join(', ')}`,
          data: null
        }
      }
    }
    
    // 验证护肤步骤数据结构
    const validateRoutine = (routine, routineName) => {
      if (!routine) return null
      for (let i = 0; i < routine.length; i++) {
        const item = routine[i]
        if (!item.productId || !item.productName) {
          return `${routineName}第${i + 1}项缺少必要字段`
        }
        if (item.usage && item.usage.length > 50) {
          return `${routineName}第${i + 1}项用量描述过长`
        }
        if (item.notes && item.notes.length > 200) {
          return `${routineName}第${i + 1}项备注过长`
        }
      }
      return null
    }
    
    const morningValidation = validateRoutine(morningRoutine, '早间护肤')
    if (morningValidation) {
      return {
        code: -1,
        message: morningValidation,
        data: null
      }
    }
    
    const eveningValidation = validateRoutine(eveningRoutine, '晚间护肤')
    if (eveningValidation) {
      return {
        code: -1,
        message: eveningValidation,
        data: null
      }
    }
    
    // 构建更新数据（只更新提供的字段）
    const updateData = {
      updateTime: new Date()
    }
    
    if (date !== undefined) {
      updateData.date = date
    }
    
    if (morningRoutine !== undefined) {
      updateData.morningRoutine = morningRoutine
    }
    
    if (eveningRoutine !== undefined) {
      updateData.eveningRoutine = eveningRoutine
    }
    
    if (skinCondition !== undefined) {
      updateData.skinCondition = skinCondition
    }
    
    if (mood !== undefined) {
      updateData.mood = mood
    }
    
    if (weather !== undefined) {
      updateData.weather = weather
    }
    
    if (notes !== undefined) {
      updateData.notes = notes
    }
    
    if (photos !== undefined) {
      updateData.photos = photos
    }
    
    // 更新日记记录
    await db.collection('diaries').doc(diaryId).update({
      data: updateData
    })
    
    // 如果更新了日期，同时更新用户的最后日记日期
    if (date && date !== existingDiary.data.date) {
      try {
        // 获取用户最新的日记日期
        const latestDiary = await db.collection('diaries')
          .where({
            userId: userId
          })
          .orderBy('date', 'desc')
          .limit(1)
          .get()
        
        if (latestDiary.data.length > 0) {
          await db.collection('users').doc(userId).update({
            data: {
              lastDiaryDate: latestDiary.data[0].date,
              updateTime: new Date()
            }
          })
        }
      } catch (updateError) {
        console.warn('更新用户统计失败:', updateError)
        // 不影响主流程，继续执行
      }
    }
    
    // 获取更新后的完整日记信息
    const updatedDiary = await db.collection('diaries')
      .doc(diaryId)
      .get()
    
    // 获取产品详情
    let productDetails = []
    if (updatedDiary.data.products && updatedDiary.data.products.length > 0) {
      const productsDetailResult = await db.collection('products')
        .where({
          _id: db.command.in(updatedDiary.data.products)
        })
        .get()
      
      productDetails = productsDetailResult.data
    }
    
    const responseData = {
      ...updatedDiary.data,
      productDetails: productDetails
    }
    
    console.log('diaryUpdate 更新成功', {
      diaryId: diaryId,
      userId: userId,
      updatedFields: Object.keys(updateData)
    })
    
    return {
      code: 0,
      message: '日记更新成功',
      data: responseData
    }
    
  } catch (error) {
    console.error('diaryUpdate 云函数执行失败:', error)
    return {
      code: -1,
      message: error.message || '更新日记失败',
      data: null
    }
  }
}