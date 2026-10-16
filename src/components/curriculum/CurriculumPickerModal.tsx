'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  GraduationCap,
  Trophy,
  Zap,
  Target,
  Building2,
  Award,
  Globe,
  Flame,
  Search,
  Check,
  MapPin,
} from 'lucide-react';

export interface SelectedCurriculumResult {
  courseId: string;
  courseName: string;
  category: 'School Exams' | 'Competitive Exams';
  board?: string;
  state?: string;
  stateCode?: string;
  classGrade?: string;
  examName?: string;
  targetYear?: string;
  subjects: string[];
  isNewCourse?: boolean;
}

export interface StateBoardOption {
  id: string;
  state: string;
  name: string;
  code: string;
  tag: string;
  fullName: string;
  region: 'North' | 'South' | 'East' | 'West' | 'Central' | 'North-East' | 'All';
  isPopular?: boolean;
}

// Comprehensive List of Indian State Boards across all 28 States & UTs
export const INDIAN_STATE_BOARDS: StateBoardOption[] = [
  // ── High Enrollment / Popular State Boards ──
  {
    id: 'maharashtra',
    state: 'Maharashtra',
    name: 'Maharashtra State Board',
    code: 'MSBSHSE',
    tag: 'SSC & HSC',
    fullName: 'Maharashtra State Board of Secondary and Higher Secondary Education, Pune',
    region: 'West',
    isPopular: true,
  },
  {
    id: 'uttar_pradesh',
    state: 'Uttar Pradesh',
    name: 'UP Board',
    code: 'UPMSP',
    tag: 'High School & Inter',
    fullName: 'Uttar Pradesh Madhyamik Shiksha Parishad, Prayagraj',
    region: 'North',
    isPopular: true,
  },
  {
    id: 'bihar',
    state: 'Bihar',
    name: 'Bihar Board',
    code: 'BSEB',
    tag: 'Matric & Inter',
    fullName: 'Bihar School Examination Board, Patna',
    region: 'East',
    isPopular: true,
  },
  {
    id: 'tamil_nadu',
    state: 'Tamil Nadu',
    name: 'Tamil Nadu State Board',
    code: 'TNBSE',
    tag: 'SSLC & HSC (+2)',
    fullName: 'Tamil Nadu Directorate of Government Examinations (DGE / TNBSE)',
    region: 'South',
    isPopular: true,
  },
  {
    id: 'karnataka',
    state: 'Karnataka',
    name: 'Karnataka State Board',
    code: 'KSEAB',
    tag: 'SSLC & 2nd PUC',
    fullName: 'Karnataka School Examination and Assessment Board (KSEAB / KSEEB)',
    region: 'South',
    isPopular: true,
  },
  {
    id: 'west_bengal',
    state: 'West Bengal',
    name: 'West Bengal Board',
    code: 'WBBSE / WBCHSE',
    tag: 'Madhyamik & HS',
    fullName: 'West Bengal Board of Secondary Education & Higher Secondary Council',
    region: 'East',
    isPopular: true,
  },
  {
    id: 'rajasthan',
    state: 'Rajasthan',
    name: 'Rajasthan Board',
    code: 'RBSE',
    tag: 'Secondary & Sr. Sec',
    fullName: 'Board of Secondary Education Rajasthan, Ajmer (BSER / RBSE)',
    region: 'North',
    isPopular: true,
  },
  {
    id: 'andhra_pradesh',
    state: 'Andhra Pradesh',
    name: 'Andhra Pradesh Board',
    code: 'BSEAP / BIEAP',
    tag: 'SSC & Intermediate',
    fullName: 'Board of Secondary Education & Intermediate Education Andhra Pradesh',
    region: 'South',
    isPopular: true,
  },
  {
    id: 'telangana',
    state: 'Telangana',
    name: 'Telangana State Board',
    code: 'TSBIE / BSE',
    tag: 'SSC & Inter',
    fullName: 'Telangana State Board of Intermediate & Secondary Education, Hyderabad',
    region: 'South',
    isPopular: true,
  },
  {
    id: 'kerala',
    state: 'Kerala',
    name: 'Kerala State Board',
    code: 'KBPE / DHSE',
    tag: 'SSLC & Plus Two',
    fullName: 'Kerala Directorate of Higher Secondary Education & Pareeksha Bhavan',
    region: 'South',
    isPopular: true,
  },
  {
    id: 'madhya_pradesh',
    state: 'Madhya Pradesh',
    name: 'MP Board',
    code: 'MPBSE',
    tag: 'High School & Higher Sec',
    fullName: 'Madhya Pradesh Board of Secondary Education, Bhopal',
    region: 'Central',
    isPopular: true,
  },
  {
    id: 'gujarat',
    state: 'Gujarat',
    name: 'Gujarat Board',
    code: 'GSEB',
    tag: 'SSC & HSC',
    fullName: 'Gujarat Secondary and Higher Secondary Education Board, Gandhinagar',
    region: 'West',
    isPopular: true,
  },
  {
    id: 'punjab',
    state: 'Punjab',
    name: 'Punjab Board',
    code: 'PSEB',
    tag: 'Matric & Sr. Secondary',
    fullName: 'Punjab School Education Board, Mohali',
    region: 'North',
    isPopular: true,
  },
  {
    id: 'odisha',
    state: 'Odisha',
    name: 'Odisha Board',
    code: 'BSE / CHSE',
    tag: 'HSC & +2',
    fullName: 'Board of Secondary Education & Council of Higher Secondary Education Odisha',
    region: 'East',
    isPopular: true,
  },
  // ── North & Central India ──
  {
    id: 'haryana',
    state: 'Haryana',
    name: 'Haryana Board',
    code: 'BSEH / HBSE',
    tag: 'Secondary & Sr. Sec',
    fullName: 'Board of School Education Haryana, Bhiwani',
    region: 'North',
  },
  {
    id: 'jharkhand',
    state: 'Jharkhand',
    name: 'Jharkhand Board',
    code: 'JAC',
    tag: 'Matric & Intermediate',
    fullName: 'Jharkhand Academic Council, Ranchi',
    region: 'East',
  },
  {
    id: 'chhattisgarh',
    state: 'Chhattisgarh',
    name: 'Chhattisgarh Board',
    code: 'CGBSE',
    tag: 'High School & Higher Sec',
    fullName: 'Chhattisgarh Board of Secondary Education, Raipur',
    region: 'Central',
  },
  {
    id: 'uttarakhand',
    state: 'Uttarakhand',
    name: 'Uttarakhand Board',
    code: 'UBSE',
    tag: 'High School & Intermediate',
    fullName: 'Uttarakhand Board of School Education, Ramnagar',
    region: 'North',
  },
  {
    id: 'himachal_pradesh',
    state: 'Himachal Pradesh',
    name: 'Himachal Pradesh Board',
    code: 'HPBOSE',
    tag: 'Matric & 10+2',
    fullName: 'Himachal Pradesh Board of School Education, Dharamshala',
    region: 'North',
  },
  {
    id: 'jammu_kashmir',
    state: 'Jammu & Kashmir',
    name: 'J&K State Board',
    code: 'JKBOSE',
    tag: 'Secondary & Higher Sec',
    fullName: 'Jammu and Kashmir State Board of School Education',
    region: 'North',
  },
  {
    id: 'delhi',
    state: 'Delhi (NCT)',
    name: 'Delhi Board',
    code: 'DBSE',
    tag: 'Secondary & Sr. Sec',
    fullName: 'Delhi Board of School Education, Government of NCT of Delhi',
    region: 'North',
  },
  // ── West & South India ──
  {
    id: 'goa',
    state: 'Goa',
    name: 'Goa Board',
    code: 'GBSHSE',
    tag: 'SSC & HSSC',
    fullName: 'Goa Board of Secondary and Higher Secondary Education, Porvorim',
    region: 'West',
  },
  // ── North-East India ──
  {
    id: 'assam',
    state: 'Assam',
    name: 'Assam State Board',
    code: 'SEBA / AHSEC',
    tag: 'HSLC & HS (10+2)',
    fullName: 'Secondary Education Board of Assam & Higher Secondary Education Council',
    region: 'North-East',
  },
  {
    id: 'tripura',
    state: 'Tripura',
    name: 'Tripura Board',
    code: 'TBSE',
    tag: 'Madhyamik & Higher Sec',
    fullName: 'Tripura Board of Secondary Education, Agartala',
    region: 'North-East',
  },
  {
    id: 'manipur',
    state: 'Manipur',
    name: 'Manipur Board',
    code: 'BSEM / COHSEM',
    tag: 'HSLC & HSE',
    fullName: 'Board of Secondary Education & Higher Secondary Council Manipur',
    region: 'North-East',
  },
  {
    id: 'meghalaya',
    state: 'Meghalaya',
    name: 'Meghalaya Board',
    code: 'MBOSE',
    tag: 'SSLC & HSSLC',
    fullName: 'Meghalaya Board of School Education, Tura',
    region: 'North-East',
  },
  {
    id: 'mizoram',
    state: 'Mizoram',
    name: 'Mizoram Board',
    code: 'MBSE',
    tag: 'HSLC & HSSLC',
    fullName: 'Mizoram Board of School Education, Aizawl',
    region: 'North-East',
  },
  {
    id: 'nagaland',
    state: 'Nagaland',
    name: 'Nagaland Board',
    code: 'NBSE',
    tag: 'HSLC & HSSLC',
    fullName: 'Nagaland Board of School Education, Kohima',
    region: 'North-East',
  },
  {
    id: 'sikkim',
    state: 'Sikkim',
    name: 'Sikkim State Board',
    code: 'SBSE',
    tag: 'State Curriculum',
    fullName: 'Directorate of School Education, Government of Sikkim',
    region: 'North-East',
  },
  {
    id: 'arunachal_pradesh',
    state: 'Arunachal Pradesh',
    name: 'Arunachal Pradesh Board',
    code: 'APBSE',
    tag: 'Secondary Education',
    fullName: 'Department of School Education, Government of Arunachal Pradesh',
    region: 'North-East',
  },
  {
    id: 'other_state',
    state: 'Other Indian States',
    name: 'General State Board',
    code: 'State Board',
    tag: 'State Curriculum',
    fullName: 'State Government Secondary & Higher Secondary Education',
    region: 'All',
  },
];

