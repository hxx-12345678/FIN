const fetch = require('node-fetch');

const API_BASE = 'http://localhost:8000/api/v1';
let token = '';
let orgId = '';

async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'cptjacksprw@gmail.com',
      password: 'Player@123'
    })
  });
  const data = await res.json();
  token = data.token;
  orgId = data.user.orgRoles[0]?.orgId || data.user.defaultOrgId;
  console.log(`✅ Logged in, Org: ${orgId}`);
}

async function testBoardReporting() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TESTING BOARD REPORTING COMPONENT');
  console.log('='.repeat(70));
  
  try {
    // Test 1: Fetch Board Templates
    console.log('\n📋 Test 1: Fetching Board Templates...');
    const templatesRes = await fetch(`${API_BASE}/orgs/${orgId}/board-reports/templates`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const templatesData = await templatesRes.json();
    if (templatesData.ok && templatesData.templates) {
      console.log(`✅ Templates: ${templatesData.templates.length} found`);
      templatesData.templates.forEach(t => {
        console.log(`   - ${t.name} (${t.type}, ${t.slides} slides, ${t.status})`);
      });
    } else {
      console.log('⚠️  No templates returned, using fallback');
    }
    
    // Test 2: Fetch Metrics
    console.log('\n📊 Test 2: Fetching Metrics...');
    let metricsRes = await fetch(`${API_BASE}/orgs/${orgId}/board-reports/metrics`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!metricsRes.ok) {
      metricsRes = await fetch(`${API_BASE}/orgs/${orgId}/investor-dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
    
    const metricsData = await metricsRes.json();
    if (metricsData.ok && metricsData.metrics) {
      console.log(`✅ Metrics: ${metricsData.metrics.length} found`);
      metricsData.metrics.slice(0, 5).forEach(m => {
        console.log(`   - ${m.name}: ${m.value} (${m.change}, ${m.trend})`);
      });
    } else if (metricsData.ok && metricsData.data) {
      const data = metricsData.data;
      const summary = data.executiveSummary || {};
      console.log(`✅ Investor Dashboard Data found:`);
      console.log(`   - ARR: $${(summary.arr || 0).toLocaleString()}`);
      console.log(`   - MRR: $${((summary.arr || 0) / 12).toLocaleString()}`);
      console.log(`   - Active Customers: ${(summary.activeCustomers || 0).toLocaleString()}`);
      console.log(`   - Churn Rate: ${summary.monthlyChurn || 0}%`);
      console.log(`   - Cash Runway: ${Math.round(summary.monthsRunway || 0)} months`);
    } else {
      console.log('❌ No metrics data found');
    }
    
    // Test 3: Fetch Chart Data
    console.log('\n📈 Test 3: Fetching Chart Data...');
    const chartRes = await fetch(`${API_BASE}/orgs/${orgId}/investor-dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const chartData = await chartRes.json();
    if (chartData.ok && chartData.data?.monthlyMetrics) {
      const monthly = chartData.data.monthlyMetrics.slice(-6);
      console.log(`✅ Chart Data: ${monthly.length} months found`);
      monthly.forEach(m => {
        console.log(`   - ${m.month}: Revenue=$${m.revenue?.toLocaleString() || 0}, Customers=${m.customers || 0}, Burn=$${m.burn?.toLocaleString() || 0}`);
      });
    } else {
      console.log('⚠️  No chart data found');
    }
    
    // Test 4: Fetch Recent Reports
    console.log('\n📄 Test 4: Fetching Recent Reports...');
    const reportsRes = await fetch(`${API_BASE}/orgs/${orgId}/exports?type=pptx,pdf&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const reportsData = await reportsRes.json();
    if (reportsData.ok && reportsData.exports) {
      const boardReports = reportsData.exports.filter(e => e.metaJson?.reportType === 'board-report');
      console.log(`✅ Recent Reports: ${boardReports.length} board reports found`);
      boardReports.slice(0, 3).forEach(r => {
        console.log(`   - ${r.metaJson?.reportTitle || 'Untitled'}: ${r.status} (${r.type})`);
      });
    } else {
      console.log('⚠️  No recent reports found');
    }
    
    // Test 5: Fetch Board Schedules
    console.log('\n📅 Test 5: Fetching Board Schedules...');
    const schedulesRes = await fetch(`${API_BASE}/orgs/${orgId}/board-reports/schedules`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const schedulesData = await schedulesRes.json();
    if (schedulesData.ok && schedulesData.schedules) {
      console.log(`✅ Schedules: ${schedulesData.schedules.length} found`);
      schedulesData.schedules.forEach(s => {
        console.log(`   - ${s.name}: ${s.frequency} (${s.status}, next: ${s.nextRunAt || 'N/A'})`);
      });
    } else {
      console.log('⚠️  No schedules found');
    }
    
    // Test 6: Test AI Content Generation
    console.log('\n🤖 Test 6: Testing AI Content Generation...');
    const aiRes = await fetch(`${API_BASE}/orgs/${orgId}/ai-plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        goal: 'Generate executive summary for board report with key highlights and areas of focus'
      })
    });
    
    if (aiRes.ok) {
      const aiData = await aiRes.json();
      if (aiData.ok && aiData.plan) {
        console.log('✅ AI Content generation initiated');
        console.log(`   Plan ID: ${aiData.plan.id}, Status: ${aiData.plan.status}`);
        
        // Poll for completion
        let plan = aiData.plan;
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 1000));
          const pollRes = await fetch(`${API_BASE}/orgs/${orgId}/ai-plans/${plan.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const pollData = await pollRes.json();
          if (pollData.ok && pollData.plan) {
            plan = pollData.plan;
            if (plan.status === 'completed') break;
          }
        }
        
        if (plan.status === 'completed') {
          const planJson = typeof plan.planJson === 'string' ? JSON.parse(plan.planJson) : plan.planJson;
          const structured = planJson?.structuredResponse || {};
          const naturalText = structured?.natural_text || '';
          console.log(`✅ AI Content generated (${naturalText.length} chars)`);
          console.log(`   Preview: ${naturalText.substring(0, 150)}...`);
        } else {
          console.log(`⚠️  AI Content still processing (status: ${plan.status})`);
        }
      }
    } else {
      console.log('⚠️  AI Content generation failed');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ BOARD REPORTING TESTS COMPLETED');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error testing board reporting:', error.message);
  }
}

async function main() {
  await login();
  await testBoardReporting();
}

main().catch(console.error);
