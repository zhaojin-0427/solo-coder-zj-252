from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from datetime import timedelta, date
from collections import defaultdict
from .models import (
    Member, TrainingSession, FitnessData, SkillProgression,
    SparringMatch, InjuryFatigueRecord, TrainingLoadAssessment,
    TrainingPlan, TrainingPlanGoal, MatchingWeightConfig
)


INTENSITY_MULTIPLIERS = {
    'very_light': 0.3,
    'light': 0.5,
    'moderate': 0.75,
    'intense': 1.0,
    'very_intense': 1.3,
}


def get_session_intensity(session):
    if not session.fitness_data:
        return 'moderate', 0.75

    fitness = session.fitness_data
    intensity_score = 0
    factors = 0

    if fitness.heart_rate_avg:
        hr_score = min(fitness.heart_rate_avg / 140, 1.5)
        intensity_score += hr_score
        factors += 1

    if fitness.calories_burned:
        cal_score = min(fitness.calories_burned / 500, 1.5)
        intensity_score += cal_score
        factors += 1

    if fitness.heart_rate_max:
        hr_max_score = min((fitness.heart_rate_max - 100) / 80, 1.5)
        intensity_score += hr_max_score
        factors += 1

    if factors == 0:
        return 'moderate', 0.75

    avg_intensity = intensity_score / factors

    if avg_intensity < 0.4:
        return 'very_light', INTENSITY_MULTIPLIERS['very_light']
    elif avg_intensity < 0.6:
        return 'light', INTENSITY_MULTIPLIERS['light']
    elif avg_intensity < 0.85:
        return 'moderate', INTENSITY_MULTIPLIERS['moderate']
    elif avg_intensity < 1.1:
        return 'intense', INTENSITY_MULTIPLIERS['intense']
    else:
        return 'very_intense', INTENSITY_MULTIPLIERS['very_intense']


def calculate_session_load(session):
    duration = session.duration_minutes or 60
    _, intensity_mult = get_session_intensity(session)

    base_load = duration * intensity_mult

    technique_bonus = 0
    if session.techniques_practiced:
        technique_bonus = len(session.techniques_practiced) * 5

    performance_bonus = 0
    if session.performance_notes and len(session.performance_notes) > 50:
        performance_bonus = 10

    return base_load + technique_bonus + performance_bonus


def calculate_match_load(match, member_id):
    duration = match.duration_minutes or 15
    intensity_mult = INTENSITY_MULTIPLIERS['intense']

    load = duration * intensity_mult

    if match.result:
        if (match.winner_id == member_id):
            load *= 1.2
        elif (match.loser_id == member_id):
            load *= 1.1

    if match.techniques_used:
        load += len(match.techniques_used) * 3

    return load


