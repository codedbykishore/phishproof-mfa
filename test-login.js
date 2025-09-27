// Test script to debug WebAuthn authentication
import fetch from 'node-fetch';

async function testLogin() {
  try {
    console.log('Testing password login...');
    
    // Step 1: Password login
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'kishore',
        password: 'password'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));
    
    if (loginData.success) {
      console.log('Password login successful, WebAuthn challenge received');
      
      // Create a mock WebAuthn response for testing
      const mockCredential = {
        id: "Wk18HFr-MyVHNqMK0XBjEQ",
        rawId: "Wk18HFr-MyVHNqMK0XBjEQ",
        response: {
          authenticatorData: "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MFAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
          clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiVk5oTGFJRklVRVEwUm1Sb1dFeFBZM2RKZEVVemJITktaazVuVjNWRFUwOUpSZz09IiwicmVwcm9jZXNzZWRfY2xpZW50X2RhdGEiOnRydWV9",
          signature: "MEUCIQDTGVxqmkOKKXKATJ1YmkMhx0RVvDZJqjy4YvYLaJe1tQIgUc2UNzDLkDQm7oNY8F5Kn2YnR6QJVS1KWjdyDlV0y6Q=",
          userHandle: ""
        },
        type: "public-key"
      };
      
      console.log('Testing WebAuthn verification with mock credential...');
      
      const verifyResponse = await fetch('http://localhost:3000/api/webauthn/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: mockCredential,
          challenge: loginData.challenge
        })
      });
      
      const verifyData = await verifyResponse.json();
      console.log('Verify response:', JSON.stringify(verifyData, null, 2));
      
    } else {
      console.log('Password login failed:', loginData.error);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testLogin();