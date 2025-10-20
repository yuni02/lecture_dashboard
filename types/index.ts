export interface Lecture {
  lecture_id?: number;
  course_id?: number;
  section_number?: number;
  section_title: string;
  chapter_number?: number;
  chapter_title?: string;
  lecture_number?: number;
  lecture_title: string;
  lecture_time: number;
  is_completed: boolean;
  sort_order?: number;
}

export interface Course {
  course_id: number;
  course_title: string;
  url: string;
  created_at: string;
  updated_at: string;
  is_manually_completed: boolean;
  is_visible_on_dashboard?: boolean;
  lectures?: Lecture[];
  total_lecture_time: number;
  study_time: number;
  remaining_time: number;
  progress_rate: number;
}

export interface TargetCourse extends Course {
  target_start_date: string;
  target_completion_date: string;
  target_daily_minutes: number;
  target_set_at: string;
}

export interface SummaryStats {
  total_courses: number;
  avg_progress: number;
  total_study_time: number;
  total_lecture_time: number;
  remaining_time: number;
}

export interface CompletionEstimate {
  remaining_minutes: number;
  days_needed_3h: number;
  days_1h_per_day: number;
  days_2h_per_day: number;
  days_3h_per_day: number;
  days_5h_per_day: number;
}

export interface DailyProgress {
  date: string;
  completed_lectures: number;
  study_time_minutes: number;
}

export interface WeeklyProgress {
  year_week: number;
  week_start: string;
  completed_lectures: number;
  study_time_minutes: number;
}

export interface CourseProgressHistory {
  date: string;
  completed_lectures: number;
  study_time_minutes: number;
  cumulative_completed: number;
}
