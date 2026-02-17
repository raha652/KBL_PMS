let allMotorcycles = [];
let allOilReports = [];
let selectedMotorcycle = null;

// بارگذاری داده‌ها
async function loadOilData() {
  showLoading();
  try {
    // بارگذاری موتور سکیل‌ها از Google Sheets
    const motoResult = await callGoogleSheets('readAll', 'motors');
    if (motoResult.success) {
      allMotorcycles = motoResult.data
        .map(mapGSToMotorcycle)
        .filter(m => m.__backendId);
    }
    
    // بارگذاری گزارشات موبلایل
    const result = await callGoogleSheets('readAll', 'oil');
    if (result.success) {
      allOilReports = result.data.map(mapGSToOil).filter(r => r.__backendId);
    }
    
    renderMotorcycles();
  } catch (error) {
    console.error('Error loading data:', error);
    showToast('خطا در بارگذاری داده‌ها', '❌');
  } finally {
    hideLoading();
  }
}

// رندر لیست موتور سکیل‌ها
function renderMotorcycles() {
  const container = document.getElementById('motorcycle-list');
  
  if (allMotorcycles.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12 text-gray-400">
        <div class="text-6xl mb-4">🏍️</div>
        <p class="text-lg">هیچ موتور سکیلی ثبت نشده است</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = allMotorcycles.map(moto => {
    // محاسبه مجموع موبلایل
    const totalOil = allOilReports
      .filter(r => r.motorcycleId === moto.__backendId)
      .reduce((sum, r) => sum + (parseFloat(r.oilAmount) || 0), 0);
    
    return `
      <div class="card p-5 cursor-pointer hover:bg-gray-800 transition-all" onclick="showMotorcycleReports('${moto.__backendId}')">
        <div class="flex items-center gap-3 mb-3">
          <div class="motorcycle-icon">🏍️</div>
          <div>
            <h3 class="font-bold text-white">${moto.motorcycleName}</h3>
            <p class="text-sm text-white">${moto.motorcycleColor} | ${moto.motorcycleDepartment}</p>
          </div>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-white">🔢 پلاک: ${moto.motorcyclePlate}</span>
          <span class="bg-amber-900/50 text-amber-300 px-2 py-1 rounded">🛢️ ${totalOil.toFixed(1)} لیتر</span>
        </div>
      </div>
    `;
  }).join('');
}

// باز کردن مودال ثبت گزارش
function openOilReportModal() {
  const user = window.currentUser || {};
  document.getElementById('oil-reporter-name').value = user.fullName || 'نامشخص';
  document.getElementById('oil-reporter-dept').value = user.department || 'نامشخص';
  document.getElementById('selected-motorcycle-display').textContent = 'انتخاب کنید';
  document.getElementById('selected-motorcycle-id').value = '';
  document.getElementById('oil-amount').value = '';
  selectedMotorcycle = null;
  
  populateMotorcycleOptions();
  document.getElementById('oil-report-modal').classList.add('active');
}

// پر کردن لیست موتور سکیل‌ها
function populateMotorcycleOptions() {
  const container = document.getElementById('motorcycle-options');
  const searchTerm = document.getElementById('motorcycle-search')?.value?.toLowerCase() || '';
  
  let filtered = allMotorcycles;
  if (searchTerm) {
    filtered = allMotorcycles.filter(m => 
      m.motorcycleName.toLowerCase().includes(searchTerm) ||
      m.motorcycleColor.toLowerCase().includes(searchTerm) ||
      m.motorcycleDepartment.toLowerCase().includes(searchTerm) ||
      m.motorcyclePlate.toLowerCase().includes(searchTerm)
    );
  }
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="p-3 text-center text-gray-400">موتور سکیلی یافت نشد</div>';
    return;
  }
  
  container.innerHTML = filtered.map(m => `
    <div class="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0" onclick="selectMotorcycle('${m.__backendId}')">
      <div class="font-semibold">${m.motorcycleName}</div>
      <div class="text-sm text-gray-400">${m.motorcycleColor} | ${m.motorcycleDepartment} | پلاک: ${m.motorcyclePlate}</div>
    </div>
  `).join('');
}

// فیلتر موتور سکیل‌ها
function filterMotorcycles() {
  populateMotorcycleOptions();
}

// باز/بستن dropdown موتور سکیل
function toggleMotorcycleDropdown() {
  const dropdown = document.getElementById('motorcycle-dropdown');
  const btn = event.target.closest('button');
  const rect = btn.getBoundingClientRect();
  
  if (dropdown.classList.contains('hidden')) {
    dropdown.style.top = `${rect.bottom + 5}px`;
    dropdown.style.left = `${Math.min(rect.left, window.innerWidth - 320)}px`;
    dropdown.classList.remove('hidden');
    document.getElementById('motorcycle-search').focus();
  } else {
    dropdown.classList.add('hidden');
  }
}

