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
    
    // 验证产品ID是否存在
    let validProducts = []
    if (products.length > 0) {
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
    
    // 构建日记数据
    const diaryData = {
      userId: userId,
      date: date,
      skinCondition: skinCondition || 5,
      mood: mood || 5,
      weather: weather || 'sunny',
      products: validProducts,
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
    if (validProducts.length > 0) {
      const productsDetailResult = await db.collection('products')
        .where({
          _id: db.command.in(validProducts)
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