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
    // 获取用户的 openid 和 unionid
    const { OPENID, UNIONID, APPID } = wxContext
    
    // 检查用户是否已存在
    const userQuery = await db.collection('users').where({
      openid: OPENID
    }).get()
    
    let user = null
    
    if (userQuery.data.length === 0) {
      // 新用户，创建用户记录
      const createTime = new Date()
      const newUser = {
        openid: OPENID,
        unionid: UNIONID || null,
        appid: APPID,
        nickname: event.userInfo?.nickName || '微信用户',
        avatar: event.userInfo?.avatarUrl || '',
        gender: event.userInfo?.gender || 0,
        city: event.userInfo?.city || '',
        province: event.userInfo?.province || '',
        country: event.userInfo?.country || '',
        language: event.userInfo?.language || 'zh_CN',
        skinType: null,
        skinConcerns: [],
        preferences: {
          notifications: true,
          dataCollection: true
        },
        createTime: createTime,
        updateTime: createTime,
        lastLoginTime: createTime,
        isActive: true
      }
      
      const createResult = await db.collection('users').add({
        data: newUser
      })
      
      user = {
        _id: createResult._id,
        ...newUser
      }
      
      console.log('新用户创建成功:', OPENID)
    } else {
      // 已存在用户，更新最后登录时间
      user = userQuery.data[0]
      
      await db.collection('users').doc(user._id).update({
        data: {
          lastLoginTime: new Date(),
          updateTime: new Date()
        }
      })
      
      console.log('用户登录成功:', OPENID)
    }
    
    return {
      success: true,
      data: {
        openid: OPENID,
        unionid: UNIONID,
        user: user,
        isNewUser: userQuery.data.length === 0
      },
      message: '登录成功'
    }
    
  } catch (error) {
    console.error('登录失败:', error)
    return {
      success: false,
      error: error.message,
      message: '登录失败，请重试'
    }
  }
}