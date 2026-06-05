import axios from 'axios';
import type {
  FightType, WeightClass, TrainingGoal, Member, Coach,
  TrainingPlan, TrainingSession, FitnessData, SkillProgression,
  SparringMatch, MatchRequest, MatchScore,
  FightTypeActivity, SkillProgress, MatchingStats, TrainingFrequency, OverviewStats,
  InjuryFatigueRecord, MatchingWeightConfig, TrainingPlanGoal,
  TrainingLoadAssessment, MatchRiskAssessment, MemberLoadSummary
} from '../types';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fightTypeApi = {
  getAll: () => api.get<FightType[]>('/fight-types/'),
  get: (id: number) => api.get<FightType>(`/fight-types/${id}/`),
  create: (data: Partial<FightType>) => api.post<FightType>('/fight-types/', data),
  update: (id: number, data: Partial<FightType>) => api.put<FightType>(`/fight-types/${id}/`, data),
  delete: (id: number) => api.delete(`/fight-types/${id}/`),
};

export const weightClassApi = {
  getAll: () => api.get<WeightClass[]>('/weight-classes/'),
  get: (id: number) => api.get<WeightClass>(`/weight-classes/${id}/`),
  create: (data: Partial<WeightClass>) => api.post<WeightClass>('/weight-classes/', data),
  update: (id: number, data: Partial<WeightClass>) => api.put<WeightClass>(`/weight-classes/${id}/`, data),
  delete: (id: number) => api.delete(`/weight-classes/${id}/`),
};

export const trainingGoalApi = {
  getAll: () => api.get<TrainingGoal[]>('/training-goals/'),
  get: (id: number) => api.get<TrainingGoal>(`/training-goals/${id}/`),
  create: (data: Partial<TrainingGoal>) => api.post<TrainingGoal>('/training-goals/', data),
  update: (id: number, data: Partial<TrainingGoal>) => api.put<TrainingGoal>(`/training-goals/${id}/`, data),
  delete: (id: number) => api.delete(`/training-goals/${id}/`),
};

export const memberApi = {
  getAll: (params?: { fight_type?: number; skill_level?: string; is_active?: boolean }) =>
    api.get<{ results: Member[]; count: number }>('/members/', { params }),
  get: (id: number) => api.get<Member>(`/members/${id}/`),
  create: (data: Partial<Member>) => api.post<Member>('/members/', data),
  update: (id: number, data: Partial<Member>) => api.put<Member>(`/members/${id}/`, data),
  delete: (id: number) => api.delete(`/members/${id}/`),
  getPotentialPartners: (id: number, fightTypeId: number) =>
    api.get<MatchScore[]>(`/members/${id}/potential_partners/?fight_type=${fightTypeId}`),
};

export const coachApi = {
  getAll: () => api.get<Coach[]>('/coaches/'),
  get: (id: number) => api.get<Coach>(`/coaches/${id}/`),
  create: (data: Partial<Coach>) => api.post<Coach>('/coaches/', data),
  update: (id: number, data: Partial<Coach>) => api.put<Coach>(`/coaches/${id}/`, data),
  delete: (id: number) => api.delete(`/coaches/${id}/`),
};

export const trainingPlanApi = {
  getAll: (params?: { member?: number; coach?: number; is_active?: boolean }) =>
    api.get<{ results: TrainingPlan[]; count: number }>('/training-plans/', { params }),
  get: (id: number) => api.get<TrainingPlan>(`/training-plans/${id}/`),
  create: (data: Partial<TrainingPlan>) => api.post<TrainingPlan>('/training-plans/', data),
  update: (id: number, data: Partial<TrainingPlan>) => api.put<TrainingPlan>(`/training-plans/${id}/`, data),
  delete: (id: number) => api.delete(`/training-plans/${id}/`),
  generateSessions: (id: number) =>
    api.post(`/training-plans/${id}/generate_sessions/`),
};

export const trainingSessionApi = {
  getAll: (params?: { member?: number; coach?: number; plan?: number; status?: string }) =>
    api.get<{ results: TrainingSession[]; count: number }>('/training-sessions/', { params }),
  get: (id: number) => api.get<TrainingSession>(`/training-sessions/${id}/`),
  create: (data: Partial<TrainingSession>) => api.post<TrainingSession>('/training-sessions/', data),
  update: (id: number, data: Partial<TrainingSession>) => api.put<TrainingSession>(`/training-sessions/${id}/`, data),
  delete: (id: number) => api.delete(`/training-sessions/${id}/`),
  recordFitness: (id: number, data: Partial<FitnessData>) =>
    api.post<FitnessData>(`/training-sessions/${id}/record_fitness/`, data),
  complete: (id: number, data: { attendance?: boolean; content?: string; performance_notes?: string; techniques_practiced?: string[] }) =>
    api.post<TrainingSession>(`/training-sessions/${id}/complete/`, data),
};