interface CurriculumPickerModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSelectCurriculum: (result: SelectedCurriculumResult) => void;
  availableCourses?: any[];
  initialCategory?: 'School Exams' | 'Competitive Exams' | null;
  inline?: boolean;
  isSubmitting?: boolean;
}

// Pre-defined Board options for School (Vibrant Light Mode Tokens)
const SCHOOL_BOARDS = [
  {
    id: 'CBSE',
    name: 'CBSE',
    fullName: 'Central Board of Secondary Education',
    icon: Building2,
    badge: 'NCERT Aligned',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'ICSE',
    name: 'ICSE / ISC',
    fullName: 'Council for the Indian School Certificate',
    icon: Award,
    badge: 'CISCE Syllabus',
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'State Board',
    name: 'State Board',
    fullName: 'State Government Secondary Education (All 28 Indian States & UTs)',
    icon: GraduationCap,
    badge: '28 States & UTs',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    badgeColor: 'bg-emerald-100 text-emerald-800',
  },
  {
    id: 'IB / Cambridge',
    name: 'IB / Cambridge',
    fullName: 'International Baccalaureate & IGCSE',
    icon: Globe,
    badge: 'Global Curriculum',
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    badgeColor: 'bg-purple-100 text-purple-800',
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
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-800',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
  },
  {
    id: 'NEET',
    name: 'NEET UG',
    shortName: 'NEET',
    badge: 'Medical Entrance',
    desc: 'Biology (Botany & Zoology), Physics & Chemistry',
    icon: Flame,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    subjects: ['Biology', 'Physics', 'Chemistry'],
  },
  {
    id: 'Foundation',
    name: 'Foundation & Olympiads',
    shortName: 'Foundation',
    badge: 'Class 8-10 Talent',
    desc: 'NTSE, Science & Math Olympiads, Pre-JEE/NEET skills',
    icon: Trophy,
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    badgeColor: 'bg-amber-100 text-amber-800',
    subjects: ['Science', 'Mathematics', 'Mental Ability'],
  },
  {
    id: 'CUET',
    name: 'CUET UG',
    shortName: 'CUET',
    badge: 'Central Universities',
    desc: 'Domain Subjects & General Aptitude Test',
    icon: Building2,
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    badgeColor: 'bg-purple-100 text-purple-800',
    subjects: ['General Test', 'Domain Subjects', 'English'],
  },
  {
    id: 'NDA',
    name: 'NDA & Defence Exams',
    shortName: 'NDA',
    badge: 'National Defence',
    desc: 'Mathematics, General Ability Test & English',
    icon: Target,
    color: 'bg-rose-50 text-rose-600 border-rose-200',
    badgeColor: 'bg-rose-100 text-rose-800',
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
  isOpen = true,
  onClose,
  onSelectCurriculum,
  availableCourses = [],
  initialCategory,
  inline = false,
  isSubmitting = false,
}) => {
  // Wizard Steps:
  // 1 = School or Competitive
  // 2 = Board (if School) OR Exam Name (if Competitive)
  // 3 = Class (if School) OR Target Year (if Competitive)
  // 4 = Confirmation & Preview
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Selections
  const [category, setCategory] = useState<'School Exams' | 'Competitive Exams' | null>(initialCategory || null);
  const [selectedBoard, setSelectedBoard] = useState<string>('CBSE');
  const [selectedStateBoard, setSelectedStateBoard] = useState<StateBoardOption | null>(null);
  const [isPickingStateBoard, setIsPickingStateBoard] = useState<boolean>(false);
  const [stateBoardSearch, setStateBoardSearch] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedClass, setSelectedClass] = useState<string>('10');
  const [selectedExam, setSelectedExam] = useState<string>('JEE');
  const [selectedYear, setSelectedYear] = useState<string>('2027');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIsPickingStateBoard(false);
      setStateBoardSearch('');
      setSelectedRegion('All');
      if (initialCategory) setCategory(initialCategory);
    }
  }, [isOpen, initialCategory]);

  const handleSelectCategory = (cat: 'School Exams' | 'Competitive Exams') => {
    setCategory(cat);
    setStep(2);
  };

  const handleBack = () => {
    if (step === 4) {
      setStep(3);
    } else if (step === 3) {
      if (selectedStateBoard) {
        setIsPickingStateBoard(true);
      }
      setStep(2);
    } else if (step === 2) {
      if (isPickingStateBoard) {
        setIsPickingStateBoard(false);
      } else {
        setStep(1);
      }
    }
  };

  // Filtered State Boards based on search query and region chip
  const filteredStateBoards = useMemo(() => {
    const q = stateBoardSearch.trim().toLowerCase();
    return INDIAN_STATE_BOARDS.filter((sb) => {
      // Region filter
      if (selectedRegion === 'Popular' && !sb.isPopular) return false;
      if (selectedRegion !== 'All' && selectedRegion !== 'Popular' && sb.region !== selectedRegion) return false;

      // Text search
      if (!q) return true;
      return (
        sb.state.toLowerCase().includes(q) ||
        sb.name.toLowerCase().includes(q) ||
        sb.code.toLowerCase().includes(q) ||
        sb.tag.toLowerCase().includes(q) ||
        sb.fullName.toLowerCase().includes(q)
      );
    });
  }, [stateBoardSearch, selectedRegion]);

  // Find or resolve best matching course from existing courses
  const resolvedCourseInfo = useMemo(() => {
    if (!category) return null;

    if (category === 'School Exams') {
      const boardLabel = selectedStateBoard ? selectedStateBoard.name : selectedBoard;
      const boardForCourse = selectedStateBoard
        ? `${selectedStateBoard.name} (${selectedStateBoard.code})`
        : selectedBoard;
      const generatedName = `Class ${selectedClass} ${boardLabel} Exam`;
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

        const searchTerms = [
          selectedBoard.toLowerCase(),
          boardLabel.toLowerCase(),
          selectedStateBoard?.code?.toLowerCase() || '',
          selectedStateBoard?.state?.toLowerCase() || '',
        ].filter(Boolean);

        const boardMatch = searchTerms.some((t) => cBoard.includes(t) || cName.includes(t));

        return gradeMatch && (boardMatch || cName.includes(selectedClass));
      });

      if (match) {
        return {
          courseId: String(match._id || match.id),
          courseName: match.name,
          category: 'School Exams' as const,
          board: match.board || boardForCourse,
          state: selectedStateBoard?.state,
          stateCode: selectedStateBoard?.code,
          classGrade: `Class ${selectedClass}`,
          subjects: Array.isArray(match.subjects) && match.subjects.length > 0 ? match.subjects : fallbackSubjects,
          isNewCourse: false,
        };
      }

      const idSlug = (selectedStateBoard ? selectedStateBoard.id : selectedBoard)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      return {
        courseId: `course_school_${idSlug}_class_${selectedClass}`,
        courseName: generatedName,
        category: 'School Exams' as const,
        board: boardForCourse,
        state: selectedStateBoard?.state,
        stateCode: selectedStateBoard?.code,
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
    if (onClose) onClose();
  };

  // Progress percentage for step indicator
  const progressPercent = step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : 100;

  if (!isOpen && !inline) return null;

  const cardContent = (
    <div className={`bg-white border-2 border-slate-200/90 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-2xl relative text-slate-900 flex flex-col ${inline ? 'my-3 border-slate-200' : 'max-h-[92vh] overflow-hidden'}`}>
      {/* Top Duolingo-Style Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4 overflow-hidden relative border border-slate-200/50">
        <div
          className="bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Modal Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5">
          {step > 1 || isPickingStateBoard ? (
            <button
              type="button"
              onClick={handleBack}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              title="Back to previous step"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-xs">
              <Target className="w-4 h-4" />
            </div>
          )}

          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">
              Step {step} of 4 • Curriculum Setup
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {step === 1 && 'What is your study goal? 🎯'}
              {step === 2 && category === 'School Exams' && (isPickingStateBoard ? 'Select Your State Board 🏛️' : 'Which Board do you follow? 🏛️')}
              {step === 2 && category === 'Competitive Exams' && 'Which Exam are you targeting? ⚡'}
              {step === 3 && category === 'School Exams' && 'Which Class are you in? 🎒'}
              {step === 3 && category === 'Competitive Exams' && 'What is your Target Year? 🗓️'}
              {step === 4 && "You're Ready to Learn! 🚀"}
            </h3>
          </div>
        </div>

        {!inline && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Modal Scrollable Body */}
      <div className="py-4 overflow-y-auto flex-1 pr-1 space-y-4">
        {/* ══════ STEP 1: School or Competitive ══════ */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Choose the academic track for your account. We will customize your topic tests, daily practice papers (DPPs), syllabus progress, and leaderboard benchmarks.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* 1. School Exams Card */}
              <button
                type="button"
                onClick={() => handleSelectCategory('School Exams')}
                className="group relative p-5 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all text-left flex flex-col justify-between cursor-pointer active:translate-y-0.5"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center text-2xl shadow-xs group-hover:scale-110 transition-transform">
                    🏫
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider">
                      Class 6 to 12
                    </span>
                    <h4 className="text-base font-black text-slate-900 mt-1.5 group-hover:text-emerald-700 transition-colors">
                      School / Board Exams
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      CBSE, ICSE &amp; State Boards. NCERT exercises, chapter-wise practice tests &amp; school exam milestones.
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                  <span>Select School Track</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* 2. Competitive Exams Card */}
              <button
                type="button"
                onClick={() => handleSelectCategory('Competitive Exams')}
                className="group relative p-5 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all text-left flex flex-col justify-between cursor-pointer active:translate-y-0.5"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center text-2xl shadow-xs group-hover:scale-110 transition-transform">
                    🚀
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-extrabold text-[10px] uppercase tracking-wider">
                      Entrance &amp; Ranks
                    </span>
                    <h4 className="text-base font-black text-slate-900 mt-1.5 group-hover:text-indigo-700 transition-colors">
                      Competitive Exams
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      JEE Main, NEET UG, Foundation Olympiads, CUET &amp; Defence. High-speed full mock tests with negative marking.
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-700">
                  <span>Select Entrance Track</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ══════ STEP 2 (School): Pick Board (Main 4 Boards) ══════ */}
        {step === 2 && category === 'School Exams' && !isPickingStateBoard && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <p className="text-xs text-slate-600 font-medium">
              Select your education board to align curriculum chapters, marking scheme, and board questions:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {SCHOOL_BOARDS.map((b) => {
                const Icon = b.icon;
                const isSelected = selectedBoard === b.id || (b.id === 'State Board' && selectedStateBoard !== null);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      if (b.id === 'State Board') {
                        setIsPickingStateBoard(true);
                      } else {
                        setSelectedStateBoard(null);
                        setSelectedBoard(b.id);
                        setStep(3);
                      }
                    }}
                    className={`p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer active:translate-y-0.5 relative group ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/80 shadow-xs'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${b.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-extrabold text-sm text-slate-900">{b.name}</h4>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${b.badgeColor}`}>
                          {b.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">{b.fullName}</p>
                      {b.id === 'State Board' && selectedStateBoard && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3 text-emerald-700" />
                          <span>Selected: {selectedStateBoard.state} ({selectedStateBoard.code})</span>
                        </div>
                      )}
                    </div>
                    {b.id === 'State Board' && (
                      <div className="self-center text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════ STEP 2 (School): Pick State Board (Nested Selection View) ══════ */}
        {step === 2 && category === 'School Exams' && isPickingStateBoard && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                  Indian State Curriculum
                </span>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Select Your State Board 🏛️
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsPickingStateBoard(false)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-blue-50 transition-colors border border-blue-200 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> All Boards
              </button>
            </div>

            {/* Sticky Search & Region Filters */}
            <div className="space-y-2 sticky top-0 bg-white z-10 pt-1 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={stateBoardSearch}
                  onChange={(e) => setStateBoardSearch(e.target.value)}
                  placeholder="Search state or board (e.g. Maharashtra, UP, Bihar, Tamil Nadu)..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                />
                {stateBoardSearch && (
                  <button
                    type="button"
                    onClick={() => setStateBoardSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Region Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                {['All', 'Popular', 'North', 'South', 'East', 'West', 'Central', 'North-East'].map((reg) => (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => setSelectedRegion(reg)}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                      selectedRegion === reg
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {reg}
                  </button>
                ))}
              </div>
            </div>

            {/* State Boards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[44vh] overflow-y-auto pr-1">
              {filteredStateBoards.length === 0 ? (
                <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                  No state board matches "{stateBoardSearch}". Try searching by state name or board acronym.
                </div>
              ) : (
                filteredStateBoards.map((sb) => {
                  const isSelected = selectedStateBoard?.id === sb.id;
                  return (
                    <button
                      key={sb.id}
                      type="button"
                      onClick={() => {
                        setSelectedStateBoard(sb);
                        setSelectedBoard(`${sb.name} (${sb.code})`);
                        setStep(3);
                      }}
                      className={`p-3 rounded-2xl border-2 text-left flex items-start gap-2.5 transition-all cursor-pointer active:translate-y-0.5 relative group ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/30 shadow-xs'
                      }`}
                    >
                      {/* State Code Badge */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 border border-emerald-200 text-emerald-800 flex flex-col items-center justify-center shrink-0 font-black text-xs shadow-xs group-hover:scale-105 transition-transform">
                        <span>{sb.code.slice(0, 4)}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                            {sb.state}
                          </h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                            {sb.tag}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-700 mt-0.5 truncate">
                          {sb.name}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-snug line-clamp-1 mt-0.5">
                          {sb.fullName}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 self-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ══════ STEP 3 (School): Pick Class / Grade ══════ */}
        {step === 3 && category === 'School Exams' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <p className="text-xs text-slate-600 font-medium">
              Board selected:{' '}
              <strong className="text-blue-600 font-extrabold">
                {selectedStateBoard ? `${selectedStateBoard.name} (${selectedStateBoard.code})` : selectedBoard}
              </strong>
              . Now pick your grade level:
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
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-md ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/30 shadow-xs'
                    }`}
                  >
                    {cl.isBoard && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[8px] font-black uppercase">
                        Board
                      </span>
                    )}
                    <span className="text-2xl">{cl.icon}</span>
                    <h4 className="font-black text-sm text-slate-900">{cl.label}</h4>
                    <span className="text-[10px] text-slate-500 font-semibold">{cl.tag}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════ STEP 2 (Competitive): Pick Exam Name ══════ */}
        {step === 2 && category === 'Competitive Exams' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <p className="text-xs text-slate-600 font-medium">
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
                        ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50 shadow-xs'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${ex.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-extrabold text-sm text-slate-900">{ex.name}</h4>
                      </div>
                      <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded ${ex.badgeColor}`}>
                        {ex.badge}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">{ex.desc}</p>
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
            <p className="text-xs text-slate-600 font-medium">
              Exam chosen: <strong className="text-blue-600 font-extrabold">{COMPETITIVE_EXAMS.find((e) => e.id === selectedExam)?.name}</strong>. Now pick your target exam year:
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
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-md ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50 shadow-xs'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-black text-sm shrink-0">
                      {ty.year.slice(-2)}'
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-base text-slate-900">{ty.year}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                          {ty.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{ty.desc}</p>
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
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-3xl mx-auto shadow-xl shadow-emerald-500/25 animate-bounce">
              🎉
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-black text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Perfect Curriculum Match
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                {resolvedCourseInfo.courseName}
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                Your question banks, full mock exams, DPPs, and benchmark leaderboards will be locked to this syllabus.
              </p>
            </div>

            {/* Course Detail Card */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-left space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Preparation Track</span>
                  <span className="font-extrabold text-slate-900 text-xs block mt-0.5">
                    {resolvedCourseInfo.category === 'School Exams' ? '🏫 School / Board' : '🚀 Competitive Entrance'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                    {resolvedCourseInfo.category === 'School Exams' ? 'Board & Class' : 'Exam & Year'}
                  </span>
                  <span className="font-extrabold text-slate-900 text-xs block mt-0.5">
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
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
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
      <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between shrink-0">
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        ) : (
          <div>
            {!inline && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">Select an option above</span>
            )}
          </div>
        )}

        {step === 4 ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmTrack}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Locking Curriculum Track...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Lock Curriculum Track &amp; Start Learning 🚀
              </>
            )}
          </button>
        ) : (
          <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            Tap a card above to continue →
          </div>
        )}
      </div>
    </div>
  );

  if (inline) {
    return <div className="w-full flex justify-center">{cardContent}</div>;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-[80] animate-in fade-in duration-200">
      {cardContent}
    </div>
  );
};
