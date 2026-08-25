import { readSharedDb } from '@/lib/sharedDb';
import { UserPayload } from '@/lib/auth';
import { queryD1 } from '@/lib/d1';

import { normalizeDigiLockerProfile } from '@/lib/digilockerHelper';

export interface UserLookupResult {
  user: any;
  isMemoryMode: boolean;
  isD1?: boolean;
}

export async function getUserFromAuth(auth: UserPayload | null): Promise<UserLookupResult | null> {
  if (!auth) return null;

  const emailLower = auth.email ? auth.email.toLowerCase().trim() : '';
  const userIdStr = auth.userId ? String(auth.userId) : '';

  // Helper to parse digilockerProfile
  const parseDigiProfile = (rawJson: any, verifiedVal: any) => {
    let parsed: any = null;
    if (typeof rawJson === 'string') {
      try {
        parsed = JSON.parse(rawJson);
      } catch (e) {}
    } else if (rawJson && typeof rawJson === 'object') {
      parsed = rawJson;
    }
    if (parsed) {
      return normalizeDigiLockerProfile(parsed);
    }
    if (verifiedVal === 1 || verifiedVal === true || verifiedVal === '1') {
      return { verified: true, name: '', dob: '', formattedDob: '', age: null, gender: '', email: '', mobile: '', maskedAadhaar: '', digilockerid: '', referenceKey: '', panNumber: '', drivingLicence: '', eaadhaar: '', linkedAt: '' };
    }
    return null;
  };

  // 1. Primary: Cloudflare D1 database lookup
  try {
    const d1Users = await queryD1('SELECT * FROM users WHERE id = ? OR LOWER(email) = ? LIMIT 1', [userIdStr, emailLower]);
    if (d1Users && d1Users.length > 0) {
      const u = d1Users[0];
      const isSubProfile = u.email && (u.email.includes('+') || u.email.includes('@exammaster.internal'));
      const parentEmail = (u.account_email || (isSubProfile ? `${u.email.split('+')[0]}@${u.email.split('@')[1] || 'examizo.com'}` : u.email)).toLowerCase().trim();

      if (isSubProfile && parentEmail && parentEmail !== u.email.toLowerCase()) {
        // Check parent main account status first
        const parentD1 = await queryD1('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1', [parentEmail]);
        if (parentD1 && parentD1.length > 0) {
          const p = parentD1[0];
          const isParentSuspended = p.status === 'Suspended' || p.status === 'suspended' || p.status === 'SUSPENDED';
          const isParentDeleted = p.status === 'Deleted' || p.name === 'Deleted User' || (p.email && p.email.startsWith('deleted_'));
          if (isParentDeleted || isParentSuspended) {
            return null; // Main account suspended/deleted blocks all sub-profiles
          }

          // Parent is Active: check if sub-profile itself is suspended/deleted
          const isSubSuspended = u.status === 'Suspended' || u.status === 'suspended' || u.status === 'SUSPENDED';
          const isSubDeleted = u.status === 'Deleted' || u.name === 'Deleted User' || (u.email && u.email.startsWith('deleted_'));
          if (isSubDeleted || isSubSuspended) {
            // Sub-profile suspended/deleted: Fallback seamlessly to the active main profile
            const pDigi = parseDigiProfile(p.digilocker_profile_json, p.digilocker_verified);
            return {
              user: {
                _id: p.id,
                id: p.id,
                name: p.name,
                email: p.email,
                password_hash: p.password_hash,
                account_email: p.email,
                locked_course_id: p.locked_course_id || null,
                status: p.status || 'Active',
                xp_total: p.xp_total || 0,
                digilocker_verified: Boolean(p.digilocker_verified),
                digilocker_profile_json: p.digilocker_profile_json || '{}',
                digilocker_raw_response_json: p.digilocker_raw_response_json || '{}',
                digilockerProfile: pDigi,
              },
              isMemoryMode: false,
              isD1: true,
            };
          }
        }
      }

      // Standard user check
      const isSuspended = u.status === 'Suspended' || u.status === 'suspended' || u.status === 'SUSPENDED';
      const isDeleted = u.status === 'Deleted' || u.name === 'Deleted User' || (u.email && u.email.startsWith('deleted_'));
      if (isDeleted || isSuspended) {
        return null;
      }

      const uDigi = parseDigiProfile(u.digilocker_profile_json, u.digilocker_verified);
      return {
        user: {
          _id: u.id,
          id: u.id,
          name: u.name,
          email: u.email,
          password_hash: u.password_hash,
          account_email: u.account_email || (u.email.includes('+profile_') ? `${u.email.split('+profile_')[0]}@${u.email.split('@')[1] || 'exammaster.internal'}` : u.email),
          locked_course_id: u.locked_course_id || null,
          status: u.status || 'Active',
          xp_total: u.xp_total || 0,
          digilocker_verified: Boolean(u.digilocker_verified),
          digilocker_profile_json: u.digilocker_profile_json || '{}',
          digilocker_raw_response_json: u.digilocker_raw_response_json || '{}',
          digilockerProfile: uDigi,
        },
        isMemoryMode: false,
        isD1: true,
      };
    }
  } catch (e) {
    console.warn('[getUserFromAuth] D1 lookup warning:', e);
  }

  // 2. Resilient Local Memory DB fallback
  try {
    const db = readSharedDb();
    if (db && db.users) {
      let memUser = db.users.find(
        (u: any) => String(u._id) === userIdStr || String(u.id) === userIdStr
      );

      if (!memUser && emailLower) {
        memUser = db.users.find(
          (u: any) =>
            (u.email && u.email.toLowerCase() === emailLower) ||
            (u.account_email && u.account_email.toLowerCase() === emailLower)
        );
      }

      if (memUser) {
        const isSubProfile = memUser.email && (memUser.email.includes('+') || memUser.email.includes('@exammaster.internal'));
        const parentEmail = (memUser.account_email || (isSubProfile ? `${memUser.email.split('+')[0]}@${memUser.email.split('@')[1] || 'examizo.com'}` : memUser.email)).toLowerCase().trim();

        if (isSubProfile && parentEmail && parentEmail !== memUser.email.toLowerCase()) {
          const parentMem = (db.users || []).find((u: any) => (u.email && u.email.toLowerCase() === parentEmail));
          if (parentMem) {
            const isParentSuspended = parentMem.status === 'Suspended' || parentMem.status === 'suspended' || parentMem.status === 'SUSPENDED';
            const isParentDeleted = parentMem.status === 'Deleted' || parentMem.name === 'Deleted User' || (parentMem.email && parentMem.email.startsWith('deleted_'));
            if (isParentDeleted || isParentSuspended) {
              return null; // Parent account suspended blocks all subprofiles
            }

            const isSubSuspended = memUser.status === 'Suspended' || memUser.status === 'suspended' || memUser.status === 'SUSPENDED';
            const isSubDeleted = memUser.status === 'Deleted' || memUser.name === 'Deleted User' || (memUser.email && memUser.email.startsWith('deleted_'));
            if (isSubDeleted || isSubSuspended) {
              // Sub-profile suspended: Fallback to active parent user
              return { user: parentMem, isMemoryMode: true };
            }
          }
        }

        const isSuspended = memUser.status === 'Suspended' || memUser.status === 'suspended' || memUser.status === 'SUSPENDED';
        const isDeleted = memUser.status === 'Deleted' || memUser.name === 'Deleted User' || (memUser.email && memUser.email.startsWith('deleted_'));
        if (isDeleted || isSuspended) {
          return null;
        }
        const memDigi = parseDigiProfile(memUser.digilocker_profile_json, memUser.digilocker_verified);
        return {
          user: {
            ...memUser,
            digilockerProfile: memDigi,
          },
          isMemoryMode: true,
        };
      }
    }
  } catch (e) {
    console.warn('[getUserFromAuth] Memory DB lookup warning:', e);
  }

  return null;
}

