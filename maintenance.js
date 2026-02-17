// maintenance.js - توابع مربوط به بخش تعمیرات

// تنظیمات صفحه تعمیرات
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof showLoading === 'function') {
    showLoading();
  }

  try {
    updateDateTime();
  } finally {
    if (typeof hideLoading === 'function') {
      hideLoading();
    }
  }
});

// آپدیت تاریخ و زمان
function updateDateTime() {
  const now = new Date();
  const weekday = now.toLocaleString('en-US', { weekday: 'short' });
  const month = now.toLocaleString('en-US', { month: 'short' });
  const day = now.getDate();
  const year = now.getFullYear();
  const formatted = `${weekday}, ${month}, ${day}, ${year}`;
  
  const dateElement = document.getElementById('current-date');
  if (dateElement) {
    dateElement.textContent = formatted;
  }
}

// توابع مربوط به نظریات تعمیرات
function openMaintenanceFeedback() {
  navigateTo('./maintenance-feedback.html');
}

// توابع مربوط به موبایل موتور سکیل‌ها
function openMaintenanceMobile() {
  navigateTo('./maintenance-mobile.html');
}