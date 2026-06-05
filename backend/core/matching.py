from .models import Member, MatchRequest, SparringMatch, MatchingWeightConfig
from .training_load import assess_match_risk, calculate_training_load_index
from django.db.models import Q
from datetime import timedelta


def get_active_config():
    config = MatchingWeightConfig.objects.filter(is_active=True).first()
    if not config:
        config = MatchingWeightConfig.objects.create(name='Default Config')
    return config


def calculate_weight_similarity(weight1, weight2, max_diff=5):
    diff = abs(weight1 - weight2)
    if diff <= max_diff:
        return 1 - (diff / max_diff)
    return max(0, 1 - (diff - max_diff) / (max_diff * 2))


def calculate_skill_similarity(level1, level2):
    level_order = ['beginner', 'intermediate', 'advanced', 'competitor']
    idx1 = level_order.index(level1) if level1 in level_order else 0
    idx2 = level_order.index(level2) if level2 in level_order else 0
    diff = abs(idx1 - idx2)
    if diff == 0:
        return 1.0
    elif diff == 1:
        return 0.7
    elif diff == 2:
        return 0.4
    return 0.1


def calculate_time_compatibility(times1, times2):
    if not times1 or not times2:
        return 0.5
    set1 = set(times1)
    set2 = set(times2)
    intersection = set1 & set2
    union = set1 | set2
    if len(union) == 0:
        return 0
    return len(intersection) / len(union)


def calculate_recent_match_penalty(member1, member2, preferred_date, interval_days=3):
    if not preferred_date:
        return 0

    recent_cutoff = preferred_date - timedelta(days=interval_days)
    recent_matches = SparringMatch.objects.filter(
        (Q(member1=member1) & Q(member2=member2)) |
        (Q(member1=member2) & Q(member2=member1)),
        scheduled_date__gte=recent_cutoff,
        scheduled_date__lte=preferred_date,
        status__in=['scheduled', 'completed']
    ).count()

    if recent_matches == 0:
        return 1.0
    elif recent_matches == 1:
        return 0.5
    else:
        return 0.0


def calculate_load_compatibility(member1, member2, assessment_date=None):
    if assessment_date is None:
        from django.utils import timezone
        assessment_date = timezone.now().date()

    load1 = calculate_training_load_index(member1, assessment_date)
    load2 = calculate_training_load_index(member2, assessment_date)

    load_penalty = 0

    if load1['recovery_status'] in ['exhausted', 'fatigued']:
        load_penalty += 0.3
    elif load1['recovery_status'] == 'normal':
        load_penalty += 0.1

    if load2['recovery_status'] in ['exhausted', 'fatigued']:
        load_penalty += 0.3
    elif load2['recovery_status'] == 'normal':
        load_penalty += 0.1

    if load1['injury_risk_score'] > 50 or load2['injury_risk_score'] > 50:
        load_penalty += 0.3
    elif load1['injury_risk_score'] > 30 or load2['injury_risk_score'] > 30:
        load_penalty += 0.15

    if load1['acwr'] > 1.3 or load2['acwr'] > 1.3:
        load_penalty += 0.2
    elif load1['acwr'] > 1.1 or load2['acwr'] > 1.1:
        load_penalty += 0.1

    compatibility = max(0, 1.0 - load_penalty)

    return {
        'score': compatibility,
        'member1_load': load1,
        'member2_load': load2,
    }


