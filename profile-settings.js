const usersStorageKey = 'userAccountsData';
let allUsers = [];
let currentUser = null;
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Google Sheets functions
async function callGoogleSheets(action, sheetName, data = null) {
  try {
    const params = new URLSearchParams({
      action,
      sheet: sheetName,
      ...(data && { data: JSON.stringify(data) })
    });
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    return await response.json();
  } catch (error) {
    console.error('Error calling Google Sheets:', error);
    return { success: false, error: error.message };
  }
}

function mapUserToGS(item) {
  return {
    'Unique ID': item.__backendId,
    'نام کامل': item.fullName,
    'نام کاربری': item.username,
    'رمز عبور': item.password,
    'نقش': item.role,
    'موقعیت شغلی': item.position || 'نامشخص',
    'دیپارتمنت': item.department || 'نامشخص',
    'آدرس عکس': item.photo || ''
  };
}

async function loadUsers() {
  try {
    const stored = localStorage.getItem(usersStorageKey);
    allUsers = stored && stored !== 'undefined' ? JSON.parse(stored) : [];
    return allUsers;
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

async function saveUsers(users) {
  try {
    localStorage.setItem(usersStorageKey, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users:', error);
    showToast('خطا در ذخیره کاربران', '❌');
  }
}

// Upload photo to imgbb
async function uploadPhotoToImgBB(file) {
  const API_KEY = 'fdd337daacb1c2d5196f43b23400a246';

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    if (result.success && result.data && result.data.url) {
      return result.data.url;
    }
    throw new Error('آپلود عکس ناموفق بود');
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
}

// Temporary solution: save photo as base64 in localStorage
async function savePhotoAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      // Limit size to avoid localStorage quota issues
      if (e.target.result.length > 2000000) { // 2MB limit
        reject(new Error('حجم عکس خیلی زیاد است. لطفاً عکسی با حجم کمتر انتخاب کنید.'));
        return;
      }
      resolve(e.target.result);
    };
    reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
    reader.readAsDataURL(file);
  });
}

function previewPhoto(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById('preview-img').src = e.target.result;
      document.getElementById('photo-preview').classList.remove('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function updateProfile(event) {
  event.preventDefault();

  const fullName = document.getElementById('profile-fullname').value.trim();
  const newPassword = document.getElementById('profile-password').value;
  const photoInput = document.getElementById('profile-photo');

  if (!fullName) {
    showToast('لطفاً نام کامل را وارد کنید', '⚠️');
    return;
  }

  if (!currentUser) {
    showToast('کاربر یافت نشد', '❌');
    return;
  }

  // آپدیت کاربر
  currentUser.fullName = fullName;
  // فقط اگر رمز جدید وارد شده باشد، آپدیت شود
  if (newPassword && newPassword.trim() !== '') {
    currentUser.password = newPassword;
  }

  // ذخیره عکس اگر انتخاب شده باشد
  if (photoInput.files && photoInput.files[0]) {
    try {
      showToast('در حال آپلود عکس...', '⏳');
      const photoUrl = await uploadPhotoToImgBB(photoInput.files[0]);
      currentUser.photo = photoUrl;
    } catch (error) {
      showToast('خطا در آپلود عکس: ' + error.message, '❌');
      return;
    }
  }

  // ذخیره در allUsers
  const userIndex = allUsers.findIndex(u => u.__backendId === currentUser.__backendId);
  if (userIndex !== -1) allUsers[userIndex] = currentUser;
  await saveUsers(allUsers);

  // همگام‌سازی با Google Sheets (بدون عکس، فقط آپلود آدرس)
  const gsData = mapUserToGS(currentUser);
  await callGoogleSheets('update', 'accounts', gsData);

  // آپدیت session
  let session = JSON.parse(localStorage.getItem('session') || '{}');
  session.fullName = fullName;
  session.photo = currentUser.photo || '';
  localStorage.setItem('session', JSON.stringify(session));

  showToast('پروفایل با موفقیت به‌روزرسانی شد!', '✅');
  setTimeout(() => navigateTo('./index.html'), 1500);
}

// فشرده‌سازی عکس
function readFileAsBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        const maxSize = 600;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height = Math.round(height * maxSize / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round(width * maxSize / height);
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function showToast(message, icon = '✅') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toast-message').textContent = message;
  document.getElementById('toast-icon').textContent = icon;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 3000);
}

function navigateTo(path) {
  window.location.href = path;
}
function logout() {
  localStorage.removeItem('session');
  navigateTo('./login.html');  // درست شد!
}

function updateDateTime() {
  const dateElement = document.getElementById('current-date');
  if (dateElement) {
    const now = new Date();
    dateElement.textContent = now.toLocaleDateString('fa-IR');
  }
}

async function initProfilePage() {
  const sessionStr = localStorage.getItem('session');
  if (!sessionStr) return navigateTo('./login.html');

  let session;
  try { session = JSON.parse(sessionStr); } catch { return navigateTo('./login.html'); }

  if (!session.loggedIn) return navigateTo('./login.html');

  await loadUsers();
  currentUser = allUsers.find(u => u.username === session.username);
  if (!currentUser) return navigateTo('./login.html');

  document.getElementById('profile-fullname').value = currentUser.fullName || '';
  // نمایش رمز عبور فعلی
  document.getElementById('profile-password').value = currentUser.password || '';

  // Load photo from session first (most recent), then from currentUser
  const photoUrl = session.photo || currentUser.photo;
  if (photoUrl) {
    document.getElementById('preview-img').src = photoUrl;
    document.getElementById('photo-preview').classList.remove('hidden');
  }

  // Make photo preview clickable
  const photoPreview = document.getElementById('photo-preview');
  const photoInput = document.getElementById('profile-photo');
  if (photoPreview && photoInput) {
    photoPreview.style.cursor = 'pointer';
    photoPreview.title = 'برای تغییر عکس کلیک کنید';
    photoPreview.addEventListener('click', () => {
      photoInput.click();
    });
  }

  // updateDateTime(); // Commented out as current-date element doesn't exist in HTML
  // setInterval(updateDateTime, 60000);
}

document.addEventListener('DOMContentLoaded', initProfilePage);
