// Node.js 环境下的云函数测试脚本
// 模拟微信小程序环境

// 模拟 wx 对象
global.wx = {
  cloud: {
    callFunction: function(options) {
      console.log('模拟云函数调用:', options.name, options.data);
      
      // 模拟云函数返回结果
      const mockResults = {
        diaryStats: {
          result: {
            code: 0,
            message: '获取成功',
            data: {
              totalDays: 15,
              averageScore: 7.2,
              skinTypeDistribution: {
                oily: 5,
                dry: 3,
                combination: 7
              },
              recentTrend: 'improving'
            }
          }
        },
        getUserProducts: {
          result: {
            code: 0,
            message: '获取成功',
            data: {
              products: [
                {
                  id: 'prod_001',
                  name: '温和洁面乳',
                  brand: '兰蔻',
                  category: 'cleanser',
                  usage: 'daily'
                }
              ],
              total: 1
            }
          }
        },
        api_products: {
          result: {
            code: 0,
            message: '获取成功',
            data: {
              products: [
                {
                  id: 'prod_001',
                  name: '温和洁面乳',
                  brand: '兰蔻',
                  category: 'cleanser',
                  usage: 'daily'
                }
              ],
              total: 1
            }
          }
        },
        productsSearch: {
          result: {
            code: 0,
            message: '搜索成功',
            data: {
              products: [
                {
                  id: 'prod_002',
                  name: '控油爽肤水',
                  brand: '雅诗兰黛',
                  category: 'toner'
                }
              ],
              total: 1,
              page: 1,
              limit: 10
            }
          }
        }
      };
      
      // 模拟异步调用
      setTimeout(() => {
        const result = mockResults[options.name] || {
          result: {
            code: -1,
            message: '云函数不存在'
          }
        };
        
        if (result.result.code === 0) {
          options.success && options.success(result);
        } else {
          options.fail && options.fail(result);
        }
      }, 100);
    }
  },
  showToast: function(options) {
    console.log('Toast:', options.title);
  }
};

// 模拟 getApp 函数
global.getApp = function() {
  return {
    globalData: {
      cloudEnabled: true,
      userInfo: null,
      config: require('./utils/config.js')
    }
  };
};

// 导入测试模块
const { runAllTests } = require('./test_cloud_functions.js');

// 运行测试
console.log('在 Node.js 环境中测试云函数...\n');
runAllTests().then(results => {
  console.log('\n测试完成！');
  process.exit(0);
}).catch(error => {
  console.error('测试过程中发生错误:', error);
  process.exit(1);
});