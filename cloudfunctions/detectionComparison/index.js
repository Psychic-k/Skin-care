// 检测历史对比云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  try {
    const { currentDetectionId, limit = 5 } = event
    const userId = wxContext.OPENID
    if (!userId) return { code: -1, message: '无法获取用户身份', data: [] }

    // 读取最近若干次检测记录（含当前）
    const listRes = await db.collection('detections')
      .where({ userId })
      .orderBy('detectionTime', 'desc')
      .limit(limit)
      .get()

    const data = (listRes.data || []).map(d => ({
      id: d._id,
      date: d.detectionTime,
      score: d.analysisResult?.overall?.score || 0,
      change: 0
    }))

    // 计算环比变动
    for (let i = 0; i < data.length; i++) {
      if (i < data.length - 1) {
        data[i].change = (data[i].score || 0) - (data[i + 1].score || 0)
      }
    }

    return { code: 0, message: 'ok', data }
  } catch (e) {
    console.error('detectionComparison error', e)
    return { code: -1, message: e.message || '加载对比数据失败', data: [] }
  }
}
