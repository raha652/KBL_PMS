const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxneJUPp4ZsLG5Lo635YnU7jDExLGoRtc0v5qbByN1XpFI-vJ_4wHRzySh694L4Y8U/exec'; 
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
function mapEmployeeToGS(item) {
  return {
    'Unique ID': item.__backendId,
    'نام کارمند': item.employeeName,
    'آیدی کارمند': item.employeeId,
    'دیپارتمنت': item.department,
    'شناسه اثر انگشت': item.fingerprintId,
    'نام موتور': item.assignedMotorcycleName || '',
    'رنگ': item.assignedMotorcycleColor || '',
    'پلاک': item.assignedMotorcyclePlate || '',
    'آیدی موتور اختصاصی': item.assignedMotorcycleId || ''   // ← این خط جدید
  };
}
function mapGSToEmployee(record) {
  return {
    type: 'employee',
    __backendId: record['Unique ID'],
    employeeName: record['نام کارمند'],
    employeeId: record['آیدی کارمند'],
    department: record['دیپارتمنت'],
    fingerprintId: record['شناسه اثر انگشت'],
    assignedMotorcycleName: record['نام موتور'] || '',
    assignedMotorcycleColor: record['رنگ'] || '',
    assignedMotorcyclePlate: record['پلاک'] || '',
    assignedMotorcycleId: record['آیدی موتور اختصاصی'] || ''   // ← این خط جدید
  };
}
async function syncEmployeesWithGoogleSheets(allDataRef) {
  try {
    const result = await callGoogleSheets('readAll', 'employees');
    if (result.success) {
      const gsEmployees = result.data
        .map(mapGSToEmployee)
        .filter(emp => emp.__backendId);
      const nonEmployeeData = allDataRef.filter(d => d.type !== 'employee');
      allDataRef.length = 0;
      allDataRef.push(...nonEmployeeData, ...gsEmployees);
      await saveData(allDataRef);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error syncing employees:', error);
    return false;
  }
}
function mapMotorcycleToGS(item) {
  return {
    'Unique ID': item.__backendId,
    'نام موتور سکیل': item.motorcycleName,
    'رنگ': item.motorcycleColor,
    'آیدی': item.motorcycleId,
    'پلاک': item.motorcyclePlate,
    'نوعیت اسناد': item.motorcycleDocumentType,
    'نمبر جواز سیر': item.motorcycleLicense || '',
    'نمبر شاسی': item.motorcycleChassisNumber,
    'نمبر انجین': item.motorcycleEngineNumber,
    'جی پی اس': item.motorcycleGps,
    'وضعیت جی پی اس': item.motorcycleGpsStatus || '',
    'دیپارتمنت': item.motorcycleDepartment,
    'URL عکس': item.motorcyclePhoto || '',
    'URL اسناد': item.motorcycleDocuments || '',
    'مجموعه استفاده': item.totalUsageTime || '00:00',
    'وضعیت موتور سکیل': item.motorcycleStatus || 'سالم'

  };
}
function mapGSToMotorcycle(record) {
  return {
    type: 'motorcycle',
    __backendId: record['Unique ID'],
    motorcycleName: record['نام موتور سکیل'],
    motorcycleColor: record['رنگ'],
    motorcycleId: record['آیدی'],
    motorcyclePlate: record['پلاک'],
    motorcycleDocumentType: record['نوعیت اسناد'],
    motorcycleLicense: record['نمبر جواز سیر'] || '',
    motorcycleChassisNumber: record['نمبر شاسی'],
    motorcycleEngineNumber: record['نمبر انجین'],
    motorcycleGps: record['جی پی اس'],
    motorcycleGpsStatus: record['وضعیت جی پی اس'] || '',
    motorcycleDepartment: record['دیپارتمنت'],
    motorcyclePhoto: record['URL عکس'] || '',
    motorcycleDocuments: record['URL اسناد'] || '',
    totalUsageTime: record['مجموعه استفاده'] || '00:00',
    motorcycleStatus: record['وضعیت موتور سکیل'] || 'سالم'

  };
}
async function syncMotorcyclesWithGoogleSheets(allDataRef) {
  try {
    const result = await callGoogleSheets('readAll', 'motors');
    if (result.success) {
      const gsMotorcycles = result.data
        .map(mapGSToMotorcycle)
        .filter(moto => moto.__backendId);
      const nonMotorcycleData = allDataRef.filter(d => d.type !== 'motorcycle');
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
function mapRequestToGS(item) {
  return {
    'Unique ID': item.__backendId,
    'نام کارمند': item.employeeName,
    'آیدی کارمند': item.employeeId,
    'دیپارتمنت کارمند': item.department,
    'شناسه اثر انگشت': item.fingerprintId,
    'نام موتور سکیل': item.motorcycleName,
    'رنگ موتور سکیل': item.motorcycleColor,
    'پلاک موتور سکیل': item.motorcyclePlate,
    'دیپارتمنت موتور سکیل': item.motorcycleDepartment,
    'تاریخ درخواست': String(item.requestDate),
    'نام درخواست کننده': item.requesterFullName,
    'زمان خروج': item.exitTime || '',
    'زمان ورود': item.entryTime || '',
    'وضعیت': item.status,
    'نام حذف کننده': item.deleterFullName || '',
    'زمان استفاده': item.usageTime || ''
  };
}
function mapGSToRequest(record) {
  function formatDateToString(value) {
    if (typeof value === 'string') {
      if (value.includes('T')) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}/${month}/${day}`;
        }
      } else if (value.includes('/')) {
        return value;
      }
    } else if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    }
    return value || '';
  }
  function formatTimeToString(value) {
    if (typeof value === 'string') {
      if (value.includes('T')) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });  
        }
      } else {
        return value;
      }
    } else if (value instanceof Date) {
      return value.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });  
    }
    return value || '';
  }
return {
  type: 'request',
  __backendId: record['Unique ID'],
  employeeName: record['نام کارمند'],
  employeeId: record['آیدی کارمند'],
  department: record['دیپارتمنت کارمند'],
  fingerprintId: record['شناسه اثر انگشت'],
  motorcycleName: record['نام موتور سکیل'],
  motorcycleColor: record['رنگ موتور سکیل'],
  motorcyclePlate: record['پلاک موتور سکیل'],
  motorcycleDepartment: record['دیپارتمنت موتور سکیل'],
  requestDate: formatDateToString(record['تاریخ درخواست']),
  requesterFullName: record['نام درخواست کننده'],
  exitTime: formatTimeToString(record['زمان خروج']) || '',
  entryTime: formatTimeToString(record['زمان ورود']) || '',
  status: record['وضعیت'],
  deleterFullName: record['نام حذف کننده'] || '',
  usageTime: record['زمان استفاده'] || ''  
};
}
async function syncRequestsWithGoogleSheets(allDataRef) {
  try {
    const result = await callGoogleSheets('readAll', 'request');
    if (result.success) {
      let gsRequests = result.data
        .map(mapGSToRequest)
        .filter(req => req.__backendId);
      gsRequests = gsRequests.filter(req => req.status !== 'delet' || true);
      const nonRequestData = allDataRef.filter(d => d.type !== 'request');
      const motorcycles = nonRequestData.filter(d => d.type === 'motorcycle');
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
function mapUserToGS(item) {
  return {
    'Unique ID': item.__backendId,
    'نام کامل': item.fullName,
    'نام کاربری': item.username,
    'رمز عبور': item.password,
    'نقش': item.role,
    'موقعیت شغلی': item.position || 'نامشخص',
    'دیپارتمنت': item.department || 'نامشخص',
    'آدرس عکس': item.photo || '',
    'وضعیت آنلاین': item.onlineStatus || 'offline',
    'آخرین فعالیت': formatDateTimeReadable(item.lastActivity),
    'نمایش‌های سفارشی': item.customDisplays || ''
  };
}

function mapGSToUser(record) {
  return {
    __backendId: record['Unique ID'],
    fullName: record['نام کامل'],
    username: record['نام کاربری'],
    password: record['رمز عبور'],
    role: record['نقش'],
    position: record['موقعیت شغلی'] || 'نامشخص',
    department: record['دیپارتمنت'] || 'نامشخص',
    photo: record['آدرس عکس'] || '',
    onlineStatus: record['وضعیت آنلاین'] || 'offline',
    lastActivity: record['آخرین فعالیت'] || '',
    customDisplays: record['نمایش‌های سفارشی'] || ''
  };
}


function mapFuelToGS(item) {
  return {
    'Unique ID': item.__backendId,
    'نام موتور': item.motorcycleName,
    'رنگ': item.motorcycleColor || '',
    'آیدی': item.motorcycleId || '',
    'پلاک': item.motorcyclePlate || '',
    'دیپارتمنت': item.motorcycleDepartment || '',
    'نوع تیل': item.fuelType || '',
    'تاریخ': item.reportDate || '',
    'میزان تیل': item.fuelAmount || '',
    'میزان کیلومتر': item.kilometerAmount || '',
    'نام کارمند': item.reporterFullName || '',
    'میزان طی مسیر': item.totalDistance || 0,
    'تاریخ اضافه کردن تیل': item.fuelAdditionDate || '' // User selected date

  };
}

function mapGSToFuel(record) {
  return {
    __backendId: record['Unique ID'],
    motorcycleName: record['نام موتور'],
    motorcycleColor: record['رنگ'] || '',
    motorcycleId: record['آیدی'] || '',
    motorcyclePlate: record['پلاک'] || '',
    motorcycleDepartment: record['دیپارتمنت'] || '',
    fuelType: record['نوع تیل'],
    reportDate: record['تاریخ'],
    fuelAmount: record['میزان تیل'],
    kilometerAmount: record['میزان کیلومتر'],
    reporterFullName: record['نام کارمند'] || '',
    totalDistance: record['میزان طی مسیر'] || 0,
    fuelAdditionDate: record['تاریخ اضافه کردن تیل'] || ''

  };
}

async function syncFuelReports() {
  try {
    const result = await callGoogleSheets('readAll', 'fuel');
    if (result.success) {
      fuelReports = result.data
        .map(mapGSToFuel)
        .filter(r => r.__backendId);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error syncing fuel reports:', error);
    return false;
  }
}

// Helper function to format time for Google Sheets (HH:MM:SS)
function formatTimeForGS(dateValue) {
  let date;
  if (typeof dateValue === 'string') {
    // If already in HH:MM:SS format, return as is
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(dateValue.trim())) {
      return dateValue.trim();
    }
    date = new Date(dateValue);
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    date = new Date();
  }
  
  if (isNaN(date.getTime())) {
    date = new Date();
  }
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
}

// Helper function to format date for Google Sheets (YYYY/MM/DD)
function formatDateForGS(dateValue) {
  let date;
  if (typeof dateValue === 'string') {
    // If already in YYYY/MM/DD format, return as is
    if (/^\d{4}[\/]\d{2}[\/]\d{2}$/.test(dateValue.trim())) {
      return dateValue.trim();
    }
    date = new Date(dateValue);
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    date = new Date();
  }
  
  if (isNaN(date.getTime())) {
    date = new Date();
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}/${month}/${day}`;
}

function mapFeedbackToGS(item) {
  const backendId = item.__backendId || (typeof generateId === 'function'
    ? generateId()
    : `fb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  return {
    'Unique ID':       backendId,
    'نوع گزارش':      item.reportType,          // "نظریه" یا "پیشنهاد"
    'نام کامل':       item.fullName,
    'دیپارتمنت':     item.department,
    'موتور سکیل':    item.motorcycle || '',     // فقط برای نظریه
    'رنگ موتور سکیل': item.motorcycleColor || '',     // رنگ موتور سکیل
    'دیپارتمنت موتور سکیل': item.motorcycleDepartment || '', // دیپارتمنت موتور سکیل
    'متن':            item.content,
    'تاریخ':          item.date || '',           // تاریخ ثبت - بدون تغییر
    'زمان ثبت':       item.timestamp || '',     // زمان ثبت - بدون تغییر
    'وضعیت تعمیر':    item.repairStatus || 'نیاز به تعمیر دارد',  // وضعیت تعمیر
    'تاریخ تعمیر':    item.repairDate || '',    // تاریخ تعمیر
    'شخص تعمیر کننده': item.repairedBy || '',   // نام شخصی که تعمیر را انجام داده
    'پین شده':        item.pinned ? 'بله' : 'خیر'  // آیا پین شده
  };
}

function mapGSToFeedback(record) {
  return {
    type:          'feedback',
    __backendId:   record['Unique ID'],
    reportType:    record['نوع گزارش'],
    fullName:      record['نام کامل'],
    department:    record['دیپارتمنت'],
    motorcycle:    record['موتور سکیل'] || '',
    motorcycleColor: record['رنگ موتور سکیل'] || '',
    motorcycleDepartment: record['دیپارتمنت موتور سکیل'] || '',
    content:       record['متن'],
    date:          record['تاریخ'],
    timestamp:     record['زمان ثبت'],
    repairStatus:  record['وضعیت تعمیر'] || 'نیاز به تعمیر دارد',
    repairDate:    record['تاریخ تعمیر'] || '',
    repairedBy:    record['شخص تعمیر کننده'] || '',
    pinned:        record['پین شده'] === 'بله'
  };
}

async function syncFeedbackWithGoogleSheets(allDataRef) {
  try {
    const result = await callGoogleSheets('readAll', 'feedback');
    if (result.success) {
      const gsFeedback = result.data.map(mapGSToFeedback);

      // فقط feedbackها را جایگزین می‌کنیم
      const nonFeedbackData = allDataRef.filter(d => d.type !== 'feedback');
      allDataRef.length = 0;
      allDataRef.push(...nonFeedbackData, ...gsFeedback);

      await saveData(allDataRef);
      return true;
    }
    return false;
  } catch (error) {
    console.error('خطا در همگام‌سازی feedback:', error);
    return false;
  }
}

// توابع مربوط به گزارشات موبلایل (oil)
function mapOilToGS(item) {
  const backendId = item.__backendId || (typeof generateId === 'function'
    ? generateId()
    : `oil-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  return {
    'Unique ID': backendId,
    'Motorcycle ID': item.motorcycleId || '',
    'نام موتور سکیل': item.motorcycleName || '',
    'رنگ موتور سکیل': item.motorcycleColor || '',
    'دیپارتمنت موتور سکیل': item.motorcycleDepartment || '',
    'پلاک موتور سکیل': item.motorcyclePlate || '',
    'مقدار موبلایل': item.oilAmount || 0,
    'نام کامل': item.reporterName || '',
    'دیپارتمنت کاربر': item.reporterDept || '',
    'تاریخ': item.date || '',
    'زمان': item.time || ''
  };
}

function mapGSToOil(record) {
  return {
    __backendId: record['Unique ID'],
    motorcycleId: record['Motorcycle ID'] || '',
    motorcycleName: record['نام موتور سکیل'] || '',
    motorcycleColor: record['رنگ موتور سکیل'] || '',
    motorcycleDepartment: record['دیپارتمنت موتور سکیل'] || '',
    motorcyclePlate: record['پلاک موتور سکیل'] || '',
    oilAmount: parseFloat(record['مقدار موبلایل']) || 0,
    reporterName: record['نام کامل'] || '',
    reporterDept: record['دیپارتمنت کاربر'] || '',
    date: record['تاریخ'] || '',
    time: record['زمان'] || ''
  };
}

async function syncOilReports() {
  try {
    const result = await callGoogleSheets('readAll', 'oil');
    if (result.success) {
      return result.data.map(mapGSToOil).filter(r => r.__backendId);
    }
    return [];
  } catch (error) {
    console.error('Error syncing oil reports:', error);
    return [];
  }
}

// تابع تبدیل تاریخ به فرمت خوانا
function formatDateTimeReadable(dateValue) {
  let date;
  if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    date = new Date();
  }
  
  if (isNaN(date.getTime())) {
    date = new Date();
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

// توابع مربوط به اعلانات (alarm)
function mapAlarmToGS(item) {
  const backendId = item.__backendId || (typeof generateId === 'function'
    ? generateId()
    : `alarm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  return {
    'Unique ID': backendId,
    'عنوان': item.title || '',
    'متن': item.message || '',
    'نام کامل': item.authorName || '',
    'دیپارتمنت': item.authorDepartment || '',
    'تاریخ': formatDateTimeReadable(item.createdAt)
  };
}

function mapGSToAlarm(record) {
  return {
    __backendId: record['Unique ID'],
    title: record['عنوان'] || '',
    message: record['متن'] || '',
    authorName: record['نام کامل'] || '',
    authorDepartment: record['دیپارتمنت'] || '',
    createdAt: record['تاریخ'] || new Date().toISOString()
  };
}

async function syncAlarmsWithGoogleSheets() {
  try {
    const result = await callGoogleSheets('readAll', 'alarm');
    if (result.success) {
      return result.data.map(mapGSToAlarm).filter(n => n.__backendId);
    }
    return [];
  } catch (error) {
    console.error('Error syncing alarms:', error);
    return [];
  }
}







