// feedback.js

let currentFeedbackType = '';

function generateFeedbackId() {
  if (typeof generateId === 'function') {
    return generateId();
  }
  return `fb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function waitForFeedbackPrerequisites(timeoutMs = 10000) {
  const start = Date.now();
  while (!window.currentUser && Date.now() - start < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 120));
  }
}

function formatFeedbackDisplayTime(item) {
  const raw = item.timestamp || item.date || '';
  if (!raw) return 'نامشخص';

  // If already stored as time-only, show it directly.
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(String(raw).trim())) {
    return String(raw).trim();
  }

  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) {
    // Try parsing date+time from separate fields, then return only time.
    const combined = parseFeedbackDateTime(item);
    if (combined > 0) {
      const dt2 = new Date(combined);
      return dt2.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }
    return raw;
  }

  return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatFeedbackTimestampForStorage(dateObj = new Date()) {
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function parseDatePart(rawDate) {
  if (!rawDate) return null;
  const text = String(rawDate).trim();

  const isoDate = Date.parse(text);
  if (!Number.isNaN(isoDate)) {
    const d = new Date(isoDate);
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }

  const ymd = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (ymd) {
    return { y: Number(ymd[1]), m: Number(ymd[2]), d: Number(ymd[3]) };
  }

  const mdy = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (mdy) {
    return { y: Number(mdy[3]), m: Number(mdy[1]), d: Number(mdy[2]) };
  }

  return null;
}

function parseTimePart(rawTime) {
  if (!rawTime) return { hh: 0, mm: 0, ss: 0 };
  const text = String(rawTime).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return { hh: 0, mm: 0, ss: 0 };
  return {
    hh: Number(match[1]),
    mm: Number(match[2]),
    ss: Number(match[3] || '00')
  };
}

function parseFeedbackDateTime(item) {
  if (!item) return 0;
  const datePart = parseDatePart(item.date);
  if (!datePart) return 0;
  const timePart = parseTimePart(item.timestamp);
  return new Date(datePart.y, datePart.m - 1, datePart.d, timePart.hh, timePart.mm, timePart.ss).getTime();
}

// شروع ثبت گزارش جدید
async function startNewReport(type) {
  currentFeedbackType = type;

  document.getElementById('feedback-type').value = type;
  document.getElementById('modal-title').textContent = 
    type === 'پیشنهاد' ? 'ثبت پیشنهاد' : 'ثبت نظریه / مشکلات';
  
  document.getElementById('content-label').textContent = 
    type === 'پیشنهاد' ? 'متن پیشنهاد' : 'متن نظریه یا مشکلات';

  // اطلاعات کاربر جاری
  const user = window.currentUser || {};
  document.getElementById('reporter-name').textContent = user.fullName || 'نامشخص';
  document.getElementById('reporter-dept').textContent = user.department || 'نامشخص';

  // نمایش فیلد موتور سکیل فقط برای "نظریه"
  const motorcycleField = document.getElementById('motorcycle-field');
  if (type === 'نظریه') {
    motorcycleField.style.display = 'block';
    // نمایش لودینگ در select
    const select = document.getElementById('feedback-motorcycle');
    select.innerHTML = '<option value="">⏳ در حال بارگذاری موتور سکیل‌ها...</option>';
    select.disabled = true;
    
    // نمایش لودینگ صفحه
    if (typeof showLoading === 'function') {
      showLoading();
    }
  } else {
    motorcycleField.style.display = 'none';
  }

  document.getElementById('new-feedback-modal').classList.add('active');
  
  // بارگذاری موتور سکیل‌ها بعد از باز شدن مودال
  if (type === 'نظریه') {
    try {
      await populateMotorcycleSelect();
    } finally {
      // مخفی کردن لودینگ بعد از اتمام بارگذاری
      if (typeof hideLoading === 'function') {
        hideLoading();
      }
    }
  }
  
  document.getElementById('feedback-content').focus();
}

// پر کردن لیست کشویی موتور سکیل‌ها
async function populateMotorcycleSelect() {
  const select = document.getElementById('feedback-motorcycle');
  
  // نمایش پیام در حال بارگذاری
  select.innerHTML = '<option value="">⏳ در حال بارگذاری موتور سکیل‌ها...</option>';
  select.disabled = true;
  
  try {
    // تلاش برای بارگذاری موتور سکیل‌ها با retry
    let motorcycles = [];
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts && motorcycles.length === 0) {
      attempts++;
      
      // اطمینان از بارگذاری موتور سکیل‌ها از گوگل شیت
      if (typeof syncMotorcyclesWithGoogleSheets === 'function' && window.allData) {
        await syncMotorcyclesWithGoogleSheets(allData);
      }
      
      // بررسی موتور سکیل‌ها در allData
      motorcycles = allData.filter(d => d.type === 'motorcycle');
      
      // اگر موتور سکیلی پیدا نشد و تلاش‌ها تمام نشده، کمی صبر کن
      if (motorcycles.length === 0 && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    select.innerHTML = '<option value="">🏍️ موتور سکیل را انتخاب کنید</option>';
    
    if (motorcycles.length === 0) {
      select.innerHTML = '<option value="">⚠️ هیچ موتور سکیلی یافت نشد</option>';
      select.disabled = false;
      return;
    }
    
    motorcycles.forEach(m => {
      const colorName = m.motorcycleColor || 'نامشخص';
      const colorHex = getColorHex(m.motorcycleColor);
      select.innerHTML += `
        <option value="${m.__backendId}" data-color="${colorHex}" data-dept="${m.motorcycleDepartment || ''}">
          🏍️ ${m.motorcycleName} | 🎨 ${colorName} | 🏭 ${m.motorcycleDepartment || 'نامشخص'} | 🔢 ${m.motorcyclePlate}
        </option>`;
    });
    
    // فعال کردن select بعد از بارگذاری
    select.disabled = false;
    
    // اضافه کردن style برای نمایش رنگ در select
    updateSelectStyle();
    
    // حذف event listener قبلی برای جلوگیری از تکرار
    select.removeEventListener('change', updateSelectStyle);
    select.addEventListener('change', updateSelectStyle);
  } catch (error) {
    console.error('خطا در بارگذاری موتور سکیل‌ها:', error);
    select.innerHTML = '<option value="">❌ خطا در بارگذاری</option>';
    select.disabled = false;
  }
}

// تبدیل نام رنگ به کد هگز
function getColorHex(colorName) {
  const colorMap = {
    'سیاه': '#1a1a1a',
    'سفید': '#ffffff',
    'قرمز': '#ef4444',
    'آبی': '#3b82f6',
    'سبز': '#22c55e',
    'زرد': '#eab308',
    'نارنجی': '#f97316',
    'بنفش': '#a855f7',
    'صورتی': '#ec4899',
    'خاکستری': '#6b7280',
    'نقره‌ای': '#9ca3af',
    'طلایی': '#fbbf24',
    'قهوه‌ای': '#92400e',
    'کرم': '#fef3c7',
    'بژ': '#d4c5a9'
  };
  return colorMap[colorName] || '#6b7280';
}

// آپدیت استایل select بر اساس انتخاب
function updateSelectStyle() {
  const select = document.getElementById('feedback-motorcycle');
  const colorIndicator = document.getElementById('motorcycle-color-indicator');
  const motoInfo = document.getElementById('motorcycle-info');
  const selectedOption = select.options[select.selectedIndex];
  
  if (selectedOption && selectedOption.value) {
    const colorHex = selectedOption.getAttribute('data-color') || '#6b7280';
    const motoDept = selectedOption.getAttribute('data-dept') || 'نامشخص';
    
    // آپدیت رنگ بوردر select
    select.style.borderRight = `6px solid ${colorHex}`;
    select.style.borderRightWidth = '6px';
    
    // آپدیت اندیکاتور رنگ
    if (colorIndicator) {
      colorIndicator.style.backgroundColor = colorHex;
      colorIndicator.style.borderColor = colorHex;
      colorIndicator.style.boxShadow = `0 0 8px ${colorHex}`;
    }
    
    // نمایش اطلاعات موتور سکیل
    if (motoInfo) {
      const motoId = select.value;
      const moto = allData.find(d => d.__backendId === motoId);
      if (moto) {
        motoInfo.innerHTML = `
          <span class="inline-flex items-center gap-2 flex-wrap">
            <span class="bg-gray-700 px-2 py-1 rounded">🏭 دیپارتمنت: <strong class="text-white">${moto.motorcycleDepartment || 'نامشخص'}</strong></span>
            <span class="bg-gray-700 px-2 py-1 rounded">🎨 رنگ: <strong class="text-white">${moto.motorcycleColor || 'نامشخص'}</strong></span>
            <span class="bg-gray-700 px-2 py-1 rounded">🔢 پلاک: <strong class="text-white">${moto.motorcyclePlate || 'نامشخص'}</strong></span>
          </span>
        `;
        motoInfo.classList.remove('hidden');
      }
    }
  } else {
    select.style.borderRight = '2px solid #e5e7eb';
    
    // ریست اندیکاتور رنگ
    if (colorIndicator) {
      colorIndicator.style.backgroundColor = '#4b5563';
      colorIndicator.style.borderColor = '#9ca3af';
      colorIndicator.style.boxShadow = 'none';
    }
    
    // مخفی کردن اطلاعات موتور سکیل
    if (motoInfo) {
      motoInfo.classList.add('hidden');
    }
  }
}

// ثبت گزارش
async function submitFeedback(e) {
  e.preventDefault();

  const type = document.getElementById('feedback-type').value;
  const content = document.getElementById('feedback-content').value.trim();
  const user = window.currentUser || {};

  if (!content) {
    showToast('لطفاً متن گزارش را بنویسید', '⚠️');
    return;
  }

  let motorcycleName = '';
  let motorcycleColor = '';
  let motorcycleDepartment = '';
  let motorcyclePlate = '';
  
  if (type === 'نظریه') {
    const motoId = document.getElementById('feedback-motorcycle').value;
    if (!motoId) {
      showToast('لطفاً موتور سکیل را انتخاب کنید', '⚠️');
      return;
    }
    const moto = allData.find(d => d.__backendId === motoId);
    if (moto) {
      motorcycleName = moto.motorcycleName || '';
      motorcyclePlate = moto.motorcyclePlate || '';
      motorcycleColor = moto.motorcycleColor || '';
      motorcycleDepartment = moto.motorcycleDepartment || '';
    }
  }

  const now = new Date();
  
  // فرمت صحیح تاریخ: YYYY/MM/DD
  const dateFormatted = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  
  // فرمت صحیح زمان: HH:MM:SS
  const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const feedbackData = {
    __backendId: generateFeedbackId(),
    type: 'feedback',
    reportType: type,
    fullName: user.fullName || 'نامشخص',
    department: user.department || 'نامشخص',
    motorcycle: motorcycleName ? `${motorcycleName} (${motorcyclePlate})` : '',
    motorcycleColor: motorcycleColor,
    motorcycleDepartment: motorcycleDepartment,
    motorcyclePlate: motorcyclePlate,
    content: content,
    date: dateFormatted,           // فرمت YYYY/MM/DD
    timestamp: timeFormatted       // فرمت HH:MM:SS
  };

  // آماده‌سازی داده‌ها برای گوگل شیت با فرمت صحیح
  const gsData = {
    'Unique ID': feedbackData.__backendId,
    'نوع گزارش': feedbackData.reportType,
    'نام کامل': feedbackData.fullName,
    'دیپارتمنت': feedbackData.department,
    'موتور سکیل': feedbackData.motorcycle,
    'رنگ موتور سکیل': feedbackData.motorcycleColor || '',
    'دیپارتمنت موتور سکیل': feedbackData.motorcycleDepartment || '',
    'متن': feedbackData.content,
    'تاریخ': feedbackData.date,              // YYYY/MM/DD
    'زمان ثبت': feedbackData.timestamp,       // HH:MM:SS
    'وضعیت تعمیر': 'نیاز به تعمیر دارد',
    'تاریخ تعمیر': '',
    'شخص تعمیر کننده': '',
    'پین شده': 'خیر'
  };

  const result = await callGoogleSheets('create', 'feedback', gsData);

  if (result.success) {
    showToast('گزارش با موفقیت ثبت شد', '✅');
    closeModal('new-feedback-modal');
    document.getElementById('feedback-form').reset();
  } else {
    console.error('خطا در ثبت:', result);
    showToast('خطا در ثبت گزارش در گوگل شیت', '❌');
  }
}

// وقتی صفحه لود شد
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof showLoading === 'function') {
    showLoading();
  }

  try {
    updateDateTime();
    
    // لود سریع‌تر داده‌ها - همگام‌سازی موتور سکیل‌ها بلافاصله
    if (typeof syncMotorcyclesWithGoogleSheets === 'function' && window.allData) {
      await syncMotorcyclesWithGoogleSheets(allData);
    }
    
    await waitForFeedbackPrerequisites();
  } finally {
    if (typeof hideLoading === 'function') {
      hideLoading();
    }
  }
});
