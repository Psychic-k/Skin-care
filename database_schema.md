# 云数据库集合结构设计

基于 data_test 目录中的测试数据，设计以下数据库集合结构：

## 1. users 集合 - 用户信息

```javascript
{
  _id: ObjectId,
  openid: String,           // 微信用户唯一标识
  unionid: String,          // 微信开放平台唯一标识（可选）
  nickName: String,         // 用户昵称
  avatarUrl: String,        // 头像URL
  gender: Number,           // 性别：0-未知，1-男，2-女
  city: String,             // 城市
  province: String,         // 省份
  country: String,          // 国家
  skinType: String,         // 肌肤类型：oily, dry, combination, sensitive, normal
  skinConcerns: [String],   // 肌肤问题：acne, pores, aging, dryness, sensitivity等
  birthDate: Date,          // 出生日期
  registrationDate: Date,   // 注册时间
  lastLoginDate: Date,      // 最后登录时间
  memberLevel: String,      // 会员等级：basic, premium, vip
  points: Number,           // 积分
  isExpert: Boolean,        // 是否为专家用户
  expertLevel: Number       // 专家等级
}
```

**索引设计：**
- `openid`: 唯一索引
- `unionid`: 普通索引
- `lastLoginDate`: 普通索引
- `memberLevel`: 普通索引

## 2. detections 集合 - 皮肤检测记录

```javascript
{
  _id: ObjectId,
  userId: String,           // 用户ID（关联users集合的openid）
  detectionType: String,    // 检测类型：face, eye, comprehensive
  imageUrl: String,         // 检测图片URL
  detectionDate: Date,      // 检测时间
  results: {
    overallScore: Number,   // 总体评分 (0-100)
    skinAge: Number,        // 肌肤年龄
    skinType: String,       // 检测出的肌肤类型
    issues: [{
      type: String,         // 问题类型：acne, pores, fine_lines, dryness等
      severity: String,     // 严重程度：mild, moderate, severe
      score: Number,        // 问题评分
      description: String   // 问题描述
    }],
    skinMetrics: {
      moisture: Number,     // 水分值 (0-100)
      oiliness: Number,     // 油脂值 (0-100)
      elasticity: Number,   // 弹性值 (0-100)
      pigmentation: Number, // 色素值 (0-100)
      pores: Number         // 毛孔值 (0-100)
    }
  },
  recommendations: [{
    category: String,       // 产品类别：cleanser, toner, serum, moisturizer等
    productIds: [String],   // 推荐产品ID列表
    advice: String          // 使用建议
  }],
  aiAnalysisData: {
    confidence: Number,     // AI分析置信度 (0-1)
    processingTime: Number, // 处理时间（秒）
    modelVersion: String    // 模型版本
  }
}
```

**索引设计：**
- `userId`: 普通索引
- `detectionDate`: 普通索引
- `detectionType`: 普通索引
- `userId + detectionDate`: 复合索引

## 3. products 集合 - 产品信息

```javascript
{
  _id: ObjectId,
  name: String,             // 产品名称
  brand: String,            // 品牌
  category: String,         // 主分类：cleanser, toner, serum, moisturizer, sunscreen等
  subCategory: String,      // 子分类：泡沫洁面, 收敛水等
  description: String,      // 产品描述
  imageUrl: String,         // 产品图片URL
  price: {
    min: Number,            // 最低价格
    max: Number,            // 最高价格
    currency: String        // 货币单位
  },
  volume: String,           // 容量规格
  suitableSkinTypes: [String], // 适合肌肤类型
  skinConcerns: [String],   // 针对的肌肤问题
  ingredients: [{
    name: String,           // 成分中文名
    englishName: String,    // 成分英文名
    concentration: String,  // 浓度
    function: String,       // 功效
    safetyLevel: String,    // 安全等级：safe, caution, avoid
    description: String     // 成分描述
  }],
  usage: {
    frequency: String,      // 使用频率：daily, weekly等
    timeOfDay: String,      // 使用时间：morning, evening, both
    instructions: String    // 使用说明
  },
  ratings: {
    average: Number,        // 平均评分
    count: Number           // 评价数量
  },
  tags: [String],           // 产品标签
  createdDate: Date,        // 创建时间
  updatedDate: Date,        // 更新时间
  isActive: Boolean         // 是否有效
}
```

