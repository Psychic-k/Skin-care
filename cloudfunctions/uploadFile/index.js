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
    const { 
      fileType, 
      fileName, 
      fileSize, 
      category = 'general',
      description = '',
      metadata = {}
    } = event
    
    console.log('文件上传请求:', { fileType, fileName, fileSize, category })
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (fileType && !allowedTypes.includes(fileType)) {
      return {
        code: -1,
        message: '不支持的文件类型，仅支持 JPEG、PNG、GIF、WebP 格式',
        error: 'INVALID_FILE_TYPE',
        data: null
      }
    }
    
    // 验证文件大小（限制为 10MB）
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (fileSize && fileSize > maxSize) {
      return {
        code: -1,
        message: '文件大小不能超过 10MB',
        error: 'FILE_TOO_LARGE',
        data: null
      }
    }
    
    // 生成云端文件路径
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const fileExtension = fileName ? fileName.split('.').pop() : 'jpg'
    
    let cloudPath = ''
    switch (category) {
      case 'avatar':
        cloudPath = `avatars/${OPENID}/${timestamp}_${randomStr}.${fileExtension}`
        break
      case 'detection':
        cloudPath = `detections/${OPENID}/${timestamp}_${randomStr}.${fileExtension}`
        break
      case 'diary':
        cloudPath = `diaries/${OPENID}/${timestamp}_${randomStr}.${fileExtension}`
        break
      case 'product':
        cloudPath = `products/${timestamp}_${randomStr}.${fileExtension}`
        break
      default:
        cloudPath = `uploads/${OPENID}/${timestamp}_${randomStr}.${fileExtension}`
    }
    
    // 记录文件上传信息到数据库
    const uploadRecord = {
      userId: OPENID,
      fileName: fileName || `upload_${timestamp}.${fileExtension}`,
      fileType: fileType || 'image/jpeg',
      fileSize: fileSize || 0,
      cloudPath: cloudPath,
      category: category,
      description: description,
      metadata: metadata,
      uploadTime: new Date(),
      status: 'pending'
    }
    
    const recordResult = await db.collection('file_uploads').add({
      data: uploadRecord
    })
    
    const uploadId = recordResult._id
    
    // 返回上传配置信息（统一返回格式）
    return {
      code: 0,
      message: '获取上传配置成功',
      data: {
        uploadId: uploadId,
        cloudPath: cloudPath,
        maxSize: maxSize,
        allowedTypes: allowedTypes,
        uploadConfig: {
          env: cloud.DYNAMIC_CURRENT_ENV,
          timeout: 60000 // 60秒超时
        }
      }
    }
    
  } catch (error) {
    console.error('文件上传配置失败:', error)
    return {
      code: -1,
      message: '获取上传配置失败，请重试',
      error: error.message,
      data: null
    }
  }
}