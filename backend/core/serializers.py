from rest_framework import serializers
from .models import (
    FightType, WeightClass, TrainingGoal, Member, Coach,
    TrainingPlan, TrainingSession, FitnessData, SkillProgression,
    SparringMatch, MatchRequest, InjuryFatigueRecord, MatchingWeightConfig,
    TrainingPlanGoal, TrainingLoadAssessment, MatchRiskAssessment
)


class FightTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FightType
        fields = '__all__'


class WeightClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeightClass
        fields = '__all__'


class TrainingGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingGoal
        fields = '__all__'


class MemberSimpleSerializer(serializers.ModelSerializer):
    fight_types = FightTypeSerializer(many=True, read_only=True)
    weight_class = WeightClassSerializer(read_only=True)
    training_goals = TrainingGoalSerializer(many=True, read_only=True)

    class Meta:
        model = Member
        fields = ['id', 'name', 'phone', 'email', 'age', 'gender', 'weight', 'height',
                  'fight_types', 'weight_class', 'training_goals', 'skill_level', 'skill_score',
                  'available_times', 'join_date', 'is_active', 'avatar', 'notes']


class MemberSerializer(serializers.ModelSerializer):
    fight_types = FightTypeSerializer(many=True, read_only=True)
    fight_type_ids = serializers.ListField(write_only=True, required=False)
    weight_class = WeightClassSerializer(read_only=True)
    weight_class_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    training_goals = TrainingGoalSerializer(many=True, read_only=True)
    training_goal_ids = serializers.ListField(write_only=True, required=False)

    class Meta:
        model = Member
        fields = ['id', 'name', 'phone', 'email', 'age', 'gender', 'weight', 'height',
                  'fight_types', 'fight_type_ids', 'weight_class', 'weight_class_id',
                  'training_goals', 'training_goal_ids', 'skill_level', 'skill_score',
                  'available_times', 'join_date', 'is_active', 'avatar', 'notes']

    def create(self, validated_data):
        fight_type_ids = validated_data.pop('fight_type_ids', [])
        training_goal_ids = validated_data.pop('training_goal_ids', [])
        weight_class_id = validated_data.pop('weight_class_id', None)

        if weight_class_id:
            validated_data['weight_class_id'] = weight_class_id

        member = Member.objects.create(**validated_data)

        if fight_type_ids:
            member.fight_types.set(fight_type_ids)
        if training_goal_ids:
            member.training_goals.set(training_goal_ids)

        return member

    def update(self, instance, validated_data):
        fight_type_ids = validated_data.pop('fight_type_ids', None)
        training_goal_ids = validated_data.pop('training_goal_ids', None)
        weight_class_id = validated_data.pop('weight_class_id', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if weight_class_id is not None:
            instance.weight_class_id = weight_class_id
        if fight_type_ids is not None:
            instance.fight_types.set(fight_type_ids)
        if training_goal_ids is not None:
            instance.training_goals.set(training_goal_ids)

        instance.save()
        return instance


class CoachSerializer(serializers.ModelSerializer):
    specialty = FightTypeSerializer(many=True, read_only=True)
    specialty_ids = serializers.ListField(write_only=True, required=False)

    class Meta:
        model = Coach
        fields = ['id', 'name', 'phone', 'email', 'specialty', 'specialty_ids',
                  'experience_years', 'certification', 'avatar']

    def create(self, validated_data):
        specialty_ids = validated_data.pop('specialty_ids', [])
        coach = Coach.objects.create(**validated_data)
        if specialty_ids:
            coach.specialty.set(specialty_ids)
        return coach

    def update(self, instance, validated_data):
        specialty_ids = validated_data.pop('specialty_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if specialty_ids is not None:
            instance.specialty.set(specialty_ids)
        instance.save()
        return instance


class CoachSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coach
        fields = ['id', 'name', 'experience_years', 'avatar']


class TrainingPlanSerializer(serializers.ModelSerializer):
    member = MemberSimpleSerializer(read_only=True)
    member_id = serializers.IntegerField(write_only=True)
    coach = CoachSimpleSerializer(read_only=True)
    coach_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    fight_type = FightTypeSerializer(read_only=True)
    fight_type_id = serializers.IntegerField(write_only=True)
    completed_sessions = serializers.SerializerMethodField()

    class Meta:
        model = TrainingPlan
        fields = ['id', 'member', 'member_id', 'coach', 'coach_id', 'name', 'description',
                  'fight_type', 'fight_type_id', 'start_date', 'end_date', 'total_sessions',
                  'sessions_per_week', 'goals', 'is_active', 'created_at', 'completed_sessions']

    def get_completed_sessions(self, obj):
        return obj.sessions.filter(status='completed').count()


class FitnessDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = FitnessData
        fields = '__all__'


class TrainingSessionSerializer(serializers.ModelSerializer):
    member = MemberSimpleSerializer(read_only=True)
    member_id = serializers.IntegerField(write_only=True)
    coach = CoachSimpleSerializer(read_only=True)
    coach_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    fight_type = FightTypeSerializer(read_only=True)
    fight_type_id = serializers.IntegerField(write_only=True)
    training_plan = TrainingPlanSerializer(read_only=True)
    training_plan_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    fitness_data = FitnessDataSerializer(read_only=True, source='fitness_data')

    class Meta:
        model = TrainingSession
        fields = ['id', 'training_plan', 'training_plan_id', 'member', 'member_id',
                  'coach', 'coach_id', 'fight_type', 'fight_type_id', 'session_date',
                  'duration_minutes', 'status', 'content', 'performance_notes',
                  'techniques_practiced', 'attendance', 'fitness_data']


class SkillProgressionSerializer(serializers.ModelSerializer):
    member = MemberSimpleSerializer(read_only=True)
    member_id = serializers.IntegerField(write_only=True)
    fight_type = FightTypeSerializer(read_only=True)
    fight_type_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = SkillProgression
        fields = ['id', 'member', 'member_id', 'fight_type', 'fight_type_id',
                  'technique', 'mastery_level', 'date_recorded', 'coach_notes']


class SparringMatchSerializer(serializers.ModelSerializer):
    member1 = MemberSimpleSerializer(read_only=True)
    member1_id = serializers.IntegerField(write_only=True)
    member2 = MemberSimpleSerializer(read_only=True)
    member2_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    fight_type = FightTypeSerializer(read_only=True)
    fight_type_id = serializers.IntegerField(write_only=True)
    weight_class = WeightClassSerializer(read_only=True)
    weight_class_id = serializers.IntegerField(write_only=True)
    winner = MemberSimpleSerializer(read_only=True)
    loser = MemberSimpleSerializer(read_only=True)

    class Meta:
        model = SparringMatch
        fields = ['id', 'member1', 'member1_id', 'member2', 'member2_id', 'fight_type',
                  'fight_type_id', 'weight_class', 'weight_class_id', 'scheduled_date',
                  'duration_minutes', 'status', 'result', 'winner', 'loser', 'match_notes',
                  'member1_score', 'member2_score', 'techniques_used', 'match_score']


class MatchRequestSerializer(serializers.ModelSerializer):
    member = MemberSimpleSerializer(read_only=True)
    member_id = serializers.IntegerField(write_only=True)
    fight_type = FightTypeSerializer(read_only=True)
    fight_type_id = serializers.IntegerField(write_only=True)
    potential_matches = serializers.SerializerMethodField()

    class Meta:
        model = MatchRequest
        fields = ['id', 'member', 'member_id', 'fight_type', 'fight_type_id',
                  'preferred_date', 'weight_range_min', 'weight_range_max',
                  'skill_level_preference', 'status', 'created_at', 'potential_matches']

    def get_potential_matches(self, obj):
        from .matching import find_potential_partners
        partners = find_potential_partners(obj)
        return MemberSimpleSerializer([p[0] for p in partners], many=True).data


class InjuryFatigueRecordSerializer(serializers.ModelSerializer):
    member = MemberSimpleSerializer(read_only=True)
    member_id = serializers.IntegerField(write_only=True)
    reported_by = CoachSimpleSerializer(read_only=True)
    reported_by_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = InjuryFatigueRecord
        fields = '__all__'


class MatchingWeightConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchingWeightConfig
        fields = '__all__'


class TrainingPlanGoalSerializer(serializers.ModelSerializer):
    training_plan = TrainingPlanSerializer(read_only=True)
    training_plan_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = TrainingPlanGoal
        fields = '__all__'


class TrainingLoadAssessmentSerializer(serializers.ModelSerializer):
    member = MemberSimpleSerializer(read_only=True)
    member_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = TrainingLoadAssessment
        fields = '__all__'


class MatchRiskAssessmentSerializer(serializers.ModelSerializer):
    member1 = MemberSimpleSerializer(read_only=True)
    member1_id = serializers.IntegerField(write_only=True)
    member2 = MemberSimpleSerializer(read_only=True)
    member2_id = serializers.IntegerField(write_only=True)
    fight_type = FightTypeSerializer(read_only=True)
    fight_type_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = MatchRiskAssessment
        fields = '__all__'
