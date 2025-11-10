// 创建日记云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('diaryCreate 云函数调用开始', event)
    
    // 参数验证
    const { 
      date,
      morningRoutine = [],
      eveningRoutine = [],
      skinCondition,
      mood,
      weather,
      notes = '',
      photos = []
    } = event

    // 统一鉴权：以 OPENID 作为用户标识，禁止冒充他人 userId
    const userId = wxContext.OPENID
    if (event.userId && event.userId !== userId) {
      return {
        code: -1,
        message: '无权以他人身份创建日记',
        data: null
      }
    }
    
    // 必填字段验证
    if (!userId) {
      return {
        code: -1,
        message: '用户ID不能为空',
        data: null
      }
    }
    
    if (!date) {
      return {
        code: -1,
        message: '日期不能为空',
        data: null
      }
    }
    
    // 验证日期格式
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
    today.setHours(23, 59, 59, 999) // 设置为今天的最后一刻
    
    if (inputDate > today) {
      return {
        code: -1,
        message: '不能选择未来的日期',
        data: null
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
    
    // 检查当天是否已有日记
    const existingDiary = await db.collection('diaries')
      .where({
        userId: userId,
        date: date
      })
      .get()
    
    if (existingDiary.data.length > 0) {
      return {
        code: -1,
        message: '当天已有日记记录，请编辑现有记录',
        data: null
      }
    }
    
    // 验证护肤步骤中的产品ID
    const allProductIds = [
      ...morningRoutine.map(item => item.productId),
      ...eveningRoutine.map(item => item.productId)
    ].filter(Boolean)
    
    let validProductIds = []
    if (allProductIds.length > 0) {
      const productsResult = await db.collection('products')
        .where({
          _id: db.command.in(allProductIds)
        })
        .get()
      
      validProductIds = productsResult.data.map(p => p._id)
      
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
    // 构建日记数据
    const diaryData = {
      userId: userId,
      date: date,
      morningRoutine: morningRoutine || [],
      eveningRoutine: eveningRoutine || [],
      skinCondition: skinCondition || {
        moisture: 5,
        oiliness: 5,
        sensitivity: 1,
        breakouts: 1,
        overall: 5
      },
      mood: mood || 'neutral',
      weather: weather || {
        condition: 'sunny',
        temperature: 20,
        humidity: 50
      },
      notes: notes,
      photos: photos,
      createTime: new Date(),
      updateTime: new Date()
    }
    
    // 创建日记记录
    const result = await db.collection('diaries').add({
      data: diaryData
    })
    
    // 更新用户统计信息
    try {
      await db.collection('users').doc(userId).update({
        data: {
          lastDiaryDate: date,
          totalDiaries: db.command.inc(1),
          updateTime: new Date()
        }
      })
    } catch (updateError) {
      console.warn('更新用户统计失败:', updateError)
      // 不影响主流程，继续执行
    }
    
    // 获取完整的日记信息返回
    const createdDiary = await db.collection('diaries')
      .doc(result._id)
      .get()
    
    // 获取产品详情
    let productDetails = []
    if (validProductIds.length > 0) {
      const productsDetailResult = await db.collection('products')
        .where({
          _id: db.command.in(validProductIds)
        })
        .get()
      
      productDetails = productsDetailResult.data
    }
    
    const responseData = {
      ...createdDiary.data,
      _id: result._id,
      productDetails: productDetails
    }
    
    console.log('diaryCreate 创建成功', {
      diaryId: result._id,
      userId: userId,
      date: date
    })
    
    return {
      code: 0,
      message: '日记创建成功',
      data: responseData
    }
    
  } catch (error) {
    console.error('diaryCreate 云函数执行失败:', error)
    return {
      code: -1,
      message: error.message || '创建日记失败',
      data: null
    }
  }
}