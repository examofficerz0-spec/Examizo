/**
 * DigiLocker Identity & KYC Helper Utilities
 * Examizo Learning & Assessment Portal
 */

export interface ParsedDigiLockerProfile {
  verified: boolean;
  name: string;
  dob: string;
  formattedDob: string;
  age: number | null;
  gender: string;
  email: string;
  mobile: string;
  maskedAadhaar: string;
  digilockerid: string;
  referenceKey: string;
  panNumber: string;
  drivingLicence: string;
  eaadhaar: string;
  linkedAt: string;
}

/**
 * Calculates student Age from various DigiLocker DOB formats:
 * - DDMMYYYY (e.g. "17102003")
 * - YYYY-MM-DD (e.g. "2003-10-17")
 * - DD-MM-YYYY / DD/MM/YYYY (e.g. "17-10-2003")
 */
export function calculateAgeFromDob(rawDob?: string | null): { age: number | null; formattedDob: string } {
  if (!rawDob || typeof rawDob !== 'string') {
    return { age: null, formattedDob: '' };
  }

  const clean = rawDob.trim().replace(/[\/\.]/g, '-');
  let birthDate: Date | null = null;
  let formattedDob = rawDob;

  // Format 1: DDMMYYYY 8-digit string (most common in DigiLocker id_token)
  if (/^\d{8}$/.test(clean)) {
    const day = parseInt(clean.substring(0, 2), 10);
    const month = parseInt(clean.substring(2, 4), 10) - 1; // 0-indexed
    const year = parseInt(clean.substring(4, 8), 10);
    birthDate = new Date(year, month, day);
    if (!isNaN(birthDate.getTime())) {
      formattedDob = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
    }
  }
  // Format 2: YYYY-MM-DD
  else if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-').map(n => parseInt(n, 10));
    birthDate = new Date(y, m - 1, d);
    if (!isNaN(birthDate.getTime())) {
      formattedDob = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }
  }
  // Format 3: DD-MM-YYYY
  else if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('-').map(n => parseInt(n, 10));
    birthDate = new Date(y, m - 1, d);
    if (!isNaN(birthDate.getTime())) {
      formattedDob = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }
  }
  // Fallback: standard Date parse
  else {
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      birthDate = parsed;
      formattedDob = parsed.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }

  if (!birthDate || isNaN(birthDate.getTime())) {
    return { age: null, formattedDob: rawDob };
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return { age: age >= 0 ? age : null, formattedDob };
}

/**
 * Normalizes raw DigiLocker profile object into a clean structured format
 */
export function normalizeDigiLockerProfile(rawProfile: any): ParsedDigiLockerProfile {
  if (!rawProfile || typeof rawProfile !== 'object') {
    return {
      verified: false,
      name: '',
      dob: '',
      formattedDob: '',
      age: null,
      gender: '',
      email: '',
      mobile: '',
      maskedAadhaar: '',
      digilockerid: '',
      referenceKey: '',
      panNumber: '',
      drivingLicence: '',
      eaadhaar: '',
      linkedAt: '',
    };
  }

  const dob = rawProfile.dob || rawProfile.birthdate || '';
  const { age, formattedDob } = calculateAgeFromDob(dob);

  let gender = rawProfile.gender || '';
  if (gender === 'M' || gender === 'm') gender = 'Male';
  else if (gender === 'F' || gender === 'f') gender = 'Female';
  else if (gender === 'T' || gender === 't') gender = 'Transgender';

  return {
    verified: Boolean(rawProfile.verified),
    name: rawProfile.name || '',
    dob: dob,
    formattedDob: formattedDob || dob,
    age: age,
    gender: gender,
    email: rawProfile.email || '',
    mobile: rawProfile.mobile || rawProfile.phone_number || '',
    maskedAadhaar: rawProfile.maskedAadhaar || rawProfile.masked_aadhaar || '',
    digilockerid: rawProfile.digilockerid || rawProfile.sub || '',
    referenceKey: rawProfile.referenceKey || rawProfile.reference_key || '',
    panNumber: rawProfile.panNumber || rawProfile.pan_number || '',
    drivingLicence: rawProfile.drivingLicence || rawProfile.driving_licence || '',
    eaadhaar: rawProfile.eaadhaar || '',
    linkedAt: rawProfile.linkedAt || new Date().toISOString(),
  };
}

/**
 * Query the Medizo Life Cloud D1 database where the Vercel gateway saves verification results
 */
export async function queryHealthD1<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const accountId = process.env.HEALTH_CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '';
  const databaseId = process.env.HEALTH_CLOUDFLARE_D1_DATABASE_ID || '';
  const apiToken = process.env.HEALTH_CLOUDFLARE_API_TOKEN || '';

  if (!accountId || !databaseId || !apiToken) {
    return [];
  }

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });

    const data = await res.json();
    if (data.success && data.result && data.result[0] && data.result[0].results) {
      return data.result[0].results as T[];
    }
  } catch (err) {
    console.error('[Health D1 Query Error]:', err);
  }

  return [];
}