**索引设计：**
- `category`: 普通索引
- `brand`: 普通索引
- `suitableSkinTypes`: 普通索引
- `skinConcerns`: 普通索引
- `isActive`: 普通索引

## 4. diaries 集合 - 护肤日记

```javascript
{
  _id: ObjectId,
  userId: String,           // 用户ID
  date: String,             // 日期 (YYYY-MM-DD格式)
  morningRoutine: [{
    productId: String,      // 产品ID
    productName: String,    // 产品名称
    usage: String,          // 用量
    notes: String           // 使用感受
  }],
  eveningRoutine: [{
    productId: String,      // 产品ID
    productName: String,    // 产品名称
    usage: String,          // 用量
    notes: String           // 使用感受
  }],
  skinCondition: {
    moisture: Number,       // 水分状态 (1-10)
    oiliness: Number,       // 出油状态 (1-10)
    sensitivity: Number,    // 敏感状态 (1-10)
    breakouts: Number,      // 痘痘状态 (1-10)
    overall: Number         // 整体状态 (1-10)
  },
  photos: [{
    url: String,            // 照片URL
    type: String,           // 照片类型：morning, evening
    timestamp: Date         // 拍摄时间
  }],
  notes: String,            // 日记备注
  weather: {
    temperature: Number,    // 温度
    humidity: Number,       // 湿度
    condition: String       // 天气状况
  },
  mood: String,             // 心情：good, neutral, bad
  createdDate: Date         // 创建时间
}
```

**索引设计：**
- `userId`: 普通索引
- `date`: 普通索引
- `userId + date`: 复合唯一索引

## 5. expert_tasks 集合 - 专家任务

```javascript
{
  _id: ObjectId,
  title: String,            // 任务标题
  description: String,      // 任务描述
  type: String,             // 任务类型：product_test, survey, review
  productIds: [String],     // 相关产品ID列表
  requirements: {
    skinTypes: [String],    // 要求的肌肤类型
    ageRange: [Number],     // 年龄范围 [min, max]
    duration: Number,       // 任务持续天数
    reportRequirements: [String] // 报告要求
  },
  rewards: {
    points: Number,         // 积分奖励
    products: [String],     // 产品奖励
    cash: Number            // 现金奖励
  },
  maxParticipants: Number,  // 最大参与人数
  currentParticipants: Number, // 当前参与人数
  startDate: Date,          // 开始时间
  endDate: Date,            // 结束时间
  status: String,           // 状态：active, completed, cancelled
  createdBy: String,        // 创建者ID
  createdDate: Date         // 创建时间
}
```

**索引设计：**
- `type`: 普通索引
- `status`: 普通索引
- `startDate`: 普通索引
- `endDate`: 普通索引

## 6. detection_reports 集合 - 检测报告（扩展）

```javascript
{
  _id: ObjectId,
  detectionId: String,      // 检测记录ID
  userId: String,           // 用户ID
  reportType: String,       // 报告类型：detailed, summary
  generatedDate: Date,      // 生成时间
  content: {
    analysis: String,       // 详细分析
    trends: [{
      metric: String,       // 指标名称
      trend: String,        // 趋势：improving, stable, declining
      recommendation: String // 建议
    }],
    comparison: {
      previousDetection: String, // 上次检测ID
      improvements: [String],    // 改善项
      concerns: [String]         // 关注项
    }
  },
  isShared: Boolean,        // 是否分享
  shareSettings: {
    public: Boolean,        // 是否公开
    allowComments: Boolean  // 是否允许评论
  }
}
```

**索引设计：**
- `detectionId`: 唯一索引
- `userId`: 普通索引
- `generatedDate`: 普通索引

## 数据库安全规则建议

1. **读权限**：用户只能读取自己的数据
2. **写权限**：用户只能创建和修改自己的数据
3. **管理员权限**：管理员可以管理所有数据
4. **产品数据**：所有用户可读，仅管理员可写

## 初始化脚本

建议创建数据库初始化脚本，包含：
1. 创建集合
2. 设置索引
3. 导入基础数据（产品信息等）
4. 配置安全规则