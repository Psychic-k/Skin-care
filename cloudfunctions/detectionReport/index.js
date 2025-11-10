// 检测报告查询云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  try {
    const { detectionId } = event
    const userId = wxContext.OPENID

    if (!detectionId) {
      return { code: -1, message: '缺少 detectionId', data: null }
    }

    const doc = await db.collection('detections').doc(detectionId).get()
    const detection = doc.data
    if (!detection) {
      return { code: -1, message: '检测记录不存在', data: null }
    }

    if (detection.userId !== userId) {
      return { code: -1, message: '无权访问该报告', data: null }
    }

    // 组装报告展示数据（可根据前端结构适配）
    const overallScore = detection.analysisResult?.overall?.score || 0
    const scoreLevel = detection.analysisResult?.overall?.level || 'unknown'
    const scoreSummary = detection.analysisResult?.overall?.summary || ''

    const keyMetrics = [
      { name: '水分', value: detection.analysisResult?.moisture?.level ?? '-', status: 'normal', statusText: '正常', icon: '💧' },
      { name: '出油', value: detection.analysisResult?.oiliness?.level ?? '-', status: 'normal', statusText: '适中', icon: '✨' },
      { name: '皱纹', value: detection.analysisResult?.wrinkles?.score ?? '-', status: 'normal', statusText: '较好', icon: '〰️' }
    ]

    const issues = []
    const ar = detection.analysisResult || {}
    if (ar.acne && ar.acne.count > 2) issues.push({ id: 'acne', name: '痘痘', severity: ar.acne.severity || 'mild', severityText: '轻度', description: `${ar.acne.count}处痘痘` })
    if (ar.wrinkles && ar.wrinkles.score < 80) issues.push({ id: 'wrinkle', name: '细纹/皱纹', severity: ar.wrinkles.severity || 'light', severityText: '轻度', description: '细纹较明显' })

    const suggested = detection.recommendations || {}

    const data = {
      detectionId,
      detectionDate: detection.detectionTime,
      detectionTypeName: detection.detectionType,
      overallScore,
      scoreLevel,
      scoreSummary,
      keyMetrics,
      issues,
      suggestions: (suggested.daily || []).map((t, idx) => ({ id: `s${idx}`, text: t })),
      detailedAnalysis: [
        { category: 'moisture', title: '水分', score: ar.moisture?.level ?? 0, summary: ar.moisture?.recommendation || '' },
        { category: 'oil', title: '出油', score: ar.oiliness?.level ?? 0, summary: '' },
        { category: 'wrinkle', title: '皱纹', score: ar.wrinkles?.score ?? 0, summary: '' }
      ],
      recommendedProducts: (suggested.products || []).map((p, i) => ({ id: `p${i}`, name: p, brand: '推荐', image: '/images/placeholder/placeholder-product.png', recommendReason: '基于检测结果推荐', matchScore: 80 - i * 5 })),
      recommendedRoutine: { morning: [{ step: 1, name: '清洁', description: '温和洁面' }], night: [{ step: 1, name: '修护', description: '加强保湿修护' }] },
      lifestyleTips: [ { category: '作息', content: '规律作息，减少熬夜' } ]
    }

    return { code: 0, message: 'ok', data }
  } catch (e) {
    console.error('detectionReport error', e)
    return { code: -1, message: e.message || '加载报告失败', data: null }
  }
}
