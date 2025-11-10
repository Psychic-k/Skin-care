const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const user = await db.collection('users').doc(OPENID).get().catch(() => null)
    const userType = user && user.data ? user.data.userType : 'user'
    if (!(userType === 'admin' || userType === 'super_admin')) {
      return { code: 403, message: '无权限', data: null }
    }

    const {
      name = '', brand = '', price = 0, description = '',
      skinTypes = [], effects = [], ingredients = [], imageUrl = '',
      category = 'serum'
    } = event || {}

    if (!name.trim() || !brand.trim()) {
      return { code: 400, message: '名称与品牌不能为空', data: null }
    }

    const product = {
      name: name.trim(),
      brand: brand.trim(),
      price: Number(price) || 0,
      description: description.trim(),
      skinTypes,
      effects,
      ingredients,
      imageUrl,
      category,
      status: 'active',
      createBy: OPENID,
      createTime: new Date(),
      updateTime: new Date()
    }

    const ret = await db.collection('products').add({ data: product })

    return { code: 0, message: '创建成功', data: { id: ret._id } }
  } catch (e) {
    console.error('adminCreateProduct error:', e)
    return { code: -1, message: e.message || '创建失败', data: null }
  }
}