def calculate_match_score(member1, member2, fight_type_id, preferred_date=None, config=None):
    if config is None:
        config = get_active_config()

    score = 0.0
    score_breakdown = {}

    weight_score = calculate_weight_similarity(
        member1.weight, member2.weight, config.max_allowed_weight_diff)
    weighted_weight = weight_score * config.weight_similarity_weight
    score += weighted_weight
    score_breakdown['weight_similarity'] = {
        'raw_score': round(weight_score, 4),
        'weight': config.weight_similarity_weight,
        'weighted_score': round(weighted_weight, 2),
        'details': {
            'member1_weight': member1.weight,
            'member2_weight': member2.weight,
            'weight_diff': abs(member1.weight - member2.weight),
            'max_allowed_diff': config.max_allowed_weight_diff,
        }
    }

    skill_score = calculate_skill_similarity(member1.skill_level, member2.skill_level)
    weighted_skill = skill_score * config.skill_similarity_weight
    score += weighted_skill
    score_breakdown['skill_similarity'] = {
        'raw_score': round(skill_score, 4),
        'weight': config.skill_similarity_weight,
        'weighted_score': round(weighted_skill, 2),
        'details': {
            'member1_skill': member1.skill_level,
            'member2_skill': member2.skill_level,
        }
    }

    time_score = calculate_time_compatibility(member1.available_times, member2.available_times)
    weighted_time = time_score * config.time_compatibility_weight
    score += weighted_time
    score_breakdown['time_compatibility'] = {
        'raw_score': round(time_score, 4),
        'weight': config.time_compatibility_weight,
        'weighted_score': round(weighted_time, 2),
    }

    fight_types1 = set(ft.id for ft in member1.fight_types.all())
    fight_types2 = set(ft.id for ft in member2.fight_types.all())
    fight_type_score = 0
    if fight_type_id in fight_types1 and fight_type_id in fight_types2:
        fight_type_score = 1.0
    else:
        common = fight_types1 & fight_types2
        if common:
            fight_type_score = 0.5

    weighted_fight_type = fight_type_score * config.fight_type_match_weight
    score += weighted_fight_type
    score_breakdown['fight_type_match'] = {
        'raw_score': round(fight_type_score, 4),
        'weight': config.fight_type_match_weight,
        'weighted_score': round(weighted_fight_type, 2),
    }

    recent_match_score = calculate_recent_match_penalty(
        member1, member2, preferred_date, config.min_recent_match_interval_days)
    weighted_recent_match = recent_match_score * config.recent_match_avoidance_weight
    score += weighted_recent_match
    score_breakdown['recent_match_avoidance'] = {
        'raw_score': round(recent_match_score, 4),
        'weight': config.recent_match_avoidance_weight,
        'weighted_score': round(weighted_recent_match, 2),
    }

    load_result = calculate_load_compatibility(member1, member2, preferred_date.date() if preferred_date else None)
    load_score = load_result['score']

    base_score = score
    load_risk_penalty = 0
    if load_score < 0.7:
        load_risk_penalty = (1 - load_score) * config.load_risk_penalty_weight
        score -= load_risk_penalty

    score_breakdown['load_risk_penalty'] = {
        'raw_score': round(load_score, 4),
        'penalty_amount': round(load_risk_penalty, 2),
        'weight': config.load_risk_penalty_weight,
        'details': {
            'member1_recovery_status': load_result['member1_load']['recovery_status'],
            'member1_recovery_score': load_result['member1_load']['recovery_score'],
            'member1_injury_risk': load_result['member1_load']['injury_risk_score'],
            'member1_acwr': load_result['member1_load']['acwr'],
            'member2_recovery_status': load_result['member2_load']['recovery_status'],
            'member2_recovery_score': load_result['member2_load']['recovery_score'],
            'member2_injury_risk': load_result['member2_load']['injury_risk_score'],
            'member2_acwr': load_result['member2_load']['acwr'],
        }
    }

    risk_assessment = assess_match_risk(
        member1, member2, fight_type_id, preferred_date, config)

    injury_risk_penalty = 0
    if risk_assessment['risk_score'] > config.max_allowed_risk_score * 0.7:
        injury_risk_penalty = (risk_assessment['risk_score'] / 100) * config.injury_risk_penalty_weight
        score -= injury_risk_penalty

    score_breakdown['injury_risk_penalty'] = {
        'raw_score': round(risk_assessment['risk_score'], 4),
        'penalty_amount': round(injury_risk_penalty, 2),
        'weight': config.injury_risk_penalty_weight,
        'risk_factors': risk_assessment['risk_factors'],
    }

    final_score = max(0, round(score, 2))

    return {
        'total_score': final_score,
        'base_score': round(base_score, 2),
        'penalties': round(load_risk_penalty + injury_risk_penalty, 2),
        'is_blocked': risk_assessment['is_blocked'],
        'block_reason': risk_assessment['block_reason'],
        'risk_level': risk_assessment['risk_level'],
        'risk_score': risk_assessment['risk_score'],
        'score_breakdown': score_breakdown,
        'risk_assessment': risk_assessment,
        'member1_load': load_result['member1_load'],
        'member2_load': load_result['member2_load'],
    }


