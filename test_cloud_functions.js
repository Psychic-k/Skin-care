// 测试新创建的云函数
const request = require('./utils/request.js');

// 模拟测试数据
const testUserId = 'user_001_id';

// 测试 diaryStats 云函数
async function testDiaryStats() {
  console.log('\n=== 测试 diaryStats 云函数 ===');
  try {
    const result = await request.get(`/api/diary/stats/${testUserId}`);
    console.log('diaryStats 测试结果:', JSON.stringify(result, null, 2));
    return result.code === 0;
  } catch (error) {
    console.error('diaryStats 测试失败:', error);
    return false;
  }
}

// 测试 getUserProducts 云函数
async function testGetUserProducts() {
  console.log('\n=== 测试 getUserProducts 云函数 ===');
  try {
    const result = await request.get('/api/products/user-products', {
      userId: testUserId,
      type: 'all',
      page: 1,
      limit: 10
    });
    console.log('getUserProducts 测试结果:', JSON.stringify(result, null, 2));
    return result.code === 0;
  } catch (error) {
    console.error('getUserProducts 测试失败:', error);
    return false;
  }
}

// 测试 productsSearch 云函数
async function testProductsSearch() {
  console.log('\n=== 测试 productsSearch 云函数 ===');
  try {
    // 测试关键词搜索
    const result1 = await request.get('/api/products/search', {
      keyword: '洁面',
      page: 1,
      limit: 10
    });
    console.log('productsSearch 关键词搜索测试结果:', JSON.stringify(result1, null, 2));
    
    // 测试分类搜索
    const result2 = await request.get('/api/products/search', {
      category: 'cleanser',
      page: 1,
      limit: 10
    });
    console.log('productsSearch 分类搜索测试结果:', JSON.stringify(result2, null, 2));
    
    // 测试品牌搜索
    const result3 = await request.get('/api/products/search', {
      brand: '兰蔻',
      page: 1,
      limit: 10
    });
    console.log('productsSearch 品牌搜索测试结果:', JSON.stringify(result3, null, 2));
    
    return result1.code === 0 && result2.code === 0 && result3.code === 0;
  } catch (error) {
    console.error('productsSearch 测试失败:', error);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('开始测试新创建的云函数...\n');
  
  const results = {
    diaryStats: await testDiaryStats(),
    getUserProducts: await testGetUserProducts(),
    productsSearch: await testProductsSearch()
  };
  
  console.log('\n=== 测试结果汇总 ===');
  console.log('diaryStats:', results.diaryStats ? '✅ 通过' : '❌ 失败');
  console.log('getUserProducts:', results.getUserProducts ? '✅ 通过' : '❌ 失败');
  console.log('productsSearch:', results.productsSearch ? '✅ 通过' : '❌ 失败');
  
  const allPassed = Object.values(results).every(result => result === true);
  console.log('\n总体结果:', allPassed ? '✅ 所有测试通过' : '❌ 部分测试失败');
  
  return results;
}

// 导出测试函数
module.exports = {
  testDiaryStats,
  testGetUserProducts,
  testProductsSearch,
  runAllTests
};

// 如果直接运行此文件，执行所有测试
if (require.main === module) {
  runAllTests().catch(console.error);
}