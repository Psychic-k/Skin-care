const cloud = require('wx-server-sdk')
const XLSX = require('xlsx')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const userDoc = await db.collection('users').doc(OPENID).get().catch(() => null)
    const userType = userDoc && userDoc.data ? userDoc.data.userType : 'user'
    if (!(userType === 'admin' || userType === 'super_admin')) {
      return { code: 403, message: '无权限', data: null }
    }

    const { fileID, cloudPath } = event || {}
    if (!fileID && !cloudPath) {
      return { code: 400, message: '缺少文件参数', data: null }
    }

    // 下载文件为 Buffer
    const downloadRes = await cloud.downloadFile({ fileID: fileID || cloudPath })
    const buffer = downloadRes.fileContent

    // 解析工作簿（兼容 xlsx/xls/csv）
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

    let successCount = 0
    let failureCount = 0
    const errors = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const name = String(row.name || row.名称 || '').trim()
        const brand = String(row.brand || row.品牌 || '').trim()
        const price = Number(row.price || row.价格 || 0) || 0
        const description = String(row.description || row.描述 || '').trim()
        const skinTypes = parseArray(row.skinTypes || row.适用肤质)
        const effects = parseArray(row.effects || row.功效)
        const ingredients = parseArray(row.ingredients || row.成分)
        const imageUrl = String(row.imageUrl || row.图片 || '')
        const category = String(row.category || row.分类 || 'serum')

        if (!name || !brand) throw new Error('名称或品牌为空')

        // 可选：创建不存在的品牌文档占位
        await ensureBrand(brand)

        const product = {
          name, brand, price, description,
          skinTypes, effects, ingredients,
          imageUrl, category,
          status: 'active',
          createBy: OPENID,
          createTime: new Date(),
          updateTime: new Date()
        }
        await db.collection('products').add({ data: product })
        successCount++
      } catch (e) {
        failureCount++
        errors.push({ index: i + 2, message: e.message }) // +2: 含表头与从1开始
      }
    }

    return {
      code: 0,
      message: '导入完成',
      data: { successCount, failureCount, errors }
    }
  } catch (e) {
    console.error('adminBatchUpload error:', e)
    return { code: -1, message: e.message || '批量导入失败', data: null }
  }
}

function parseArray(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  const str = String(val)
  // 支持逗号/中文逗号/分号
  return str.split(/[,，;；]/).map(s => s.trim()).filter(Boolean)
}

async function ensureBrand(name) {
  const col = db.collection('brands')
  const ret = await col.where({ name }).get()
  if (!ret.data || ret.data.length === 0) {
    await col.add({ data: { name, createTime: new Date() } })
  }
}