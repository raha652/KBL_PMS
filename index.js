const IDLE_TIMEOUT_SECONDS = 21600;
const SYNC_INTERVAL_MS = 8000;
const MAX_KILOMETERS = 1000000;
const MIN_KILOMETERS = 0;
const SEARCH_DEBOUNCE_MS = 300;


const defaultConfig = {
  dashboard_title: 'سیستم مدیریت موتور سکیل ها',
  company_name: 'پارکینگ ولایت کابل',
  primary_color: '#667eea',
  secondary_color: '#11998e',
  text_color: '#1f2937',
  background_color: '#f9fafb',
  card_color: '#ffffff'
};
let allData = [];
let allUsers = [];
let currentRecordCount = 0;
let currentPasswordType = '';
let currentStatusFilter = 'all';
let currentMotorcycleDeptFilter = 'all';
let currentMotorcycleSearchTerm = '';
let departments = [];
let currentUserRole = '';
let historySearchTerm = '';
let historyFromDate = '';
let historyToDate = '';
let currentMotorcycleId = '';
let currentRequestFilter = 'all';
let currentRequestSearch = '';
let accountSearchTerm = '';
let currentDeptFilter = 'all';
let requestedEmployeeIds = [];
let currentFuelReports = [];
let fuelReportSearchDate = '';
let usageSearchTerm = '';
let currentUsageSort = 'none';
let currentSortDisplay = 'هیچکدام';
let currentUsageDeptFilter = 'all';
let currentDeptDisplay = 'همه';
let currentTimeInterval = 'none';
let currentCustomDays = 0;
let currentIntervalDisplay = 'هیچکدام';

