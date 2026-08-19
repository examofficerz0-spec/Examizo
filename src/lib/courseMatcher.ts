/**
 * Helper to get all course IDs that belong to the same exam track (e.g. NEET, JEE, Class 7th, 10th).
 * This ensures that mock tests, questions, or DPPs created under equivalent courses
 * (e.g. "NEET" vs "NEET 2027", "Class 7" vs "Class 7th") are accessible to students enrolled in that track.
 */
export function getEquivalentCourseIds(lockedCourseId: string, courses: any[]): string[] {
  if (!lockedCourseId) return [];

  const rawStr = typeof lockedCourseId === 'object'
    ? String((lockedCourseId as any)?._id || (lockedCourseId as any)?.id || '')
    : String(lockedCourseId);
  const initialIdStr = rawStr.trim();
  if (!initialIdStr) return [];

  const targetCourse = (courses || []).find(
    (c) =>
      String(c._id || '').toLowerCase() === initialIdStr.toLowerCase() ||
      String(c.id || '').toLowerCase() === initialIdStr.toLowerCase() ||
      String(c.name || '').toLowerCase() === initialIdStr.toLowerCase()
  );

  const matchedIds = new Set<string>();
  matchedIds.add(initialIdStr);

  if (targetCourse) {
    if (targetCourse.id) matchedIds.add(String(targetCourse.id));
    if (targetCourse._id) matchedIds.add(String(targetCourse._id));
    if (targetCourse.name) matchedIds.add(String(targetCourse.name));
  }

  const targetName = (targetCourse?.name || initialIdStr).toLowerCase().trim();

  // Extract grade numbers if present (e.g. "class 10" -> "10", "class 7th" -> "7")
  const getGrade = (str: string) => {
    const match = str.match(/class\s*(\d+)/i) || str.match(/grade\s*(\d+)/i) || str.match(/(\d+)(th|st|nd|rd)/i) || str.match(/^(\d+)$/);
    return match ? match[1] : null;
  };

  const targetGrade = getGrade(targetName);

  (courses || []).forEach((c) => {
    const cName = (c.name || '').toLowerCase().trim();
    const cGrade = getGrade(cName);

    const isSchoolTarget = targetName.includes('class') || targetName.includes('school') || targetName.includes('board') || /^\d+(th|st|nd|rd)?$/.test(targetName);
    const isSchoolC = cName.includes('class') || cName.includes('school') || cName.includes('board') || /^\d+(th|st|nd|rd)?$/.test(cName);

    const isExactName = cName === targetName;
    const isNeet = targetName.includes('neet') && cName.includes('neet');
    const isJee = targetName.includes('jee') && cName.includes('jee');
    const isSameGrade = Boolean(targetGrade && cGrade && targetGrade === cGrade);
    const isBothSchoolNoGrade = Boolean(isSchoolTarget && isSchoolC && !targetGrade && !cGrade);

    if (isExactName || isNeet || isJee || isSameGrade || isBothSchoolNoGrade) {
      if (c.id) matchedIds.add(String(c.id));
      if (c._id) matchedIds.add(String(c._id));
      if (c.name) matchedIds.add(String(c.name));
    }
  });

  return Array.from(matchedIds).filter(Boolean);
}
