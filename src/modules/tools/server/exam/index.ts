/**
 * @file 考试服务层统一导出
 */

export {
  examRowToExam,
  createExam,
  updateExam,
  publishExam,
  endExam,
  deleteExam,
  getExamById,
  listExams,
} from './crud';

export {
  listQuestionsByExam,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from './questions';

export {
  submitAnswer,
  getUserAttempts,
  getExamRanking,
} from './attempts';

export type {
  ExamStatus,
  QuestionType,
  Exam,
  ExamQuestion,
  ExamOption,
  ExamAttempt,
  ExamRanking,
  ExamInput,
  QuestionInput,
  OptionInput,
  AnswerInput,
} from '../../types';