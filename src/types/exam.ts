export interface Category {
  id: number;
  name: string;
}

export interface Question {
  id: number;
  category_id: number;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface ExamData {
  title: string;
  categories: Category[];
  questions: Question[];
}

export type ExamMode = 'study' | 'test';

export interface CategoryScore {
  categoryId: number;
  categoryName: string;
  total: number;
  correct: number;
  rate: number;
}

export interface ExamResult {
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  isPassed: boolean; // 과락(40점 미만) 없이 평균 60점 이상
  hasSubjectFail: boolean; // 40점 미만 과락 과목 존재 여부
  timeSpentSeconds: number;
  categoryScores: CategoryScore[];
}
