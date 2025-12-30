const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxx43d2o_s9QZDWegoB2_0ZgqFPzkZe7UaiDUErzHnWs-4RbK8HR0deOTw6vWPSZq-Z/exec'; 
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
    'مجموعه استفاده': item.totalUsageTime || '00:00'

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
    totalUsageTime: record['مجموعه استفاده'] || '00:00'

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
    'دیپارتمنت': item.department || 'نامشخص'
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
    department: record['دیپارتمنت'] || 'نامشخص' 
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
    'میزان طی مسیر': item.totalDistance || 0
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
    totalDistance: record['میزان طی مسیر'] || 0
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


