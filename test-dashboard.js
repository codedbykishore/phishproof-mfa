import fetch from 'node-fetch';

async function testDashboard() {
  console.log('Testing dashboard API with login session...');
  
  try {
    // First login to get token
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'kishore',
        password: 'testpass'
      })
    });

    console.log('Login response status:', loginResponse.status);
    console.log('Login response headers:', Object.fromEntries(loginResponse.headers));
    
    const loginText = await loginResponse.text();
    console.log('Login response body:', loginText.substring(0, 200));
    
    let loginData;
    try {
      loginData = JSON.parse(loginText);
    } catch (e) {
      console.log('Failed to parse login response as JSON');
      return;
    }
    console.log('Login response:', JSON.stringify(loginData, null, 2));
    
    if (!loginData.success) {
      console.log('Login failed, cannot test dashboard');
      return;
    }
    
    // Store the JWT token from the response
    const authToken = loginResponse.headers.get('set-cookie')
      ?.split(';')[0]
      ?.replace('token=', '');
    
    if (!authToken) {
      console.log('No auth token received from login');
      return;
    }

    console.log('Auth token received, testing dashboard...');
    
    // Now test dashboard with token
    const dashboardResponse = await fetch('http://localhost:3000/api/dashboard', {
      method: 'GET',
      headers: {
        'Cookie': `token=${authToken}`
      }
    });

    const dashboardData = await dashboardResponse.json();
    console.log('Dashboard response:', JSON.stringify(dashboardData, null, 2));
    
    if (dashboardData.success && dashboardData.user.lastLogin) {
      console.log('✅ Last login field is present:', dashboardData.user.lastLogin);
    } else {
      console.log('❌ Last login field issue:', dashboardData.user?.lastLogin);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testDashboard();