// Pure TypeScript Type Definitions for Cloudflare D1 & SharedDb Data Entities
// MongoDB & Mongoose are completely decommissioned.

export interface IFriendRequest {
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterXp?: number;
  status: 'pending' | 'accepted' | 'declined';
  created_at?: string;
}

export interface IUser {
  _id?: string;
  id: string;
  name: string;
  email: string;
  password_hash: string;
  locked_course_id?: string | null;
  previous_course_id?: string | null;
  status: 'Active' | 'Suspended' | 'Deleted';
  xp_total: number;
  created_at?: string;
  account_email?: string;
  friends?: string[];
  friendRequests?: IFriendRequest[];
}

export interface ICourse {
  _id?: string;
  id: string;
  name: string;
  description: string;
  category?: 'Competitive Exams' | 'School Exams';
  board?: string;
  curriculum?: string;
  subjects?: string[];
  marking_scheme?: {
    marks_per_correct: number;
    penalty_per_incorrect: number;
  };
  is_active: boolean;
  created_at?: string;
}

export interface IQuestion {
  _id?: string;
  id: string;
  course_id: string;
  subject?: string;
  topic_tag: string;
  question_type?: 'MCQ' | 'Short Answer' | 'Long Answer';
  question_text: string;
  options: string[];
  correct_option: number;
  sample_answer?: string;
  marks?: number;
  explanation?: string;
  detailed_explanation?: string;
  is_active: boolean;
  created_at?: string;
}

export interface IMockTest {
  _id?: string;
  id: string;
  course_id: string;
  preset_id?: string | null;
  title: string;
  type: 'full' | 'sectional';
  duration_minutes: number;
  cutoff_marks: number;
  question_ids: string[];
  is_dynamic_reshuffle?: boolean;
  subject_allocations?: Record<string, number>;
  is_active: boolean;
  created_at?: string;
}

export interface IAttempt {
  _id?: string;
  id: string;
  student_id: string;
  course_id: string;
  test_id?: string | null;
  type: 'practice' | 'mock' | 'weekly';
  topic_tag?: string;
  responses: Array<{
    question_id: string;
    selected_option: number;
    is_correct: boolean;
  }>;
  score: number;
  accuracy: number;
  time_spent_seconds?: number;
  started_at?: string;
  submitted_at?: string;
  submission_type?: 'manual' | 'auto';
}

export interface IXPTransaction {
  _id?: string;
  id: string;
  student_id: string;
  attempt_id?: string | null;
  xp_amount: number;
  reason: string;
  created_at?: string;
}

export interface IAdmin {
  _id?: string;
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  permissions?: string[];
  allowed_courses?: string[];
  created_at?: string;
}

export interface IAuditLog {
  _id?: string;
  id: string;
  admin_id?: string | null;
  admin_name: string;
  action_type: string;
  affected_entity_id?: string;
  details: string;
  timestamp?: string;
}

export interface IWeeklyDPP {
  _id?: string;
  id: string;
  course_id: string;
  title: string;
  duration_minutes: number;
  question_ids: string[];
  is_active: boolean;
  created_at?: string;
}

export interface IResource {
  _id?: string;
  id: string;
  course_id: string;
  title: string;
  description?: string;
  subject?: string;
  resource_type: 'PDF Book' | 'Study Notes' | 'Formula Sheet' | 'Reference Manual';
  file_url: string;
  file_size?: string;
  page_count?: number;
  is_active: boolean;
  created_at?: string;
}

export interface INotification {
  _id?: string;
  id: string;
  targetType: 'all' | 'user' | 'course';
  targetUserId?: string | null;
  targetCourseId?: string | null;
  title: string;
  message: string;
  type?: 'info' | 'alert' | 'announcement' | 'warning' | 'success';
  readBy?: string[];
  clearedBy?: string[];
  created_at?: string;
}

// Dummy model compatibility stubs (no runtime Mongoose calls)
export const User: any = {};
export const Course: any = {};
export const Question: any = {};
export const MockTest: any = {};
export const WeeklyDPP: any = {};
export const Resource: any = {};
export const Attempt: any = {};
export const XPTransaction: any = {};
export const Admin: any = {};
export const AuditLog: any = {};
export const Notification: any = {};
