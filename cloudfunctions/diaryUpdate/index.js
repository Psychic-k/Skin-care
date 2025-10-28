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
      skinCondition,
      mood,
      weather,
      products = [],
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
    if (skinCondition !== undefined && (skinCondition < 1 || skinCondition > 10)) {
      return {
        code: -1,
        message: '皮肤状态评分必须在1-10之间',
        data: null
      }
    }
    
    if (mood !== undefined && (mood < 1 || mood > 10)) {
      return {
        code: -1,
        message: '心情评分必须在1-10之间',
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
    
    // 验证产品ID是否存在
    let validProducts = []
    if (products && products.length > 0) {
      const productsResult = await db.collection('products')
        .where({
          _id: db.command.in(products)
        })
        .get()
      
      validProducts = productsResult.data.map(p => p._id)
      
      // 检查是否有无效的产品ID
      const invalidProducts = products.filter(id => !validProducts.includes(id))
      if (invalidProducts.length > 0) {
        console.warn('发现无效产品ID:', invalidProducts)
      }
    }
    
    // 构建更新数据（只更新提供的字段）
    const updateData = {
      updateTime: new Date()
    }
    
    if (date !== undefined) {
      updateData.date = date
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
    
    if (products !== undefined) {
      updateData.products = validProducts
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