// انتخاب موتور سکیل
function selectMotorcycle(id) {
  selectedMotorcycle = allMotorcycles.find(m => m.__backendId === id);
  if (selectedMotorcycle) {
    document.getElementById('selected-motorcycle-display').textContent = 
      `${selectedMotorcycle.motorcycleName} | ${selectedMotorcycle.motorcycleColor} | ${selectedMotorcycle.motorcycleDepartment}`;
    document.getElementById('selected-motorcycle-id').value = id;
  }
  document.getElementById('motorcycle-dropdown').classList.add('hidden');
}

// ثبت گزارش موبلایل
async function submitOilReport(e) {
  e.preventDefault();
  
  if (!selectedMotorcycle) {
    showToast('لطفاً موتور سکیل را انتخاب کنید', '⚠️');
    return;
  }
  
  const oilAmount = parseFloat(document.getElementById('oil-amount').value);
  if (isNaN(oilAmount) || oilAmount <= 0) {
    showToast('لطفاً مقدار معتبر وارد کنید', '⚠️');
    return;
  }
  
  const user = window.currentUser || {};
  const now = new Date();
  const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const reportData = {
    __backendId: generateId(),
    motorcycleId: selectedMotorcycle.__backendId,
    motorcycleName: selectedMotorcycle.motorcycleName,
    motorcycleColor: selectedMotorcycle.motorcycleColor,
    motorcycleDepartment: selectedMotorcycle.motorcycleDepartment,
    motorcyclePlate: selectedMotorcycle.motorcyclePlate,
    oilAmount: oilAmount,
    reporterName: user.fullName || 'نامشخص',
    reporterDept: user.department || 'نامشخص',
    date: dateStr,
    time: timeStr
  };
  
  const gsData = mapOilToGS(reportData);
  const result = await callGoogleSheets('create', 'oil', gsData);
  
  if (result.success) {
    showToast('گزارش موبلایل با موفقیت ثبت شد', '✅');
    closeModal('oil-report-modal');
    allOilReports.push(reportData);
    renderMotorcycles();
  } else {
    showToast('خطا در ثبت گزارش', '❌');
  }
}

// فرمت تاریخ و زمان
function formatOilDateTime(dateStr, timeStr) {
  let formattedDate = dateStr || '';
  let formattedTime = timeStr || '';
  
  // فرمت تاریخ
  if (formattedDate && formattedDate.includes('T')) {
    const date = new Date(formattedDate);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      formattedDate = `${year}/${month}/${day}`;
    }
  }
  
  // فرمت زمان
  if (formattedTime && formattedTime.includes('T')) {
    const date = new Date(formattedTime);
    if (!isNaN(date.getTime())) {
      formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
  }
  
  return { date: formattedDate, time: formattedTime };
}

// نمایش گزارشات یک موتور سکیل
function showMotorcycleReports(motorcycleId) {
  const moto = allMotorcycles.find(m => m.__backendId === motorcycleId);
  if (!moto) return;
  
  const reports = allOilReports.filter(r => r.motorcycleId === motorcycleId);
  
  document.getElementById('reports-modal-title').textContent = 
    `گزارشات موبلایل - ${moto.motorcycleName} (${moto.motorcycleDepartment})`;
  
  const container = document.getElementById('motorcycle-reports-list');
  
  if (reports.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-400">
        <div class="text-4xl mb-2">🛢️</div>
        <p>هیچ گزارشی برای این موتور سکیل ثبت نشده است</p>
      </div>
    `;
  } else {
    container.innerHTML = reports.map(r => {
      const { date: formattedDate, time: formattedTime } = formatOilDateTime(r.date, r.time);
      return `
        <div class="bg-gray-800 rounded-lg p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="bg-amber-900/50 text-amber-300 px-2 py-1 rounded text-sm">🛢️ ${r.oilAmount} لیتر</span>
            <span class="text-xs text-gray-400">${formattedDate}${formattedTime ? ' - ' + formattedTime : ''}</span>
          </div>
          <div class="text-sm text-gray-300">
            <span>👤 ${r.reporterName}</span>
            <span class="mx-2">|</span>
            <span>🏭 ${r.reporterDept}</span>
          </div>
        </div>
      `;
    }).join('');
  }
  
  document.getElementById('motorcycle-reports-modal').classList.add('active');
}

// بستن dropdown با کلیک بیرون
document.addEventListener('click', (e) => {
  if (!e.target.closest('#motorcycle-dropdown') && !e.target.closest('button')) {
    document.getElementById('motorcycle-dropdown')?.classList.add('hidden');
  }
});

// شروع
document.addEventListener('DOMContentLoaded', () => {
  updateDateTime();
  loadOilData();
});
