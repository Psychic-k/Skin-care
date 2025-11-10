const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { page = 1, limit = 100 } = event || {}
    const skip = (page - 1) * limit

    const res = await db.collection('brands')
      .orderBy('name', 'asc')
      .skip(skip)
      .limit(limit)
      .get()

    return {
      code: 0,
      message: 'OK',
      data: {
        brands: res.data || [],
        page,
        limit,
        total: res.data ? res.data.length : 0
      }
    }
  } catch (e) {
    console.error('brandsList error:', e)
    return { code: -1, message: e.message || '获取品牌列表失败', data: null }
  }
}