def calculate_training_load_index(member, assessment_date=None):
    if assessment_date is None:
        assessment_date = timezone.now().date()

    acute_start = assessment_date - timedelta(days=7)
    chronic_start = assessment_date - timedelta(days=28)
    data_sources = {}
    calculation_details = {}

    sessions_7d = TrainingSession.objects.filter(
        member=member,
        session_date__gte=acute_start,
        session_date__lte=assessment_date + timedelta(days=1),
        status='completed'
    ).select_related('fitness_data')

    sessions_28d = TrainingSession.objects.filter(
        member=member,
        session_date__gte=chronic_start,
        session_date__lte=assessment_date + timedelta(days=1),
        status='completed'
    ).select_related('fitness_data')

    matches_7d = SparringMatch.objects.filter(
        Q(member1=member) | Q(member2=member),
        scheduled_date__gte=acute_start,
        scheduled_date__lte=assessment_date + timedelta(days=1),
        status='completed'
    )

    matches_28d = SparringMatch.objects.filter(
        Q(member1=member) | Q(member2=member),
        scheduled_date__gte=chronic_start,
        scheduled_date__lte=assessment_date + timedelta(days=1),
        status='completed'
    )

    acute_session_load = 0
    session_loads_7d = []
    for session in sessions_7d:
        load = calculate_session_load(session)
        acute_session_load += load
        session_loads_7d.append({
            'date': session.session_date.date().isoformat(),
            'load': load,
            'type': 'session',
            'duration': session.duration_minutes
        })

    chronic_session_load = 0
    for session in sessions_28d:
        chronic_session_load += calculate_session_load(session)

    acute_match_load = 0
    match_loads_7d = []
    for match in matches_7d:
        load = calculate_match_load(match, member.id)
        acute_match_load += load
        match_loads_7d.append({
            'date': match.scheduled_date.date().isoformat(),
            'load': load,
            'type': 'match',
            'result': match.result
        })

    chronic_match_load = 0
    for match in matches_28d:
        chronic_match_load += calculate_match_load(match, member.id)

    acute_load = acute_session_load + acute_match_load
    chronic_load = (chronic_session_load + chronic_match_load) / 4

    acwr = acute_load / chronic_load if chronic_load > 0 else 0

    data_sources['sessions_7d'] = sessions_7d.count()
    data_sources['sessions_28d'] = sessions_28d.count()
    data_sources['matches_7d'] = matches_7d.count()
    data_sources['matches_28d'] = matches_28d.count()

    calculation_details['acute_session_load'] = acute_session_load
    calculation_details['chronic_session_load'] = chronic_session_load
    calculation_details['acute_match_load'] = acute_match_load
    calculation_details['chronic_match_load'] = chronic_match_load
    calculation_details['session_loads_7d'] = session_loads_7d
    calculation_details['match_loads_7d'] = match_loads_7d

    active_injuries = InjuryFatigueRecord.objects.filter(
        member=member,
        status='active'
    )

    fatigue_score = calculate_fatigue_score(
        member, assessment_date, sessions_7d, matches_7d, active_injuries
    )

    injury_risk_score = calculate_injury_risk_score(
        member, acwr, active_injuries, sessions_7d.count()
    )

    recovery_score = calculate_recovery_score(
        member, assessment_date, fatigue_score, injury_risk_score, acwr
    )

    training_load_index = acute_load * (1 + fatigue_score / 100)

    load_level = determine_load_level(training_load_index)
    recovery_status = determine_recovery_status(recovery_score)
    recommended_intensity = recommend_intensity(
        load_level, recovery_status, acwr, injury_risk_score
    )

    available_minutes = calculate_available_training_minutes(
        member, recovery_score, training_load_index
    )

    plan_restrictions = get_plan_restrictions(member, assessment_date)
    if plan_restrictions:
        calculation_details['plan_restrictions'] = plan_restrictions

    return {
        'assessment_date': assessment_date,
        'training_load_index': round(training_load_index, 2),
        'load_level': load_level,
        'recovery_status': recovery_status,
        'recovery_score': round(recovery_score, 2),
        'acute_load': round(acute_load, 2),
        'chronic_load': round(chronic_load, 2),
        'acwr': round(acwr, 2),
        'fatigue_score': round(fatigue_score, 2),
        'injury_risk_score': round(injury_risk_score, 2),
        'available_training_minutes': available_minutes,
        'recommended_intensity': recommended_intensity,
        'data_sources': data_sources,
        'calculation_details': calculation_details,
    }


