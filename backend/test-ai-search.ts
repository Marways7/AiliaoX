/**
 * AI搜索功能测试脚本
 */

async function testAISearch() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTUzajBodDcwMDAwMTIyaDR1dHUxcjB6IiwidXNlcm5hbWUiOiJ6aGFuZ3NhbiIsInJvbGUiOiJET0NUT1IiLCJpYXQiOjE3Mzg0MzU5NjUsImV4cCI6MTczODUyMjM2NX0.lLmYr_VB7nRTOVl-vFQr0P4i3b82P31l_qS4y_p0VFo'; // 从localStorage获取

  try {
    console.log('Testing AI Search API...');
    const response = await fetch('http://localhost:3000/api/v1/medical-records/ai-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query: '发烧',
        limit: 10
      })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (data.success && data.data) {
      console.log('\n✅ AI Search API is working!');
      console.log('Records found:', data.data.records?.length || 0);
      console.log('Relevance scores:', data.data.relevanceScores?.length || 0);
      console.log('Explanation:', data.data.explanation);
    } else {
      console.log('\n❌ AI Search API returned unexpected data');
    }
  } catch (error) {
    console.error('❌ Error testing AI Search:', error);
  }
}

testAISearch();
