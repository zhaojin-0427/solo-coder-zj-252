from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Avg, Q
from django.utils import timezone
from datetime import timedelta
from collections import defaultdict

from .models import (
    FightType, WeightClass, TrainingGoal, Member, Coach,
    TrainingPlan, TrainingSession, FitnessData, SkillProgression,
    SparringMatch, MatchRequest
)
from .serializers import (
    FightTypeSerializer, WeightClassSerializer, TrainingGoalSerializer,
    MemberSerializer, CoachSerializer, TrainingPlanSerializer,
    TrainingSessionSerializer, FitnessDataSerializer,
    SkillProgressionSerializer, SparringMatchSerializer,
    MatchRequestSerializer
)
from .matching import find_potential_partners, auto_match_requests, calculate_match_score


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
        partners = find_potential_partners(temp_request)

        result = []
        for partner in partners:
            score = calculate_match_score(member, partner, int(fight_type_id))
            result.append({
                'member': MemberSerializer(partner).data,
                'match_score': score
            })

        return Response(result)


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
        partners = find_potential_partners(match_request)

        result = []
        for partner in partners:
            score = calculate_match_score(
                match_request.member, partner, match_request.fight_type_id, match_request.preferred_date)
            result.append({
                'member': MemberSerializer(partner).data,
                'match_score': score
            })

        return Response(result)

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