def calculate_fatigue_score(member, assessment_date, sessions_7d, matches_7d, active_injuries):
    score = 0

    session_count = sessions_7d.count()
    if session_count >= 5:
        score += 30
    elif session_count >= 4:
        score += 20
    elif session_count >= 3:
        score += 10

    match_count = matches_7d.count()
    if match_count >= 3:
        score += 35
    elif match_count >= 2:
        score += 20
    elif match_count >= 1:
        score += 10

    today = assessment_date
    consecutive_days = 0
    for i in range(7):
        check_date = today - timedelta(days=i)
        has_activity = TrainingSession.objects.filter(
            member=member,
            session_date__date=check_date,
            status='completed'
        ).exists() or SparringMatch.objects.filter(
            Q(member1=member) | Q(member2=member),
            scheduled_date__date=check_date,
            status='completed'
        ).exists()

        if has_activity:
            consecutive_days += 1
        else:
            break

    if consecutive_days >= 5:
        score += 25
    elif consecutive_days >= 3:
        score += 15

    for injury in active_injuries:
        if injury.type == 'injury':
            if injury.severity == 'severe':
                score += 40
            elif injury.severity == 'moderate':
                score += 25
            else:
                score += 15
        elif injury.type == 'fatigue':
            if injury.severity == 'severe':
                score += 30
            elif injury.severity == 'moderate':
                score += 20
            else:
                score += 10

    fitness_datas = FitnessData.objects.filter(
        training_session__member=member,
        training_session__session_date__gte=assessment_date - timedelta(days=7)
    )

    if fitness_datas.exists():
        avg_hr = fitness_datas.aggregate(avg=Avg('heart_rate_avg'))['avg']
        if avg_hr and avg_hr > 140:
            score += 10

    return min(score, 100)


def calculate_injury_risk_score(member, acwr, active_injuries, session_count_7d):
    score = 0

    if acwr > 1.5:
        score += 30
    elif acwr > 1.2:
        score += 15
    elif acwr < 0.5:
        score += 10

    if session_count_7d >= 6:
        score += 20
    elif session_count_7d >= 5:
        score += 10

    for injury in active_injuries:
        if injury.status == 'active':
            if injury.severity == 'severe':
                score += 50
            elif injury.severity == 'moderate':
                score += 30
            else:
                score += 15

        if injury.training_restriction_days > 0:
            days_since_onset = (timezone.now().date() - injury.onset_date).days
            if days_since_onset < injury.training_restriction_days:
                score += 20

    history_injuries = InjuryFatigueRecord.objects.filter(
        member=member,
        type='injury'
    ).count()

    if history_injuries >= 3:
        score += 15
    elif history_injuries >= 1:
        score += 5

    return min(score, 100)


def calculate_recovery_score(member, assessment_date, fatigue_score, injury_risk_score, acwr):
    score = 100 - (fatigue_score * 0.6 + injury_risk_score * 0.4)

    today = assessment_date
    rest_days = 0
    for i in range(7):
        check_date = today - timedelta(days=i)
        has_activity = TrainingSession.objects.filter(
            member=member,
            session_date__date=check_date,
            status='completed'
        ).exists() or SparringMatch.objects.filter(
            Q(member1=member) | Q(member2=member),
            scheduled_date__date=check_date,
            status='completed'
        ).exists()

        if not has_activity:
            rest_days += 1

    score += rest_days * 5

    if acwr >= 0.8 and acwr <= 1.2:
        score += 10
    elif acwr >= 0.5 and acwr <= 1.5:
        score += 5

    recovered_injuries = InjuryFatigueRecord.objects.filter(
        member=member,
        status='recovered',
        actual_recovery_date__gte=assessment_date - timedelta(days=14)
    ).count()

    score += recovered_injuries * 5

    return max(0, min(score, 100))


def determine_load_level(tli):
    if tli < 200:
        return 'very_low'
    elif tli < 400:
        return 'low'
    elif tli < 600:
        return 'moderate'
    elif tli < 800:
        return 'high'
    else:
        return 'very_high'


def determine_recovery_status(recovery_score):
    if recovery_score < 20:
        return 'exhausted'
    elif recovery_score < 40:
        return 'fatigued'
    elif recovery_score < 60:
        return 'normal'
    elif recovery_score < 80:
        return 'recovered'
    else:
        return 'fresh'