def find_potential_partners(match_request):
    config = get_active_config()
    member = match_request.member
    fight_type_id = match_request.fight_type_id
    min_weight = match_request.weight_range_min
    max_weight = match_request.weight_range_max
    skill_pref = match_request.skill_level_preference

    potential = Member.objects.filter(
        is_active=True,
        weight__gte=min_weight,
        weight__lte=max_weight,
        fight_types__id=fight_type_id
    ).exclude(id=member.id).distinct()

    if skill_pref:
        potential = potential.filter(skill_level=skill_pref)

    from .training_load import InjuryFatigueRecord
    from django.db.models import Subquery

    excluded_members = InjuryFatigueRecord.objects.filter(
        status='active',
        type='injury',
        no_sparring_days__gt=0
    ).values('member_id')

    potential = potential.exclude(id__in=Subquery(excluded_members))

    scored_partners = []
    for partner in potential:
        score_result = calculate_match_score(
            member, partner, fight_type_id, match_request.preferred_date, config)

        if config.auto_block_high_risk and score_result['is_blocked']:
            continue

        scored_partners.append((partner, score_result))

    scored_partners.sort(key=lambda x: x[1]['total_score'], reverse=True)

    return scored_partners[:10]


def auto_match_requests():
    config = get_active_config()
    open_requests = MatchRequest.objects.filter(status='open').order_by('created_at')
    matched_pairs = []

    for req1 in open_requests:
        if req1.status != 'open':
            continue

        scored_partners = find_potential_partners(req1)

        for partner, score_result in scored_partners:
            if score_result.get('is_blocked', False) and config.auto_block_high_risk:
                continue

            existing_match = SparringMatch.objects.filter(
                (Q(member1=req1.member) & Q(member2=partner) & Q(status__in=['pending', 'scheduled'])) |
                (Q(member1=partner) & Q(member2=req1.member) & Q(status__in=['pending', 'scheduled']))
            ).exists()

            if existing_match:
                continue

            partner_requests = MatchRequest.objects.filter(
                member=partner,
                status='open',
                fight_type_id=req1.fight_type_id
            )

            for req2 in partner_requests:
                if req2.weight_range_min <= req1.member.weight <= req2.weight_range_max and \
                   req1.weight_range_min <= partner.weight <= req1.weight_range_max:

                    final_score = score_result.get('total_score', 0)
                    match = SparringMatch.objects.create(
                        member1=req1.member,
                        member2=partner,
                        fight_type_id=req1.fight_type_id,
                        weight_class_id=req1.member.weight_class_id or partner.weight_class_id,
                        scheduled_date=req1.preferred_date,
                        status='scheduled',
                        match_score=final_score,
                        match_notes=f"风险等级: {score_result.get('risk_level', 'safe')}, 风险评分: {score_result.get('risk_score', 0)}"
                    )

                    req1.status = 'matched'
                    req1.save()
                    req2.status = 'matched'
                    req2.save()

                    matched_pairs.append(match)
                    break

            if matched_pairs and matched_pairs[-1].member2 == partner:
                break

    return matched_pairs
