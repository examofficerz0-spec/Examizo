'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Check,
  CheckCircle2,
  GraduationCap,
  Rocket,
  Trophy,
  Zap,
  Target,
  Calendar,
  BookOpen,
  Award,
  Globe,
  Building2,
  Star,
  Flame,
} from 'lucide-react';

export interface SelectedCurriculumResult {
  courseId: string;
  courseName: string;
  category: 'School Exams' | 'Competitive Exams';
  board?: string;
  classGrade?: string;
  examName?: string;
  targetYear?: string;
  subjects: string[];
  isNewCourse?: boolean;
}

interface CurriculumPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCurriculum: (result: SelectedCurriculumResult) => void;
  availableCourses: any[];
  initialCategory?: 'School Exams' | 'Competitive Exams' | null;
}

// Pre-defined Board options for School
const SCHOOL_BOARDS = [
  {
    id: 'CBSE',
    name: 'CBSE',
    fullName: 'Central Board of Secondary Education',
    icon: Building2,
    badge: 'NCERT Aligned',
    color: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/40',
    accent: 'bg-blue-600',
  },
  {
    id: 'ICSE',
    name: 'ICSE / ISC',
    fullName: 'Council for the Indian School Certificate',
    icon: Award,
    badge: 'CISCE Syllabus',
    color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/40',
    accent: 'bg-amber-600',
  },
  {
    id: 'State Board',
    name: 'State Board',
    fullName: 'State Government Secondary Education',
    icon: GraduationCap,
    badge: 'State Curriculum',
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/40',
    accent: 'bg-emerald-600',
  },
  {
    id: 'IB / Cambridge',
    name: 'IB / Cambridge',
    fullName: 'International Baccalaureate & IGCSE',
    icon: Globe,
    badge: 'Global Curriculum',
    color: 'from-purple-500/20 to-violet-500/20 text-purple-400 border-purple-500/40',
    accent: 'bg-purple-600',
  },
];

// Pre-defined School Classes
const SCHOOL_CLASSES = [
  { grade: '6', label: 'Class 6', tag: 'Junior Explorer', icon: '🎒', isBoard: false },
  { grade: '7', label: 'Class 7', tag: 'Middle School', icon: '📐', isBoard: false },
  { grade: '8', label: 'Class 8', tag: 'Pre-Secondary', icon: '🧪', isBoard: false },
  { grade: '9', label: 'Class 9', tag: 'Foundation Year', icon: '🔬', isBoard: false },
  { grade: '10', label: 'Class 10', tag: 'Board Exam Year 🌟', icon: '⭐', isBoard: true },
  { grade: '11', label: 'Class 11', tag: 'Higher Secondary', icon: '📚', isBoard: false },
  { grade: '12', label: 'Class 12', tag: 'Senior Board Year 🎓', icon: '🎯', isBoard: true },
];

// Pre-defined Competitive Exams
const COMPETITIVE_EXAMS = [
  {
    id: 'JEE',
    name: 'JEE Main & Advanced',
    shortName: 'JEE Main',
    badge: 'Engineering Entrance',
    desc: 'Physics, Chemistry & Mathematics for IITs & NITs',
    icon: Zap,
    color: 'from-blue-600/20 to-cyan-600/20 text-cyan-400 border-cyan-500/40',
    accent: 'bg-cyan-600',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
  },
  {
    id: 'NEET',
    name: 'NEET UG',
    shortName: 'NEET',
    badge: 'Medical Entrance',
    desc: 'Biology (Botany & Zoology), Physics & Chemistry',
    icon: Flame,
    color: 'from-emerald-600/20 to-teal-600/20 text-emerald-400 border-emerald-500/40',
    accent: 'bg-emerald-600',
    subjects: ['Biology', 'Physics', 'Chemistry'],
  },
  {
    id: 'Foundation',
    name: 'Foundation & Olympiads',
    shortName: 'Foundation',
    badge: 'Class 8-10 Talent',
    desc: 'NTSE, Science & Math Olympiads, Pre-JEE/NEET skills',
    icon: Trophy,
    color: 'from-amber-600/20 to-orange-600/20 text-amber-400 border-amber-500/40',
    accent: 'bg-amber-600',
    subjects: ['Science', 'Mathematics', 'Mental Ability'],
  },
  {
    id: 'CUET',
    name: 'CUET UG',
    shortName: 'CUET',
    badge: 'Central Universities',
    desc: 'Domain Subjects & General Aptitude Test',
    icon: Building2,
    color: 'from-purple-600/20 to-pink-600/20 text-purple-400 border-purple-500/40',
    accent: 'bg-purple-600',
    subjects: ['General Test', 'Domain Subjects', 'English'],
  },
  {
    id: 'NDA',
    name: 'NDA & Defence Exams',
    shortName: 'NDA',
    badge: 'National Defence',
    desc: 'Mathematics, General Ability Test & English',
    icon: Target,
    color: 'from-rose-600/20 to-red-600/20 text-rose-400 border-rose-500/40',
    accent: 'bg-rose-600',
    subjects: ['Mathematics', 'General Ability', 'English'],
  },
];