def recommend_intensity(load_level, recovery_status, acwr, injury_risk):
    if injury_risk >= 70 or recovery_status == 'exhausted':
        return 'very_light'
    elif injury_risk >= 40 or recovery_status == 'fatigued':
        return 'light'
    elif acwr > 1.3 or load_level == 'very_high':
        return 'light'
    elif acwr > 1.1 or load_level == 'high':
        return 'moderate'
    elif recovery_status == 'fresh' and acwr < 1.0:
        return 'intense'
    else:
        return 'moderate'


def calculate_available_training_minutes(member, recovery_score, tli):
    base_minutes = 300

    if recovery_score >= 80:
        base_minutes = 420
    elif recovery_score >= 60:
        base_minutes = 360
    elif recovery_score >= 40:
        base_minutes = 240
    elif recovery_score >= 20:
        base_minutes = 120
    else:
        base_minutes = 60

    if tli > 800:
        base_minutes = max(0, base_minutes - 180)
    elif tli > 600:
        base_minutes = max(0, base_minutes - 90)

    return base_minutes


def get_plan_restrictions(member, assessment_date):
    active_plans = TrainingPlan.objects.filter(
        member=member,
        is_active=True,
        start_date__lte=assessment_date,
        end_date__gte=assessment_date
    ).select_related('plan_goals')

    restrictions = []
    for plan in active_plans:
        if hasattr(plan, 'plan_goals') and plan.plan_goals:
            goals = plan.plan_goals
            week_start = assessment_date - timedelta(days=assessment_date.weekday())
            week_end = week_start + timedelta(days=6)

            week_sessions = TrainingSession.objects.filter(
                member=member,
                training_plan=plan,
                session_date__gte=week_start,
                session_date__lte=week_end,
                status='completed'
            ).count()

            week_matches = SparringMatch.objects.filter(
                Q(member1=member) | Q(member2=member),
                scheduled_date__gte=week_start,
                scheduled_date__lte=week_end,
                status='completed'
            ).count()

            if week_sessions >= goals.max_sessions_per_week:
                restrictions.append(f"计划 '{plan.name}' 已达到本周最大训练次数")

            if week_matches >= goals.max_sparring_per_week:
                restrictions.append(f"计划 '{plan.name}' 已达到本周最大对练次数")

            if not goals.allow_sparring:
                restrictions.append(f"计划 '{plan.name}' 不允许对练")

    return restrictions


def save_load_assessment(member, assessment_date=None):
    data = calculate_training_load_index(member, assessment_date)

    assessment, created = TrainingLoadAssessment.objects.update_or_create(
        member=member,
        assessment_date=data['assessment_date'],
        defaults={
            'training_load_index': data['training_load_index'],
            'load_level': data['load_level'],
            'recovery_status': data['recovery_status'],
            'recovery_score': data['recovery_score'],
            'acute_load': data['acute_load'],
            'chronic_load': data['chronic_load'],
            'acwr': data['acwr'],
            'fatigue_score': data['fatigue_score'],
            'injury_risk_score': data['injury_risk_score'],
            'available_training_minutes': data['available_training_minutes'],
            'recommended_intensity': data['recommended_intensity'],
            'data_sources': data['data_sources'],
            'calculation_details': data['calculation_details'],
        }
    )

    return assessment


def get_member_load_trend(member, days=30):
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=days)

    assessments = TrainingLoadAssessment.objects.filter(
        member=member,
        assessment_date__gte=start_date,
        assessment_date__lte=end_date
    ).order_by('assessment_date')

    trend_data = []
    for assessment in assessments:
        trend_data.append({
            'date': assessment.assessment_date.isoformat(),
            'tli': assessment.training_load_index,
            'recovery_score': assessment.recovery_score,
            'fatigue_score': assessment.fatigue_score,
            'injury_risk': assessment.injury_risk_score,
            'acwr': assessment.acwr,
            'load_level': assessment.load_level,
            'recovery_status': assessment.recovery_status,
        })

    return trend_data


