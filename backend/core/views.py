from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Avg, Q
from django.utils import timezone
from datetime import timedelta, date
from collections import defaultdict

from .models import (
    FightType, WeightClass, TrainingGoal, Member, Coach,
    TrainingPlan, TrainingSession, FitnessData, SkillProgression,
    SparringMatch, MatchRequest, InjuryFatigueRecord, MatchingWeightConfig,
    TrainingPlanGoal, TrainingLoadAssessment, MatchRiskAssessment
)
from .serializers import (
    FightTypeSerializer, WeightClassSerializer, TrainingGoalSerializer,
    MemberSerializer, CoachSerializer, TrainingPlanSerializer,
    TrainingSessionSerializer, FitnessDataSerializer,
    SkillProgressionSerializer, SparringMatchSerializer,
    MatchRequestSerializer, InjuryFatigueRecordSerializer,
    MatchingWeightConfigSerializer, TrainingPlanGoalSerializer,
    TrainingLoadAssessmentSerializer, MatchRiskAssessmentSerializer
)
from .matching import find_potential_partners, auto_match_requests, calculate_match_score
from .training_load import (
    calculate_training_load_index, save_load_assessment,
    get_member_load_trend, assess_match_risk, generate_all_daily_assessments
)


class FightTypeViewSet(viewsets.ModelViewSet):
    queryset = FightType.objects.all()
    serializer_class = FightTypeSerializer
    pagination_class = None


class WeightClassViewSet(viewsets.ModelViewSet):
    queryset = WeightClass.objects.all()
    serializer_class = WeightClassSerializer
    pagination_class = None


class TrainingGoalViewSet(viewsets.ModelViewSet):
    queryset = TrainingGoal.objects.all()
    serializer_class = TrainingGoalSerializer
    pagination_class = None


class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer

    def get_queryset(self):
        queryset = Member.objects.all().order_by('id')
        fight_type = self.request.query_params.get('fight_type', None)
        skill_level = self.request.query_params.get('skill_level', None)
        is_active = self.request.query_params.get('is_active', None)
        if fight_type:
            queryset = queryset.filter(fight_types__id=fight_type)
        if skill_level:
            queryset = queryset.filter(skill_level=skill_level)
        if is_active is not None:
            queryset = queryset.filter(is_active=(is_active.lower() == 'true'))
        return queryset

    @action(detail=True, methods=['get'])
    def potential_partners(self, request, pk=None):
        member = self.get_object()
        fight_type_id = request.query_params.get('fight_type')
        if not fight_type_id:
            return Response({'error': 'fight_type parameter is required'}, status=400)

        temp_request = MatchRequest(
            member=member,
            fight_type_id=fight_type_id,
            weight_range_min=member.weight - 5,
            weight_range_max=member.weight + 5,
            skill_level_preference=None
        )
        scored_partners = find_potential_partners(temp_request)

        result = []
        for partner, score_result in scored_partners:
            result.append({
                'member': MemberSerializer(partner).data,
                'match_score': score_result['total_score'],
                'score_details': score_result
            })

        return Response(result)

    @action(detail=True, methods=['get'])
    def training_load(self, request, pk=None):
        member = self.get_object()
        assessment_date = request.query_params.get('date')
        if assessment_date:
            from datetime import datetime
            assessment_date = datetime.strptime(assessment_date, '%Y-%m-%d').date()

        load_data = calculate_training_load_index(member, assessment_date)
        return Response(load_data)

    @action(detail=True, methods=['post'])
    def calculate_load(self, request, pk=None):
        member = self.get_object()
        assessment = save_load_assessment(member)
        return Response(TrainingLoadAssessmentSerializer(assessment).data)

    @action(detail=True, methods=['get'])
    def load_trend(self, request, pk=None):
        member = self.get_object()
        days = int(request.query_params.get('days', 30))
        trend_data = get_member_load_trend(member, days)
        return Response(trend_data)

    @action(detail=True, methods=['get'])
    def injury_fatigue_records(self, request, pk=None):
        member = self.get_object()
        records = InjuryFatigueRecord.objects.filter(member=member)
        status_filter = request.query_params.get('status')
        if status_filter:
            records = records.filter(status=status_filter)
        return Response(InjuryFatigueRecordSerializer(records, many=True).data)

    @action(detail=True, methods=['post'])
    def add_injury_fatigue(self, request, pk=None):
        member = self.get_object()
        data = {**request.data, 'member_id': member.id}
        serializer = InjuryFatigueRecordSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CoachViewSet(viewsets.ModelViewSet):
    queryset = Coach.objects.all()
    serializer_class = CoachSerializer
    pagination_class = None