// Target Years for Competitive
const TARGET_YEARS = [
  { year: '2025', badge: '⚡ Appearing This Year', desc: 'Fast-Track & Revision Milestones' },
  { year: '2026', badge: '🎯 Target 2026', desc: '1-Year Intensive Preparation' },
  { year: '2027', badge: '🚀 Target 2027', desc: '2-Year Comprehensive Foundation' },
  { year: '2028', badge: '🌟 Target 2028', desc: 'Multi-Year Long Term Aspirant' },
];

export const CurriculumPickerModal: React.FC<CurriculumPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectCurriculum,
  availableCourses,
}) => {
  // Wizard Steps:
  // 1 = School or Competitive
  // 2 = Board (if School) OR Exam Name (if Competitive)
  // 3 = Class (if School) OR Target Year (if Competitive)
  // 4 = Confirmation & Preview
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Selections
  const [category, setCategory] = useState<'School Exams' | 'Competitive Exams' | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<string>('CBSE');
  const [selectedClass, setSelectedClass] = useState<string>('10');
  const [selectedExam, setSelectedExam] = useState<string>('JEE');
  const [selectedYear, setSelectedYear] = useState<string>('2027');

  if (!isOpen) return null;

  const handleSelectCategory = (cat: 'School Exams' | 'Competitive Exams') => {
    setCategory(cat);
    setStep(2);
  };

  const handleBack = () => {
    if (step === 4) setStep(3);
    else if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };

  // Find or resolve best matching course from existing courses
  const resolvedCourseInfo = useMemo(() => {
    if (!category) return null;

    if (category === 'School Exams') {
      const generatedName = `Class ${selectedClass} ${selectedBoard} Board Exam`;
      const fallbackSubjects =
        selectedClass === '11' || selectedClass === '12'
          ? ['Physics', 'Chemistry', 'Mathematics', 'Biology']
          : ['Science', 'Mathematics', 'Social Studies'];

      // Look for match in existing available courses
      const match = (availableCourses || []).find((c: any) => {
        const cCat = String(c.category || '').toLowerCase();
        const cName = String(c.name || '').toLowerCase();
        const cBoard = String(c.board || '').toLowerCase();

        const isSchool = cCat.includes('school') || cName.includes('class') || cName.includes('board');
        if (!isSchool) return false;

        const gradeMatch =
          cName.includes(`class ${selectedClass}`) ||
          cName.includes(`classs ${selectedClass}`) ||
          cName.includes(`grade ${selectedClass}`) ||
          cName.includes(`${selectedClass}th`);

        const boardMatch = !selectedBoard || cBoard.includes(selectedBoard.toLowerCase()) || cName.includes(selectedBoard.toLowerCase());

        return gradeMatch && (boardMatch || cName.includes(selectedClass));
      });

      if (match) {
        return {
          courseId: String(match._id || match.id),
          courseName: match.name,
          category: 'School Exams' as const,
          board: match.board || selectedBoard,
          classGrade: `Class ${selectedClass}`,
          subjects: Array.isArray(match.subjects) && match.subjects.length > 0 ? match.subjects : fallbackSubjects,
          isNewCourse: false,
        };
      }

      return {
        courseId: `course_school_${selectedBoard.toLowerCase().replace(/[^a-z0-9]/g, '')}_class_${selectedClass}`,
        courseName: generatedName,
        category: 'School Exams' as const,
        board: selectedBoard,
        classGrade: `Class ${selectedClass}`,
        subjects: fallbackSubjects,
        isNewCourse: true,
      };
    } else {
      // Competitive track
      const examObj = COMPETITIVE_EXAMS.find((e) => e.id === selectedExam) || COMPETITIVE_EXAMS[0];
      const generatedName = `${examObj.shortName} ${selectedYear}`;

      // Check match in existing available courses
      const match = (availableCourses || []).find((c: any) => {
        const cCat = String(c.category || '').toLowerCase();
        const cName = String(c.name || '').toLowerCase();

        const isCompetitive = cCat.includes('competitive') || cName.includes('jee') || cName.includes('neet') || cName.includes('olympiad');
        if (!isCompetitive) return false;

        const examMatch = cName.includes(examObj.id.toLowerCase()) || cName.includes(examObj.shortName.toLowerCase());
        const yearMatch = cName.includes(selectedYear);

        return examMatch && (yearMatch || cName.includes(examObj.shortName.toLowerCase()));
      });

      if (match) {
        return {
          courseId: String(match._id || match.id),
          courseName: match.name,
          category: 'Competitive Exams' as const,
          examName: examObj.name,
          targetYear: selectedYear,
          subjects: Array.isArray(match.subjects) && match.subjects.length > 0 ? match.subjects : examObj.subjects,
          isNewCourse: false,
        };
      }

      return {
        courseId: `course_comp_${examObj.id.toLowerCase()}_${selectedYear}`,
        courseName: generatedName,
        category: 'Competitive Exams' as const,
        examName: examObj.name,
        targetYear: selectedYear,
        subjects: examObj.subjects,
        isNewCourse: true,
      };
    }
  }, [category, selectedBoard, selectedClass, selectedExam, selectedYear, availableCourses]);

  const handleConfirmTrack = () => {
    if (!resolvedCourseInfo) return;
    onSelectCurriculum(resolvedCourseInfo);
    onClose();
  };

  // Progress percentage for step indicator
  const progressPercent = step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : 100;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 z-[80] animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-2xl relative text-white flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Duolingo-Style Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-2 mb-4 overflow-hidden relative">
          <div
            className="bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="Back to previous step"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
            )}

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
                Step {step} of 4 • Curriculum Wizard
              </span>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                {step === 1 && 'What is your study goal? 🎯'}
                {step === 2 && category === 'School Exams' && 'Which Board do you follow? 🏛️'}
                {step === 2 && category === 'Competitive Exams' && 'Which Exam are you targeting? ⚡'}
                {step === 3 && category === 'School Exams' && 'Which Class are you in? 🎒'}
                {step === 3 && category === 'Competitive Exams' && 'What is your Target Year? 🗓️'}
                {step === 4 && "You're Ready to Learn! 🚀"}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="py-4 overflow-y-auto flex-1 pr-1 space-y-4">
          {/* ══════ STEP 1: School or Competitive ══════ */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <p className="text-xs text-slate-400">
                Choose the academic preparation track for this profile. We will tailor your revision tests, daily DPPs, and subjects accordingly.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* 1. School Exams Card */}
                <button
                  type="button"
                  onClick={() => handleSelectCategory('School Exams')}
                  className="group relative p-5 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 hover:border-emerald-400 hover:bg-emerald-950/60 transition-all text-left flex flex-col justify-between cursor-pointer shadow-lg hover:shadow-emerald-500/10 active:translate-y-0.5"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                      🏫
                    </div>
                    <div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] uppercase tracking-wider">
                        Class 6 to 12
                      </span>
                      <h4 className="text-base font-black text-white mt-1 group-hover:text-emerald-300 transition-colors">
                        School / Board Exams
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        CBSE, ICSE &amp; State Boards. Textbook NCERT exercises, daily practice papers &amp; school exams.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-400">
                    <span>Select School Track</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* 2. Competitive Exams Card */}
                <button
                  type="button"
                  onClick={() => handleSelectCategory('Competitive Exams')}
                  className="group relative p-5 rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 hover:border-indigo-400 hover:bg-indigo-950/60 transition-all text-left flex flex-col justify-between cursor-pointer shadow-lg hover:shadow-indigo-500/10 active:translate-y-0.5"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                      🚀
                    </div>
                    <div>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider">
                        Entrance &amp; Ranks
                      </span>
                      <h4 className="text-base font-black text-white mt-1 group-hover:text-indigo-300 transition-colors">
                        Competitive Exams
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        JEE Main, NEET UG, Foundation Olympiads, CUET &amp; Defence. High-speed mock tests with negative marking.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-indigo-400">
                    <span>Select Entrance Track</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ══════ STEP 2 (School): Pick Board ══════ */}
          {step === 2 && category === 'School Exams' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <p className="text-xs text-slate-400">
                Select your education board to align curriculum chapters, marking scheme, and board questions:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {SCHOOL_BOARDS.map((b) => {
                  const Icon = b.icon;
                  const isSelected = selectedBoard === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setSelectedBoard(b.id);
                        setStep(3);
                      }}
                      className={`p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer active:translate-y-0.5 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-950/40 shadow-lg shadow-blue-500/20'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${b.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-extrabold text-sm text-white">{b.name}</h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {b.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">{b.fullName}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════ STEP 3 (School): Pick Class / Grade ══════ */}
          {step === 3 && category === 'School Exams' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <p className="text-xs text-slate-400">
                Board selected: <strong className="text-blue-400 font-extrabold">{selectedBoard}</strong>. Now pick your grade level:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {SCHOOL_CLASSES.map((cl) => {
                  const isSelected = selectedClass === cl.grade;
                  return (
                    <button
                      key={cl.grade}
                      type="button"
                      onClick={() => {
                        setSelectedClass(cl.grade);
                        setStep(4);
                      }}
                      className={`p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 active:translate-y-0.5 relative overflow-hidden ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-950/40 shadow-md shadow-emerald-500/20'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/60'
                      }`}
                    >
                      {cl.isBoard && (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[8px] font-black uppercase">
                          Board
                        </span>
                      )}
                      <span className="text-2xl">{cl.icon}</span>
                      <h4 className="font-black text-sm text-white">{cl.label}</h4>
                      <span className="text-[10px] text-slate-400 font-medium">{cl.tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════ STEP 2 (Competitive): Pick Exam Name ══════ */}
          {step === 2 && category === 'Competitive Exams' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <p className="text-xs text-slate-400">
                Select your targeted competitive entrance examination track:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {COMPETITIVE_EXAMS.map((ex) => {
                  const Icon = ex.icon;
                  const isSelected = selectedExam === ex.id;
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        setSelectedExam(ex.id);
                        setStep(3);
                      }}
                      className={`p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer active:translate-y-0.5 ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-950/40 shadow-lg shadow-cyan-500/20'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${ex.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-extrabold text-sm text-white">{ex.name}</h4>
                        </div>
                        <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300">
                          {ex.badge}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">{ex.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════ STEP 3 (Competitive): Pick Target Year ══════ */}
          {step === 3 && category === 'Competitive Exams' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <p className="text-xs text-slate-400">
                Exam chosen: <strong className="text-cyan-400 font-extrabold">{COMPETITIVE_EXAMS.find((e) => e.id === selectedExam)?.name}</strong>. Now pick your target exam year:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {TARGET_YEARS.map((ty) => {
                  const isSelected = selectedYear === ty.year;
                  return (
                    <button
                      key={ty.year}
                      type="button"
                      onClick={() => {
                        setSelectedYear(ty.year);
                        setStep(4);
                      }}
                      className={`p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer active:translate-y-0.5 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-500/20'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-sm shrink-0">
                        {ty.year.slice(-2)}'
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-base text-white">{ty.year}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300">
                            {ty.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{ty.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════ STEP 4: Celebratory Confirmation Preview ══════ */}
          {step === 4 && resolvedCourseInfo && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200 text-center py-2">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-3xl mx-auto shadow-xl shadow-emerald-500/20 animate-bounce">
                🎉
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Perfect Curriculum Match
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-2">
                  {resolvedCourseInfo.courseName}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Your academic questions, DPPs, and benchmark leaderboards will be customized for this track.
                </p>
              </div>

              {/* Course Detail Card */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Preparation Track</span>
                    <span className="font-extrabold text-white text-xs block mt-0.5">
                      {resolvedCourseInfo.category === 'School Exams' ? '🏫 School / Board' : '🚀 Competitive Entrance'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">
                      {resolvedCourseInfo.category === 'School Exams' ? 'Board & Class' : 'Exam & Year'}
                    </span>
                    <span className="font-extrabold text-white text-xs block mt-0.5">
                      {resolvedCourseInfo.category === 'School Exams'
                        ? `${resolvedCourseInfo.board} • ${resolvedCourseInfo.classGrade}`
                        : `${resolvedCourseInfo.examName} • Target ${resolvedCourseInfo.targetYear}`}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1.5">Curriculum Subjects</span>
                  <div className="flex flex-wrap gap-1.5">
                    {resolvedCourseInfo.subjects.map((sub: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold">
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
          )}

          {step === 4 ? (
            <button
              type="button"
              onClick={handleConfirmTrack}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" /> Lock This Curriculum Track 🚀
            </button>
          ) : (
            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              Select an option above to continue
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
