// 皮肤检测分析云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('detectionAnalyze 云函数调用开始', event)
    
    // 参数验证
    const { 
      imageUrl,
      detectionType = 'comprehensive', // comprehensive, acne, wrinkle, moisture, oil
      analysisOptions = {}
    } = event

    const userId = wxContext.OPENID
    
    if (!userId) {
      return {
        code: -1,
        message: '用户ID不能为空',
        data: null
      }
    }
    
    if (!imageUrl) {
      return {
        code: -1,
        message: '检测图片不能为空',
        data: null
      }
    }
    
    // 模拟皮肤检测分析逻辑
    // 在实际项目中，这里会调用AI分析服务或第三方API
    const analysisResult = await performSkinAnalysis(imageUrl, detectionType, analysisOptions)
    
    // 构建检测记录数据
    const detectionData = {
      userId: userId,
      imageUrl: imageUrl,
      detectionType: detectionType,
      analysisResult: analysisResult,
      detectionTime: new Date(),
      createTime: new Date()
    }
    
    // 保存检测记录
    const saveResult = await db.collection('detections').add({
      data: detectionData
    })
    
    // 更新用户检测统计
    try {
      await db.collection('users').doc(userId).update({
        data: {
          lastDetectionTime: new Date(),
          totalDetections: db.command.inc(1),
          updateTime: new Date()
        }
      })
    } catch (updateError) {
      console.warn('更新用户检测统计失败:', updateError)
    }
    
    // 生成护肤建议
    const recommendations = generateSkinCareRecommendations(analysisResult)
    
    const responseData = {
      detectionId: saveResult._id,
      analysisResult: analysisResult,
      recommendations: recommendations,
      detectionTime: detectionData.detectionTime
    }
    
    console.log('detectionAnalyze 分析完成', {
      detectionId: saveResult._id,
      userId: userId,
      detectionType: detectionType
    })
    
    return {
      code: 0,
      message: '皮肤检测分析完成',
      data: responseData
    }
    
  } catch (error) {
    console.error('detectionAnalyze 云函数执行失败:', error)
    return {
      code: -1,
      message: error.message || '皮肤检测分析失败',
      data: null
    }
  }
}

// 模拟皮肤分析函数
async function performSkinAnalysis(imageUrl, detectionType, options) {
  // 这里是模拟的分析逻辑，实际项目中需要集成真实的AI分析服务
  
  // 模拟分析延时
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const baseAnalysis = {
    overall: {
      score: Math.floor(Math.random() * 40) + 60, // 60-100分
      level: 'good', // excellent, good, fair, poor
      summary: '您的皮肤整体状态良好'
    },
    acne: {
      count: Math.floor(Math.random() * 5),
      severity: 'mild', // mild, moderate, severe
      areas: ['T区', '下巴']
    },
    wrinkles: {
      score: Math.floor(Math.random() * 30) + 70,
      areas: ['眼角', '法令纹'],
      severity: 'light'
    },
    moisture: {
      level: Math.floor(Math.random() * 40) + 60, // 60-100%
      status: 'normal', // dry, normal, oily
      recommendation: '建议加强保湿护理'
    },
    oiliness: {
      level: Math.floor(Math.random() * 50) + 30, // 30-80%
      areas: ['T区', '鼻翼'],
      type: 'combination' // dry, normal, oily, combination
    },
    pores: {
      size: 'medium', // small, medium, large
      visibility: 'moderate',
      areas: ['鼻头', '脸颊']
    },
    pigmentation: {
      spots: Math.floor(Math.random() * 3),
      evenness: Math.floor(Math.random() * 30) + 70,
      areas: ['颧骨', '太阳穴']
    }
  }
  
  // 根据检测类型返回相应结果
  switch (detectionType) {
    case 'acne':
      return {
        overall: baseAnalysis.overall,
        acne: baseAnalysis.acne,
        analysisType: 'acne'
      }
    case 'wrinkle':
      return {
        overall: baseAnalysis.overall,
        wrinkles: baseAnalysis.wrinkles,
        analysisType: 'wrinkle'
      }
    case 'moisture':
      return {
        overall: baseAnalysis.overall,
        moisture: baseAnalysis.moisture,
        analysisType: 'moisture'
      }
    case 'oil':
      return {
        overall: baseAnalysis.overall,
        oiliness: baseAnalysis.oiliness,
        analysisType: 'oil'
      }
    case 'comprehensive':
    default:
      return {
        ...baseAnalysis,
        analysisType: 'comprehensive'
      }
  }
}

// 生成护肤建议
function generateSkinCareRecommendations(analysisResult) {
  const recommendations = {
    immediate: [], // 立即建议
    daily: [],     // 日常护理
    weekly: [],    // 每周护理
    products: []   // 推荐产品
  }
  
  // 根据分析结果生成建议
  if (analysisResult.acne && analysisResult.acne.count > 2) {
    recommendations.immediate.push('避免用手触摸面部，保持面部清洁')
    recommendations.daily.push('使用温和的洁面产品，早晚各一次')
    recommendations.products.push('含水杨酸的祛痘产品')
  }
  
  if (analysisResult.moisture && analysisResult.moisture.level < 70) {
    recommendations.daily.push('加强保湿护理，使用保湿精华和面霜')
    recommendations.products.push('玻尿酸保湿精华')
  }
  
  if (analysisResult.oiliness && analysisResult.oiliness.level > 60) {
    recommendations.daily.push('使用控油洁面产品，避免过度清洁')
    recommendations.weekly.push('每周使用1-2次清洁面膜')
    recommendations.products.push('控油爽肤水')
  }
  
  if (analysisResult.wrinkles && analysisResult.wrinkles.score < 80) {
    recommendations.daily.push('使用抗衰老精华，注意防晒')
    recommendations.products.push('维A醇抗衰精华')
  }
  
  // 通用建议
  recommendations.daily.push('每日使用防晒霜，SPF30以上')
  recommendations.weekly.push('每周进行1-2次深层清洁')
  
  return recommendations
}