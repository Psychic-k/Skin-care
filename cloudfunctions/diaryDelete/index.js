// 删除日记云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    console.log('diaryDelete 云函数调用开始', event)

    const { diaryId, userId } = event

    if (!diaryId) {
      return { code: -1, message: '日记ID不能为空', data: null }
    }
    if (!userId) {
      return { code: -1, message: '用户ID不能为空', data: null }
    }

    // 检查日记是否存在
    const docRes = await db.collection('diaries').doc(diaryId).get()
    const diary = docRes && docRes.data
    if (!diary) {
      return { code: -1, message: '日记不存在', data: null }
    }

    // 权限校验：只能删除自己的日记
    if (diary.userId !== userId) {
      return { code: -1, message: '无权限删除此日记', data: null }
    }

    // 执行删除
    await db.collection('diaries').doc(diaryId).remove()

    console.log('diaryDelete 删除成功', { diaryId })
    return { code: 0, message: 'success', data: { diaryId } }
  } catch (error) {
    console.error('diaryDelete 云函数执行失败:', error)
    return { code: -1, message: error.message || '删除日记失败', data: null }
  }
}