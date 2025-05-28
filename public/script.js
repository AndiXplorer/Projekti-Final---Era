const API_URL = 'http://localhost:3000';

// ======================
// AUTHENTICATION FUNCTIONS
// ======================

// Signup Function
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.onsubmit = async (e) => {
    e.preventDefault();
    try {
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
      if (res.ok) {
        showNotification('Account created successfully! Redirecting to login...', 'success');
        setTimeout(() => window.location.href = 'login.html', 1500);
      } else {
        showNotification(data.message || data.error, 'error');
      }
    } catch (err) {
      showNotification('Network error. Please try again.', 'error');
      console.error('Signup error:', err);
    }
  };
}

// Login Function
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    try {
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
        showNotification('Login successful! Redirecting...', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
      } else {
        showNotification(data.message || data.error, 'error');
      }
    } catch (err) {
      showNotification('Network error. Please try again.', 'error');
      console.error('Login error:', err);
    }
  };
}

// ======================
// DASHBOARD FUNCTIONS
// ======================

// Load User Data
async function loadUserData() {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  
  if (!userId || !token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (res.status === 401) {
      logout();
      return;
    }

    const user = await res.json();
    
    // Update username in header
    if (document.getElementById('username-display')) {
      document.getElementById('username-display').textContent = user.username;
    }
    
    // Update user info card
    if (document.getElementById('userData')) {
      document.getElementById('userData').innerHTML = `
        <p><span class="font-semibold">Username:</span> ${user.username}</p>
        <p><span class="font-semibold">Email:</span> ${user.email}</p>
        <p><span class="font-semibold">Member Since:</span> ${new Date(user.createdAt).toLocaleDateString()}</p>
      `;
    }

    // Update pet data if exists
    const petDataElement = document.getElementById('petData');
    if (petDataElement) {
      if (user.pet) {
        petDataElement.innerHTML = `
          <h4 class="pet-name">${user.pet.name || user.pet.type}</h4>
          <img src="${user.pet.photo}" alt="${user.pet.type}" class="pet-image" />
          <p class="pet-status">${getPetMood(user.pet.hunger)}</p>
        `;
        
        // Update stats
        updatePetStats(user.pet.hunger, user.pet.happiness || 75, user.pet.energy || 60);
        
        // Setup pet interaction buttons
        setupPetInteractions(userId);
      } else {
        petDataElement.innerHTML = `
          <div class="no-pet">
            <i class="fas fa-question-circle no-pet-icon"></i>
            <p>No pet assigned yet</p>
            <a href="choose-pet.html" class="btn assign-pet-btn">
              <i class="fas fa-plus"></i> Choose a Pet
            </a>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('Error loading user data:', err);
    showNotification('Error loading data. Please try again.', 'error');
  }
}

// Update Pet Stats Display
function updatePetStats(hunger, happiness, energy) {
  if (document.getElementById('hunger-value')) {
    document.getElementById('hunger-value').textContent = hunger;
    document.documentElement.style.setProperty('--hunger-value', `${hunger}%`);
  }
  
  if (document.getElementById('happiness-value')) {
    document.getElementById('happiness-value').textContent = happiness;
    document.documentElement.style.setProperty('--happiness-value', `${happiness}%`);
  }
  
  if (document.getElementById('energy-value')) {
    document.getElementById('energy-value').textContent = energy;
    document.documentElement.style.setProperty('--energy-value', `${energy}%`);
  }
}

// Get Pet Mood Text
function getPetMood(hunger) {
  if (hunger < 20) return "Starving! 😫 Feed me now!";
  if (hunger < 40) return "Very hungry 😟";
  if (hunger < 60) return "Could eat 😋";
  if (hunger < 80) return "Content 😊";
  return "Full and happy! 🥰";
}

// Setup Pet Interaction Buttons
function setupPetInteractions(userId) {
  const feedBtn = document.querySelector('.feed-btn');
  const playBtn = document.querySelector('.play-btn');
  const careBtn = document.querySelector('.care-btn');

  if (feedBtn) {
    feedBtn.addEventListener('click', () => interactWithPet(userId, 'feed'));
  }
  
  if (playBtn) {
    playBtn.addEventListener('click', () => interactWithPet(userId, 'play'));
  }
  
  if (careBtn) {
    careBtn.addEventListener('click', () => interactWithPet(userId, 'care'));
  }
}

// Interact with Pet (Feed/Play/Care)
async function interactWithPet(userId, action) {
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch(`${API_URL}/pet-interaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        action
      })
    });
    
    if (res.status === 401) {
      logout();
      return;
    }

    const data = await res.json();
    
    if (res.ok) {
      showNotification(`Pet ${action} successful!`, 'success');
      updatePetStats(data.hunger, data.happiness, data.energy);
      
      // Update pet mood text
      const petStatusElement = document.querySelector('.pet-status');
      if (petStatusElement) {
        petStatusElement.textContent = getPetMood(data.hunger);
      }
      
      // Add to activity log
      addActivityLog(action);
    } else {
      showNotification(data.message || 'Interaction failed', 'error');
    }
  } catch (err) {
    console.error('Pet interaction error:', err);
    showNotification('Network error. Please try again.', 'error');
  }
}