class TrainingPlanViewSet(viewsets.ModelViewSet):
    queryset = TrainingPlan.objects.all()
    serializer_class = TrainingPlanSerializer

    def get_queryset(self):
        queryset = TrainingPlan.objects.all()
        member_id = self.request.query_params.get('member', None)
        coach_id = self.request.query_params.get('coach', None)
        is_active = self.request.query_params.get('is_active', None)
        if member_id:
            queryset = queryset.filter(member_id=member_id)
        if coach_id:
            queryset = queryset.filter(coach_id=coach_id)
        if is_active is not None:
            queryset = queryset.filter(is_active=(is_active.lower() == 'true'))
        return queryset

    @action(detail=True, methods=['post'])
    def generate_sessions(self, request, pk=None):
        plan = self.get_object()
        from datetime import date, timedelta as td

        sessions = []
        current_date = plan.start_date
        session_count = 0
        days_between = 7 // plan.sessions_per_week

        while session_count < plan.total_sessions and current_date <= plan.end_date:
            session = TrainingSession.objects.create(
                training_plan=plan,
                member=plan.member,
                coach=plan.coach,
                fight_type=plan.fight_type,
                session_date=timezone.make_aware(
                    timezone.datetime.combine(current_date, timezone.datetime.min.time())
                ) + td(hours=18),
                duration_minutes=60,
                status='scheduled'
            )
            sessions.append(session)
            session_count += 1
            current_date += td(days=days_between)

        return Response({
            'message': f'Generated {len(sessions)} sessions',
            'sessions': TrainingSessionSerializer(sessions, many=True).data
        })

    @action(detail=True, methods=['get'])
    def plan_goals(self, request, pk=None):
        plan = self.get_object()
        try:
            goals = TrainingPlanGoal.objects.get(training_plan=plan)
            return Response(TrainingPlanGoalSerializer(goals).data)
        except TrainingPlanGoal.DoesNotExist:
            return Response(None)

    @action(detail=True, methods=['post'])
    def set_plan_goals(self, request, pk=None):
        plan = self.get_object()
        data = {**request.data, 'training_plan_id': plan.id}

        try:
            goals = TrainingPlanGoal.objects.get(training_plan=plan)
            serializer = TrainingPlanGoalSerializer(goals, data=data, partial=True)
        except TrainingPlanGoal.DoesNotExist:
            serializer = TrainingPlanGoalSerializer(data=data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def member_load_summary(self, request, pk=None):
        plan = self.get_object()
        member = plan.member
        days = int(request.query_params.get('days', 30))

        load_data = calculate_training_load_index(member)
        trend_data = get_member_load_trend(member, days)

        week_start = timezone.now().date() - timedelta(days=timezone.now().date().weekday())
        week_end = week_start + timedelta(days=6)
        week_sessions = TrainingSession.objects.filter(
            member=member,
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

        return Response({
            'current_load': load_data,
            'trend': trend_data,
            'weekly_summary': {
                'sessions_completed': week_sessions,
                'matches_completed': week_matches,
            },
        })


class TrainingSessionViewSet(viewsets.ModelViewSet):
    queryset = TrainingSession.objects.all()
    serializer_class = TrainingSessionSerializer

    def get_queryset(self):
        queryset = TrainingSession.objects.all()
        member_id = self.request.query_params.get('member', None)
        coach_id = self.request.query_params.get('coach', None)
        plan_id = self.request.query_params.get('plan', None)
        status = self.request.query_params.get('status', None)
        if member_id:
            queryset = queryset.filter(member_id=member_id)
        if coach_id:
            queryset = queryset.filter(coach_id=coach_id)
        if plan_id:
            queryset = queryset.filter(training_plan_id=plan_id)
        if status:
            queryset = queryset.filter(status=status)
        return queryset.order_by('-session_date')

    @action(detail=True, methods=['post'])
    def record_fitness(self, request, pk=None):
        session = self.get_object()
        serializer = FitnessDataSerializer(data=request.data)
        if serializer.is_valid():
            fitness, created = FitnessData.objects.update_or_create(
                training_session=session,
                defaults=serializer.validated_data
            )
            return Response(FitnessDataSerializer(fitness).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        session = self.get_object()
        session.status = 'completed'
        session.attendance = request.data.get('attendance', True)
        session.content = request.data.get('content', session.content)
        session.performance_notes = request.data.get('performance_notes', session.performance_notes)
        session.techniques_practiced = request.data.get('techniques_practiced', session.techniques_practiced)
        session.save()

        session.member.update_skill_score()

        return Response(TrainingSessionSerializer(session).data)


class FitnessDataViewSet(viewsets.ModelViewSet):
    queryset = FitnessData.objects.all()
    serializer_class = FitnessDataSerializer
    pagination_class = None


class SkillProgressionViewSet(viewsets.ModelViewSet):
    queryset = SkillProgression.objects.all()
    serializer_class = SkillProgressionSerializer

    def get_queryset(self):
        queryset = SkillProgression.objects.all()
        member_id = self.request.query_params.get('member', None)
        fight_type_id = self.request.query_params.get('fight_type', None)
        if member_id:
            queryset = queryset.filter(member_id=member_id)
        if fight_type_id:
            queryset = queryset.filter(fight_type_id=fight_type_id)
        return queryset


class SparringMatchViewSet(viewsets.ModelViewSet):
    queryset = SparringMatch.objects.all()
    serializer_class = SparringMatchSerializer

    def get_queryset(self):
        queryset = SparringMatch.objects.all()
        member_id = self.request.query_params.get('member', None)
        fight_type_id = self.request.query_params.get('fight_type', None)
        status = self.request.query_params.get('status', None)
        if member_id:
            queryset = queryset.filter(Q(member1_id=member_id) | Q(member2_id=member_id))
        if fight_type_id:
            queryset = queryset.filter(fight_type_id=fight_type_id)
        if status:
            queryset = queryset.filter(status=status)
        return queryset.order_by('-scheduled_date')

    @action(detail=True, methods=['post'])
    def record_result(self, request, pk=None):
        match = self.get_object()
        result = request.data.get('result')
        member1_score = request.data.get('member1_score')
        member2_score = request.data.get('member2_score')
        match_notes = request.data.get('match_notes', '')
        techniques_used = request.data.get('techniques_used', [])

        match.status = 'completed'
        match.result = result
        match.member1_score = member1_score
        match.member2_score = member2_score
        match.match_notes = match_notes
        match.techniques_used = techniques_used

        if result == 'win':
            if member1_score > member2_score:
                match.winner = match.member1
                match.loser = match.member2
            else:
                match.winner = match.member2
                match.loser = match.member1
        elif result == 'draw':
            match.winner = None
            match.loser = None

        match.save()

        if match.member1:
            match.member1.update_skill_score()
        if match.member2:
            match.member2.update_skill_score()

        return Response(SparringMatchSerializer(match).data)


class MatchRequestViewSet(viewsets.ModelViewSet):
    queryset = MatchRequest.objects.all()
    serializer_class = MatchRequestSerializer

    def get_queryset(self):
        queryset = MatchRequest.objects.all()
        member_id = self.request.query_params.get('member', None)
        status = self.request.query_params.get('status', None)
        fight_type_id = self.request.query_params.get('fight_type', None)
        if member_id:
            queryset = queryset.filter(member_id=member_id)
        if status:
            queryset = queryset.filter(status=status)
        if fight_type_id:
            queryset = queryset.filter(fight_type_id=fight_type_id)
        return queryset.order_by('-created_at')

    @action(detail=True, methods=['get'])
    def partners(self, request, pk=None):
        match_request = self.get_object()
        scored_partners = find_potential_partners(match_request)

        result = []
        for partner, score_result in scored_partners:
            result.append({
                'member': MemberSerializer(partner).data,
                'match_score': score_result['total_score'],
                'score_details': score_result,
            })

        return Response(result)

    @action(detail=True, methods=['post'])
    def assess_risk(self, request, pk=None):
        match_request = self.get_object()
        partner_id = request.data.get('partner_id')
        if not partner_id:
            return Response({'error': 'partner_id is required'}, status=400)

        try:
            partner = Member.objects.get(id=partner_id)
        except Member.DoesNotExist:
            return Response({'error': 'Partner not found'}, status=404)

        risk_result = assess_match_risk(
            match_request.member, partner,
            match_request.fight_type_id,
            match_request.preferred_date
        )

        return Response(risk_result)

    @action(detail=False, methods=['post'])
    def auto_match(self, request):
        matched = auto_match_requests()
        return Response({
            'matched_count': len(matched),
            'matches': SparringMatchSerializer(matched, many=True).data
        })


class StatisticsViewSet(viewsets.ViewSet):

    @action(detail=False, methods=['get'])
    def overview(self, request):
        total_members = Member.objects.filter(is_active=True).count()
        total_coaches = Coach.objects.count()
        total_plans = TrainingPlan.objects.filter(is_active=True).count()
        total_matches = SparringMatch.objects.filter(status='completed').count()
        total_sessions = TrainingSession.objects.filter(status='completed').count()

        return Response({
            'total_members': total_members,
            'total_coaches': total_coaches,
            'total_plans': total_plans,
            'total_matches': total_matches,
            'total_sessions': total_sessions,
        })

    @action(detail=False, methods=['get'])
    def fight_type_activity(self, request):
        fight_types = FightType.objects.annotate(
            member_count=Count('members'),
            session_count=Count('trainingsession', filter=Q(trainingsession__status='completed')),
            match_count=Count('sparringmatch', filter=Q(sparringmatch__status='completed'))
        )

        data = []
        for ft in fight_types:
            data.append({
                'id': ft.id,
                'name': ft.name,
                'member_count': ft.member_count,
                'session_count': ft.session_count,
                'match_count': ft.match_count,
                'total_activity': ft.member_count + ft.session_count * 2 + ft.match_count * 3
            })

        data.sort(key=lambda x: x['total_activity'], reverse=True)
        return Response(data)

    @action(detail=False, methods=['get'])
    def skill_progression(self, request):
        member_id = request.query_params.get('member')
        fight_type_id = request.query_params.get('fight_type')

        queryset = SkillProgression.objects.all()
        if member_id:
            queryset = queryset.filter(member_id=member_id)
        if fight_type_id:
            queryset = queryset.filter(fight_type_id=fight_type_id)

        progress_by_member = defaultdict(lambda: defaultdict(list))
        for prog in queryset:
            progress_by_member[prog.member.id][prog.technique].append({
                'date': prog.date_recorded,
                'mastery': prog.mastery_level
            })

        result = []
        for member_id, techniques in progress_by_member.items():
            member = Member.objects.get(id=member_id)
            tech_data = []
            for technique, records in techniques.items():
                records.sort(key=lambda x: x['date'])
                tech_data.append({
                    'technique': technique,
                    'records': records,
                    'improvement': records[-1]['mastery'] - records[0]['mastery'] if len(records) > 1 else 0
                })
            result.append({
                'member_id': member_id,
                'member_name': member.name,
                'techniques': tech_data
            })

        return Response(result)

    @action(detail=False, methods=['get'])
    def matching_success_rate(self, request):
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)

        total_requests = MatchRequest.objects.filter(created_at__gte=start_date).count()
        matched_requests = MatchRequest.objects.filter(
            created_at__gte=start_date, status='matched').count()
        completed_matches = SparringMatch.objects.filter(
            scheduled_date__gte=start_date, status='completed').count()
        scheduled_matches = SparringMatch.objects.filter(
            scheduled_date__gte=start_date, status='scheduled').count()

        success_rate = (matched_requests / total_requests * 100) if total_requests > 0 else 0
        completion_rate = (completed_matches / (completed_matches + scheduled_matches) * 100) \
            if (completed_matches + scheduled_matches) > 0 else 0

        match_scores = SparringMatch.objects.filter(
            scheduled_date__gte=start_date
        ).aggregate(avg_score=Avg('match_score'))

        return Response({
            'period_days': days,
            'total_requests': total_requests,
            'matched_requests': matched_requests,
            'success_rate': round(success_rate, 2),
            'completed_matches': completed_matches,
            'scheduled_matches': scheduled_matches,
            'completion_rate': round(completion_rate, 2),
            'average_match_score': round(match_scores['avg_score'] or 0, 2)
        })

    @action(detail=False, methods=['get'])
    def training_frequency(self, request):
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)

        sessions = TrainingSession.objects.filter(
            session_date__gte=start_date, status='completed'
        )

        daily_count = defaultdict(int)
        weekday_count = defaultdict(int)
        hour_count = defaultdict(int)

        for session in sessions:
            date_str = session.session_date.date().isoformat()
            weekday = session.session_date.weekday()
            hour = session.session_date.hour

            daily_count[date_str] += 1
            weekday_count[weekday] += 1
            hour_count[hour] += 1

        daily_data = []
        current = timezone.now().date()
        for i in range(days):
            d = current - timedelta(days=days - 1 - i)
            daily_data.append({
                'date': d.isoformat(),
                'count': daily_count.get(d.isoformat(), 0)
            })

        weekday_names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        weekday_data = [{'day': weekday_names[i], 'count': weekday_count.get(i, 0)} for i in range(7)]

        hour_data = [{'hour': h, 'count': hour_count.get(h, 0)} for h in range(6, 23)]

        member_frequency = sessions.values('member_id', 'member__name').annotate(
            count=Count('id')
        ).order_by('-count')[:10]

        return Response({
            'period_days': days,
            'daily_distribution': daily_data,
            'weekday_distribution': weekday_data,
            'hour_distribution': hour_data,
            'top_members': list(member_frequency),
            'total_sessions': sessions.count()
        })


class InjuryFatigueRecordViewSet(viewsets.ModelViewSet):
    queryset = InjuryFatigueRecord.objects.all()
    serializer_class = InjuryFatigueRecordSerializer

    def get_queryset(self):
        queryset = InjuryFatigueRecord.objects.all().order_by('-created_at')
        member_id = self.request.query_params.get('member', None)
        status_filter = self.request.query_params.get('status', None)
        record_type = self.request.query_params.get('type', None)
        if member_id:
            queryset = queryset.filter(member_id=member_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if record_type:
            queryset = queryset.filter(type=record_type)
        return queryset

    @action(detail=True, methods=['post'])
    def mark_recovered(self, request, pk=None):
        record = self.get_object()
        record.status = 'recovered'
        record.actual_recovery_date = timezone.now().date()
        record.save()
        return Response(InjuryFatigueRecordSerializer(record).data)


class MatchingWeightConfigViewSet(viewsets.ModelViewSet):
    queryset = MatchingWeightConfig.objects.all()
    serializer_class = MatchingWeightConfigSerializer
    pagination_class = None

    @action(detail=False, methods=['get'])
    def active(self, request):
        config = MatchingWeightConfig.objects.filter(is_active=True).first()
        if not config:
            config = MatchingWeightConfig.objects.create(name='Default Config')
        return Response(MatchingWeightConfigSerializer(config).data)

    @action(detail=True, methods=['post'])
    def set_active(self, request, pk=None):
        MatchingWeightConfig.objects.update(is_active=False)
        config = self.get_object()
        config.is_active = True
        config.save()
        return Response(MatchingWeightConfigSerializer(config).data)


class TrainingLoadAssessmentViewSet(viewsets.ModelViewSet):
    queryset = TrainingLoadAssessment.objects.all()
    serializer_class = TrainingLoadAssessmentSerializer

    def get_queryset(self):
        queryset = TrainingLoadAssessment.objects.all().order_by('-assessment_date')
        member_id = self.request.query_params.get('member', None)
        if member_id:
            queryset = queryset.filter(member_id=member_id)
        return queryset

    @action(detail=False, methods=['post'])
    def generate_all(self, request):
        assessments = generate_all_daily_assessments()
        return Response({
            'generated_count': len(assessments),
            'assessments': TrainingLoadAssessmentSerializer(assessments, many=True).data
        })

    @action(detail=False, methods=['post'])
    def generate_for_member(self, request):
        member_id = request.data.get('member_id')
        if not member_id:
            return Response({'error': 'member_id is required'}, status=400)
        try:
            member = Member.objects.get(id=member_id)
        except Member.DoesNotExist:
            return Response({'error': 'Member not found'}, status=404)
        assessment = save_load_assessment(member)
        return Response(TrainingLoadAssessmentSerializer(assessment).data)


class MatchRiskAssessmentViewSet(viewsets.ModelViewSet):
    queryset = MatchRiskAssessment.objects.all()
    serializer_class = MatchRiskAssessmentSerializer

    def get_queryset(self):
        queryset = MatchRiskAssessment.objects.all().order_by('-assessment_date')
        member_id = self.request.query_params.get('member', None)
        if member_id:
            queryset = queryset.filter(Q(member1_id=member_id) | Q(member2_id=member_id))
        return queryset

    @action(detail=False, methods=['post'])
    def assess(self, request):
        member1_id = request.data.get('member1_id')
        member2_id = request.data.get('member2_id')
        fight_type_id = request.data.get('fight_type_id')
        preferred_date = request.data.get('preferred_date')

        if not all([member1_id, member2_id, fight_type_id]):
            return Response(
                {'error': 'member1_id, member2_id, and fight_type_id are required'},
                status=400
            )

        try:
            member1 = Member.objects.get(id=member1_id)
            member2 = Member.objects.get(id=member2_id)
        except Member.DoesNotExist:
            return Response({'error': 'Member not found'}, status=404)

        from datetime import datetime
        pref_date = None
        if preferred_date:
            pref_date = timezone.make_aware(datetime.fromisoformat(preferred_date.replace('Z', '+00:00')))

        result = assess_match_risk(member1, member2, fight_type_id, pref_date)
        return Response(result)


class TrainingPlanGoalViewSet(viewsets.ModelViewSet):
    queryset = TrainingPlanGoal.objects.all()
    serializer_class = TrainingPlanGoalSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = TrainingPlanGoal.objects.all()
        plan_id = self.request.query_params.get('training_plan', None)
        if plan_id:
            queryset = queryset.filter(training_plan_id=plan_id)
        return queryset
