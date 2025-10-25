// index.js
Page({
  data: {
    
  },

  onLoad() {
    console.log('首页加载完成');
  },

  // 跳转到皮肤检测页面
  goToDetection() {
    wx.navigateTo({
      url: '/pages/detection/detection'
    });
  },

  // 跳转到护肤日记页面
  goToDiary() {
    wx.switchTab({
      url: '/pages/diary/diary'
    });
  },

  // 跳转到产品推荐页面
  goToProducts() {
    wx.switchTab({
      url: '/pages/products/products'
    });
  }
})