// Add to Activity Log
function addActivityLog(action) {
  const activityList = document.querySelector('.activity-list');
  if (!activityList) return;

  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  let actionText = '';
  let iconClass = '';
  
  switch(action) {
    case 'feed':
      actionText = 'Fed your pet';
      iconClass = 'fa-utensils';
      break;
    case 'play':
      actionText = 'Played with your pet';
      iconClass = 'fa-gamepad';
      break;
    case 'care':
      actionText = 'Took care of your pet';
      iconClass = 'fa-heart';
      break;
    default:
      return;
  }
  
  const newActivity = document.createElement('li');
  newActivity.innerHTML = `
    <i class="fas ${iconClass} activity-icon"></i> 
    ${actionText} at ${timeString}
  `;
  
  activityList.insertBefore(newActivity, activityList.firstChild);
  
  // Limit to 5 activities
  if (activityList.children.length > 5) {
    activityList.removeChild(activityList.lastChild);
  }
}

// ======================
// PET SELECTION FUNCTIONS
// ======================

// Assign Pet Function
async function assignPet(petChoice) {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  
  try {
    const res = await fetch(`${API_URL}/assign-pet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        userId, 
        petChoice,
        petName: document.getElementById('petName')?.value || petChoice
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showNotification(`Pet assigned successfully! Welcome your new ${petChoice}!`, 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 1500);
    } else {
      showNotification(data.error || 'Failed to assign pet', 'error');
    }
  } catch (err) {
    console.error('Assign pet error:', err);
    showNotification('Network error. Please try again.', 'error');
  }
}

// Setup Pet Selection Buttons
function setupPetSelection() {
  const petButtons = document.querySelectorAll('.pet-option');
  petButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Highlight selected pet
      petButtons.forEach(btn => btn.classList.remove('selected'));
      button.classList.add('selected');
      
      // Enable confirm button
      const confirmBtn = document.getElementById('confirmPet');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.onclick = () => assignPet(button.dataset.petType);
      }
    });
  });
}

// ======================
// UTILITY FUNCTIONS
// ======================

// Show Notification
function showNotification(message, type = 'info') {
  // Remove any existing notifications first
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button class="close-notification">&times;</button>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
  
  // Close button
  const closeBtn = notification.querySelector('.close-notification');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => notification.remove());
  }
}

// Logout Function
function logout() {
  localStorage.clear();
  showNotification('Logged out successfully. Redirecting...', 'info');
  setTimeout(() => window.location.href = 'login.html', 1000);
}

// Check Authentication
function checkAuth() {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  
  if (!token || !userId) {
    // If on a protected page, redirect to login
    if (!['login.html', 'signup.html'].includes(window.location.pathname.split('/').pop())) {
      window.location.href = 'login.html';
    }
  } else {
    // If on login/signup page but already authenticated, redirect to dashboard
    if (['login.html', 'signup.html'].includes(window.location.pathname.split('/').pop())) {
      window.location.href = 'dashboard.html';
    }
  }
}

// ======================
// INITIALIZATION
// ======================

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication state
  checkAuth();
  
  // Load dashboard if on dashboard page
  if (document.getElementById('userData')) {
    loadUserData();
  }
  
  // Setup pet selection if on choose-pet page
  if (document.querySelector('.pet-option')) {
    setupPetSelection();
  }
  
  // Add notification styles dynamically
  const style = document.createElement('style');
  style.textContent = `
    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 5px;
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      transform: translateX(0);
      transition: transform 0.3s ease, opacity 0.3s ease;
    }
    
    .notification.success {
      background-color: var(--success);
    }
    
    .notification.error {
      background-color: var(--danger);
    }
    
    .notification.info {
      background-color: var(--primary);
    }
    
    .close-notification {
      background: none;
      border: none;
      color: white;
      font-size: 1.2rem;
      cursor: pointer;
      margin-left: 15px;
    }
    
    .fade-out {
      opacity: 0;
      transform: translateX(100px);
    }
  `;
  document.head.appendChild(style);
});