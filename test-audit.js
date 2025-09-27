import fetch from 'node-fetch';

async function testAuditData() {
  console.log('Testing audit data structure...');
  
  try {
    // Login first to get session
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'hello',
        password: 'password'
      })
    });

    // Get the session token from cookie
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Login cookies:', cookies);

    if (loginResponse.status !== 200) {
      console.log('Login failed with status:', loginResponse.status);
      return;
    }

    // Now test audit endpoint
    const auditResponse = await fetch('http://localhost:3000/api/audit?limit=3', {
      method: 'GET',
      headers: {
        'Cookie': cookies || ''
      }
    });

    const auditData = await auditResponse.json();
    console.log('Audit response status:', auditResponse.status);
    console.log('Audit data structure:', JSON.stringify(auditData, null, 2));
    
    if (auditData.success && auditData.events && auditData.events.length > 0) {
      console.log('First event keys:', Object.keys(auditData.events[0]));
      console.log('First event event_type:', auditData.events[0].event_type);
      console.log('First event eventType:', auditData.events[0].eventType);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testAuditData();