export const fitnessDataApi = {
  getAll: () => api.get<FitnessData[]>('/fitness-data/'),
  get: (id: number) => api.get<FitnessData>(`/fitness-data/${id}/`),
  create: (data: Partial<FitnessData>) => api.post<FitnessData>('/fitness-data/', data),
  update: (id: number, data: Partial<FitnessData>) => api.put<FitnessData>(`/fitness-data/${id}/`, data),
  delete: (id: number) => api.delete(`/fitness-data/${id}/`),
};

export const skillProgressionApi = {
  getAll: (params?: { member?: number; fight_type?: number }) =>
    api.get<{ results: SkillProgression[]; count: number }>('/skill-progressions/', { params }),
  get: (id: number) => api.get<SkillProgression>(`/skill-progressions/${id}/`),
  create: (data: Partial<SkillProgression>) => api.post<SkillProgression>('/skill-progressions/', data),
  update: (id: number, data: Partial<SkillProgression>) => api.put<SkillProgression>(`/skill-progressions/${id}/`, data),
  delete: (id: number) => api.delete(`/skill-progressions/${id}/`),
};

export const sparringMatchApi = {
  getAll: (params?: { member?: number; fight_type?: number; status?: string }) =>
    api.get<{ results: SparringMatch[]; count: number }>('/sparring-matches/', { params }),
  get: (id: number) => api.get<SparringMatch>(`/sparring-matches/${id}/`),
  create: (data: Partial<SparringMatch>) => api.post<SparringMatch>('/sparring-matches/', data),
  update: (id: number, data: Partial<SparringMatch>) => api.put<SparringMatch>(`/sparring-matches/${id}/`, data),
  delete: (id: number) => api.delete(`/sparring-matches/${id}/`),
  recordResult: (id: number, data: {
    result: string;
    member1_score: number;
    member2_score: number;
    match_notes?: string;
    techniques_used?: string[];
  }) => api.post<SparringMatch>(`/sparring-matches/${id}/record_result/`, data),
};

export const matchRequestApi = {
  getAll: (params?: { member?: number; status?: string; fight_type?: number }) =>
    api.get<{ results: MatchRequest[]; count: number }>('/match-requests/', { params }),
  get: (id: number) => api.get<MatchRequest>(`/match-requests/${id}/`),
  create: (data: Partial<MatchRequest>) => api.post<MatchRequest>('/match-requests/', data),
  update: (id: number, data: Partial<MatchRequest>) => api.put<MatchRequest>(`/match-requests/${id}/`, data),
  delete: (id: number) => api.delete(`/match-requests/${id}/`),
  getPartners: (id: number) =>
    api.get<MatchScore[]>(`/match-requests/${id}/partners/`),
  autoMatch: () =>
    api.post<{ matched_count: number; matches: SparringMatch[] }>('/match-requests/auto_match/'),
};

export const statisticsApi = {
  getOverview: () => api.get<OverviewStats>('/statistics/overview/'),
  getFightTypeActivity: () => api.get<FightTypeActivity[]>('/statistics/fight_type_activity/'),
  getSkillProgression: (params?: { member?: number; fight_type?: number }) =>
    api.get<SkillProgress[]>('/statistics/skill_progression/', { params }),
  getMatchingSuccessRate: (days?: number) =>
    api.get<MatchingStats>(`/statistics/matching_success_rate/?days=${days || 30}`),
  getTrainingFrequency: (days?: number) =>
    api.get<TrainingFrequency>(`/statistics/training_frequency/?days=${days || 30}`),
};

export const injuryFatigueRecordApi = {
  getAll: (params?: { member?: number; status?: string; type?: string }) =>
    api.get<{ results: InjuryFatigueRecord[]; count: number }>('/injury-fatigue-records/', { params }),
  get: (id: number) => api.get<InjuryFatigueRecord>(`/injury-fatigue-records/${id}/`),
  create: (data: Partial<InjuryFatigueRecord>) =>
    api.post<InjuryFatigueRecord>('/injury-fatigue-records/', data),
  update: (id: number, data: Partial<InjuryFatigueRecord>) =>
    api.put<InjuryFatigueRecord>(`/injury-fatigue-records/${id}/`, data),
  delete: (id: number) => api.delete(`/injury-fatigue-records/${id}/`),
  markRecovered: (id: number) =>
    api.post<InjuryFatigueRecord>(`/injury-fatigue-records/${id}/mark_recovered/`),
};

