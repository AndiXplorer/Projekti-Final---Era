const API_URL = 'http://localhost:3000';

// Signup
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.onsubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
      })
    });
    const data = await res.json();
    if (res.ok) window.location.href = 'login.html';
    else alert(data.message || data.error);
  };
}

// Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
      })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
      window.location.href = 'choose-pet.html';
    } else {
      alert(data.message || data.error);
    }
  };
}

// Assign Pet
async function assignPet(petChoice) {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const res = await fetch(`${API_URL}/assign-pet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, petChoice })
  });
  const data = await res.json();
  if (res.ok) window.location.href = 'dashboard.html';
  else alert(data.error);
}

// Dashboard
const userData = document.getElementById('userData');
if (userData) {
  const userId = localStorage.getItem('userId');
  fetch(`${API_URL}/user/${userId}`)
    .then(res => res.json())
    .then(user => {
      userData.innerHTML = `
        <p><strong>Username:</strong> ${user.username}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        ${user.pet ? `
          <p><strong>Pet Type:</strong> ${user.pet.type}</p>
          <p><strong>Hunger:</strong> ${user.pet.hunger}</p>
          <img src="${user.pet.photo}" alt="${user.pet.type}" style="max-width:200px;" />
        ` : '<p>No pet assigned yet.</p>'}
      `;
    });
}

// Logout
function logout() {
  localStorage.clear();
  window.location.href = 'login.html';
}