def assess_match_risk(member1, member2, fight_type_id, preferred_date=None, config=None):
    if config is None:
        config = MatchingWeightConfig.objects.filter(is_active=True).first()

    if config is None:
        config = MatchingWeightConfig.objects.create(name='Default Config')

    if preferred_date is None:
        preferred_date = timezone.now()

    assessment_date = preferred_date.date()
    risk_factors = []
    recommendations = []
    total_risk = 0

    load1 = calculate_training_load_index(member1, assessment_date)
    load2 = calculate_training_load_index(member2, assessment_date)

    weight_diff = abs(member1.weight - member2.weight)
    weight_risk = 0
    if weight_diff > config.max_allowed_weight_diff:
        weight_risk = min((weight_diff / config.max_allowed_weight_diff) * 50, 50)
        risk_factors.append(f'体重差距过大 ({weight_diff}kg)')
        recommendations.append('建议缩小体重范围或增加护具保护')

    level_order = ['beginner', 'intermediate', 'advanced', 'competitor']
    skill_idx1 = level_order.index(member1.skill_level) if member1.skill_level in level_order else 0
    skill_idx2 = level_order.index(member2.skill_level) if member2.skill_level in level_order else 0
    skill_diff = abs(skill_idx1 - skill_idx2)
    skill_risk = 0
    if skill_diff > config.max_allowed_skill_diff:
        skill_risk = min(skill_diff * 20, 50)
        risk_factors.append(f'技术水平差距过大 (差{skill_diff}级)')
        recommendations.append('建议调整技术匹配范围或安排教练指导')

    fatigue_risk = 0
    if load1['recovery_status'] in ['exhausted', 'fatigued']:
        fatigue_risk += 25
        risk_factors.append(f'{member1.name} 处于{load1["recovery_status"]}状态')
        recommendations.append(f'建议{member1.name}先休息恢复')
    if load2['recovery_status'] in ['exhausted', 'fatigued']:
        fatigue_risk += 25
        risk_factors.append(f'{member2.name} 处于{load2["recovery_status"]}状态')
        recommendations.append(f'建议{member2.name}先休息恢复')

    fatigue_risk = min(fatigue_risk, 40)

    injury_risk = 0
    if load1['injury_risk_score'] > 50:
        injury_risk += 30
        risk_factors.append(f'{member1.name} 伤病风险较高 ({load1["injury_risk_score"]}%)')
        recommendations.append(f'建议{member1.name}避免高强度对练')
    elif load1['injury_risk_score'] > 30:
        injury_risk += 15
        risk_factors.append(f'{member1.name} 伤病风险中等')

    if load2['injury_risk_score'] > 50:
        injury_risk += 30
        risk_factors.append(f'{member2.name} 伤病风险较高 ({load2["injury_risk_score"]}%)')
        recommendations.append(f'建议{member2.name}避免高强度对练')
    elif load2['injury_risk_score'] > 30:
        injury_risk += 15
        risk_factors.append(f'{member2.name} 伤病风险中等')

    injury_risk = min(injury_risk, 50)

    active_injuries1 = InjuryFatigueRecord.objects.filter(
        member=member1, status='active', type='injury'
    )
    active_injuries2 = InjuryFatigueRecord.objects.filter(
        member=member2, status='active', type='injury'
    )

    for injury in active_injuries1:
        if injury.no_sparring_days > 0:
            days_since = (timezone.now().date() - injury.onset_date).days
            if days_since < injury.no_sparring_days:
                injury_risk = 50
                risk_factors.append(f'{member1.name} 有伤病禁止对练')
                recommendations.append(f'{member1.name} 在禁对练期内，不能参加对练')

    for injury in active_injuries2:
        if injury.no_sparring_days > 0:
            days_since = (timezone.now().date() - injury.onset_date).days
            if days_since < injury.no_sparring_days:
                injury_risk = 50
                risk_factors.append(f'{member2.name} 有伤病禁止对练')
                recommendations.append(f'{member2.name} 在禁对练期内，不能参加对练')

    recent_match_penalty = 0
    recent_cutoff = preferred_date - timedelta(days=config.min_recent_match_interval_days)
    recent_matches = SparringMatch.objects.filter(
        (Q(member1=member1) & Q(member2=member2)) |
        (Q(member1=member2) & Q(member2=member1)),
        scheduled_date__gte=recent_cutoff,
        scheduled_date__lte=preferred_date,
        status__in=['scheduled', 'completed']
    )

    if recent_matches.exists():
        recent_match_penalty = 20
        risk_factors.append(f'近期已对练过 ({config.min_recent_match_interval_days}天内)')
        recommendations.append('建议间隔更长时间再配对，增加对练多样性')

    total_risk = (
        weight_risk * 0.25 +
        skill_risk * 0.25 +
        fatigue_risk * 0.2 +
        injury_risk * 0.2 +
        recent_match_penalty * 0.1
    )

    total_risk = min(total_risk, 100)

    if total_risk >= 80:
        risk_level = 'dangerous'
    elif total_risk >= 60:
        risk_level = 'high'
    elif total_risk >= 40:
        risk_level = 'moderate'
    elif total_risk >= 20:
        risk_level = 'low'
    else:
        risk_level = 'safe'

    is_blocked = False
    block_reason = ''
    if config.auto_block_high_risk:
        if total_risk >= config.max_allowed_risk_score:
            is_blocked = True
            block_reason = f'风险评分 {total_risk:.1f} 超过阈值 {config.max_allowed_risk_score}'
        elif active_injuries1.filter(no_sparring_days__gt=0).exists() or \
             active_injuries2.filter(no_sparring_days__gt=0).exists():
            is_blocked = True
            block_reason = '一方或双方处于伤病禁对练期'

    plan_restrictions1 = get_plan_restrictions(member1, assessment_date)
    plan_restrictions2 = get_plan_restrictions(member2, assessment_date)
    all_restrictions = plan_restrictions1 + plan_restrictions2

    for restriction in all_restrictions:
        if '不允许对练' in restriction or '最大对练次数' in restriction:
            is_blocked = True
            block_reason = restriction
            risk_factors.append(restriction)

    from .models import MatchRiskAssessment, FightType
    try:
        fight_type = FightType.objects.get(id=fight_type_id)
    except:
        fight_type = None

    assessment = MatchRiskAssessment.objects.create(
        member1=member1,
        member2=member2,
        fight_type=fight_type,
        risk_level=risk_level,
        risk_score=round(total_risk, 2),
        weight_diff_score=round(weight_risk, 2),
        skill_diff_score=round(skill_risk, 2),
        fatigue_risk_score=round(fatigue_risk, 2),
        injury_risk_score=round(injury_risk, 2),
        recent_match_penalty=round(recent_match_penalty, 2),
        risk_factors=risk_factors,
        recommendations=recommendations,
        is_blocked=is_blocked,
        block_reason=block_reason,
    )

    return {
        'assessment': assessment,
        'risk_level': risk_level,
        'risk_score': round(total_risk, 2),
        'weight_diff_score': round(weight_risk, 2),
        'skill_diff_score': round(skill_risk, 2),
        'fatigue_risk_score': round(fatigue_risk, 2),
        'injury_risk_score': round(injury_risk, 2),
        'recent_match_penalty': round(recent_match_penalty, 2),
        'risk_factors': risk_factors,
        'recommendations': recommendations,
        'is_blocked': is_blocked,
        'block_reason': block_reason,
        'member1_load': load1,
        'member2_load': load2,
    }


def generate_all_daily_assessments():
    today = timezone.now().date()
    members = Member.objects.filter(is_active=True)
    results = []

    for member in members:
        try:
            assessment = save_load_assessment(member, today)
            results.append(assessment)
        except Exception as e:
            print(f"Error generating assessment for {member.name}: {e}")

    return results
