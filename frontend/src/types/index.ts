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

export interface InjuryFatigueRecord {
  id: number;
  member: Member;
  member_id: number;
  reported_by?: Coach;
  reported_by_id?: number;
  type: 'injury' | 'fatigue' | 'rest';
  severity: 'mild' | 'moderate' | 'severe';
  status: 'active' | 'recovered' | 'chronic';
  description: string;
  affected_body_part: string;
  onset_date: string;
  expected_recovery_date?: string;
  actual_recovery_date?: string;
  training_restriction_days: number;
  no_sparring_days: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MatchingWeightConfig {
  id: number;
  name: string;
  is_active: boolean;
  weight_similarity_weight: number;
  skill_similarity_weight: number;
  time_compatibility_weight: number;
  fight_type_match_weight: number;
  recent_match_avoidance_weight: number;
  load_risk_penalty_weight: number;
  injury_risk_penalty_weight: number;
  max_allowed_weight_diff: number;
  max_allowed_skill_diff: number;
  max_allowed_risk_score: number;
  min_recent_match_interval_days: number;
  auto_block_high_risk: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingPlanGoal {
  id: number;
  training_plan: TrainingPlan;
  training_plan_id: number;
  period_type: string;
  target_load_per_week: number;
  max_load_per_week: number;
  max_sessions_per_week: number;
  max_consecutive_training_days: number;
  min_rest_days_per_week: number;
  target_intensity: string;
  max_intensity: string;
  allow_sparring: boolean;
  max_sparring_per_week: number;
  weight_gain_goal?: number;
  weight_loss_goal?: number;
  skill_improvement_goals: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingLoadAssessment {
  id: number;
  member: Member;
  member_id: number;
  assessment_date: string;
  training_load_index: number;
  load_level: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  recovery_status: 'exhausted' | 'fatigued' | 'normal' | 'recovered' | 'fresh';
  recovery_score: number;
  acute_load: number;
  chronic_load: number;
  acwr: number;
  fatigue_score: number;
  injury_risk_score: number;
  available_training_minutes: number;
  recommended_intensity: string;
  data_sources: Record<string, any>;
  calculation_details: Record<string, any>;
  notes: string;
  created_at: string;
}

export interface MatchRiskAssessment {
  id: number;
  member1: Member;
  member1_id: number;
  member2: Member;
  member2_id: number;
  fight_type: FightType;
  fight_type_id: number;
  assessment_date: string;
  risk_level: 'safe' | 'low' | 'moderate' | 'high' | 'dangerous';
  risk_score: number;
  weight_diff_score: number;
  skill_diff_score: number;
  fatigue_risk_score: number;
  injury_risk_score: number;
  recent_match_penalty: number;
  risk_factors: string[];
  recommendations: string[];
  is_blocked: boolean;
  block_reason: string;
}

export interface ScoreBreakdownItem {
  raw_score: number;
  weight: number;
  weighted_score: number;
  penalty_amount?: number;
  details?: Record<string, any>;
  risk_factors?: string[];
}

export interface MatchScoreDetails {
  total_score: number;
  base_score: number;
  penalties: number;
  is_blocked: boolean;
  block_reason: string;
  risk_level: string;
  risk_score: number;
  score_breakdown: {
    weight_similarity: ScoreBreakdownItem;
    skill_similarity: ScoreBreakdownItem;
    time_compatibility: ScoreBreakdownItem;
    fight_type_match: ScoreBreakdownItem;
    recent_match_avoidance: ScoreBreakdownItem;
    load_risk_penalty: ScoreBreakdownItem;
    injury_risk_penalty: ScoreBreakdownItem;
  };
  risk_assessment: MatchRiskAssessment;
  member1_load: TrainingLoadAssessment;
  member2_load: TrainingLoadAssessment;
}

export interface MatchScore {
  member: Member;
  match_score: number;
  score_details?: MatchScoreDetails;
}

export interface LoadTrendItem {
  date: string;
  tli: number;
  recovery_score: number;
  fatigue_score: number;
  injury_risk: number;
  acwr: number;
  load_level: string;
  recovery_status: string;
}

export interface MemberLoadSummary {
  current_load: TrainingLoadAssessment;
  trend: LoadTrendItem[];
  weekly_summary: {
    sessions_completed: number;
    matches_completed: number;
  };
}
