from .models import Member, MatchRequest, SparringMatch
from django.db.models import Q
from datetime import timedelta


def calculate_weight_similarity(weight1, weight2, max_diff=5):
    diff = abs(weight1 - weight2)
    if diff <= max_diff:
        return 1 - (diff / max_diff)
    return 0


def calculate_skill_similarity(level1, level2):
    level_order = ['beginner', 'intermediate', 'advanced', 'competitor']
    idx1 = level_order.index(level1)
    idx2 = level_order.index(level2)
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


def calculate_match_score(member1, member2, fight_type_id, preferred_date=None):
    score = 0.0

    weight_score = calculate_weight_similarity(member1.weight, member2.weight)
    score += weight_score * 35

    skill_score = calculate_skill_similarity(member1.skill_level, member2.skill_level)
    score += skill_score * 35

    time_score = calculate_time_compatibility(member1.available_times, member2.available_times)
    score += time_score * 20

    fight_types1 = set(ft.id for ft in member1.fight_types.all())
    fight_types2 = set(ft.id for ft in member2.fight_types.all())
    if fight_type_id in fight_types1 and fight_type_id in fight_types2:
        score += 10
    else:
        common = fight_types1 & fight_types2
        if common:
            score += 5

    if preferred_date:
        recent_matches = SparringMatch.objects.filter(
            (Q(member1=member1) & Q(member2=member2) & Q(scheduled_date__gte=preferred_date - timedelta(days=7))) |
            (Q(member1=member2) & Q(member2=member1) & Q(scheduled_date__gte=preferred_date - timedelta(days=7)))
        ).count()
        if recent_matches == 0:
            score += 5

    return round(score, 2)


def find_potential_partners(match_request):
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

    scored_partners = []
    for partner in potential:
        score = calculate_match_score(
            member, partner, fight_type_id, match_request.preferred_date)
        scored_partners.append((partner, score))

    scored_partners.sort(key=lambda x: x[1], reverse=True)

    return [p[0] for p in scored_partners[:10]]


def auto_match_requests():
    open_requests = MatchRequest.objects.filter(status='open').order_by('created_at')
    matched_pairs = []

    for req1 in open_requests:
        if req1.status != 'open':
            continue

        partners = find_potential_partners(req1)

        for partner in partners:
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

                    match = SparringMatch.objects.create(
                        member1=req1.member,
                        member2=partner,
                        fight_type_id=req1.fight_type_id,
                        weight_class_id=req1.member.weight_class_id or partner.weight_class_id,
                        scheduled_date=req1.preferred_date,
                        status='scheduled',
                        match_score=calculate_match_score(req1.member, partner, req1.fight_type_id)
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