export const matchingWeightConfigApi = {
  getAll: () => api.get<MatchingWeightConfig[]>('/matching-weight-configs/'),
  get: (id: number) => api.get<MatchingWeightConfig>(`/matching-weight-configs/${id}/`),
  create: (data: Partial<MatchingWeightConfig>) =>
    api.post<MatchingWeightConfig>('/matching-weight-configs/', data),
  update: (id: number, data: Partial<MatchingWeightConfig>) =>
    api.put<MatchingWeightConfig>(`/matching-weight-configs/${id}/`, data),
  delete: (id: number) => api.delete(`/matching-weight-configs/${id}/`),
  getActive: () => api.get<MatchingWeightConfig>('/matching-weight-configs/active/'),
  setActive: (id: number) =>
    api.post<MatchingWeightConfig>(`/matching-weight-configs/${id}/set_active/`),
};

export const trainingLoadAssessmentApi = {
  getAll: (params?: { member?: number }) =>
    api.get<{ results: TrainingLoadAssessment[]; count: number }>('/training-load-assessments/', { params }),
  get: (id: number) => api.get<TrainingLoadAssessment>(`/training-load-assessments/${id}/`),
  create: (data: Partial<TrainingLoadAssessment>) =>
    api.post<TrainingLoadAssessment>('/training-load-assessments/', data),
  update: (id: number, data: Partial<TrainingLoadAssessment>) =>
    api.put<TrainingLoadAssessment>(`/training-load-assessments/${id}/`, data),
  delete: (id: number) => api.delete(`/training-load-assessments/${id}/`),
  generateAll: () =>
    api.post<{ generated_count: number; assessments: TrainingLoadAssessment[] }>(
      '/training-load-assessments/generate_all/'
    ),
  generateForMember: (memberId: number) =>
    api.post<TrainingLoadAssessment>('/training-load-assessments/generate_for_member/', {
      member_id: memberId,
    }),
};

export const matchRiskAssessmentApi = {
  getAll: (params?: { member?: number }) =>
    api.get<{ results: MatchRiskAssessment[]; count: number }>('/match-risk-assessments/', { params }),
  get: (id: number) => api.get<MatchRiskAssessment>(`/match-risk-assessments/${id}/`),
  create: (data: Partial<MatchRiskAssessment>) =>
    api.post<MatchRiskAssessment>('/match-risk-assessments/', data),
  update: (id: number, data: Partial<MatchRiskAssessment>) =>
    api.put<MatchRiskAssessment>(`/match-risk-assessments/${id}/`, data),
  delete: (id: number) => api.delete(`/match-risk-assessments/${id}/`),
  assess: (data: {
    member1_id: number;
    member2_id: number;
    fight_type_id: number;
    preferred_date?: string;
  }) => api.post<MatchRiskAssessment>('/match-risk-assessments/assess/', data),
};

export const trainingPlanGoalApi = {
  getAll: (params?: { training_plan?: number }) =>
    api.get<TrainingPlanGoal[]>('/training-plan-goals/', { params }),
  get: (id: number) => api.get<TrainingPlanGoal>(`/training-plan-goals/${id}/`),
  create: (data: Partial<TrainingPlanGoal>) =>
    api.post<TrainingPlanGoal>('/training-plan-goals/', data),
  update: (id: number, data: Partial<TrainingPlanGoal>) =>
    api.put<TrainingPlanGoal>(`/training-plan-goals/${id}/`, data),
  delete: (id: number) => api.delete(`/training-plan-goals/${id}/`),
};

export const memberApiExtended = {
  getTrainingLoad: (memberId: number, date?: string) =>
    api.get<TrainingLoadAssessment>(
      `/members/${memberId}/training_load/${date ? `?date=${date}` : ''}`
    ),
  calculateLoad: (memberId: number) =>
    api.post<TrainingLoadAssessment>(`/members/${memberId}/calculate_load/`),
  getLoadTrend: (memberId: number, days?: number) =>
    api.get(`/members/${memberId}/load_trend/?days=${days || 30}`),
  getInjuryFatigueRecords: (memberId: number, status?: string) =>
    api.get<InjuryFatigueRecord[]>(
      `/members/${memberId}/injury_fatigue_records/${status ? `?status=${status}` : ''}`
    ),
  addInjuryFatigue: (memberId: number, data: Partial<InjuryFatigueRecord>) =>
    api.post<InjuryFatigueRecord>(`/members/${memberId}/add_injury_fatigue/`, data),
};

export const trainingPlanApiExtended = {
  getPlanGoals: (planId: number) =>
    api.get<TrainingPlanGoal | null>(`/training-plans/${planId}/plan_goals/`),
  setPlanGoals: (planId: number, data: Partial<TrainingPlanGoal>) =>
    api.post<TrainingPlanGoal>(`/training-plans/${planId}/set_plan_goals/`, data),
  getMemberLoadSummary: (planId: number, days?: number) =>
    api.get<MemberLoadSummary>(
      `/training-plans/${planId}/member_load_summary/?days=${days || 30}`
    ),
};

export const matchRequestApiExtended = {
  assessRisk: (requestId: number, partnerId: number) =>
    api.post<MatchRiskAssessment>(`/match-requests/${requestId}/assess_risk/`, {
      partner_id: partnerId,
    }),
};
