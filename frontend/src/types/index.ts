export interface FightType {
  id: number;
  name: string;
  description: string;
}

export interface WeightClass {
  id: number;
  name: string;
  min_weight: number;
  max_weight: number;
}

export interface TrainingGoal {
  id: number;
  name: string;
  description: string;
}

export interface Member {
  id: number;
  name: string;
  phone: string;
  email: string;
  age: number;
  gender: string;
  weight: number;
  height?: number;
  fight_types: FightType[];
  fight_type_ids?: number[];
  weight_class?: WeightClass;
  weight_class_id?: number;
  training_goals: TrainingGoal[];
  training_goal_ids?: number[];
  skill_level: string;
  skill_score: number;
  available_times: string[];
  join_date: string;
  is_active: boolean;
  avatar?: string;
  notes: string;
}

export interface Coach {
  id: number;
  name: string;
  phone: string;
  email: string;
  specialty: FightType[];
  specialty_ids?: number[];
  experience_years: number;
  certification: string;
  avatar?: string;
}

export interface TrainingPlan {
  id: number;
  member: Member;
  member_id: number;
  coach?: Coach;
  coach_id?: number;
  name: string;
  description: string;
  fight_type: FightType;
  fight_type_id: number;
  start_date: string;
  end_date: string;
  total_sessions: number;
  sessions_per_week: number;
  goals: string;
  is_active: boolean;
  created_at: string;
  completed_sessions: number;
}

export interface TrainingSession {
  id: number;
  training_plan?: TrainingPlan;
  training_plan_id?: number;
  member: Member;
  member_id: number;
  coach?: Coach;
  coach_id?: number;
  fight_type: FightType;
  fight_type_id: number;
  session_date: string;
  duration_minutes: number;
  status: string;
  content: string;
  performance_notes: string;
  techniques_practiced: string[];
  attendance: boolean;
  fitness_data?: FitnessData;
}

export interface FitnessData {
  id: number;
  training_session: number;
  heart_rate_avg?: number;
  heart_rate_max?: number;
  calories_burned?: number;
  weight?: number;
  body_fat?: number;
  flexibility_score?: number;
  strength_score?: number;
  endurance_score?: number;
  notes: string;
}

export interface SkillProgression {
  id: number;
  member: Member;
  member_id: number;
  fight_type: FightType;
  fight_type_id: number;
  technique: string;
  mastery_level: number;
  date_recorded: string;
  coach_notes: string;
}

export interface SparringMatch {
  id: number;
  member1: Member;
  member1_id: number;
  member2?: Member;
  member2_id?: number;
  fight_type: FightType;
  fight_type_id: number;
  weight_class: WeightClass;
  weight_class_id: number;
  scheduled_date: string;
  duration_minutes: number;
  status: string;
  result?: string;
  winner?: Member;
  loser?: Member;
  match_notes: string;
  member1_score?: number;
  member2_score?: number;
  techniques_used: string[];
  match_score: number;
}

export interface MatchRequest {
  id: number;
  member: Member;
  member_id: number;
  fight_type: FightType;
  fight_type_id: number;
  preferred_date: string;
  weight_range_min: number;
  weight_range_max: number;
  skill_level_preference?: string;
  status: string;
  created_at: string;
  potential_matches?: Member[];
}

export interface MatchScore {
  member: Member;
  match_score: number;
}

export interface FightTypeActivity {
  id: number;
  name: string;
  member_count: number;
  session_count: number;
  match_count: number;
  total_activity: number;
}

export interface SkillProgress {
  member_id: number;
  member_name: string;
  techniques: {
    technique: string;
    records: { date: string; mastery: number }[];
    improvement: number;
  }[];
}

export interface MatchingStats {
  period_days: number;
  total_requests: number;
  matched_requests: number;
  success_rate: number;
  completed_matches: number;
  scheduled_matches: number;
  completion_rate: number;
  average_match_score: number;
}

export interface TrainingFrequency {
  period_days: number;
  daily_distribution: { date: string; count: number }[];
  weekday_distribution: { day: string; count: number }[];
  hour_distribution: { hour: number; count: number }[];
  top_members: { member_id: number; member__name: string; count: number }[];
  total_sessions: number;
}

export interface OverviewStats {
  total_members: number;
  total_coaches: number;
  total_plans: number;
  total_matches: number;
  total_sessions: number;
}
