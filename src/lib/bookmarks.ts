'use client';

export interface BookmarkedQuestion {
  id: string;
  _id?: string;
  course_id?: string;
  question_text: string;
  options: string[];
  options_json?: string;
  correct_option: number;
  explanation?: string;
  detailed_explanation?: string;
  topic_tag?: string;
  subject?: string;
  marks?: number;
  image_url?: string;
  saved_at?: string;
  source?: 'mock-test' | 'practice';
  test_title?: string;
}

const STORAGE_PREFIX = 'examizo_saved_bookmarks_';

function getStorageKey(studentId?: string): string {
  if (typeof window === 'undefined') return `${STORAGE_PREFIX}default`;
  const resolvedId =
    studentId ||
    localStorage.getItem('examizo_active_profile_id') ||
    localStorage.getItem('student_user_id') ||
    'default';
  return `${STORAGE_PREFIX}${resolvedId}`;
}

/**
 * Retrieve all saved bookmarks for the active student
 */
export function getSavedBookmarks(studentId?: string): BookmarkedQuestion[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getStorageKey(studentId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('[Bookmarks] Error reading bookmarks:', e);
    return [];
  }
}

/**
 * Check if a question is already bookmarked
 */
export function isQuestionBookmarked(questionId: string, studentId?: string): boolean {
  if (!questionId || typeof window === 'undefined') return false;
  const list = getSavedBookmarks(studentId);
  return list.some((item) => String(item.id || item._id) === String(questionId));
}

/**
 * Toggle bookmark for a question (add if not present, remove if present)
 * Returns true if now bookmarked, false if removed
 */
export function toggleQuestionBookmark(
  question: any,
  meta?: { source?: 'mock-test' | 'practice'; test_title?: string; studentId?: string }
): boolean {
  if (typeof window === 'undefined' || !question) return false;

  const qId = String(question.id || question._id || '');
  if (!qId) return false;

  const key = getStorageKey(meta?.studentId);
  const currentList = getSavedBookmarks(meta?.studentId);
  const existingIdx = currentList.findIndex((item) => String(item.id || item._id) === qId);

  let updatedList: BookmarkedQuestion[];
  let isNowBookmarked = false;

  if (existingIdx >= 0) {
    // Remove from bookmarks
    updatedList = currentList.filter((_, idx) => idx !== existingIdx);
    isNowBookmarked = false;
  } else {
    // Format options safely
    let optionsArray: string[] = [];
    if (Array.isArray(question.options)) {
      optionsArray = question.options;
    } else if (typeof question.options_json === 'string') {
      try {
        optionsArray = JSON.parse(question.options_json);
      } catch (_) {}
    }

    const newItem: BookmarkedQuestion = {
      id: qId,
      _id: qId,
      course_id: question.course_id,
      question_text: question.question_text || question.question || '',
      options: optionsArray,
      correct_option: Number(question.correct_option ?? 0),
      explanation: question.explanation || '',
      detailed_explanation: question.detailed_explanation || '',
      topic_tag: question.topic_tag || question.topic || 'General',
      subject: question.subject || 'General',
      marks: Number(question.marks || 1),
      image_url: question.image_url || null,
      saved_at: new Date().toISOString(),
      source: meta?.source || 'practice',
      test_title: meta?.test_title,
    };

    updatedList = [newItem, ...currentList];
    isNowBookmarked = true;
  }

  try {
    localStorage.setItem(key, JSON.stringify(updatedList));
    // Dispatch local storage & custom event so UI updates immediately
    window.dispatchEvent(new CustomEvent('examizo:bookmarks-updated', { detail: { updatedList } }));
  } catch (e) {
    console.error('[Bookmarks] Error saving bookmark:', e);
  }

  return isNowBookmarked;
}

/**
 * Remove a bookmark by question ID
 */
export function removeQuestionBookmark(questionId: string, studentId?: string): void {
  if (typeof window === 'undefined' || !questionId) return;
  const key = getStorageKey(studentId);
  const currentList = getSavedBookmarks(studentId);
  const updatedList = currentList.filter((item) => String(item.id || item._id) !== String(questionId));
  try {
    localStorage.setItem(key, JSON.stringify(updatedList));
    window.dispatchEvent(new CustomEvent('examizo:bookmarks-updated', { detail: { updatedList } }));
  } catch (e) {}
}