async function syncAllData() {
  try {
    console.log('Starting full data sync...');
    await syncEmployeesWithGoogleSheets(allData);
    console.log('Employees synced:', allData.filter(d => d.type === 'employee').length);
    await syncMotorcyclesWithGoogleSheets(allData);
    console.log('Motorcycles synced:', allData.filter(d => d.type === 'motorcycle').length);
    await syncRequestsWithGoogleSheets(allData);
    console.log('Requests synced:', allData.filter(d => d.type === 'request').length);
    await saveData(allData);
    await syncFeedbackWithGoogleSheets(allData);
    dataHandler.onDataChanged(allData);
    console.log('Data synced successfully');
  } catch (error) {
    console.error('Sync error:', error);
    showToast('خطا در همگام‌سازی داده‌ها', '⚠️');
  }
}
const JalaliDate = {
  g_days_in_month: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  j_days_in_month: [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29]
};
JalaliDate.jalaliToGregorian = function (j_y, j_m, j_d) {
  j_y = parseInt(j_y);
  j_m = parseInt(j_m);
  j_d = parseInt(j_d);
  var jy = j_y - 979;
  var jm = j_m - 1;
  var jd = j_d - 1;
  var j_day_no = 365 * jy + parseInt(jy / 33) * 8 + parseInt((jy % 33 + 3) / 4);
  for (var i = 0; i < jm; ++i) j_day_no += JalaliDate.j_days_in_month[i];
  j_day_no += jd;
  var g_day_no = j_day_no + 79;
  var gy = 1600 + 400 * parseInt(g_day_no / 146097);
  g_day_no = g_day_no % 146097;
  var leap = true;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * parseInt(g_day_no / 36524);
    g_day_no = g_day_no % 36524;
    if (g_day_no >= 365) g_day_no++;
    else leap = false;
  }
  gy += 4 * parseInt(g_day_no / 1461);
  g_day_no %= 1461;
  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += parseInt(g_day_no / 365);
    g_day_no = g_day_no % 365;
  }
  for (var i = 0; g_day_no >= JalaliDate.g_days_in_month[i] + (i == 1 && leap); i++)
    g_day_no -= JalaliDate.g_days_in_month[i] + (i == 1 && leap);
  var gm = i + 1;
  var gd = g_day_no + 1;
  gm = gm < 10 ? "0" + gm : gm;
  gd = gd < 10 ? "0" + gd : gd;
  return [gy, gm, gd];
};
const dataStorageKey = `motorcycleManagementData_${defaultConfig.company_name}`;
const usersStorageKey = 'userAccountsData';
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
function calculateUsageTime(exitTime, entryTime) {
  if (!exitTime || !entryTime) return '';
  const [exitH, exitM] = exitTime.split(':').map(Number);
  const [entryH, entryM] = entryTime.split(':').map(Number);
  const exitMinutes = exitH * 60 + exitM;
  const entryMinutes = entryH * 60 + entryM;
  let diffMinutes = entryMinutes - exitMinutes;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
  }
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
async function loadData() {
  try {
    const stored = localStorage.getItem(dataStorageKey);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading data from localStorage:', error);
    return [];
  }
}
async function saveData(data) {
  try {
    localStorage.setItem(dataStorageKey, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving data to localStorage:', error);
    showToast('خطا در ذخیره داده‌ها', '❌');
  }
}
async function loadUsers() {
  try {
    const stored = localStorage.getItem(usersStorageKey);
    allUsers = stored && stored !== 'undefined' ? JSON.parse(stored) : [];
    if (allUsers.length === 0) {
      const defaultAdmin = {
        __backendId: generateId(),
        fullName: 'شهاب حمیدی',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        position: 'Electrical ENG',
        department: 'پاور',
        photo: 'https://i.ibb.co/bcmdRGx/photo-2025-11-07-17-46-35.jpg',
        customDisplays: 'تعمیرات,اعلانات'
      };
      allUsers.push(defaultAdmin);
      await saveUsers();
    }
    const syncSuccess = await syncUsersWithGoogleSheets();
    if (!syncSuccess) {
      showToast('هشدار: همگام‌سازی اکانت‌ها با Google Sheets ناموفق بود', '⚠️');
    }
    return allUsers;
  } catch (error) {
    console.error('Error loading users from localStorage:', error);
    return [];
  }
}
async function saveUsers(users) {
  try {
    localStorage.setItem(usersStorageKey, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users from localStorage:', error);
    showToast('خطا در ذخیره کاربران', '❌');
  }
}
async function createUser(userData) {
  if (currentUserRole !== 'admin') {
    showToast('شما دسترسی به ایجاد اکانت ندارید', '⚠️');
    return { isOk: false };
  }
  if (allUsers.find(u => u.username === userData.username)) {
    showToast('نام کاربری تکراری است', '⚠️');
    return { isOk: false };
  }
  userData.__backendId = generateId();
  allUsers.push(userData);
  await saveUsers(allUsers);
  const gsData = mapUserToGS(userData);
  const gsResult = await callGoogleSheets('create', 'accounts', gsData);
  if (!gsResult.success) {
    showToast('خطا در ذخیره اکانت در Google Sheets', '❌');
    allUsers.pop();
    await saveUsers(allUsers);
    return { isOk: false };
  }
  if (getCurrentPage() === 'accounts') {
    renderAccounts();
  }
  return { isOk: true };
}
async function deleteUser(userId) {
  if (currentUserRole !== 'admin') {
    showToast('شما دسترسی به حذف اکانت ندارید', '⚠️');
    return { isOk: false };
  }
  const user = allUsers.find(u => u.__backendId === userId);
  if (!user || user.username === 'admin') {
    showToast('نمی‌توان اکانت شهاب حمیدی را حذف کرد', '⚠️');
    return { isOk: false };
  }
  const gsResult = await callGoogleSheets('delete', 'accounts', { __backendId: userId });
  if (!gsResult.success) {
    showToast('خطا در حذف اکانت از Google Sheets', '❌');
    return { isOk: false };
  }
  const index = allUsers.findIndex(u => u.__backendId === userId);
  allUsers.splice(index, 1);
  await saveUsers(allUsers);
  if (getCurrentPage() === 'accounts') {
    renderAccounts();
  }
  return { isOk: true };
}
async function updateUser(userId, updatedData) {
  if (currentUserRole !== 'admin') {
    showToast('شما دسترسی به ویرایش اکانت ندارید', '⚠️');
    return { isOk: false };
  }
  const userIndex = allUsers.findIndex(u => u.__backendId === userId);
  if (userIndex === -1) return { isOk: false };
  allUsers[userIndex] = { ...allUsers[userIndex], ...updatedData };
  await saveUsers(allUsers);
  const gsData = mapUserToGS(allUsers[userIndex]);
  const gsResult = await callGoogleSheets('update', 'accounts', gsData);
  if (!gsResult.success) {
    showToast('خطا در به‌روزرسانی اکانت در Google Sheets', '❌');
    return { isOk: false };
  }
  if (getCurrentPage() === 'accounts') {
    renderAccounts();
  }
  return { isOk: true };
}
function openEditAccountModal(userId, username, fullName, password, role, position, department, customDisplays) {
  if (currentUserRole !== 'admin') {
    showToast('شما دسترسی به ویرایش اکانت ندارید', '⚠️');
    return;
  }
  document.getElementById('edit-account-username').textContent = `اکانت: ${username}`;
  document.getElementById('edit-account-fullname').value = fullName;
  document.getElementById('edit-account-username-input').value = username;
  document.getElementById('edit-account-password').value = password;
  document.getElementById('edit-account-role').value = role;
  document.getElementById('edit-account-position').value = position;
  document.getElementById('edit-account-department').value = department;

  const displays = customDisplays ? customDisplays.split(',') : [];
  document.getElementById('edit-account-show-maintenance').checked = displays.includes('تعمیرات');
  document.getElementById('edit-account-show-notifications').checked = displays.includes('اعلانات');


  document.getElementById('edit-account-form').dataset.userId = userId;
  document.getElementById('edit-account-modal').classList.add('active');
}
async function submitEditAccount(event) {
  event.preventDefault();
  const userId = document.getElementById('edit-account-form').dataset.userId;
  const fullName = document.getElementById('edit-account-fullname').value.trim();
  const username = document.getElementById('edit-account-username-input').value.trim();
  const password = document.getElementById('edit-account-password').value;
  const role = document.getElementById('edit-account-role').value;
  const position = document.getElementById('edit-account-position').value.trim();
  const department = document.getElementById('edit-account-department').value.trim();


  const showMaintenance = document.getElementById('edit-account-show-maintenance').checked;
  const showNotifications = document.getElementById('edit-account-show-notifications').checked;
  const customDisplays = [];
  if (showMaintenance) customDisplays.push('تعمیرات');
  if (showNotifications) customDisplays.push('اعلانات');

  if (!fullName || !username || !password || !role || !position || !department) {
    showToast('لطفاً همه فیلدها را پر کنید', '⚠️');
    return;
  }
  const updatedData = { fullName, username, password, role, position, department, customDisplays: customDisplays.join(',') };
  const result = await updateUser(userId, updatedData);
  if (result.isOk) {
    showToast('اکانت با موفقیت به‌روزرسانی شد', '✅');
    closeModal('edit-account-modal');
  } else {
    showToast('خطا در به‌روزرسانی اکانت', '❌');
  }
}
async function syncUsersWithGoogleSheets() {
  try {
    const result = await callGoogleSheets('readAll', 'accounts');
    if (result.success) {
      const gsUsers = result.data
        .map(mapGSToUser)
        .filter(user => user.__backendId);


      const localUsers = [...allUsers];

      for (let gsUser of gsUsers) {
        const localUser = localUsers.find(u => u.username === gsUser.username);
        if (localUser && localUser.customDisplays && !gsUser.customDisplays) {
          gsUser.customDisplays = localUser.customDisplays;
        }
      }

      const defaultAdminExists = gsUsers.some(u => u.username === 'admin');
      if (!defaultAdminExists) {
        const defaultAdmin = {
          __backendId: generateId(),
          fullName: 'شهاب حمیدی',
          username: 'admin',
          password: 'admin123',
          role: 'admin',
          position: 'Electrical ENG',
          department: 'پاور',
          photo: 'https://i.ibb.co/bcmdRGx/photo-2025-11-07-17-46-35.jpg',
          customDisplays: 'تعمیرات,اعلانات' // Admin needs to explicitly enable maintenance
        };
        gsUsers.push(defaultAdmin);
      }
      // Note: We don't force customDisplays on admin anymore
      // Each user must have maintenance explicitly enabled in their account
      allUsers = gsUsers;
      await saveUsers(allUsers);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error syncing users:', error);
    return false;
  }
}
window.dataSdk = {
  init: async (handler) => {
    allData = await loadData();
    currentRecordCount = allData.length;
    updateDepartments();
    if (handler && handler.onDataChanged) {
      handler.onDataChanged(allData);
    }
    return { isOk: true };
  },
  create: async (item) => {
    if (currentRecordCount >= 10000000000000) {
      showToast('حداکثر تعداد رکوردها (۹۹۹) به پایان رسیده است', '⚠️');
      return { isOk: false };
    }
    item.__backendId = generateId();
    item.type = item.type || 'unknown';
    if (item.type === 'employee') {
      const gsData = mapEmployeeToGS(item);
      const gsResult = await callGoogleSheets('create', 'employees', gsData);
      if (!gsResult.success) {
        showToast('خطا در ذخیره کارمند در Google Sheets', '❌');
        return { isOk: false };
      }
    }
    if (item.type === 'motorcycle') {
      const gsData = mapMotorcycleToGS(item);
      const gsResult = await callGoogleSheets('create', 'motors', gsData);
      if (!gsResult.success) {
        showToast('خطا در ذخیره موتور سکیل در Google Sheets', '❌');
        return { isOk: false };
      }
    }
    if (item.type === 'request') {
      const gsData = mapRequestToGS(item);
      const gsResult = await callGoogleSheets('create', 'request', gsData);
      if (!gsResult.success) {
        showToast('خطا در ذخیره درخواست در Google Sheets', '❌');
        return { isOk: false };
      }
    }
    allData.push(item);
    await saveData(allData);
    currentRecordCount = allData.length;
    updateDepartments();
    if (dataHandler && dataHandler.onDataChanged) {
      dataHandler.onDataChanged(allData);
    }
    return { isOk: true };
  },
  update: async (item) => {
    const index = allData.findIndex(d => d.__backendId === item.__backendId);
    if (index === -1) {
      return { isOk: false };
    }
    if (item.type === 'employee') {
      const gsData = mapEmployeeToGS(item);
      const gsResult = await callGoogleSheets('update', 'employees', gsData);
      if (!gsResult.success) {
        showToast('خطا در به‌روزرسانی کارمند در Google Sheets', '❌');
        return { isOk: false };
      }
    }
    if (item.type === 'motorcycle') {
      const gsData = mapMotorcycleToGS(item);
      const gsResult = await callGoogleSheets('update', 'motors', gsData);
      if (!gsResult.success) {
        showToast('خطا در به‌روزرسانی موتور سکیل در Google Sheets', '❌');
        return { isOk: false };
      }
    }
    if (item.type === 'request') {
      const gsData = mapRequestToGS(item);
      const gsResult = await callGoogleSheets('update', 'request', gsData);
      if (!gsResult.success) {
        showToast('خطا در به‌روزرسانی درخواست در Google Sheets', '❌');
        return { isOk: false };
      }
    }
    allData[index] = { ...allData[index], ...item };
    await saveData(allData);
    currentRecordCount = allData.length;
    updateDepartments();
    if (dataHandler && dataHandler.onDataChanged) {
      dataHandler.onDataChanged(allData);
    }
    return { isOk: true };
  },
  delete: async (item) => {
    const index = allData.findIndex(d => d.__backendId === item.__backendId);
    if (index === -1) {
      return { isOk: false };
    }
    if (item.type === 'employee') {
      const gsResult = await callGoogleSheets('delete', 'employees', { __backendId: item.__backendId });
      if (!gsResult.success) {
        showToast('خطا در حذف کارمند از Google Sheets', '❌');
        return { isOk: false };
      }
    }
    if (item.type === 'motorcycle') {
      const gsResult = await callGoogleSheets('delete', 'motors', { __backendId: item.__backendId });
      if (!gsResult.success) {
        showToast('خطا در حذف موتور سکیل از Google Sheets', '❌');
        return { isOk: false };
      }
    }
    if (item.type === 'request') {
      const gsResult = await callGoogleSheets('delete', 'request', { __backendId: item.__backendId });
      if (!gsResult.success) {
        showToast('خطا در حذف درخواست از Google Sheets', '❌');
        return { isOk: false };
      }
    }
    allData.splice(index, 1);
    await saveData(allData);
    currentRecordCount = allData.length;
    updateDepartments();
    if (dataHandler && dataHandler.onDataChanged) {
      dataHandler.onDataChanged(allData);
    }
    return { isOk: true };
  }
};
function updateDepartments() {
  const uniqueDepartments = [...new Set(allData.filter(d => d.type === 'motorcycle').map(d => d.motorcycleDepartment))];
  departments = uniqueDepartments.sort();
}
const passwords = {
  management: '456',
  motorcycle: 'motor123',
  employee: 'staff456',
  maintenance: '234'
};
const dataHandler = {
  onDataChanged(data) {
    allData = data;
    currentRecordCount = data.length;
    updateDepartments();
    updateCurrentPage();
    if (getCurrentPage() === 'requests') {
      renderRequests(allData.filter(d => d.type === 'request'));
    }
    if (getCurrentPage() === 'history') {
      const allCompleted = allData.filter(d => d.type === 'request' && (d.status === 'completed' || d.status === 'delet'));
      renderHistory(filterHistory(allCompleted));
    }
    if (getCurrentPage() === 'motorcycle-status') {
      const motorcycles = allData.filter(d => d.type === 'motorcycle');
      const requests = allData.filter(d => d.type === 'request');
      renderMotorcycleStatus(motorcycles, requests);
    }
    if (getCurrentPage() === 'fuel-expenses') {
      renderMotorcyclesForFuel();
    }
  }
};
function navigateTo(path) {
  window.location.href = path;
}
function getCurrentPage() {
  const path = window.location.pathname;
  if (path.includes('usage-amount')) return 'usage-amount';
  if (path.includes('requests')) return 'requests';
  if (path.includes('management')) return 'management';
  if (path.includes('motorcycles')) return 'motorcycles';
  if (path.includes('employees')) return 'employees';
  if (path.includes('history')) return 'history';
  if (path.includes('request-menu')) return 'request-menu';
  if (path.includes('motorcycle-status')) return 'motorcycle-status';
  if (path.includes('accounts')) return 'accounts';
  if (path.includes('profile-settings')) return 'profile-settings';
  if (path.includes('fuel-expenses')) return 'fuel-expenses';
  return 'dashboard';
}
function showLoading() {
  const loadingElement = document.getElementById('loading-overlay');
  if (loadingElement) {
    loadingElement.style.display = 'flex';
  }
}
function hideLoading() {
  const loadingElement = document.getElementById('loading-overlay');
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }
}
async function loadAndSyncDataForPage(page) {
  try {
    switch (page) {
      case 'dashboard':
      case 'management':
        await syncEmployeesWithGoogleSheets(allData);
        await syncMotorcyclesWithGoogleSheets(allData);
        await syncRequestsWithGoogleSheets(allData);
        break;
      case 'requests':
      case 'request-menu':
        await syncEmployeesWithGoogleSheets(allData);
        await syncMotorcyclesWithGoogleSheets(allData);
        await syncRequestsWithGoogleSheets(allData);
        break;
      case 'history':
      case 'motorcycle-status':
        await syncMotorcyclesWithGoogleSheets(allData);
        await syncRequestsWithGoogleSheets(allData);
        break;
      case 'motorcycles':
        await syncMotorcyclesWithGoogleSheets(allData);
        break;
      case 'usage-amount':
        await syncMotorcyclesWithGoogleSheets(allData);
        await syncRequestsWithGoogleSheets(allData);
        await loadFuelReports();
        break;
      case 'employees':
        await syncEmployeesWithGoogleSheets(allData);
        break;
      case 'accounts':
      case 'profile-settings':
        await syncUsersWithGoogleSheets();
        break;
      case 'fuel-expenses':
        renderMotorcyclesForFuel();
        syncMotorcyclesWithGoogleSheets(allData).then(() => {
          console.log('After background sync in fuel-expenses: allData length =', allData.length, 'motorcycles =', allData.filter(d => d.type === 'motorcycle').length);
          renderMotorcyclesForFuel();
        });
        await loadFuelReports();
        console.log('fuelReports length =', fuelReports.length);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('Error in loadAndSyncDataForPage:', error);
  }
}
function updateCurrentPage() {
  const page = getCurrentPage();
  switch (page) {
    case 'requests':
      renderDeptFilters();
      renderRequests(allData.filter(d => d.type === 'request'));
      break;
    case 'motorcycles':
      renderMotorcycles(allData.filter(d => d.type === 'motorcycle'));
      break;
    case 'employees':
      renderEmployees(allData.filter(d => d.type === 'employee'));
      break;
    case 'history':
      const allCompleted = allData.filter(d => d.type === 'request' && (d.status === 'completed' || d.status === 'delet'));
      renderHistory(filterHistory(allCompleted));
      break;
    case 'accounts':
      renderAccounts();
      break;
    case 'motorcycle-status':
      const motorcycles = allData.filter(d => d.type === 'motorcycle');
      const requests = allData.filter(d => d.type === 'request');
      renderMotorcycleStatus(motorcycles, requests);
      renderMotorcycleDeptFilters();
      break;
    case 'fuel-expenses':
      renderMotorcyclesForFuel();
      break;
    default:
      updateDashboard();
      break;
    case 'usage-amount':
      renderUsageMotorcycles();
      break;
  }
}
async function setUserOnlineStatus(username, status) {
  try {
    const user = allUsers.find(u => u.username === username);
    if (!user) return;

    user.onlineStatus = status;
    user.lastActivity = new Date().toISOString();

    const userIndex = allUsers.findIndex(u => u.username === username);
    if (userIndex !== -1) {
      allUsers[userIndex] = user;
      await saveUsers(allUsers);

      // Sync with Google Sheets
      const gsData = mapUserToGS(user);
      await callGoogleSheets('update', 'accounts', gsData);
      
      // آپدیت وضعیت آنلاین در داشبورد
      updateOnlineStatus();
    }
  } catch (error) {
    console.error('Error setting online status:', error);
  }
}

// بررسی و آپدیت وضعیت آنلاین کاربران (5 دقیقه عدم فعالیت = آفلاین)
async function checkAndUpdateOnlineStatus() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  let updated = false;
  
  for (let i = 0; i < allUsers.length; i++) {
    const user = allUsers[i];
    if (user.onlineStatus === 'online' && user.lastActivity) {
      const lastActivity = new Date(user.lastActivity);
      if (lastActivity < fiveMinutesAgo) {
        user.onlineStatus = 'offline';
        updated = true;
        
        // آپدیت در Google Sheets
        try {
          const gsData = mapUserToGS(user);
          await callGoogleSheets('update', 'accounts', gsData);
        } catch (e) {
          console.error('Error updating offline status:', e);
        }
      }
    }
  }
  
  if (updated) {
    await saveUsers(allUsers);
    updateOnlineStatus();
  }
}

// آپدیت فعالیت کاربر فعلی
function updateUserActivity() {
  if (window.currentUser && window.currentUser.username) {
    const user = allUsers.find(u => u.username === window.currentUser.username);
    if (user) {
      user.lastActivity = new Date().toISOString();
      user.onlineStatus = 'online';
      saveUsers(allUsers);
    }
  }
}

function logout() {
  // Set user as offline
  if (window.currentUser && window.currentUser.username) {
    setUserOnlineStatus(window.currentUser.username, 'offline');
  }

  if (window.idleInterval) {
    clearInterval(window.idleInterval);
    window.idleInterval = null;
  }
  localStorage.removeItem('session');
  window.location.href = './login.html';
}
function renderAccounts() {
  const container = document.getElementById('accounts-list');
  if (!container) return;
  let filteredUsers = allUsers;
  if (accountSearchTerm) {
    const searchLower = accountSearchTerm.toLowerCase();
    filteredUsers = allUsers.filter(user =>
      user.fullName.toLowerCase().includes(searchLower) ||
      user.username.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower) ||
      (user.position || '').toLowerCase().includes(searchLower) ||
      (user.department || '').toLowerCase().includes(searchLower)
    );
  }
  if (filteredUsers.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-300"><p class="text-lg">هیچ اکانتی با جستجوی شما یافت نشد</p></div>';
    return;
  }
  const userCards = filteredUsers.map(user => {
    let actionButtons = '';
    if (currentUserRole === 'admin') {
      actionButtons = `
        <div class="flex items-center gap-2">
          <button class="btn btn-primary px-3 py-1 text-sm" onclick="openEditAccountModal('${user.__backendId}', '${user.username}', '${user.fullName}', '${user.password}', '${user.role}', '${user.position}', '${user.department || ''}', '${user.customDisplays || ''}')">✏️ ویرایش</button>
          <button class="delete-btn" onclick="deleteUser('${user.__backendId}')">🗑️ حذف</button>
        </div>
      `;
    }
    
    // Display custom displays
    let customDisplaysHtml = '';
    if (user.customDisplays) {
      const displays = user.customDisplays.split(',').filter(d => d);
      if (displays.length > 0) {
        customDisplaysHtml = `<p class="text-gray-200 mt-1">نمایش‌ها: ${displays.join('، ')}</p>`;
      }
    }
    
    return `
      <div class="card p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="motorcycle-icon">
              ${user.photo ? `<img src="${user.photo}" alt="Profile Photo" class="w-full h-full rounded-full object-cover">` : '👤'}
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">${user.fullName}</h3>
              <p class="text-gray-200 mt-1">نام کاربری: ${user.username}</p>
              <p class="text-gray-200 mt-1">نقش: ${user.role === 'admin' ? 'ادمین' : (user.role === 'limit' ? 'لیمیت' : 'کاربر')}</p>
              <p class="text-gray-200 mt-1">موقعیت شغلی: ${user.position || 'نامشخص'}</p>
              <p class="text-gray-200 mt-1">دیپارتمنت: ${user.department || 'نامشخص'}</p>
              ${customDisplaysHtml}
            </div>
          </div>
          ${actionButtons}
        </div>
      </div>
    `;
  }).join('');
  container.innerHTML = userCards;
  const newAccountBtn = document.querySelector('button[onclick="openNewAccountModal()"]');
  if (newAccountBtn) {
    if (currentUserRole !== 'admin') {
      newAccountBtn.classList.add('hidden');
    } else {
      newAccountBtn.classList.remove('hidden');
    }
  }
}

function renderUsageMotorcycles() {
  const container = document.getElementById('usage-list');
  if (!container) return;
  const motorcycles = allData.filter(d => d.type === 'motorcycle');
  let filteredMotorcycles = motorcycles.map(moto => {
    const filteredUsage = calculateFilteredUsage(moto.__backendId, currentTimeInterval, currentCustomDays);
    return { ...moto, filteredUsage };
  });

  if (usageSearchTerm) {
    const searchLower = usageSearchTerm.toLowerCase();
    filteredMotorcycles = filteredMotorcycles.filter(moto =>
      moto.motorcycleName.toLowerCase().includes(searchLower) ||
      moto.motorcycleDepartment.toLowerCase().includes(searchLower) ||
      moto.motorcycleColor.toLowerCase().includes(searchLower) ||
      moto.motorcyclePlate.toLowerCase().includes(searchLower)
    );
  }

  if (currentUsageDeptFilter !== 'all') {
    filteredMotorcycles = filteredMotorcycles.filter(moto => moto.motorcycleDepartment === currentUsageDeptFilter);
  }

  if (currentUsageSort !== 'none') {
    filteredMotorcycles.sort((a, b) => {
      const minA = timeToMinutes(a.filteredUsage || '00:00');
      const minB = timeToMinutes(b.filteredUsage || '00:00');
      return currentUsageSort === 'desc' ? minB - minA : minA - minB;
    });
  }

  if (filteredMotorcycles.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-gray-300"><p class="text-lg">هیچ موتورسیکلی یافت نشد</p></div>';
    return;
  }

  container.innerHTML = filteredMotorcycles.map(moto => `
    <div class="card p-6 cursor-pointer hover:shadow-2xl transition-all duration-300" onclick="showUsageHistoryModal('${moto.__backendId}')">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="motorcycle-icon">🏍️</div>
          <div>
            <h3 class="text-lg font-bold text-white">${moto.motorcycleName}</h3>
            <p class="text-gray-200 mt-1">رنگ: ${moto.motorcycleColor}</p>
            <p class="text-gray-200 mt-1">دیپارتمنت: ${moto.motorcycleDepartment}</p>
            <p class="text-gray-200 mt-1">پلاک: ${moto.motorcyclePlate}</p>
            <p class="text-gray-200 mt-1">مجموعه استفاده: ${moto.filteredUsage || '00:00'}</p>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function showUsageHistoryModal(motorcycleId) {
  const motorcycle = allData.find(d => d.__backendId === motorcycleId && d.type === 'motorcycle');
  if (!motorcycle) {
    showToast('موتورسیکلت یافت نشد', '❌');
    return;
  }
  const history = allData.filter(d => d.type === 'request' && d.motorcycleId === motorcycleId && (d.status === 'completed' || d.status === 'delet'));
  document.getElementById('modal-title').textContent = `تاریخچه استفاده: ${motorcycle.motorcycleName} (${motorcycle.motorcycleDepartment})`;
  const list = document.getElementById('usage-history-list');
  if (history.length === 0) {
    list.innerHTML = '<div class="text-center py-12 text-gray-300"><p class="text-lg">هیچ تاریخچه‌ای برای این موتورسیکلت وجود ندارد</p></div>';
  } else {
    list.innerHTML = history.map(req => `
      <div class="card p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="motorcycle-icon">📅</div>
            <div>
              <h3 class="text-lg font-bold text-white">تاریخ: ${req.requestDate}</h3>
              <p class="text-gray-200 mt-1">ساعت خروج: ${req.exitTime || 'نامشخص'}</p>
              <p class="text-gray-200 mt-1">مدت استفاده: ${formatUsageTime(req.usageTime) || 'نامشخص'}</p>
              <!-- <p class="text-gray-200 mt-1">کاربر: ${req.employeeName || 'نامشخص'}</p> -->
            </div>
          </div>
          <span class="status-badge ${req.status === 'completed' ? 'status-completed' : 'status-deleted'}">
            ${req.status === 'completed' ? '✅ تکمیل' : '❌ حذف شده'}
          </span>
        </div>
      </div>
    `).join('');
  }
  document.getElementById('usage-history-modal').classList.add('active');
}


function openNewAccountModal() {
  if (currentUserRole !== 'admin') {
    showToast('شما دسترسی به ایجاد اکانت ندارید', '⚠️');
    return;
  }
  document.getElementById('new-account-form').reset();
  document.getElementById('new-account-modal').classList.add('active');
}
async function submitNewAccount(event) {
  event.preventDefault();
  const fullName = document.getElementById('account-fullname').value.trim();
  const username = document.getElementById('account-username').value.trim();
  const password = document.getElementById('account-password').value;
  const role = document.getElementById('account-role').value;
  const position = document.getElementById('account-position').value.trim();
  const department = document.getElementById('account-department').value.trim();
  
  // Get custom displays
  const showMaintenance = document.getElementById('account-show-maintenance').checked;
  const showNotifications = document.getElementById('account-show-notifications').checked;
  const customDisplays = [];
  if (showMaintenance) customDisplays.push('تعمیرات');
  if (showNotifications) customDisplays.push('اعلانات');
  
  if (!fullName || !username || !password || !role || !position || !department) {
    showToast('لطفاً همه فیلدها را پر کنید', '⚠️');
    return;
  }
  const result = await createUser({ fullName, username, password, role, position, department, customDisplays: customDisplays.join(',') });
  if (result.isOk) {
    showToast('اکانت با موفقیت اضافه شد', '✅');
    closeModal('new-account-modal');
  } else {
    showToast('خطا در افزودن اکانت', '❌');
  }
}
async function initApp() {
  showLoading();
  const sessionStr = localStorage.getItem('session');
  if (!sessionStr) {
    window.location.href = './login.html';
    hideLoading();
    return;
  }
  let session;
  try {
    session = JSON.parse(sessionStr);
  } catch (e) {
    localStorage.removeItem('session');
    window.location.href = './login.html';
    hideLoading();
    return;
  }
  if (!session.loggedIn) {
    localStorage.removeItem('session');
    window.location.href = './login.html';
    hideLoading();
    return;
  }
  await loadUsers();
  const currentUser = allUsers.find(u => u.username === session.username);
  if (!currentUser) {
    localStorage.removeItem('session');
    window.location.href = './login.html';
    hideLoading();
    return;
  }
  window.currentUser = currentUser;
  currentUserRole = currentUser.role;
  session.fullName = currentUser.fullName;
  localStorage.setItem('session', JSON.stringify(session));

  // Restrict access for limit users - they can only access requests.html
  if (currentUserRole === 'limit') {
    const currentPage = getCurrentPage();
    if (currentPage !== 'requests') {
      showToast('شما فقط به صفحه درخواست‌ها دسترسی دارید', '⚠️');
      window.location.href = './requests.html';
      hideLoading();
      return;
    }
    // Hide back button for limit users on requests page
    const backBtn = document.getElementById('back-to-main-btn');
    if (backBtn) {
      backBtn.classList.add('hidden');
    }
    // Hide department filter for limit users
    const deptFilterSection = document.querySelector('.card.p-4.mb-6:has(#dept-filters)');
    if (deptFilterSection) {
      deptFilterSection.classList.add('hidden');
    }
    // Add logout button for limit users in header
    addLogoutButtonForLimitUser();
  }

  // Set user as online
  await setUserOnlineStatus(currentUser.username, 'online');
  if (document.getElementById('current-user')) {
    document.getElementById('current-user').textContent = currentUser.fullName || "کاربر ناشناس";
  }
  if (document.getElementById('current-user-position')) {
    document.getElementById('current-user-position').textContent = currentUser.position || "نامشخص";
  }
  const userIcon = document.getElementById('user-profile-icon');
  if (userIcon) {
    if (currentUser.photo) {
      userIcon.innerHTML = `<img src="${currentUser.photo}" alt="Profile Photo" class="w-full h-full rounded-full object-cover">`;
    } else {
      userIcon.innerHTML = '👤';
    }
  }
  const newAccountBtn = document.querySelector('button[onclick="openNewAccountModal()"]');
  if (newAccountBtn && currentUserRole !== 'admin') {
    newAccountBtn.classList.add('hidden');
  }
if (getCurrentPage() === 'management') {
    const accountsCard = document.querySelector('button[onclick*="accounts"], .card[onclick*="accounts"], div[onclick*="accounts"], [onclick*="accounts"]');
    if (accountsCard && currentUserRole !== 'admin') {
      accountsCard.classList.add('hidden');
    }
  }
  
  // Note: Maintenance card should always be visible
  // Password requirement is handled in openPasswordModal function
  updateDateTime();
  setInterval(updateDateTime, 60000);
  hideLoading();
  const initResult = await window.dataSdk.init(dataHandler);
  if (!initResult.isOk) {
    showToast('خطا در بارگذاری داده‌ها', '❌');
  }
  const page = getCurrentPage();
  await loadAndSyncDataForPage(page);
  if (window.elementSdk && typeof window.elementSdk.init === 'function') {
    await window.elementSdk.init({
      defaultConfig,
      onConfigChange: async (config) => {
        document.getElementById('dashboard-title').textContent = config.dashboard_title || defaultConfig.dashboard_title;
        document.getElementById('company-name').textContent = config.company_name || defaultConfig.company_name;
      },
      mapToCapabilities: (config) => ({
        recolorables: [
          {
            get: () => config.primary_color || defaultConfig.primary_color,
            set: (value) => {
              window.elementSdk.config.primary_color = value;
              window.elementSdk.setConfig({ primary_color: value });
            }
          }
        ],
        borderables: [],
        fontEditable: undefined,
        fontSizeable: undefined
      }),
      mapToEditPanelValues: (config) => new Map([
        ['dashboard_title', config.dashboard_title || defaultConfig.dashboard_title],
        ['company-name', config.company_name || defaultConfig.company_name]
      ])
    });
  } else {
    console.warn('elementSdk is not available. Skipping initialization.');
    if (document.getElementById('dashboard-title')) {
      document.getElementById('dashboard-title').textContent = defaultConfig.dashboard_title;
    }
    if (document.getElementById('company-name')) {
      document.getElementById('company-name').textContent = defaultConfig.company_name;
    }
  }
  updateCurrentPage();
  if (window.location.pathname.includes('requests')) {
    renderRequests(allData.filter(d => d.type === 'request'));
  }
  if (window.location.pathname.includes('history')) {
    const historySearchInput = document.getElementById('history-search');
    const historyFromDate = document.getElementById('history-from-date');
    const historyToDate = document.getElementById('history-to-date');
    const searchButton = document.querySelector('button[onclick="filterHistory()"]');
    if (historySearchInput) {
      historySearchInput.addEventListener('input', () => {
        filterHistory();
      });
    }
    if (historyFromDate) {
      historyFromDate.addEventListener('change', () => {
        filterHistory();
      });
    }
    if (historyToDate) {
      historyToDate.addEventListener('change', () => {
        filterHistory();
      });
    }
    if (searchButton) {
      searchButton.classList.add('hidden');
    }
  }
  const accountSearchInput = document.getElementById('account-search');
  if (accountSearchInput) {
    accountSearchInput.addEventListener('input', () => {
      accountSearchTerm = accountSearchInput.value.trim().toLowerCase();
      renderAccounts();
    });
    if (getCurrentPage() === 'usage-amount') {
      const usageSearchInput = document.getElementById('usage-search');
      if (usageSearchInput) {
        usageSearchInput.addEventListener('input', () => {
          usageSearchTerm = usageSearchInput.value.trim().toLowerCase();
          renderUsageMotorcycles();
        });
      }
    }
  }
  const searchInput = document.getElementById('motorcycle-status-search');
  const searchBtn = document.getElementById('motorcycle-status-search-btn');
  if (searchBtn && searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentMotorcycleSearchTerm = e.target.value.trim();
      updateCurrentPage();
    });
    searchBtn.addEventListener('click', () => {
      currentMotorcycleSearchTerm = searchInput.value.trim();
      updateCurrentPage();
    });
  }
  setupIdleLogout();
  setInterval(syncAllData, SYNC_INTERVAL_MS); // Use named constant
  
  // بررسی وضعیت آنلاین هر 1 دقیقه
  setInterval(checkAndUpdateOnlineStatus, 60000);
  
  // Load notification badge
  loadNotificationBadge();
  setInterval(loadNotificationBadge, 30000); // Update every 30 seconds
  
  // آپدیت فعالیت کاربر در هر حرکت ماوس یا کلیک
  ['mousemove', 'keydown', 'click', 'scroll'].forEach(event => {
    document.addEventListener(event, updateUserActivity, true);
  });
}
function setupIdleLogout() {
  if (typeof window.idleTime === 'undefined') {
    window.idleTime = 0;
  }
  const resetIdleTime = () => {
    window.idleTime = 0;
  };
  if (!window.listenersAdded) {
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(event => {
      document.addEventListener(event, resetIdleTime, true);
    });
    window.listenersAdded = true;
  }
  if (window.idleInterval) {
    clearInterval(window.idleInterval);
  }
  window.idleTime = 0;
  window.idleInterval = setInterval(() => {
    window.idleTime += 1;
    if (window.idleTime >= IDLE_TIMEOUT_SECONDS) {
      showToast('به دلیل عدم فعالیت، شما لاگ‌اوت شدید', '⚠️');
      logout();
      clearInterval(window.idleInterval);
      window.idleInterval = null;
    }
  }, 1000);
  const resetIdleTimeLocal = () => {
    idleTime = 0;
  };
  ['mousemove', 'keydown', 'click', 'scroll'].forEach(event => {
    document.addEventListener(event, resetIdleTimeLocal, true);
  });
}
function updateDateTime() {
  const now = new Date();
  const weekday = now.toLocaleString('en-US', { weekday: 'short' });
  const month = now.toLocaleString('en-US', { month: 'short' });
  const day = now.getDate();
  const year = now.getFullYear();
  const formatted = `${weekday}, ${month}, ${day}, ${year}`;
  document.getElementById('current-date').textContent = formatted;
}
function updateDashboard() {
  const motorcycles = allData.filter(d => d.type === 'motorcycle');
  const employees = allData.filter(d => d.type === 'employee');
  const requests = allData.filter(d => d.type === 'request');
  const activeRequests = requests.filter(r => r.status === 'pending' || r.status === 'active');
  const inUse = requests.filter(r => r.status === 'active');

  console.log('Dashboard update:', {
    motorcycles: motorcycles.length,
    employees: employees.length,
    requests: requests.length,
    activeRequests: activeRequests.length,
    inUse: inUse.length
  });

  if (document.getElementById('total-motorcycles')) document.getElementById('total-motorcycles').textContent = motorcycles.length;
  if (document.getElementById('total-employees')) document.getElementById('total-employees').textContent = employees.length;
  if (document.getElementById('active-requests')) document.getElementById('active-requests').textContent = activeRequests.length;
  if (document.getElementById('in-use')) document.getElementById('in-use').textContent = inUse.length;

  // Update online status
  updateOnlineStatus();

  if (getCurrentPage() === 'dashboard') {
    renderRequests(requests);
    renderMotorcycles(motorcycles);
    renderEmployees(employees);
    renderHistory(requests.filter(r => r.status === 'completed'));
    renderMotorcycleStatus(motorcycles, requests);
    updateModalSelects(employees, motorcycles);
  }
}
function renderRequests(requests) {
  const container = document.getElementById('requests-list');
  if (!container) return;
  let filteredRequests = requests.filter(r => r.status === 'pending' || r.status === 'active');
  
  // Filter requests for limit users - they only see their own requests
  if (currentUserRole === 'limit' && window.currentUser) {
    const currentUserFullName = (window.currentUser.fullName || '').trim().toLowerCase();
    filteredRequests = filteredRequests.filter(r => {
      const requesterName = (r.requesterFullName || '').trim().toLowerCase();
      return requesterName === currentUserFullName;
    });
    console.log('Limit user filter - Current user:', currentUserFullName);
    console.log('Filtered requests count:', filteredRequests.length);
  }
  if (currentRequestFilter !== 'all') {
    filteredRequests = filteredRequests.filter(r => r.status === currentRequestFilter);
  }
  if (currentDeptFilter !== 'all') {
    filteredRequests = filteredRequests.filter(r => r.motorcycleDepartment === currentDeptFilter);
  }
  if (currentRequestSearch) {
    const searchLower = currentRequestSearch.toLowerCase();
    filteredRequests = filteredRequests.filter(r =>
      r.motorcycleName.toLowerCase().includes(searchLower) ||
      r.employeeName.toLowerCase().includes(searchLower) ||
      r.motorcycleDepartment.toLowerCase().includes(searchLower) ||
      (r.requesterFullName && r.requesterFullName.toLowerCase().includes(searchLower))
    );
  }
  if (filteredRequests.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-gray-300"><p class="text-lg">هیچ موتور سکیلی درخواست نشده است</p><p class="text-sm mt-2">تمام موتور سکیل‌ها در دسترس هستند</p></div>';
    return;
  }
  container.innerHTML = filteredRequests.map(request => {
    let deleteButton = '';
    if (currentUserRole === 'admin') {
      deleteButton = `<button class="delete-btn" onclick="deleteRequest('${request.__backendId}')">🗑️ حذف</button>`;
    }
    return `
      <div class="card p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4 flex-1">
            <div class="motorcycle-icon engine-glow">
              🏍️
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-white">${request.motorcycleName} - ${request.motorcycleColor} - دیپارتمنت ${request.motorcycleDepartment}</h3>
              <p class="text-gray-100 mt-1">👤 ${request.employeeName} (${request.department})</p>
              <p class="text-gray-100 mt-1">🆔 درخواست کننده: ${request.requesterFullName || 'ناشناس'}</p>
              <p class="text-sm text-gray-100 mt-1">📅 ${request.requestDate}</p>
              ${request.exitTime ? `<p class="text-sm text-gray-100">🕐 خروج: ${request.exitTime}</p>` : ''}
              <p class="text-sm text-gray-100 mt-1">🔢 پلاک: ${request.motorcyclePlate}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="status-badge ${request.status === 'pending' ? 'status-pending' : 'status-active'}">
              ${request.status === 'pending' ? '⏳ در انتظار تحویل' : '🔄 در حال استفاده'}
            </span>
            ${request.status === 'pending' ?
        `<button class="btn btn-success" onclick="markAsExit('${request.__backendId}')">🚀 خروج</button>` :
        `<button class="btn btn-primary" onclick="markAsEntry('${request.__backendId}')">🏁 ورود</button>`
      }
            ${deleteButton}
          </div>
        </div>
      </div>
    `;
  }).join('');
}
function renderMotorcycles(motorcycles) {
  const container = document.getElementById('motorcycles-list');
  if (!container) return;
  if (motorcycles.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-300"><p class="text-lg">هیچ موتور سکیلی ثبت نشده است</p></div>';
    return;
  }
  container.innerHTML = motorcycles.map(motorcycle => {
    // Status badge with color coding
    const status = motorcycle.motorcycleStatus || 'سالم';
    let statusClass = '';
    if (status === 'سالم') {
      statusClass = 'bg-green-500';
    } else if (status === 'مفقود') {
      statusClass = 'bg-red-500';
    } else if (status === 'خراب') {
      statusClass = 'bg-red-500';
    }

    return `
    <div class="card p-6 cursor-pointer hover:shadow-2xl transition-all duration-300"
         onclick="showMotorcycleDetails('${motorcycle.__backendId}')">
      <div class="flex items-center gap-4 mb-4">
        <div class="motorcycle-icon">
          🏍️
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-bold text-white">${motorcycle.motorcycleName}</h3>
          <p class="text-gray-200">🎨 ${motorcycle.motorcycleColor}</p>
          <p class="text-sm text-gray-200 font-semibold">🏢 ${motorcycle.motorcycleDepartment}</p>
        </div>
      </div>
      <div class="border-t border-gray-600 pt-4">
        <p class="text-sm text-gray-100">🔢 پلاک: ${motorcycle.motorcyclePlate}</p>
        <div class="mt-2 flex items-center gap-2">
          <span class="text-sm text-gray-100">وضعیت:</span>
          <span class="px-3 py-1 rounded-full text-xs font-semibold text-white ${statusClass}">${status}</span>
        </div>
      </div>
    </div>
    `;
  }).join('');
}
function showMotorcycleDetails(motorcycleId) {
  const motorcycle = allData.find(d => d.__backendId === motorcycleId);
  if (!motorcycle) {
    showToast('موتور سکیل یافت نشد', '❌');
    return;
  }
  currentMotorcycleId = motorcycleId;
  const activeRequest = allData.find(r =>
    r.type === 'request' &&
    r.motorcycleId === motorcycle.__backendId &&
    (r.status === 'pending' || r.status === 'active')
  );
  let statusHtml = '';
  if (!activeRequest) {
    statusHtml = `
      <div class="bg-green-100 border border-green-200 p-3 rounded-lg text-sm">
        <p class="text-green-800 font-bold">🅿️ موجود در پارکینگ</p>
      </div>
    `;
  } else if (activeRequest.status === 'pending') {
    statusHtml = `
      <div class="bg-yellow-100 border border-yellow-200 p-3 rounded-lg text-sm">
        <p class="text-yellow-800 font-bold">⏳ در انتظار خروج</p>
        <p class="text-xs text-yellow-700 mt-1">👤 ${activeRequest.employeeName}</p>
      </div>
    `;
  } else {
    statusHtml = `
      <div class="bg-red-100 border border-red-200 p-3 rounded-lg text-sm">
        <p class="text-red-800 font-bold">🔄 در حال استفاده</p>
        <p class="text-xs text-red-700 mt-1">👤 ${activeRequest.employeeName}</p>
        ${activeRequest.exitTime ? `<p class="text-xs text-red-600">🚀 زمان خروج: ${activeRequest.exitTime}</p>` : ''}
      </div>
    `;
  }
  let photoHtml = motorcycle.motorcyclePhoto ?
    `<img src="${motorcycle.motorcyclePhoto}" alt="عکس موتور سکیل" class="w-full h-48 object-contain rounded-lg mb-4">` :
    `<div class="motorcycle-icon-large mb-4">🏍️</div>`;
  const licenseHtml = motorcycle.motorcycleLicense ? `<tr><td class="px-4 py-2 font-semibold">نمبر جواز سیر</td><td class="px-4 py-2">${motorcycle.motorcycleLicense}</td></tr>` : '';
  const gpsStatusHtml = motorcycle.motorcycleGpsStatus ? `<tr><td class="px-4 py-2 font-semibold">وضعیت جی پی اس</td><td class="px-4 py-2">${motorcycle.motorcycleGpsStatus}</td></tr>` : '';

  // Status badge with color coding
  const conditionStatus = motorcycle.motorcycleStatus || 'سالم';
  let conditionClass = '';
  if (conditionStatus === 'سالم') {
    conditionClass = 'bg-green-100 text-green-800';
  } else if (conditionStatus === 'مفقود') {
    conditionClass = 'bg-red-100 text-red-800';
  } else if (conditionStatus === 'خراب') {
    conditionClass = 'bg-red-100 text-red-800';
  }
  const conditionHtml = `<tr><td class="px-4 py-2 font-semibold">وضعیت موتور سکیل</td><td class="px-4 py-2"><span class="px-3 py-1 rounded-full text-sm font-semibold ${conditionClass}">${conditionStatus}</span></td></tr>`;
  const documentsButton = motorcycle.motorcycleDocuments ? `<button class="btn btn-secondary text-xs py-1 px-2 ml-2" onclick="window.open('${motorcycle.motorcycleDocuments}', '_blank')">نمایش اسناد</button>` : '';
  const content = `
    <div class="flex flex-col items-center">
      ${photoHtml}
      <h3 class="text-2xl font-bold text-white mb-4">${motorcycle.motorcycleName}</h3>
      <div class="w-full overflow-x-auto">
        <table class="min-w-full bg-gray-800 border border-gray-600 rounded-lg shadow-md table-beauty">
          <thead class="bg-gray-700">
            <th class="px-4 py-2 text-right font-semibold text-white"/>مشخصات موتور سیکلت<th>
          </thead>
          <tbody>
            <tr><td class="px-4 py-2 font-semibold text-gray-300">رنگ</td><td class="px-4 py-2 text-gray-200">${motorcycle.motorcycleColor}</td></tr>
            <tr><td class="px-4 py-2 font-semibold text-gray-300">آیدی</td><td class="px-4 py-2 text-gray-200">${motorcycle.motorcycleId}</td></tr>
            <tr><td class="px-4 py-2 font-semibold text-gray-300">شماره پلاک</td><td class="px-4 py-2 text-gray-200">${motorcycle.motorcyclePlate}</td></tr>
            ${licenseHtml}
            <tr><td class="px-4 py-2 font-semibold text-gray-300">نوعیت اسناد</td><td class="px-4 py-2 text-gray-200">${motorcycle.motorcycleDocumentType}</td></tr>
            ${conditionHtml}
            <tr><td class="px-4 py-2 font-semibold text-gray-300">نمبر شاسی</td><td class="px-4 py-2 text-gray-200">${motorcycle.motorcycleChassisNumber}</td></tr>
            <tr><td class="px-4 py-2 font-semibold text-gray-300">نمبر انجین</td><td class="px-4 py-2 text-gray-200">${motorcycle.motorcycleEngineNumber}</td></tr>
            <tr><td class="px-4 py-2 font-semibold text-gray-300">جی پی اس</td><td class="px-4 py-2 text-gray-200">${motorcycle.motorcycleGps}</td></tr>
            ${gpsStatusHtml}
            <tr><td class="px-4 py-2 font-semibold text-gray-300">دیپارتمنت</td><td class="px-4 py-2 text-gray-200">${motorcycle.motorcycleDepartment}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="mt-4 w-full flex items-stretch gap-2">
        <div class="flex-1">
          ${statusHtml}
        </div>
        <div class="flex-1 flex items-center justify-center">
          ${documentsButton}
        </div>
      </div>
      <div class="mt-4 p-3 bg-blue-900 text-white rounded-lg w-full">
        <p class="text-blue-300 font-semibold">🆔 شناسه:</p>
        <p class="text-sm text-blue-200 font-mono">${motorcycleId}</p>
      </div>
    </div>
  `;
  document.getElementById('motorcycle-details-content').innerHTML = content;
  document.getElementById('motorcycle-details-modal').classList.add('active');
  document.getElementById('edit-from-details-btn').onclick = () => {
    closeModal('motorcycle-details-modal');
    openEditMotorcycleModal(motorcycleId);
  };
  document.getElementById('delete-from-details-btn').onclick = () => {
    deleteMotorcycle(motorcycleId);
    closeModal('motorcycle-details-modal');
  };
}
function renderEmployees(employees) {
  const container = document.getElementById('employees-list');
  if (!container) return;
  if (employees.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-gray-300"><p class="text-lg">هیچ کارمندی ثبت نشده است</p></div>';
    return;
  }
  container.innerHTML = employees.map(employee => `
    <div class="card p-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="motorcycle-icon">
            👤
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">${employee.employeeName}</h3>
            <p class="text-gray-200 mt-1">🏢 ${employee.department}</p>
            <p class="text-sm text-gray-100 mt-1">🆔 ${employee.employeeId} | 👆 ${employee.fingerprintId}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-primary" onclick="openEditEmployeeModal('${employee.__backendId}')">✏️ ویرایش</button>
          <button class="delete-btn" onclick="deleteEmployee('${employee.__backendId}')">🗑️ حذف</button>
        </div>
      </div>
    </div>
  `).join('');
}
function renderHistory(filteredRequests) {
  const container = document.getElementById('history-list');
  if (!container) return;
  if (filteredRequests.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-gray-300"><p class="text-lg">هیچ تاریخچه‌ای با فیلترهای انتخابی وجود ندارد</p></div>';
    return;
  }
  container.innerHTML = filteredRequests.map(request => `
    <div class="card p-6 ${request.status === 'delet' ? 'bg-red-900' : ''}">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4 flex-1">
          <div class="motorcycle-icon">
            📊
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-white">${request.motorcycleName} - ${request.motorcycleColor} - دیپارتمنت ${request.motorcycleDepartment}</h3>
            <p class="text-gray-200 mt-1">👤 ${request.employeeName} ( ${request.department})</p>
            <p class="text-gray-200 mt-1">🆔 درخواست کننده: ${request.requesterFullName || 'ناشناس'}</p>
            ${request.deleterFullName ? `<p class="text-gray-200 mt-1">🗑️ حذف‌کننده: ${request.deleterFullName}</p>` : ''}
            <div class="flex gap-6 mt-2 text-sm text-gray-100">
              <span>📅 ${request.requestDate}</span>
              <span>🚀 خروج: ${request.exitTime}</span>
              <span>🏁 ورود: ${request.entryTime}</span>
              <span>⏱ مدت زمان استفاده: ${formatUsageTime(request.usageTime) || 'نامشخص'}</span>
            </div>
          </div>
        </div>
        <span class="status-badge ${request.status === 'completed' ? 'status-completed' : (request.status === 'delet' ? 'status-deleted' : '')}">
          ${request.status === 'completed' ? '✅ تکمیل شده' : (request.status === 'delet' ? '❌ حذف شده' : 'نامعلوم')}
        </span>
      </div>
    </div>
  `).join('');
}
function renderMotorcycleStatus(motorcycles, requests) {
  const container = document.getElementById('motorcycle-status-list');
  if (!container) return;
  if (motorcycles.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-300"><p class="text-lg">هیچ موتورسیکلی ثبت نشده است</p></div>';
    return;
  }
  let availableCount = 0;
  let pendingCount = 0;
  let inUseCount = 0;
  let motorcycleStatusData = motorcycles.map(motorcycle => {
    const activeRequest = requests.find(r =>
      r.motorcycleId === motorcycle.__backendId &&
      (r.status === 'pending' || r.status === 'active')
    );
    let status, statusClass, statusIcon, statusText, employeeInfo;
    if (!activeRequest) {
      status = 'available';
      statusClass = 'bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-400/30';
      statusIcon = '🅿️';
      statusText = 'موجود در پارکینگ';
      employeeInfo = '';
      availableCount++;
    } else if (activeRequest.status === 'pending') {
      status = 'pending';
      statusClass = 'bg-gradient-to-br from-yellow-500/20 to-orange-600/20 border-yellow-400/30';
      statusIcon = '⏳';
      statusText = 'در انتظار خروج';
      employeeInfo = `👤 ${activeRequest.employeeName}`;
      pendingCount++;
    } else if (activeRequest.status === 'active') {
      status = 'in-use';
      statusClass = 'bg-gradient-to-br from-red-500/20 to-pink-600/20 border-red-400/30';
      statusIcon = '🔄';
      statusText = 'در حال استفاده';
      employeeInfo = `👤 ${activeRequest.employeeName}`;
      inUseCount++;
    }
    return {
      motorcycle,
      status,
      statusClass,
      statusIcon,
      statusText,
      employeeInfo,
      activeRequest
    };
  });
  if (currentMotorcycleDeptFilter !== 'all') {
    motorcycleStatusData = motorcycleStatusData.filter(data => data.motorcycle.motorcycleDepartment === currentMotorcycleDeptFilter);
  }
  if (document.getElementById('available-count')) document.getElementById('available-count').textContent = availableCount;
  if (document.getElementById('pending-count')) document.getElementById('pending-count').textContent = pendingCount;
  if (document.getElementById('in-use-count')) document.getElementById('in-use-count').textContent = inUseCount;
  let filteredData = currentStatusFilter === 'all' ?
    motorcycleStatusData :
    motorcycleStatusData.filter(data => data.status === currentStatusFilter);
  if (currentMotorcycleSearchTerm) {
    filteredData = filteredData.filter(data =>
      data.motorcycle.motorcycleName.toLowerCase().includes(currentMotorcycleSearchTerm.toLowerCase()) ||
      data.motorcycle.motorcycleDepartment.toLowerCase().includes(currentMotorcycleSearchTerm.toLowerCase())
    );
  }
  document.getElementById('filtered-count').textContent = filteredData.length;
  if (filteredData.length === 0) {
    const filterNames = {
      'available': 'موجود در پارکینگ',
      'pending': 'در انتظار خروج',
      'in-use': 'در حال استفاده'
    };
    const filterName = filterNames[currentStatusFilter] || 'این فیلتر';
    container.innerHTML = `<div class="col-span-full text-center py-12 text-gray-300"><p class="text-lg">هیچ موتورسیکلی با وضعیت "${filterName}" یافت نشد</p></div>`;
    return;
  }
  container.innerHTML = filteredData.map(data => `
    <div class="card p-6 ${data.statusClass}">
      <div class="flex items-center gap-4 mb-4">
        <div class="motorcycle-icon">
          🏍️
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-bold text-white">${data.motorcycle.motorcycleName}</h3>
          <p class="text-gray-300">🎨 ${data.motorcycle.motorcycleColor}</p>
          <p class="text-sm text-gray-100 font-semibold">🏢 ${data.motorcycle.motorcycleDepartment}</p>
        </div>
        <div class="text-center">
          <div class="text-3xl mb-1">${data.statusIcon}</div>
          <span class="text-xs text-white font-semibold">${data.statusText}</span>
        </div>
      </div>
      <div class="border-t border-gray-600 pt-4">
        <p class="text-sm text-gray-100 mb-2">🔢 پلاک: ${data.motorcycle.motorcyclePlate}</p>
        
        <!-- Condition Status (سالم/مفقود/خراب) with color coding -->
        <div class="mt-2 flex items-center gap-2">
          <span class="text-sm text-gray-100">وضعیت:</span>
          ${(() => {
      const conditionStatus = data.motorcycle.motorcycleStatus || 'سالم';
      let statusClass = '';
      if (conditionStatus === 'سالم') {
        statusClass = 'bg-green-500';
      } else if (conditionStatus === 'مفقود' || conditionStatus === 'خراب') {
        statusClass = 'bg-red-500';
      }
      return `<span class="px-2 py-0.5 rounded-full text-xs font-semibold text-white ${statusClass}">${conditionStatus}</span>`;
    })()}
        </div>
        
        ${data.employeeInfo ? `<p class="text-sm text-gray-100 mb-2 mt-2">${data.employeeInfo}</p>` : ''}
        ${data.activeRequest && data.activeRequest.requestDate ? `<p class="text-xs text-gray-100">📅 ${data.activeRequest.requestDate}</p>` : ''}
        ${data.activeRequest && data.activeRequest.exitTime ? `<p class="text-xs text-gray-100">🚀 خروج: ${data.activeRequest.exitTime}</p>` : ''}
      </div>
    </div>
  `).join('');
}
function formatUsageTime(usageTime) {
  if (!usageTime) return null;
  if (usageTime.includes('T')) {
    const date = new Date(usageTime);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  return usageTime;
}
function filterMotorcycleStatus(filter) {
  currentStatusFilter = filter;
  document.querySelectorAll('[id^="filter-"]').forEach(btn => btn.classList.remove('active-filter'));
  const selectedBtn = document.getElementById(`filter-${filter}`);
  if (selectedBtn) {
    selectedBtn.classList.add('active-filter');
  }
  updateCurrentPage();
}
function filterHistory(completedRequests) {
  if (!completedRequests) {
    completedRequests = allData.filter(d => d.type === 'request' && (d.status === 'completed' || d.status === 'delet'));
  }
  const searchTerm = document.getElementById('history-search')?.value.toLowerCase() || historySearchTerm;
  const fromDateStr = document.getElementById('history-from-date')?.value || historyFromDate;
  const toDateStr = document.getElementById('history-to-date')?.value || historyToDate;
  let filtered = completedRequests;
  if (searchTerm) {
    filtered = filtered.filter(r =>
      r.employeeName.toLowerCase().includes(searchTerm) ||
      r.motorcycleName.toLowerCase().includes(searchTerm) ||
      (r.requesterFullName && r.requesterFullName.toLowerCase().includes(searchTerm))
    );
  }
  if (fromDateStr || toDateStr) {
    filtered = filtered.filter(r => {
      const reqDate = r.requestDate.replace(/\//g, '-');
      if (fromDateStr && reqDate < fromDateStr) return false;
      if (toDateStr && reqDate > toDateStr) return false;
      return true;
    });
  }
  historySearchTerm = searchTerm;
  historyFromDate = fromDateStr;
  historyToDate = toDateStr;
  renderHistory(filtered);
  return filtered;
}
function populateDepartmentDropdown() {
  const optionsContainer = document.getElementById('department-options');
  if (!optionsContainer) return;
  if (availableDepartments.length === 0) {
    optionsContainer.innerHTML = '<div class="p-3 text-gray-500 text-center">هیچ دیپارتمنتی ثبت نشده است. ابتدا موتور سکیل اضافه کنید.</div>';
    return;
  }
  optionsContainer.innerHTML = availableDepartments.map(dept =>
    `<div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0" onclick="selectDepartment('${dept}')">${dept}</div>`
  ).join('');
}
function searchDepartments() {
  const searchTerm = document.getElementById('department-search').value.toLowerCase();
  const filteredDepartments = availableDepartments.filter(dept => dept.toLowerCase().includes(searchTerm));
  const optionsContainer = document.getElementById('department-options');
  if (!optionsContainer) return;
  if (filteredDepartments.length === 0) {
    optionsContainer.innerHTML = '<div class="p-3 text-gray-500 text-center">هیچ دیپارتمنتی یافت نشد</div>';
    return;
  }
  optionsContainer.innerHTML = filteredDepartments.map(dept =>
    `<div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0" onclick="selectDepartment('${dept}')">${dept}</div>`
  ).join('');
}
function toggleDepartmentDropdown() {
  const dropdown = document.getElementById('department-dropdown');
  if (!dropdown) return;
  const isHidden = dropdown.classList.contains('hidden');
  document.getElementById('employee-dropdown')?.classList.add('hidden');
  document.getElementById('motorcycle-dropdown')?.classList.add('hidden');
  if (isHidden) {
    dropdown.classList.remove('hidden');
    document.getElementById('department-search').value = '';
    populateDepartmentDropdown();
    setTimeout(() => document.getElementById('department-search').focus(), 100);
  } else {
    dropdown.classList.add('hidden');
  }
}
function selectDepartment(department) {
  document.getElementById('department-display').textContent = department;
  document.getElementById('selected-department').value = department;
  document.getElementById('department-dropdown').classList.add('hidden');
  filterByDepartment();
}

function filterByDepartment() {
  const selectedDepartment = document.getElementById('selected-department').value;
  const employeeSelect = document.getElementById('employee-select');
  const motorcycleSelect = document.getElementById('motorcycle-select');
  const employeeDisplay = document.getElementById('employee-display');
  const motorcycleDisplay = document.getElementById('motorcycle-display');

  if (!selectedDepartment) {
    employeeSelect.disabled = true;
    motorcycleSelect.disabled = true;
    employeeSelect.classList.add('opacity-50');
    motorcycleSelect.classList.add('opacity-50');
    employeeDisplay.textContent = 'ابتدا دیپارتمنت را انتخاب کنید';
    motorcycleDisplay.textContent = 'ابتدا دیپارتمنت را انتخاب کنید';
    document.getElementById('selected-employee').value = '';
    document.getElementById('selected-motorcycle').value = '';
    return;
  }

  const activeRequests = allData.filter(d => d.type === 'request' && (d.status === 'pending' || d.status === 'active'));
  const requestedMotorcycleIds = activeRequests.map(r => r.motorcycleId);
  const userDept = window.currentUser.department || '';

  // پاک کردن انتخاب قبلی
  document.getElementById('selected-employee').value = '';
  document.getElementById('selected-motorcycle').value = '';
  employeeDisplay.textContent = 'کارمند را انتخاب کنید';
  motorcycleDisplay.textContent = 'موتور سکیل را انتخاب کنید';

  // فعال کردن فیلدها
  employeeSelect.disabled = false;
  employeeSelect.classList.remove('opacity-50');
  motorcycleSelect.disabled = false;
  motorcycleSelect.classList.remove('opacity-50');

  if (selectedDepartment === 'متفرقه') {
    availableEmployees = allData.filter(d => d.type === 'employee');

    // اگر دیپارتمنت همه است، تمام موتورهای آزاد را نشان بده
    // در غیر این صورت فقط موتورهای دیپارتمنت کاربر فعلی
    if (userDept === 'همه' || userDept === 'BDT') {
      availableMotorcycles = allData.filter(d =>
        d.type === 'motorcycle' &&
        !requestedMotorcycleIds.includes(d.__backendId)
      );
    } else {
      availableMotorcycles = allData.filter(d =>
        d.type === 'motorcycle' &&
        d.motorcycleDepartment === userDept &&
        !requestedMotorcycleIds.includes(d.__backendId)
      );
    }
  } else {
    // دیپارتمنت معمولی
    availableEmployees = allData.filter(d =>
      d.type === 'employee' &&
      d.department === selectedDepartment
    );

    // همه موتورهای آزاد این دیپارتمنت (برای انتخاب دستی)
    availableMotorcycles = allData.filter(d =>
      d.type === 'motorcycle' &&
      d.motorcycleDepartment === selectedDepartment &&
      !requestedMotorcycleIds.includes(d.__backendId)
    );
  }

  employeeDisplay.textContent = availableEmployees.length > 0 ? 'کارمند را انتخاب کنید' : 'هیچ کارمندی یافت نشد';
  motorcycleDisplay.textContent = 'ابتدا کارمند را انتخاب کنید'; // تا کارمند انتخاب نشود، لیست موتور نمایش داده نشود

  populateEmployeeDropdown();
  // لیست موتورها را بعداً در selectEmployee پر می‌کنیم
}

let availableDepartments = [];
let availableEmployees = [];
let availableMotorcycles = [];
function updateModalSelects(employees, motorcycles) {
  const uniqueDepts = [...new Set([...employees.map(e => e.department), ...motorcycles.map(m => m.motorcycleDepartment)])].sort();
  const userDept = window.currentUser.department || '';
  if (userDept === 'BDT' || userDept === 'همه') {
    availableDepartments = ['متفرقه', ...uniqueDepts];
  } else {
    availableDepartments = ['متفرقه'];
    if (uniqueDepts.includes(userDept)) {
      availableDepartments.push(userDept);
    }
  }
  populateDepartmentDropdown();
}
function populateEmployeeDropdown() {
  const searchTerm = document.getElementById('employee-search').value.toLowerCase();
  const activeRequests = allData.filter(d => d.type === 'request' && (d.status === 'pending' || d.status === 'active'));
  requestedEmployeeIds = activeRequests.map(r => r.employeeId);
  const availableEmployeesForRequest = availableEmployees.filter(emp => !requestedEmployeeIds.includes(emp.employeeId));
  const filteredEmployees = availableEmployeesForRequest.filter(emp =>
    emp.employeeName.toLowerCase().includes(searchTerm) ||
    String(emp.employeeId).toLowerCase().includes(searchTerm)
  );
  const optionsContainer = document.getElementById('employee-options');
  if (!optionsContainer) return;
  if (filteredEmployees.length === 0) {
    optionsContainer.innerHTML = '<div class="p-3 text-gray-500 text-center">هیچ کارمندی یافت نشد</div>';
    return;
  }
  optionsContainer.innerHTML = filteredEmployees.map(emp =>
    `<div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0" onclick="selectEmployee('${emp.__backendId}', '${emp.employeeName} - ${emp.employeeId}')">${emp.employeeName} - ${emp.employeeId}</div>`
  ).join('');
}
function searchEmployees() {
  populateEmployeeDropdown();
}
function toggleEmployeeDropdown() {
  if (document.getElementById('employee-select').disabled) return;
  const dropdown = document.getElementById('employee-dropdown');
  if (!dropdown) return;
  const isHidden = dropdown.classList.contains('hidden');
  document.getElementById('department-dropdown')?.classList.add('hidden');
  document.getElementById('motorcycle-dropdown')?.classList.add('hidden');
  if (isHidden) {
    dropdown.classList.remove('hidden');
    document.getElementById('employee-search').value = '';
    populateEmployeeDropdown();
    setTimeout(() => document.getElementById('employee-search').focus(), 100);
  } else {
    dropdown.classList.add('hidden');
  }
}


function selectEmployee(employeeId, employeeText) {
  document.getElementById('employee-display').textContent = employeeText;
  document.getElementById('selected-employee').value = employeeId;
  document.getElementById('employee-dropdown').classList.add('hidden');

  const employee = allData.find(d => d.__backendId === employeeId && d.type === 'employee');
  const motorcycleSelect = document.getElementById('motorcycle-select');
  const motorcycleDisplay = document.getElementById('motorcycle-display');

  // پاک کردن انتخاب قبلی موتور
  document.getElementById('selected-motorcycle').value = '';
  motorcycleDisplay.textContent = 'موتور سکیل را انتخاب کنید';
  motorcycleSelect.disabled = false;
  motorcycleSelect.classList.remove('opacity-50');

  // چک جدید: اگر دیپارتمنت "متفرقه" است، همیشه به انتخاب دستی برو
  const selectedDepartment = document.getElementById('selected-department').value;
  if (selectedDepartment === 'متفرقه') {
    motorcycleDisplay.textContent = 'موتور سکیل را انتخاب کنید';
    motorcycleSelect.disabled = false;
    motorcycleSelect.classList.remove('opacity-50');
    populateMotorcycleDropdown();
    return;
  }

  if (employee && employee.assignedMotorcycleId) {
    const assignedMoto = allData.find(d => d.__backendId === employee.assignedMotorcycleId && d.type === 'motorcycle');
    if (assignedMoto) {
      // چک درخواست‌های فعال
      const activeRequests = allData.filter(d =>
        d.type === 'request' &&
        (d.status === 'pending' || d.status === 'active') &&
        d.motorcycleId === assignedMoto.__backendId
      );
      if (activeRequests.length === 0) {
        // موتور آزاد است → اتوماتیک انتخاب
        const text = `${assignedMoto.motorcycleName} - ${assignedMoto.motorcycleColor} - ${assignedMoto.motorcyclePlate}`;
        motorcycleDisplay.textContent = text + ' (اختصاصی)';
        document.getElementById('selected-motorcycle').value = assignedMoto.__backendId;

        // read-only کردن فیلد
        motorcycleSelect.disabled = true;
        motorcycleSelect.classList.add('opacity-50');
        document.getElementById('motorcycle-dropdown').classList.add('hidden');

        showToast('موتور سیکل اختصاصی این کارمند به صورت خودکار انتخاب شد', '✅');
        return;
      } else {
        // موتور در استفاده
        showToast('موتور اختصاصی این کارمند در حال حاضر در حال استفاده است', '⚠️');
      }
    } else {
      showToast('موتور اختصاصی این کارمند یافت نشد', '⚠️');
    }
  }

  // اگر نرسید به اتوماتیک → انتخاب دستی
  motorcycleDisplay.textContent = 'موتور سکیل را انتخاب کنید';
  motorcycleSelect.disabled = false;
  motorcycleSelect.classList.remove('opacity-50');
  populateMotorcycleDropdown();
}

function populateMotorcycleDropdown() {
  const optionsContainer = document.getElementById('motorcycle-options');
  if (!optionsContainer) return;

  const activeRequests = allData.filter(d => d.type === 'request' && (d.status === 'pending' || d.status === 'active'));
  const requestedMotorcycleIds = activeRequests.map(r => r.motorcycleId);

  const availableMotorcyclesForRequest = availableMotorcycles.filter(moto =>
    !requestedMotorcycleIds.includes(moto.__backendId)
  );

  if (availableMotorcyclesForRequest.length === 0) {
    optionsContainer.innerHTML = '<div class="p-3 text-gray-500 text-center">هیچ موتور سکیل آزادی موجود نیست</div>';
    return;
  }

  optionsContainer.innerHTML = availableMotorcyclesForRequest.map(moto => {
    // Status badge with color coding
    const status = moto.motorcycleStatus || 'سالم';
    let statusClass = '';
    if (status === 'سالم') {
      statusClass = 'bg-green-500';
    } else if (status === 'مفقود' || status === 'خراب') {
      statusClass = 'bg-red-500';
    }

    return `<div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0" onclick="selectMotorcycle('${moto.__backendId}', '${moto.motorcycleName} - ${moto.motorcycleColor} - ${moto.motorcycleDepartment}')">
      <div class="font-semibold">${moto.motorcycleName} - ${moto.motorcycleColor} - ${moto.motorcycleDepartment}</div>
      <div class="flex items-center gap-2 mt-1">
        <span class="text-sm text-gray-600">وضعیت:</span>
        <span class="px-2 py-0.5 rounded-full text-xs font-semibold text-white ${statusClass}">${status}</span>
      </div>
    </div>`;
  }).join('');
}


function searchMotorcycles() {
  const searchTerm = document.getElementById('motorcycle-search').value.toLowerCase();
  const activeRequests = allData.filter(d => d.type === 'request' && (d.status === 'pending' || d.status === 'active'));
  const requestedMotorcycleIds = activeRequests.map(r => r.motorcycleId);
  const availableMotorcyclesForRequest = availableMotorcycles.filter(moto =>
    !requestedMotorcycleIds.includes(moto.__backendId)
  );
  const filteredMotorcycles = availableMotorcyclesForRequest.filter(moto =>
    moto.motorcycleName.toLowerCase().includes(searchTerm) ||
    moto.motorcycleColor.toLowerCase().includes(searchTerm) ||
    String(moto.motorcyclePlate).toLowerCase().includes(searchTerm)
  );
  const optionsContainer = document.getElementById('motorcycle-options');
  if (!optionsContainer) return;
  if (filteredMotorcycles.length === 0) {
    optionsContainer.innerHTML = '<div class="p-3 text-gray-500 text-center">هیچ موتور سکیل آزادی یافت نشد</div>';
    return;
  }
  optionsContainer.innerHTML = filteredMotorcycles.map(moto => {
    // Status badge with color coding
    const status = moto.motorcycleStatus || 'سالم';
    let statusClass = '';
    if (status === 'سالم') {
      statusClass = 'bg-green-500';
    } else if (status === 'مفقود' || status === 'خراب') {
      statusClass = 'bg-red-500';
    }

    return `<div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0" onclick="selectMotorcycle('${moto.__backendId}', '${moto.motorcycleName} - ${moto.motorcycleColor} - ${moto.motorcycleDepartment}')">
      <div class="font-semibold">${moto.motorcycleName} - ${moto.motorcycleColor} - ${moto.motorcycleDepartment}</div>
      <div class="flex items-center gap-2 mt-1">
        <span class="text-sm text-gray-600">وضعیت:</span>
        <span class="px-2 py-0.5 rounded-full text-xs font-semibold text-white ${statusClass}">${status}</span>
      </div>
    </div>`;
  }).join('');
}
function toggleMotorcycleDropdown() {
  if (document.getElementById('motorcycle-select').disabled) return;
  const dropdown = document.getElementById('motorcycle-dropdown');
  if (!dropdown) return;
  const isHidden = dropdown.classList.contains('hidden');
  document.getElementById('department-dropdown')?.classList.add('hidden');
  document.getElementById('employee-dropdown')?.classList.add('hidden');
  if (isHidden) {
    dropdown.classList.remove('hidden');
    document.getElementById('motorcycle-search').value = '';
    populateMotorcycleDropdown();
    setTimeout(() => document.getElementById('motorcycle-search').focus(), 100);
  } else {
    dropdown.classList.add('hidden');
  }
}
function selectMotorcycle(motorcycleId, motorcycleText) {
  document.getElementById('motorcycle-display').textContent = motorcycleText;
  document.getElementById('selected-motorcycle').value = motorcycleId;
  document.getElementById('motorcycle-dropdown').classList.add('hidden');
}
function openPasswordModal(type) {
  // All users can create requests without password
  if (type === 'request') {
    openNewRequestModal();
    return;
  }

  // Check if user has maintenance permission (customDisplays contains 'تعمیرات')
  if (type === 'maintenance') {
    const user = window.currentUser;
    const displays = user && user.customDisplays ? user.customDisplays.split(',') : [];
    const hasMaintenancePermission = displays.includes('تعمیرات');
    
    if (hasMaintenancePermission) {
      // User has permission - no password needed
      navigateTo('./maintenance.html');
      return;
    }
    // User doesn't have permission - ask for password
    currentPasswordType = type;
    document.getElementById('password-message').textContent = '🔐 برای دسترسی به تعمیرات، رمز عبور را وارد کنید';
    document.getElementById('password-modal').classList.add('active');
    document.getElementById('password-input').focus();
    return;
  }

  // For other types, admins can skip password
  if (currentUserRole === 'admin') {
    if (type === 'management') {
      navigateTo('./management.html');
    } else if (type === 'motorcycle') {
      openNewMotorcycleModal();
    } else if (type === 'employee') {
      openNewEmployeeModal();
    }
    return;
  }

  currentPasswordType = type;
  const messages = {
    management: '🔐 برای دسترسی به پنل مدیریت، رمز عبور را وارد کنید',
    motorcycle: '🔐 برای افزودن موتور سکیل، رمز عبور مدیریت موتور سکیل‌ها را وارد کنید',
    employee: '🔐 برای افزودن کارمند، رمز عبور مدیریت کارمندان را وارد کنید'
  };
  document.getElementById('password-message').textContent = messages[type];
  document.getElementById('password-modal').classList.add('active');
  document.getElementById('password-input').focus();
}
function verifyPassword(event) {
  event.preventDefault();
  const enteredPassword = document.getElementById('password-input').value;
  const correctPassword = passwords[currentPasswordType];
  if (enteredPassword === correctPassword) {
    closeModal('password-modal');
    document.getElementById('password-form').reset();

    if (currentPasswordType === 'management') {
      navigateTo('./management.html');
    } else if (currentPasswordType === 'motorcycle') {
      openNewMotorcycleModal();
    } else if (currentPasswordType === 'employee') {
      openNewEmployeeModal();
    } else if (currentPasswordType === 'maintenance') {
      navigateTo('./maintenance.html');
    }
  } else {
    showToast('رمز عبور اشتباه است', '❌');
    document.getElementById('password-input').value = '';
    document.getElementById('password-input').focus();
  }
}
function openNewRequestModal() {
  const employees = allData.filter(d => d.type === 'employee');
  const motorcycles = allData.filter(d => d.type === 'motorcycle');
  updateModalSelects(employees, motorcycles);
  document.getElementById('new-request-modal').classList.add('active');
  populateDepartmentDropdown();
}
function closeNewRequestModal() {
  closeModal('new-request-modal');
  resetRequestForm();
}
function openNewMotorcycleModal() {
  toggleLicenseField();
  toggleGpsStatusField();
  document.getElementById('new-motorcycle-modal').classList.add('active');
}
function openNewEmployeeModal() {
  document.getElementById('new-employee-modal').classList.add('active');
}
function openEditMotorcycleModal(motorcycleId) {
  const motorcycle = allData.find(d => d.__backendId === motorcycleId);
  if (!motorcycle) return;
  document.getElementById('edit-motorcycle-name').value = motorcycle.motorcycleName;
  document.getElementById('edit-motorcycle-color').value = motorcycle.motorcycleColor;
  document.getElementById('edit-motorcycle-id').value = motorcycle.motorcycleId;
  document.getElementById('edit-motorcycle-plate').value = motorcycle.motorcyclePlate;
  document.getElementById('edit-motorcycle-document-type').value = motorcycle.motorcycleDocumentType;
  document.getElementById('edit-motorcycle-license').value = motorcycle.motorcycleLicense || '';
  document.getElementById('edit-motorcycle-chassis-number').value = motorcycle.motorcycleChassisNumber || '';
  document.getElementById('edit-motorcycle-engine-number').value = motorcycle.motorcycleEngineNumber || '';
  document.getElementById('edit-motorcycle-gps').value = motorcycle.motorcycleGps || '';
  document.getElementById('edit-motorcycle-gps-status').value = motorcycle.motorcycleGpsStatus || '';
  document.getElementById('edit-motorcycle-department').value = motorcycle.motorcycleDepartment;
  document.getElementById('edit-motorcycle-status').value = motorcycle.motorcycleStatus || 'سالم';
  // Don't set file input values - they can't be pre-filled programmatically
  // If there are existing photos, show previews
  if (motorcycle.motorcyclePhoto) {
    document.getElementById('edit-motorcycle-photo-preview-img').src = motorcycle.motorcyclePhoto;
    document.getElementById('edit-motorcycle-photo-preview').classList.remove('hidden');
  } else {
    document.getElementById('edit-motorcycle-photo-preview').classList.add('hidden');
  }
  if (motorcycle.motorcycleDocuments) {
    document.getElementById('edit-motorcycle-documents-name').textContent = 'اسناد قبلی موجود است - فایل جدید برای جایگزینی انتخاب کنید';
    document.getElementById('edit-motorcycle-documents-preview').classList.remove('hidden');
  } else {
    document.getElementById('edit-motorcycle-documents-preview').classList.add('hidden');
  }
  document.getElementById('edit-motorcycle-form').dataset.id = motorcycleId;
  toggleEditLicenseField();
  toggleEditGpsStatusField();
  document.getElementById('edit-motorcycle-modal').classList.add('active');
}
function openEditEmployeeModal(employeeId) {
  const employee = allData.find(d => d.__backendId === employeeId);
  if (!employee) return;
  document.getElementById('edit-employee-name').value = employee.employeeName;
  document.getElementById('edit-employee-id').value = employee.employeeId;
  document.getElementById('edit-employee-department').value = employee.department;
  document.getElementById('edit-employee-fingerprint').value = employee.fingerprintId;
  document.getElementById('edit-employee-form').dataset.id = employeeId;
  if (employee.assignedMotorcycleName) {
    document.getElementById('edit-assigned-motorcycle-display').textContent =
      `${employee.assignedMotorcycleName} - ${employee.assignedMotorcycleColor} - ${employee.assignedMotorcyclePlate}`;
    document.getElementById('edit-selected-assigned-motorcycle').value = employee.assignedMotorcycleId || '';
  } else {
    document.getElementById('edit-assigned-motorcycle-display').textContent = 'موتور سیکل اختصاصی انتخاب نشده';
    document.getElementById('edit-selected-assigned-motorcycle').value = '';
  }

  document.getElementById('edit-employee-modal').classList.add('active');
}
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}
async function submitNewRequest(event) {
  event.preventDefault();
  if (currentRecordCount >= 100000000000) {
    showToast('حداکثر تعداد رکوردها (۹۹۹) به پایان رسیده است', '⚠️');
    return;
  }
  const form = event.target;
  form.classList.add('loading');
  const employeeId = document.getElementById('selected-employee').value;
  const motorcycleId = document.getElementById('selected-motorcycle').value;
  const employee = allData.find(d => d.__backendId === employeeId);
  const motorcycle = allData.find(d => d.__backendId === motorcycleId);

  if (!employee || !motorcycle) {
    showToast('کارمند یا موتورسیکلت یافت نشد', '❌');
    form.classList.remove('loading');
    return;
  }
  const activeRequests = allData.filter(d =>
    d.type === 'request' &&
    d.motorcycleId === motorcycle.__backendId &&
    (d.status === 'pending' || d.status === 'active')
  );

  if (activeRequests.length > 0) {
    showToast('این موتورسیکلت توسط کاربر دیگری درخواست شده است. لطفاً لیست را چک کنید.', '⚠️');
    form.classList.remove('loading');
    return;
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const requestDate = `${year}/${month}/${day}`;
  let requesterFullName = 'ناشناس';
  if (window.currentUser && window.currentUser.fullName) {
    requesterFullName = window.currentUser.fullName;
    console.log('Requester from currentUser:', requesterFullName);
  } else {
    try {
      const session = JSON.parse(localStorage.getItem('session'));
      if (session && session.fullName) {
        requesterFullName = session.fullName;
        console.log('Requester from session:', requesterFullName);
      } else {
        console.error('No fullName in session or currentUser!');
      }
    } catch (e) {
      console.error('Session parse error:', e);
    }
  }
  console.log('Request Date (fixed):', requestDate);
  console.log('Requester FullName:', requesterFullName);
  const requestData = {
    type: 'request',
    employeeId: employee.employeeId,
    employeeName: employee.employeeName,
    department: employee.department,
    fingerprintId: employee.fingerprintId,
    motorcycleId: motorcycle.__backendId,
    motorcycleName: motorcycle.motorcycleName,
    motorcycleColor: motorcycle.motorcycleColor,
    motorcyclePlate: motorcycle.motorcyclePlate,
    motorcycleDepartment: motorcycle.motorcycleDepartment,
    requestDate: requestDate,
    requesterFullName: requesterFullName,
    exitTime: '',
    entryTime: '',
    usageTime: '',
    status: 'pending'
  };
  const result = await window.dataSdk.create(requestData);
  form.classList.remove('loading');
  if (result.isOk) {
    showToast('درخواست با موفقیت ثبت شد', '✅');
    closeModal('new-request-modal');
    resetRequestForm();
    // No immediate sync needed - local data already has the request with correct motorcycleId
    updateCurrentPage();
  } else {
    showToast('خطا در ثبت درخواست', '❌');
  }
}
function resetRequestForm() {
  document.getElementById('department-display').textContent = 'دیپارتمنت را انتخاب کنید';
  document.getElementById('employee-display').textContent = 'ابتدا دیپارتمنت را انتخاب کنید';
  document.getElementById('motorcycle-display').textContent = 'ابتدا دیپارتمنت را انتخاب کنید';
  document.getElementById('selected-department').value = '';
  document.getElementById('selected-employee').value = '';
  document.getElementById('selected-motorcycle').value = '';
  document.getElementById('employee-select').disabled = true;
  document.getElementById('motorcycle-select').disabled = true;
  document.getElementById('employee-select').classList.add('opacity-50');
  document.getElementById('motorcycle-select').classList.add('opacity-50');
  document.getElementById('department-dropdown')?.classList.add('hidden');
  document.getElementById('employee-dropdown')?.classList.add('hidden');
  document.getElementById('motorcycle-dropdown')?.classList.add('hidden');
}

// Upload photo to imgbb (same function as in profile-settings.js)
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

// Preview motorcycle photo
function previewMotorcyclePhoto(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById('motorcycle-photo-preview-img').src = e.target.result;
      document.getElementById('motorcycle-photo-preview').classList.remove('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// Preview motorcycle documents
function previewMotorcycleDocuments(input) {
  if (input.files && input.files[0]) {
    document.getElementById('motorcycle-documents-name').textContent = input.files[0].name;
    document.getElementById('motorcycle-documents-preview').classList.remove('hidden');
  }
}

// Preview edit motorcycle photo
function previewEditMotorcyclePhoto(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById('edit-motorcycle-photo-preview-img').src = e.target.result;
      document.getElementById('edit-motorcycle-photo-preview').classList.remove('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// Preview edit motorcycle documents
function previewEditMotorcycleDocuments(input) {
  if (input.files && input.files[0]) {
    document.getElementById('edit-motorcycle-documents-name').textContent = input.files[0].name;
    document.getElementById('edit-motorcycle-documents-preview').classList.remove('hidden');
  }
}

async function submitNewMotorcycle(event) {
  event.preventDefault();
  if (currentRecordCount >= 100000000000) {
    showToast('حداکثر تعداد رکوردها (۹۹۹) به پایان رسیده است', '⚠️');
    return;
  }
  const form = event.target;
  form.classList.add('loading');
  const documentType = document.getElementById('motorcycle-document-type').value;
  const licenseNumber = documentType === 'جواز سیر' ? document.getElementById('motorcycle-license').value : '';
  const gps = document.getElementById('motorcycle-gps').value;
  const gpsStatus = gps === 'دارد' ? document.getElementById('motorcycle-gps-status').value : '';

  // Upload photos and documents
  let photoUrl = '';
  let documentsUrl = '';
  const photoInput = document.getElementById('motorcycle-photo');
  const documentsInput = document.getElementById('motorcycle-documents');

  if (photoInput.files && photoInput.files[0]) {
    try {
      showToast('در حال آپلود عکس...', '⏳');
      photoUrl = await uploadPhotoToImgBB(photoInput.files[0]);
    } catch (error) {
      showToast('خطا در آپلود عکس: ' + error.message, '❌');
      form.classList.remove('loading');
      return;
    }
  }

  if (documentsInput.files && documentsInput.files[0]) {
    try {
      showToast('در حال آپلود اسناد...', '⏳');
      documentsUrl = await uploadPhotoToImgBB(documentsInput.files[0]);
    } catch (error) {
      showToast('خطا در آپلود اسناد: ' + error.message, '❌');
      form.classList.remove('loading');
      return;
    }
  }

  const motorcycleData = {
    type: 'motorcycle',
    motorcycleName: document.getElementById('motorcycle-name').value,
    motorcycleColor: document.getElementById('motorcycle-color').value,
    motorcycleId: document.getElementById('motorcycle-id').value,
    motorcyclePlate: document.getElementById('motorcycle-plate').value,
    motorcycleDocumentType: documentType,
    motorcycleLicense: licenseNumber,
    motorcycleChassisNumber: document.getElementById('motorcycle-chassis-number').value,
    motorcycleEngineNumber: document.getElementById('motorcycle-engine-number').value,
    motorcycleGps: gps,
    motorcycleGpsStatus: gpsStatus,
    motorcycleDepartment: document.getElementById('motorcycle-department').value,
    motorcycleStatus: document.getElementById('motorcycle-status').value,
    motorcyclePhoto: photoUrl,
    motorcycleDocuments: documentsUrl,
    totalUsageTime: '00:00'
  };
  const result = await window.dataSdk.create(motorcycleData);
  form.classList.remove('loading');
  if (result.isOk) {
    showToast('موتور سکیل با موفقیت اضافه شد', '✅');
    closeModal('new-motorcycle-modal');
    form.reset();
    toggleLicenseField();
    toggleGpsStatusField();
    // Reset previews
    document.getElementById('motorcycle-photo-preview').classList.add('hidden');
    document.getElementById('motorcycle-documents-preview').classList.add('hidden');
  } else {
    showToast('خطا در افزودن موتور سکیل', '❌');
  }
}

async function submitEditMotorcycle(event) {
  event.preventDefault();
  const form = event.target;
  form.classList.add('loading');
  const motorcycleId = form.dataset.id;
  const motorcycle = allData.find(d => d.__backendId === motorcycleId);
  if (!motorcycle) return;
  const documentType = document.getElementById('edit-motorcycle-document-type').value;
  const licenseNumber = documentType === 'جواز سیر' ? document.getElementById('edit-motorcycle-license').value : '';
  const gps = document.getElementById('edit-motorcycle-gps').value;
  const gpsStatus = gps === 'دارد' ? document.getElementById('edit-motorcycle-gps-status').value : '';

  // Handle photo upload - keep existing photo unless a new file is selected
  let photoUrl = motorcycle.motorcyclePhoto || '';
  const photoInput = document.getElementById('edit-motorcycle-photo');

  if (photoInput.files && photoInput.files[0]) {
    try {
      showToast('در حال آپلود عکس...', '⏳');
      photoUrl = await uploadPhotoToImgBB(photoInput.files[0]);
    } catch (error) {
      showToast('خطا در آپلود عکس: ' + error.message, '❌');
      form.classList.remove('loading');
      return;
    }
  }

  // Handle documents upload - keep existing documents unless a new file is selected
  let documentsUrl = motorcycle.motorcycleDocuments || '';
  const documentsInput = document.getElementById('edit-motorcycle-documents');

  if (documentsInput.files && documentsInput.files[0]) {
    try {
      showToast('در حال آپلود اسناد...', '⏳');
      documentsUrl = await uploadPhotoToImgBB(documentsInput.files[0]);
    } catch (error) {
      showToast('خطا در آپلود اسناد: ' + error.message, '❌');
      form.classList.remove('loading');
      return;
    }
  }

  const updatedMotorcycle = {
    ...motorcycle,
    motorcycleName: document.getElementById('edit-motorcycle-name').value,
    motorcycleColor: document.getElementById('edit-motorcycle-color').value,
    motorcycleId: document.getElementById('edit-motorcycle-id').value,
    motorcyclePlate: document.getElementById('edit-motorcycle-plate').value,
    motorcycleDocumentType: documentType,
    motorcycleLicense: licenseNumber,
    motorcycleChassisNumber: document.getElementById('edit-motorcycle-chassis-number').value,
    motorcycleEngineNumber: document.getElementById('edit-motorcycle-engine-number').value,
    motorcycleGps: gps,
    motorcycleGpsStatus: gpsStatus,
    motorcycleDepartment: document.getElementById('edit-motorcycle-department').value,
    motorcycleStatus: document.getElementById('edit-motorcycle-status').value,
    motorcyclePhoto: photoInput.files && photoInput.files[0] ? photoUrl : (motorcycle.motorcyclePhoto || ''),
    motorcycleDocuments: documentsInput.files && documentsInput.files[0] ? documentsUrl : (motorcycle.motorcycleDocuments || ''),
    totalUsageTime: motorcycle.totalUsageTime || '00:00'
  };
  form.classList.remove('loading');
  const result = await window.dataSdk.update(updatedMotorcycle);
  if (result.isOk) {
    showToast('موتور سکیل با موفقیت ویرایش شد', '✅');
    closeModal('edit-motorcycle-modal');
    updateCurrentPage();
  } else {
    showToast('خطا در ویرایش موتور سکیل', '❌');
  }
}
function toggleLicenseField() {
  const documentType = document.getElementById('motorcycle-document-type').value;
  document.getElementById('license-number-field').style.display = documentType === 'جواز سیر' ? 'block' : 'none';
}
function toggleGpsStatusField() {
  const gps = document.getElementById('motorcycle-gps').value;
  document.getElementById('gps-status-field').style.display = gps === 'دارد' ? 'block' : 'none';
}
function toggleEditLicenseField() {
  const documentType = document.getElementById('edit-motorcycle-document-type').value;
  document.getElementById('edit-license-number-field').style.display = documentType === 'جواز سیر' ? 'block' : 'none';
}
function toggleEditGpsStatusField() {
  const gps = document.getElementById('edit-motorcycle-gps').value;
  document.getElementById('edit-gps-status-field').style.display = gps === 'دارد' ? 'block' : 'none';
}

async function submitNewEmployee(event) {
  event.preventDefault();
  if (currentRecordCount >= 100000000000) {
    showToast('حداکثر تعداد رکوردها (۹۹۹) به پایان رسیده است', '⚠️');
    return;
  }
  const form = event.target;
  form.classList.add('loading');

  const assignedMotorcycleId = document.getElementById('selected-assigned-motorcycle').value.trim(); // اصلاح: trim اضافه شد
  let assignedMotorcycleName = '', assignedMotorcycleColor = '', assignedMotorcyclePlate = '';

  if (assignedMotorcycleId) {
    const moto = allData.find(d => d.__backendId === assignedMotorcycleId && d.type === 'motorcycle');
    if (moto) {
      assignedMotorcycleName = moto.motorcycleName;
      assignedMotorcycleColor = moto.motorcycleColor;
      assignedMotorcyclePlate = moto.motorcyclePlate;
    } else {
      showToast('موتور سیکل انتخاب شده یافت نشد', '❌');
      form.classList.remove('loading');
      return;
    }
  }

  const employeeData = {
    type: 'employee',
    employeeName: document.getElementById('employee-name').value.trim(),
    employeeId: document.getElementById('employee-id').value.trim(),
    department: document.getElementById('employee-department').value.trim(),
    fingerprintId: document.getElementById('employee-fingerprint').value.trim(),
    assignedMotorcycleId: assignedMotorcycleId || null,  // مهم: اینجا حتماً آیدی ذخیره شود
    assignedMotorcycleName: assignedMotorcycleName,
    assignedMotorcycleColor: assignedMotorcycleColor,
    assignedMotorcyclePlate: assignedMotorcyclePlate
  };

  const result = await window.dataSdk.create(employeeData);
  form.classList.remove('loading');
  if (result.isOk) {
    showToast('کارمند با موفقیت اضافه شد', '✅');
    closeModal('new-employee-modal');
    form.reset();
    document.getElementById('assigned-motorcycle-display').textContent = 'موتور سیکل اختصاصی انتخاب نشده';
    document.getElementById('selected-assigned-motorcycle').value = '';
  } else {
    showToast('خطا در افزودن کارمند', '❌');
  }
}


async function submitEditEmployee(event) {
  event.preventDefault();
  const form = event.target;
  const employeeId = form.dataset.id;
  const employee = allData.find(d => d.__backendId === employeeId);
  if (!employee) return;

  const assignedMotorcycleId = document.getElementById('edit-selected-assigned-motorcycle').value.trim();
  let assignedMotorcycleName = '', assignedMotorcycleColor = '', assignedMotorcyclePlate = '';

  if (assignedMotorcycleId) {
    const moto = allData.find(d => d.__backendId === assignedMotorcycleId && d.type === 'motorcycle');
    if (moto) {
      assignedMotorcycleName = moto.motorcycleName;
      assignedMotorcycleColor = moto.motorcycleColor;
      assignedMotorcyclePlate = moto.motorcyclePlate;
    } else {
      showToast('موتور سیکل انتخاب شده یافت نشد', '❌');
      return;
    }
  }

  const updatedEmployee = {
    ...employee,
    employeeName: document.getElementById('edit-employee-name').value.trim(),
    employeeId: document.getElementById('edit-employee-id').value.trim(),
    department: document.getElementById('edit-employee-department').value.trim(),
    fingerprintId: document.getElementById('edit-employee-fingerprint').value.trim(),
    assignedMotorcycleId: assignedMotorcycleId || null,  // مهم: اینجا حتماً آیدی ذخیره شود
    assignedMotorcycleName: assignedMotorcycleName,
    assignedMotorcycleColor: assignedMotorcycleColor,
    assignedMotorcyclePlate: assignedMotorcyclePlate
  };

  const result = await window.dataSdk.update(updatedEmployee);
  if (result.isOk) {
    showToast('کارمند با موفقیت ویرایش شد', '✅');
    closeModal('edit-employee-modal');
    updateCurrentPage();
  } else {
    showToast('خطا در ویرایش کارمند', '❌');
  }
}

async function markAsExit(requestId) {
  const request = allData.find(d => d.__backendId === requestId);
  if (!request) return;

  const now = new Date();
  const exitTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const updatedRequest = {
    ...request,
    exitTime: exitTime,
    status: 'active'
  };

  const result = await window.dataSdk.update(updatedRequest);
  if (result.isOk) {
    showToast('خروج با موفقیت ثبت شد', '✅');
    updateCurrentPage();
  } else {
    showToast('خطا در ثبت خروج', '❌');
  }
}



async function markAsEntry(requestId) {
  const request = allData.find(d => d.__backendId === requestId);
  if (!request) return;

  const now = new Date();
  const entryTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const usageTime = calculateUsageTime(request.exitTime, entryTime);

  const updatedRequest = {
    ...request,
    entryTime: entryTime,
    usageTime: usageTime,
    status: 'completed'
  };

  const result = await window.dataSdk.update(updatedRequest);

  if (result.isOk) {
    await updateMotorcycleUsageAfterCompletion(updatedRequest);
    showToast('ورود با موفقیت ثبت شد', '✅');
    updateCurrentPage();
  } else {
    showToast('خطا در ثبت ورود', '❌');
  }
}



async function updateMotorcycleUsageAfterCompletion(request) {
  if (request.status !== 'completed' && request.status !== 'delet') return;
  const index = allData.findIndex(d =>
    d.type === 'motorcycle' &&
    d.motorcycleName === request.motorcycleName &&
    d.motorcycleColor === request.motorcycleColor &&
    d.motorcyclePlate === request.motorcyclePlate &&
    d.motorcycleDepartment === request.motorcycleDepartment
  );
  if (index === -1) {
    console.warn('Motorcycle not found');
    return;
  }
  const motorcycle = allData[index];
  const previousTotal = normalizeTime(motorcycle.totalUsageTime || '00:00');
  const newUsage = normalizeTime(request.usageTime);
  const updatedTotal = addTimes(previousTotal, newUsage);
  console.log('Prev:', previousTotal, 'New:', newUsage, 'Final:', updatedTotal);
  allData[index] = {
    ...motorcycle,
    totalUsageTime: updatedTotal
  };
  await window.dataSdk.update(allData[index]);
}



async function deleteMotorcycle(motorcycleId) {
  const motorcycle = allData.find(d => d.__backendId === motorcycleId);
  if (!motorcycle) return;
  const inUse = allData.some(d => d.type === 'request' && d.motorcycleId === motorcycleId && (d.status === 'pending' || d.status === 'active'));
  if (inUse) {
    showToast('این موتور سکیل در حال استفاده است و قابل حذف نیست', '⚠️');
    return;
  }
  const result = await window.dataSdk.delete(motorcycle);
  if (result.isOk) {

    await syncMotorcyclesWithGoogleSheets(allData);
    showToast('موتور سکیل با موفقیت حذف شد', '✅');
    updateCurrentPage();
  } else {
    showToast('خطا در حذف موتور سکیل', '❌');
  }
}
async function deleteEmployee(employeeId) {
  const employee = allData.find(d => d.__backendId === employeeId);
  if (!employee) return;
  const hasActiveRequests = allData.some(d => d.type === 'request' && d.employeeId === employee.employeeId && (d.status === 'pending' || d.status === 'active'));
  if (hasActiveRequests) {
    showToast('این کارمند درخواست فعال دارد و قابل حذف نیست', '⚠️');
    return;
  }
  const result = await window.dataSdk.delete(employee);
  if (result.isOk) {
    showToast('کارمند با موفقیت حذف شد', '✅');
    updateCurrentPage();
  } else {
    showToast('خطا در حذف کارمند', '❌');
  }
}
async function deleteRequest(requestId) {
  if (currentUserRole !== 'admin') {
    showToast('شما دسترسی به حذف درخواست ندارید', '⚠️');
    return { isOk: false };
  }
  const request = allData.find(d => d.__backendId === requestId);
  if (!request) {
    showToast('درخواست یافت نشد', '❌');
    return { isOk: false };
  }
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  let updatedExitTime = request.exitTime || currentTime;
  let updatedEntryTime = currentTime;
  const usageTime = calculateUsageTime(updatedExitTime, updatedEntryTime);
  const updatedRequest = {
    ...request,
    status: 'delet',
    deleterFullName: window.currentUser.fullName || 'ناشناس',
    exitTime: updatedExitTime,
    entryTime: updatedEntryTime,
    usageTime: usageTime
  };
  const result = await window.dataSdk.update(updatedRequest);
  if (result.isOk) {
    await updateMotorcycleUsageAfterCompletion(updatedRequest);
    showToast('درخواست با موفقیت حذف (به وضعیت delet تغییر یافت)', '✅');
    if (getCurrentPage() === 'requests') {
      renderRequests(allData.filter(d => d.type === 'request' && (d.status === 'pending' || d.status === 'active')));
    }
    return { isOk: true };
  } else {
    showToast('خطا در تغییر وضعیت درخواست', '❌');
    return { isOk: false };
  }
}
function showToast(message, icon = '✅') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toast-message').textContent = message;
  document.getElementById('toast-icon').textContent = icon;
  toast.classList.add('active');
  setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}
document.addEventListener('click', function (event) {
  const departmentDropdown = document.getElementById('department-dropdown');
  const employeeDropdown = document.getElementById('employee-dropdown');
  const motorcycleDropdown = document.getElementById('motorcycle-dropdown');
  const departmentSelect = document.getElementById('department-select');
  const employeeSelect = document.getElementById('employee-select');
  const motorcycleSelect = document.getElementById('motorcycle-select');
  if (departmentDropdown && departmentSelect && !departmentSelect.contains(event.target) && !departmentDropdown.contains(event.target)) {
    departmentDropdown.classList.add('hidden');
  }
  if (employeeDropdown && employeeSelect && !employeeSelect.contains(event.target) && !employeeDropdown.contains(event.target)) {
    employeeDropdown.classList.add('hidden');
  }
  if (motorcycleDropdown && motorcycleSelect && !motorcycleSelect.contains(event.target) && !motorcycleDropdown.contains(event.target)) {
    motorcycleDropdown.classList.add('hidden');
  }
  const userDropdown = document.getElementById('user-dropdown');
  const userIcon = document.getElementById('user-profile-icon');
  if (userDropdown && userIcon && !userIcon.contains(event.target) && !userDropdown.contains(event.target)) {
    userDropdown.classList.add('hidden');
  }
  const sortButton = document.getElementById('sort-button');
  const sortDropdown = document.getElementById('sort-dropdown');
  if (sortDropdown && sortButton && !sortButton.contains(event.target) && !sortDropdown.contains(event.target)) {
    sortDropdown.classList.add('hidden');
  }
  const deptButton = document.getElementById('dept-button');
  const deptDropdown = document.getElementById('dept-dropdown');
  if (deptDropdown && deptButton && !deptButton.contains(event.target) && !deptDropdown.contains(event.target)) {
    deptDropdown.classList.add('hidden');
  }

  const intervalButton = document.getElementById('interval-button');
  const intervalDropdown = document.getElementById('interval-dropdown');
  if (intervalDropdown && intervalButton && !intervalButton.contains(event.target) && !intervalDropdown.contains(event.target)) {
    intervalDropdown.classList.add('hidden');
  }

});
function toggleUserDropdown() {
  const icon = document.getElementById('user-profile-icon');
  const dropdown = document.getElementById('user-dropdown');
  if (!dropdown || !icon) return;
  const rect = icon.getBoundingClientRect();
  dropdown.style.position = 'fixed';
  dropdown.style.top = rect.bottom + 8 + 'px';
  dropdown.style.left = rect.left + 'px';
  dropdown.classList.toggle('hidden');
}
let fuelReports = [];
let fuelSearchTerm = '';
async function loadFuelReports() {
  try {
    const result = await callGoogleSheets('readAll', 'fuel');
    if (result.success) {
      fuelReports = result.data.map(report => {
        let mapped = mapGSToFuel(report);
        if (mapped.reportDate && mapped.reportDate.includes('T')) {
          const dt = new Date(mapped.reportDate);
          const year = dt.getFullYear();
          const month = String(dt.getMonth() + 1).padStart(2, '0');
          const day = String(dt.getDate()).padStart(2, '0');
          mapped.reportDate = `${year}/${month}/${day}`;
        }
        return mapped;
      }).filter(report => report.__backendId);
      console.log('Loaded fuelReports:', fuelReports);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error loading fuel reports:', error);
    return false;
  }
}
function openFuelReportModal() {
  const motorcycles = allData.filter(d => d.type === 'motorcycle');
  populateFuelMotorcycleDropdown(motorcycles);
  document.getElementById('fuel-report-modal').classList.add('active');
}
function populateFuelMotorcycleDropdown() {
  const motorcycles = allData.filter(d => d.type === 'motorcycle');
  const optionsContainer = document.getElementById('fuel-motorcycle-options');
  if (!optionsContainer) return;
  if (motorcycles.length === 0) {
    optionsContainer.innerHTML = '<div class="p-3 text-gray-500 text-center">هیچ موتور سکیلی ثبت نشده</div>';
    return;
  }
  optionsContainer.innerHTML = motorcycles.map(moto => `
    <div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
         onclick="selectFuelMotorcycle('${moto.__backendId}', '${moto.motorcycleName} - ${moto.motorcycleColor} - ${moto.motorcycleDepartment}')">
      <div class="font-semibold">${moto.motorcycleName}</div>
      <div class="text-sm text-gray-600">${moto.motorcycleColor} - ${moto.motorcycleDepartment}</div>
      <div class="text-xs text-gray-500">پلاک: ${moto.motorcyclePlate}</div>
    </div>
  `).join('');
}
function searchFuelMotorcycles() {
  const searchTerm = document.getElementById('fuel-motorcycle-search').value.toLowerCase();
  const motorcycles = allData.filter(d => d.type === 'motorcycle');
  const filtered = motorcycles.filter(moto =>
    moto.motorcycleName.toLowerCase().includes(searchTerm) ||
    moto.motorcycleColor.toLowerCase().includes(searchTerm) ||
    moto.motorcycleDepartment.toLowerCase().includes(searchTerm) ||
    moto.motorcyclePlate.toLowerCase().includes(searchTerm)
  );
  const optionsContainer = document.getElementById('fuel-motorcycle-options');
  if (filtered.length === 0) {
    optionsContainer.innerHTML = '<div class="p-3 text-gray-500 text-center">موتور سکیلی یافت نشد</div>';
    return;
  }
  optionsContainer.innerHTML = filtered.map(moto => `
    <div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
         onclick="selectFuelMotorcycle('${moto.__backendId}', '${moto.motorcycleName} - ${moto.motorcycleColor} - ${moto.motorcycleDepartment}')">
      <div class="font-semibold">${moto.motorcycleName}</div>
      <div class="text-sm text-gray-600">${moto.motorcycleColor} - ${moto.motorcycleDepartment}</div>
      <div class="text-xs text-gray-500">پلاک: ${moto.motorcyclePlate}</div>
    </div>
  `).join('');
}
function toggleFuelMotorcycleDropdown() {
  const dropdown = document.getElementById('fuel-motorcycle-dropdown');
  dropdown.classList.toggle('hidden');
  if (!dropdown.classList.contains('hidden')) {
    document.getElementById('fuel-motorcycle-search').focus();
  }
}
let selectedMotorcycleForFuel = null;
function selectFuelMotorcycle(id, displayText) {
  document.getElementById('fuel-motorcycle-display').textContent = displayText;
  document.getElementById('selected-fuel-motorcycle').value = id;

  selectedMotorcycleForFuel = allData.find(d => d.__backendId === id && d.type === 'motorcycle');
  document.getElementById('fuel-motorcycle-dropdown').classList.add('hidden');
}

async function submitFuelReport(event) {
  event.preventDefault();
  if (!selectedMotorcycleForFuel) {
    showToast('لطفاً یک موتور سکیل انتخاب کنید', 'Warning');
    return;
  }
  const fuelType = document.getElementById('fuel-type').value.trim();
  const fuelAmount = document.getElementById('fuel-amount').value.trim();
  const kilometerAmount = parseFloat(document.getElementById('kilometer-amount').value.trim());
  const fuelAdditionDateInput = document.getElementById('fuel-addition-date').value.trim();
  
  if (!fuelType || !fuelAmount || isNaN(kilometerAmount) || !fuelAdditionDateInput) {
    showToast('لطفاً همه فیلدها را پر کنید', 'Warning');
    return;
  }
  if (kilometerAmount < MIN_KILOMETERS || kilometerAmount > MAX_KILOMETERS) {
    showToast(`میزان کیلومتر باید بین ${MIN_KILOMETERS.toLocaleString()} تا ${MAX_KILOMETERS.toLocaleString()} باشد`, '⚠️');
    return;
  }
  
  // Parse the fuel addition date (it's in YYYY-MM-DD format from date input)
  const fuelAdditionDate = new Date(fuelAdditionDateInput);
  const year = fuelAdditionDate.getFullYear();
  const month = String(fuelAdditionDate.getMonth() + 1).padStart(2, '0');
  const day = String(fuelAdditionDate.getDate()).padStart(2, '0');
  const formattedFuelAdditionDate = `${year}/${month}/${day}`;
  
  // Get current date for automatic "تاریخ" field
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = String(now.getDate()).padStart(2, '0');
  const currentDate = `${currentYear}/${currentMonth}/${currentDay}`;
  
  const previousReports = fuelReports.filter(report =>
    report.motorcycleName === selectedMotorcycleForFuel.motorcycleName &&
    report.motorcycleDepartment === selectedMotorcycleForFuel.motorcycleDepartment
  ).sort((a, b) => new Date(a.reportDate) - new Date(b.reportDate));
  const reporterFullName = window.currentUser.fullName || 'ناشناس';
  const reportData = {
    __backendId: generateId(),
    motorcycleName: selectedMotorcycleForFuel.motorcycleName,
    motorcycleColor: selectedMotorcycleForFuel.motorcycleColor,
    motorcycleId: selectedMotorcycleForFuel.motorcycleId || '',
    motorcyclePlate: selectedMotorcycleForFuel.motorcyclePlate || '',
    motorcycleDepartment: selectedMotorcycleForFuel.motorcycleDepartment || '',
    fuelType: fuelType,
    fuelAmount: fuelAmount,
    kilometerAmount: kilometerAmount,
    reportDate: currentDate, // Automatic date when record is added
    fuelAdditionDate: formattedFuelAdditionDate, // User selected date
    reporterFullName: reporterFullName,
    totalDistance: 0
  };
  if (previousReports.length > 0) {
    const lastReport = previousReports[previousReports.length - 1];
    const distance = kilometerAmount - parseFloat(lastReport.kilometerAmount);
    if (!isNaN(distance) && distance > 0) {
      const updatedLastReport = {
        ...lastReport,
        totalDistance: distance
      };
      const gsUpdateData = mapFuelToGS(updatedLastReport);
      const updateResult = await callGoogleSheets('update', 'fuel', gsUpdateData);
      if (updateResult.success) {
        const index = fuelReports.findIndex(r => r.__backendId === lastReport.__backendId);
        if (index !== -1) {
          fuelReports[index].totalDistance = distance;
        }
      } else {
        showToast('خطا در به‌روزرسانی گزارش قبلی', 'Error');
        return;
      }
    }
  }
  const gsData = mapFuelToGS(reportData);
  const result = await callGoogleSheets('create', 'fuel', gsData);
  if (result.success) {
    showToast('گزارش تیل با موفقیت ثبت شد', 'Success');
    closeModal('fuel-report-modal');
    fuelReports.push(reportData);
    document.getElementById('fuel-report-form').reset();
    document.getElementById('fuel-motorcycle-display').textContent = 'موتور سکیل را انتخاب کنید';
    selectedMotorcycleForFuel = null;
  } else {
    showToast('خطا در ثبت گزارش تیل', 'Error');
  }
}

function renderMotorcyclesForFuel() {
  const container = document.getElementById('motorcycles-fuel-list');
  if (!container) return;
  const motorcycles = allData.filter(d => d.type === 'motorcycle');
  let filteredMotorcycles = motorcycles;
  if (fuelSearchTerm) {
    const searchLower = fuelSearchTerm.toLowerCase();
    filteredMotorcycles = motorcycles.filter(moto =>
      moto.motorcycleName.toLowerCase().includes(searchLower) ||
      moto.motorcycleDepartment.toLowerCase().includes(searchLower) ||
      moto.motorcycleColor.toLowerCase().includes(searchLower)
    );
  }
  if (filteredMotorcycles.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-gray-300"><p class="text-lg">هیچ موتور سیکلی یافت نشد</p></div>';
    return;
  }
  container.innerHTML = filteredMotorcycles.map(moto => `
    <div class="card p-6 cursor-pointer hover:shadow-2xl transition-all duration-300" onclick="showMotorcycleFuelReports('${moto.__backendId}')">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="motorcycle-icon">🏍️</div>
          <div>
            <h3 class="text-lg font-bold text-white">${moto.motorcycleName}</h3>
            <p class="text-gray-200 mt-1">رنگ: ${moto.motorcycleColor}</p>
            <p class="text-gray-200 mt-1">دیپارتمنت: ${moto.motorcycleDepartment}</p>
          </div>
        </div>
        <span class="status-badge status-active">نمایش گزارش‌ها</span>
      </div>
    </div>
  `).join('');
}

function showMotorcycleFuelReports(motorcycleId) {
  const motorcycle = allData.find(d => d.__backendId === motorcycleId && d.type === 'motorcycle');
  if (!motorcycle) {
    showToast('موتور سیکل یافت نشد', '❌');
    return;
  }
  currentFuelReports = fuelReports.filter(report =>
    report.motorcycleName === motorcycle.motorcycleName &&
    report.motorcycleDepartment === motorcycle.motorcycleDepartment
  );
  const title = document.getElementById('motorcycle-reports-title');
  if (title) title.textContent = `گزارش‌های تیل برای ${motorcycle.motorcycleName} (${motorcycle.motorcycleDepartment})`;
  renderFuelReportsList();
  document.getElementById('motorcycle-reports-modal').classList.add('active');
  document.getElementById('fuel-report-date-search').value = '';
  fuelReportSearchDate = '';
}
function renderFuelReportsList() {
  const list = document.getElementById('motorcycle-reports-list');
  let filteredReports = currentFuelReports;
  if (fuelReportSearchDate) {
    const [year, month, day] = fuelReportSearchDate.split('-');
    const formattedDate = `${year}/${month}/${day}`;
    filteredReports = filteredReports.filter(report => report.reportDate === formattedDate);
  }
  if (filteredReports.length === 0) {
    list.innerHTML = '<div class="text-center py-12 text-gray-300"><p class="text-lg">هیچ گزارشی برای این موتور ثبت نشده</p></div>';
  } else {
    list.innerHTML = filteredReports.map(report => {
      let formattedDate = report.reportDate;
      if (report.reportDate.includes('T')) {
        const dt = new Date(report.reportDate);
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        formattedDate = `${year}/${month}/${day}`;
      }
      return `
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="motorcycle-icon">⛽</div>
              <div>
                <h3 class="text-lg font-bold text-white">نوع تیل: ${report.fuelType}</h3>
                <p class="text-gray-200 mt-1">مقدار: ${report.fuelAmount} لیتر</p>
                <p class="text-gray-200 mt-1">کیلومتر: ${report.kilometerAmount} km</p>
                <p class="text-gray-200 mt-1">نام کارمند: ${report.reporterFullName}</p>
                <p class="text-gray-200 mt-1">میزان طی مسیر: ${report.totalDistance || 0} km</p>
                <p class="text-sm text-gray-100 mt-1">تاریخ: ${formattedDate}</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}


function searchUsage() {
  const searchInput = document.getElementById('usage-search');
  if (searchInput) {
    usageSearchTerm = searchInput.value.trim().toLowerCase();
    renderUsageMotorcycles();
  }
}

function filterFuelReportsByDate() {
  fuelReportSearchDate = document.getElementById('fuel-report-date-search').value;
  renderFuelReportsList();
}

document.addEventListener('DOMContentLoaded', () => {
  if (getCurrentPage() === 'fuel-expenses') {
    loadFuelReports().then(() => renderMotorcyclesForFuel());
    const searchInput = document.getElementById('fuel-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        fuelSearchTerm = searchInput.value.trim().toLowerCase();
        renderMotorcyclesForFuel();
      });
    }
  }
  renderMotorcyclesForFuel();
});
// Theme Toggle Function
function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById('theme-icon');
  const currentTheme = body.getAttribute('data-theme');

  if (currentTheme === 'dark') {
    body.removeAttribute('data-theme');
    themeIcon.textContent = '☀️';
    localStorage.setItem('theme', 'light');
  } else {
    body.setAttribute('data-theme', 'dark');
    themeIcon.textContent = '🌙';
    localStorage.setItem('theme', 'dark');
  }
}

// Load saved theme on page load
function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  const body = document.body;
  const themeIcon = document.getElementById('theme-icon');

  // Apply theme to body regardless of whether theme icon exists
  if (savedTheme === 'dark') {
    body.setAttribute('data-theme', 'dark');
    if (themeIcon) themeIcon.textContent = '🌙';
  } else {
    body.removeAttribute('data-theme');
    if (themeIcon) themeIcon.textContent = '☀️';
  }

  // Force a reflow to ensure theme applies
  void body.offsetHeight;
}

// Keyboard Shortcuts
window.addEventListener('keydown', function (event) {
  // Escape - Close all modals
  if (event.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(modal => {
      modal.classList.remove('active');
    });
  }

  // Ctrl + K - Search focus
  if (event.ctrlKey && (event.key === 'k' || event.key === 'K')) {
    event.preventDefault();
    const searchInput = document.querySelector('input[type="text"]:not([type="password"])') ||
      document.querySelector('#department-search') ||
      document.querySelector('#employee-search') ||
      document.querySelector('#motorcycle-search');
    if (searchInput) {
      searchInput.focus();
      showToast('فوکوس روی جستجو', '🔍');
    }
  }

  // Ctrl + N - New request
  if (event.ctrlKey && (event.key === 'n' || event.key === 'N')) {
    event.preventDefault();
    if (typeof openNewRequestModal === 'function') {
      openPasswordModal('request');
    } else {
      showToast('صفحه درخواستی‌ها نیست', '⚠️');
    }
  }

  // Ctrl + L - Logout
  if (event.ctrlKey && (event.key === 'l' || event.key === 'L')) {
    event.preventDefault();
    if (confirm('آیا می‌خواهید خارج شوید؟')) {
      logout();
    }
  }

  // Ctrl + / - Show shortcuts help (Shift + / gives ? on keyboard)
  if (event.ctrlKey && (event.key === '?' || event.key === '/')) {
    event.preventDefault();
    showShortcutsModal();
  }
});

// Show Shortcuts Modal
function showShortcutsModal() {
  const shortcutsHtml = `
    <div class="modal active" style="display: flex;">
      <div class="modal-content">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">⌨️ شورت‌کات‌ها</h2>
        <div class="space-y-3">
          <div class="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <kbd class="px-3 py-1 bg-gray-200 rounded text-sm font-mono">Ctrl</kbd> + <kbd class="px-3 py-1 bg-gray-200 rounded text-sm font-mono">K</kbd>
            <span>جستجو</span>
          </div>
          <div class="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <kbd class="px-3 py-1 bg-gray-200 rounded text-sm font-mono">Ctrl</kbd> + <kbd class="px-3 py-1 bg-gray-200 rounded text-sm font-mono">N</kbd>
            <span>درخواست جدید</span>
          </div>
          <div class="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <kbd class="px-3 py-1 bg-gray-200 rounded text-sm font-mono">Escape</kbd>
            <span>بستن مودال‌ها</span>
          </div>
          <div class="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <kbd class="px-3 py-1 bg-gray-200 rounded text-sm font-mono">Ctrl</kbd> + <kbd class="px-3 py-1 bg-gray-200 rounded text-sm font-mono">L</kbd>
            <span>خروج</span>
          </div>
          <div class="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <kbd class="px-3 py-1 bg-gray-200 rounded text-sm font-mono">Ctrl</kbd> + <kbd class="px-3 py-1 bg-gray-200 rounded text-sm font-mono">?</kbd>
            <span>راهنما</span>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button type="button" class="btn btn-secondary flex-1" onclick="document.querySelector('.modal.active')?.remove()">بستن</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', shortcutsHtml);
}

// Update Online Status - counts users with onlineStatus = 'online' in accounts
function updateOnlineStatus() {
  const onlineUsers = allUsers.filter(u => u.onlineStatus === 'online').length;

  // Find or create online status card
  let onlineStatusCard = document.getElementById('online-status-card');
  if (!onlineStatusCard) {
    const statsSection = document.getElementById('stats-section');
    if (statsSection) {
      const cardHtml = `
        <div class="stat-card" id="online-status-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm opacity-90">🟢 آنلاین</span>
            <span class="text-2xl">👥</span>
          </div>
          <p id="online-users" class="text-3xl font-bold">${onlineUsers}</p>
        </div>
      `;
      statsSection.insertAdjacentHTML('beforeend', cardHtml);
      onlineStatusCard = document.getElementById('online-status-card');
    }
  } else {
    const onlineUsersElement = document.getElementById('online-users');
    if (onlineUsersElement) {
      onlineUsersElement.textContent = onlineUsers;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Load theme on all pages
  loadTheme();

  // Only init app if we're on a page that requires authentication
  if (!window.location.pathname.includes('login.html') &&
    !window.location.pathname.includes('signup.html')) {
    initApp();
  }
});
function filterRequests(filter) {
  currentRequestFilter = filter;
  document.querySelectorAll('[id^="filter-request-"]').forEach(btn => btn.classList.remove('active-filter'));
  const selectedBtn = document.getElementById(`filter-request-${filter}`);
  if (selectedBtn) {
    selectedBtn.classList.add('active-filter');
  }
  renderRequests(allData.filter(d => d.type === 'request'));
}
function filterByDept(dept) {
  currentDeptFilter = dept;
  renderRequests(allData.filter(d => d.type === 'request'));
  renderDeptFilters();
}
function filterMotorcycleByDept(dept) {
  document.querySelectorAll('#dept-filters button').forEach(btn => btn.classList.remove('active-filter'));
  currentMotorcycleDeptFilter = dept;
  updateCurrentPage();
}
function searchRequests() {
  currentRequestSearch = document.getElementById('request-search').value.trim();
  renderRequests(allData.filter(d => d.type === 'request'));
}
function renderDeptFilters() {
  const container = document.getElementById('dept-filters');
  if (!container) return;
  let html = `<button id="dept-all" class="btn btn-dept text-sm whitespace-nowrap ${currentDeptFilter === 'all' ? 'active-filter' : ''}" onclick="filterByDept('all')">همه</button>`;
  departments.forEach(dept => {
    html += `<button class="btn btn-dept text-sm whitespace-nowrap ${currentDeptFilter === dept ? 'active-filter' : ''}" onclick="filterByDept('${dept}')">${dept}</button>`;
  });
  container.innerHTML = html;
}
function renderMotorcycleDeptFilters() {
  const container = document.getElementById('dept-filters');
  if (!container) return;
  if (departments.length === 0) {
    container.innerHTML = '<p class="text-gray-300 text-sm whitespace-nowrap">هیچ دیپارتمنتی موجود نیست</p>';
    return;
  }
  let html = `<button id="motor-dept-all" class="btn btn-dept text-sm whitespace-nowrap ${currentMotorcycleDeptFilter === 'all' ? 'active-filter' : ''}" onclick="filterMotorcycleByDept('all')">همه</button>`;
  departments.forEach(dept => {
    html += `<button class="btn btn-dept text-sm whitespace-nowrap ${currentMotorcycleDeptFilter === dept ? 'active-filter' : ''}" onclick="filterMotorcycleByDept('${dept}')">${dept}</button>`;
  });
  container.innerHTML = html;
}


function normalizeTime(time) {
  if (!time || typeof time !== 'string') return '00:00';

  const parts = time.split(':');
  if (parts.length !== 2) return '00:00';

  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);

  if (isNaN(h) || isNaN(m)) return '00:00';

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function addTimes(time1, time2) {
  time1 = normalizeTime(time1);
  time2 = normalizeTime(time2);

  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);

  const totalMinutes = (h1 * 60 + m1) + (h2 * 60 + m2);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}


function timeToMinutes(time) {
  const normalized = normalizeTime(time);
  const [hours, minutes] = normalized.split(':').map(Number);
  return (hours * 60) + minutes;
}

async function syncMotorcyclesWithGoogleSheets(allDataRef) {
  try {
    const result = await callGoogleSheets('readAll', 'motors');
    if (result.success) {
      const gsMotorcycles = result.data
        .map(mapGSToMotorcycle)
        .filter(moto => moto.__backendId)
        .map(moto => ({ ...moto, totalUsageTime: normalizeTime(moto.totalUsageTime || '00:00') }));
      const nonMotorcycleData = allDataRef.filter(d => d.type !== 'motorcycle');
      const localMotorcycles = allDataRef.filter(d => d.type === 'motorcycle')
        .map(moto => ({ ...moto, totalUsageTime: normalizeTime(moto.totalUsageTime || '00:00') }));
      const motorsMap = new Map(localMotorcycles.map(m => [m.__backendId, m]));
      gsMotorcycles.forEach(gsMoto => {
        if (motorsMap.has(gsMoto.__backendId)) {
          const local = motorsMap.get(gsMoto.__backendId);
          const localMin = timeToMinutes(local.totalUsageTime);
          const gsMin = timeToMinutes(gsMoto.totalUsageTime);
          const maxTotal = localMin > gsMin ? local.totalUsageTime : gsMoto.totalUsageTime;
          const merged = { ...local, ...gsMoto, totalUsageTime: maxTotal };
          motorsMap.set(gsMoto.__backendId, merged);
        } else {
          motorsMap.set(gsMoto.__backendId, gsMoto);
        }
      });
      allDataRef.length = 0;
      allDataRef.push(...nonMotorcycleData, ...gsMotorcycles);
      await saveData(allDataRef);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error syncing motorcycles:', error);
    return false;
  }
}

async function syncRequestsWithGoogleSheets(allDataRef) {
  try {
    const result = await callGoogleSheets('readAll', 'request');
    if (result.success) {
      // ONLY use Google Sheets data - ignore local data completely
      let gsRequests = result.data
        .map(mapGSToRequest)
        .filter(request => request.__backendId);

      // Match requests to motorcycles by name, color, plate, and department
      // to set motorcycleId for status calculation
      const motorcycles = allDataRef.filter(d => d.type === 'motorcycle');
      for (let req of gsRequests) {
        const matchingMotor = motorcycles.find(m =>
          m.motorcycleName === req.motorcycleName &&
          m.motorcycleColor === req.motorcycleColor &&
          m.motorcyclePlate === req.motorcyclePlate &&
          m.motorcycleDepartment === req.motorcycleDepartment
        );
        if (matchingMotor) {
          req.motorcycleId = matchingMotor.__backendId;
        } else {
          console.warn('No matching motorcycle found for request:', req);
        }
      }

      // Keep only non-request data, replace all requests with Google Sheets data
      const nonRequestData = allDataRef.filter(d => d.type !== 'request');
      allDataRef.length = 0;
      allDataRef.push(...nonRequestData, ...gsRequests);
      await saveData(allDataRef);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error syncing requests:', error);
    return false;
  }
}

function setUsageSort(sortType) {
  currentUsageSort = sortType;
  currentSortDisplay = sortType === 'desc' ? 'بیشترین استفاده' : (sortType === 'asc' ? 'کمترین استفاده' : 'هیچکدام');
  const sortButton = document.getElementById('sort-button');
  if (sortButton) {
    sortButton.textContent = `مرتب بر اساس: ${currentSortDisplay} `;
  }
  document.getElementById('sort-dropdown').classList.add('hidden');
  renderUsageMotorcycles();
}

function toggleSortDropdown() {
  const dropdown = document.getElementById('sort-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

function selectDept(dept) {
  currentUsageDeptFilter = dept;
  currentDeptDisplay = dept === 'all' ? 'همه' : dept;
  const deptButton = document.getElementById('dept-button');
  if (deptButton) {
    deptButton.textContent = `دیپارتمنت: ${currentDeptDisplay}`;
  }
  document.getElementById('dept-dropdown').classList.add('hidden');
  renderUsageMotorcycles();
}

function toggleDeptDropdown() {
  const dropdown = document.getElementById('dept-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      populateDeptDropdown();
    }
  }
}

function populateDeptDropdown() {
  const optionsContainer = document.getElementById('dept-options');
  if (!optionsContainer) return;
  let html = `<div class="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-600" onclick="selectDept('all')">همه</div>`;
  departments.forEach(dept => {
    html += `<div class="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0" onclick="selectDept('${dept}')">${dept}</div>`;
  });
  optionsContainer.innerHTML = html;
}


function calculateFilteredUsage(motorcycleId, interval, customDays = 0) {
  const requests = allData.filter(d => d.type === 'request' && (d.status === 'completed' || d.status === 'delet') && d.motorcycleId === motorcycleId);
  if (requests.length === 0) return '00:00';

  const now = new Date();
  let startDate = new Date();

  if (interval === 'day') {
    startDate.setHours(0, 0, 0, 0);
  } else if (interval === 'week') {
    startDate.setDate(startDate.getDate() - 7);
  } else if (interval === 'month') {
    startDate.setMonth(startDate.getMonth() - 1);
  } else if (interval === 'year') {
    startDate.setFullYear(startDate.getFullYear() - 1);
  } else if (interval === 'custom' && customDays > 0) {
    startDate.setDate(startDate.getDate() - customDays);
  } else {
    const motorcycle = allData.find(d => d.__backendId === motorcycleId && d.type === 'motorcycle');
    return motorcycle ? (motorcycle.totalUsageTime || '00:00') : '00:00';
  }
  const filteredRequests = requests.filter(req => {
    const reqDate = new Date(req.requestDate.replace(/\//g, '-'));
    return reqDate >= startDate && reqDate <= now;
  });
  let total = '00:00';
  filteredRequests.forEach(req => {
    total = addTimes(total, req.usageTime || '00:00');
  });
  return total;
}

function setTimeInterval(interval) {
  if (interval === 'custom') {
    document.getElementById('custom-days-input').value = currentCustomDays || "";
    document.getElementById('custom-days-modal').classList.add('active');
    document.getElementById('custom-days-input').focus();
    document.getElementById('interval-dropdown').classList.add('hidden');
    return;
  } else {
    currentTimeInterval = interval;
    currentCustomDays = 1;
    currentIntervalDisplay =
      interval === 'day' ? 'روز' :
        interval === 'week' ? 'هفته' :
          interval === 'month' ? 'ماه' :
            interval === 'year' ? 'سال' :
              'هیچکدام';

    const intervalButton = document.getElementById('interval-button');
    if (intervalButton) {
      intervalButton.textContent = `انتروال زمانی: ${currentIntervalDisplay}`;
    }
    document.getElementById('interval-dropdown').classList.add('hidden');
    renderUsageMotorcycles();
  }
}

function closeCustomDaysModal() {
  document.getElementById('custom-days-modal').classList.remove('active');
}

function confirmCustomDays() {
  const input = document.getElementById('custom-days-input');
  const days = parseInt(input.value);

  if (isNaN(days) || days < 1 || days > 9999999999999999) {
    showToast('لطفاً عددی بالاتر از 1 وارد کنید', '⚠️');
    input.focus();
    return;
  }

  currentCustomDays = days;
  currentTimeInterval = 'custom';
  currentIntervalDisplay = `سفارشی (${days} روز)`;

  const intervalButton = document.getElementById('interval-button');
  if (intervalButton) {
    intervalButton.textContent = `انتروال زمانی: ${currentIntervalDisplay}`;
  }

  closeCustomDaysModal();
  renderUsageMotorcycles();
}

function toggleIntervalDropdown() {
  const dropdown = document.getElementById('interval-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

function getAssignedMotorcycleIds() {
  return allData
    .filter(d => d.type === 'employee' && d.assignedMotorcycleId)
    .map(e => e.assignedMotorcycleId);
}

function populateAssignedMotorcycleDropdown() {
  document.getElementById('assigned-motorcycle-search').value = '';
  searchAssignedMotorcycles();
}

function searchAssignedMotorcycles() {
  const searchInput = document.getElementById('assigned-motorcycle-search');
  if (!searchInput) return;

  const searchTerm = searchInput.value.toLowerCase().trim();

  const assignedIds = getAssignedMotorcycleIds();
  const availableMotorcycles = allData.filter(d =>
    d.type === 'motorcycle' && !assignedIds.includes(d.__backendId)
  );

  const filtered = availableMotorcycles.filter(m => {
    // تبدیل ایمن همه فیلدها به رشته
    const name = (m.motorcycleName || '').toString().toLowerCase();
    const color = (m.motorcycleColor || '').toString().toLowerCase();
    const plate = (m.motorcyclePlate || '').toString().toLowerCase();
    const dept = (m.motorcycleDepartment || '').toString().toLowerCase();

    return name.includes(searchTerm) ||
      color.includes(searchTerm) ||
      plate.includes(searchTerm) ||
      dept.includes(searchTerm);
  });

  const container = document.getElementById('assigned-motorcycle-options');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="p-3 text-gray-500 text-center">موتور سیکل آزادی یافت نشد</div>';
    return;
  }

  container.innerHTML = filtered.map(m => `
    <div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
         onclick="selectAssignedMotorcycle('${m.__backendId}', '${m.motorcycleName} - ${m.motorcycleColor} - ${m.motorcyclePlate}')">
      ${m.motorcycleName} - ${m.motorcycleColor} - ${m.motorcyclePlate}
      <span class="block text-xs text-gray-500">${m.motorcycleDepartment}</span>
    </div>
  `).join('');
}

function toggleAssignedMotorcycleDropdown() {
  const dropdown = document.getElementById('assigned-motorcycle-dropdown');
  dropdown.classList.toggle('hidden');
  if (!dropdown.classList.contains('hidden')) {
    document.getElementById('assigned-motorcycle-search').value = '';
    searchAssignedMotorcycles();
    setTimeout(() => document.getElementById('assigned-motorcycle-search').focus(), 100);
  }
}

function selectAssignedMotorcycle(id, text) {
  document.getElementById('assigned-motorcycle-display').textContent = text;
  document.getElementById('selected-assigned-motorcycle').value = id;
  document.getElementById('assigned-motorcycle-dropdown').classList.add('hidden');
}

function populateEditAssignedMotorcycleDropdown(currentAssignedId = '') {
  document.getElementById('edit-assigned-motorcycle-search').value = '';
  searchEditAssignedMotorcycles();
}

function searchEditAssignedMotorcycles() {
  const searchInput = document.getElementById('edit-assigned-motorcycle-search');
  if (!searchInput) return;

  const searchTerm = searchInput.value.toLowerCase().trim();
  const currentAssignedId = document.getElementById('edit-selected-assigned-motorcycle').value || '';

  const assignedIds = getAssignedMotorcycleIds()
    .filter(id => id !== currentAssignedId);

  const availableMotorcycles = allData.filter(d =>
    d.type === 'motorcycle' && !assignedIds.includes(d.__backendId)
  );

  const filtered = availableMotorcycles.filter(m => {
    // تبدیل ایمن همه فیلدها به رشته
    const name = (m.motorcycleName || '').toString().toLowerCase();
    const color = (m.motorcycleColor || '').toString().toLowerCase();
    const plate = (m.motorcyclePlate || '').toString().toLowerCase();
    const dept = (m.motorcycleDepartment || '').toString().toLowerCase();

    return name.includes(searchTerm) ||
      color.includes(searchTerm) ||
      plate.includes(searchTerm) ||
      dept.includes(searchTerm);
  });

  const container = document.getElementById('edit-assigned-motorcycle-options');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="p-3 text-gray-500 text-center">موتور سیکل آزادی یافت نشد</div>';
    return;
  }

  container.innerHTML = filtered.map(m => `
    <div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
         onclick="selectEditAssignedMotorcycle('${m.__backendId}', '${m.motorcycleName} - ${m.motorcycleColor} - ${m.motorcyclePlate}')">
      ${m.motorcycleName} - ${m.motorcycleColor} - ${m.motorcyclePlate}
      <span class="block text-xs text-gray-500">${m.motorcycleDepartment}</span>
    </div>
  `).join('');
}

function toggleEditAssignedMotorcycleDropdown() {
  const dropdown = document.getElementById('edit-assigned-motorcycle-dropdown');
  dropdown.classList.toggle('hidden');
  if (!dropdown.classList.contains('hidden')) {
    const currentId = document.getElementById('edit-selected-assigned-motorcycle').value;
    document.getElementById('edit-assigned-motorcycle-search').value = '';
    searchEditAssignedMotorcycles();
    setTimeout(() => document.getElementById('edit-assigned-motorcycle-search').focus(), 100);
  }
}

function selectEditAssignedMotorcycle(id, text) {
  document.getElementById('edit-assigned-motorcycle-display').textContent = text || 'موتور سیکل اختصاصی انتخاب نشده';
  document.getElementById('edit-selected-assigned-motorcycle').value = id || '';
  document.getElementById('edit-assigned-motorcycle-dropdown').classList.add('hidden');
}

// Get read notifications from localStorage
function getReadNotifications() {
  try {
    const read = localStorage.getItem('readNotifications');
    return read ? JSON.parse(read) : [];
  } catch (e) {
    return [];
  }
}

// Mark a notification as read
function markNotificationAsRead(notificationId) {
  const read = getReadNotifications();
  if (!read.includes(notificationId)) {
    read.push(notificationId);
    localStorage.setItem('readNotifications', JSON.stringify(read));
  }
}

// Mark all notifications as read
function markAllNotificationsAsRead(notificationIds) {
  const read = getReadNotifications();
  notificationIds.forEach(id => {
    if (!read.includes(id)) {
      read.push(id);
    }
  });
  localStorage.setItem('readNotifications', JSON.stringify(read));
}

// Add logout button for limit users in header (next to date)
function addLogoutButtonForLimitUser() {
  // Check if logout button already exists
  if (document.getElementById('limit-logout-btn')) return;
  
  // Create logout button with open gate icon
  const logoutBtn = document.createElement('button');
  logoutBtn.id = 'limit-logout-btn';
  logoutBtn.className = 'w-10 h-10 rounded-full bg-red-500 bg-opacity-80 flex items-center justify-center cursor-pointer hover:bg-opacity-100 transition-all duration-200 text-xl shrink-0';
  logoutBtn.title = 'خروج از سیستم';
  logoutBtn.innerHTML = '🚪';
  logoutBtn.onclick = showLogoutConfirmModal;
  
  // Find the current-date element
  const currentDate = document.getElementById('current-date');
  if (currentDate && currentDate.parentElement) {
    // The date container has class "text-left" - we need to make it a flex container
    const dateContainer = currentDate.parentElement;
    // Change from text-left to flex layout
    dateContainer.style.display = 'flex';
    dateContainer.style.flexDirection = 'row';
    dateContainer.style.alignItems = 'center';
    dateContainer.style.justifyContent = 'flex-start';
    dateContainer.style.gap = '8px';
    
    // In RTL, first element appears on the right side
    // Append the button to the end so it appears first (on the right) in RTL
    dateContainer.appendChild(logoutBtn);
  }
}

// Show logout confirmation modal for limit users
function showLogoutConfirmModal() {
  // Create modal if it doesn't exist
  let modal = document.getElementById('limit-logout-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'limit-logout-modal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2 class="text-2xl font-bold text-gray-300 mb-6">🚪 خروج از سیستم</h2>
        <div class="mb-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg">
          <p class="text-red-800">آیا می‌خواهید از سیستم خارج شوید؟</p>
        </div>
        <div class="flex gap-3 mt-6">
          <button type="button" class="btn btn-danger flex-1" onclick="confirmLimitLogout()">✅ بله، خروج</button>
          <button type="button" class="btn btn-secondary flex-1" onclick="closeLimitLogoutModal()">❌ انصراف</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.classList.add('active');
}

function closeLimitLogoutModal() {
  const modal = document.getElementById('limit-logout-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function confirmLimitLogout() {
  closeLimitLogoutModal();
  logout();
}

// Load notification badge count (only unread)
async function loadNotificationBadge() {
  try {
    const result = await callGoogleSheets('readAll', 'alarm');
    if (result.success && result.data) {
      const allNotifications = result.data.filter(n => n['Unique ID'] || n.__backendId);
      const readNotifications = getReadNotifications();
      
      // Count only unread notifications
      const unreadCount = allNotifications.filter(n => {
        const id = n['Unique ID'] || n.__backendId;
        return !readNotifications.includes(id);
      }).length;
      
      const badge = document.getElementById('notification-badge');
      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    }
  } catch (error) {
    console.error('Error loading notification badge:', error);
  }
}
