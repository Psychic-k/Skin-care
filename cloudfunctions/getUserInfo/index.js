// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const { OPENID } = wxContext
    const { userId } = event
    
    // 如果提供了 userId，则查询指定用户；否则查询当前用户
    const queryOpenid = userId ? userId : OPENID
    
    // 查询用户信息
    const userQuery = await db.collection('users').where({
      openid: queryOpenid
    }).get()
    
    if (userQuery.data.length === 0) {
      // 如果用户不存在，创建新用户
      const newUser = {
        openid: queryOpenid,
        nickname: '新用户',
        avatar: '/images/default-avatar.png',
        gender: 0,
        city: '',
        province: '',
        country: '',
        skinType: '',
        skinConcerns: [],
        preferences: {},
        createTime: new Date(),
        lastLoginTime: new Date(),
        isActive: true,
        level: 1,
        //
      }
      
      const createResult = await db.collection('users').add({
        data: newUser
      })
      
      // 返回新创建的用户信息
      return {
        success: true,
        data: {
          _id: createResult._id,
          ...newUser,
          stats: {
            diaryCount: 0,
            detectionCount: 0
          },
          recentActivities: {
            detections: [],
            diaries: []
          }
        },
        message: '新用户创建成功'
      }
    }
    
    const user = userQuery.data[0]
    
    // 获取用户的护肤日记统计
    const diaryStats = await db.collection('diaries').where({
      userId: user._id
    }).count()
    
    // 获取用户的检测记录统计
    const detectionStats = await db.collection('detections').where({
      userId: user._id
    }).count()
    
    // 获取用户最近的检测记录
    const recentDetections = await db.collection('detections')
      .where({
        userId: user._id
      })
      .orderBy('createTime', 'desc')
      .limit(5)
      .get()
    
    // 获取用户最近的护肤日记
    const recentDiaries = await db.collection('diaries')
      .where({
        userId: user._id
      })
      .orderBy('createTime', 'desc')
      .limit(5)
      .get()
    
    // 构建返回的用户信息（不包含敏感信息）
    const userInfo = {
      _id: user._id,
      openid: user.openid,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      city: user.city,
      province: user.province,
      country: user.country,
      skinType: user.skinType,
      skinConcerns: user.skinConcerns,
      preferences: user.preferences,
      createTime: user.createTime,
      lastLoginTime: user.lastLoginTime,
      isActive: user.isActive,
      stats: {
        diaryCount: diaryStats.total,
        detectionCount: detectionStats.total
      },
      recentActivities: {
        detections: recentDetections.data,
        diaries: recentDiaries.data
      }
    }
    
    return {
      success: true,
      data: userInfo,
      message: '获取用户信息成功'
    }
    
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return {
      success: false,
      error: error.message,
      message: '获取用户信息失败，请重试'
    }
  }
}