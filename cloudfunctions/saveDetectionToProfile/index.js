// 保存检测到用户档案云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  try {
    const { detectionId, reportData } = event
    const userId = wxContext.OPENID

    if (!detectionId) return { code: -1, message: '缺少 detectionId', data: null }

    // 校验归属
    const det = await db.collection('detections').doc(detectionId).get()
    if (!det.data) return { code: -1, message: '检测记录不存在', data: null }
    if (det.data.userId !== userId) return { code: -1, message: '无权保存到档案', data: null }

    // 写入 users 集合的概览字段（按需扩展）
    await db.collection('users').where({ openid: userId }).update({
      data: {
        lastDetectionTime: new Date(det.data.detectionTime),
        totalDetections: _.inc(1),
        lastOverallScore: det.data.analysisResult?.overall?.score || 0,
        updateTime: new Date()
      }
    })

    // 可选：写入一个 profile 子集合
    // 这里简化为返回成功
    return { code: 0, message: '已保存到档案', data: { detectionId } }
  } catch (e) {
    console.error('saveDetectionToProfile error', e)
    return { code: -1, message: e.message || '保存失败', data: null }
  }
}
