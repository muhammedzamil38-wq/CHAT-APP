async function testRegister() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test_${Date.now()}@example.com`,
        password: 'password123',
        username: 'testuser'
      })
    });
    const data = await res.json();
    if (res.ok) {
      console.log('Success:', data);
    } else {
      console.error('Error:', data);
    }
  } catch (err) {
    console.error('Fetch Error:', err.message);
  }
}

testRegister();
