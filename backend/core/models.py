from django.db import models
from django.contrib.auth.models import User


class FightType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class WeightClass(models.Model):
    name = models.CharField(max_length=50)
    min_weight = models.FloatField()
    max_weight = models.FloatField()

    def __str__(self):
        return f"{self.name} ({self.min_weight}-{self.max_weight}kg)"


class TrainingGoal(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class SkillLevel(models.TextChoices):
    BEGINNER = 'beginner', '初级'
    INTERMEDIATE = 'intermediate', '中级'
    ADVANCED = 'advanced', '高级'
    COMPETITOR = 'competitor', '竞技级'


class Member(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    email = models.EmailField(unique=True)
    age = models.IntegerField()
    gender = models.CharField(max_length=10, choices=[('male', '男'), ('female', '女')])
    weight = models.FloatField()
    height = models.FloatField(null=True, blank=True)
    fight_types = models.ManyToManyField(FightType, related_name='members')
    weight_class = models.ForeignKey(WeightClass, on_delete=models.SET_NULL, null=True, blank=True)
    training_goals = models.ManyToManyField(TrainingGoal, related_name='members')
    skill_level = models.CharField(max_length=20, choices=SkillLevel.choices, default=SkillLevel.BEGINNER)
    skill_score = models.IntegerField(default=0)
    available_times = models.JSONField(default=list)
    join_date = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    avatar = models.URLField(blank=True, null=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return self.name

    def update_skill_score(self):
        sessions = self.training_sessions.filter(status='completed').count()
        matches_won = self.sparring_matches_won.filter(result='win').count()
        matches_lost = self.sparring_matches_lost.filter(result='loss').count()
        self.skill_score = sessions * 10 + matches_won * 25 - matches_lost * 5
        self.save()


class Coach(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    email = models.EmailField(unique=True)
    specialty = models.ManyToManyField(FightType, related_name='coaches')
    experience_years = models.IntegerField()
    certification = models.CharField(max_length=200, blank=True)
    avatar = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.name


class TrainingPlan(models.Model):
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='training_plans')
    coach = models.ForeignKey(Coach, on_delete=models.SET_NULL, null=True, related_name='plans')
    name = models.CharField(max_length=100)
    description = models.TextField()
    fight_type = models.ForeignKey(FightType, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    total_sessions = models.IntegerField(default=12)
    sessions_per_week = models.IntegerField(default=3)
    goals = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.member.name}"


class TrainingSession(models.Model):
    STATUS_CHOICES = [
        ('scheduled', '已预约'),
        ('completed', '已完成'),
        ('cancelled', '已取消'),
    ]

    training_plan = models.ForeignKey(TrainingPlan, on_delete=models.CASCADE, related_name='sessions', null=True, blank=True)
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='training_sessions')
    coach = models.ForeignKey(Coach, on_delete=models.SET_NULL, null=True, related_name='coaching_sessions')
    fight_type = models.ForeignKey(FightType, on_delete=models.CASCADE)
    session_date = models.DateTimeField()
    duration_minutes = models.IntegerField(default=60)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    content = models.TextField(blank=True)
    performance_notes = models.TextField(blank=True)
    techniques_practiced = models.JSONField(default=list)
    attendance = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.member.name} - {self.fight_type} - {self.session_date}"


class FitnessData(models.Model):
    training_session = models.OneToOneField(TrainingSession, on_delete=models.CASCADE, related_name='fitness_data')
    heart_rate_avg = models.IntegerField(null=True, blank=True)
    heart_rate_max = models.IntegerField(null=True, blank=True)
    calories_burned = models.IntegerField(null=True, blank=True)
    weight = models.FloatField(null=True, blank=True)
    body_fat = models.FloatField(null=True, blank=True)
    flexibility_score = models.IntegerField(null=True, blank=True)
    strength_score = models.IntegerField(null=True, blank=True)
    endurance_score = models.IntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Fitness Data - {self.training_session}"


class SkillProgression(models.Model):
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='skill_progressions')
    fight_type = models.ForeignKey(FightType, on_delete=models.CASCADE)
    technique = models.CharField(max_length=100)
    mastery_level = models.IntegerField(default=0)
    date_recorded = models.DateField(auto_now_add=True)
    coach_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-date_recorded']

    def __str__(self):
        return f"{self.member.name} - {self.technique} - {self.mastery_level}%"


class SparringMatch(models.Model):
    RESULT_CHOICES = [
        ('win', '胜利'),
        ('loss', '失败'),
        ('draw', '平局'),
        ('cancelled', '取消'),
    ]
    STATUS_CHOICES = [
        ('pending', '待配对'),
        ('scheduled', '已安排'),
        ('completed', '已完成'),
        ('cancelled', '已取消'),
    ]

    member1 = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='sparring_matches_as_1')
    member2 = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='sparring_matches_as_2', null=True, blank=True)
    fight_type = models.ForeignKey(FightType, on_delete=models.CASCADE)
    weight_class = models.ForeignKey(WeightClass, on_delete=models.CASCADE)
    scheduled_date = models.DateTimeField()
    duration_minutes = models.IntegerField(default=15)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    result = models.CharField(max_length=20, choices=RESULT_CHOICES, blank=True, null=True)
    winner = models.ForeignKey(Member, on_delete=models.SET_NULL, related_name='sparring_matches_won', null=True, blank=True)
    loser = models.ForeignKey(Member, on_delete=models.SET_NULL, related_name='sparring_matches_lost', null=True, blank=True)
    match_notes = models.TextField(blank=True)
    member1_score = models.IntegerField(null=True, blank=True)
    member2_score = models.IntegerField(null=True, blank=True)
    techniques_used = models.JSONField(default=list)
    match_score = models.FloatField(default=0)

    def __str__(self):
        return f"{self.member1.name} vs {self.member2.name if self.member2 else 'TBD'} - {self.fight_type}"


class MatchRequest(models.Model):
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='match_requests')
    fight_type = models.ForeignKey(FightType, on_delete=models.CASCADE)
    preferred_date = models.DateTimeField()
    weight_range_min = models.FloatField()
    weight_range_max = models.FloatField()
    skill_level_preference = models.CharField(max_length=20, choices=SkillLevel.choices, null=True, blank=True)
    status = models.CharField(max_length=20, choices=[('open', '开放'), ('matched', '已配对'), ('expired', '已过期')], default='open')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.member.name} - {self.fight_type} - {self.preferred_date}"


class InjuryFatigueRecord(models.Model):
    TYPE_CHOICES = [
        ('injury', '伤病'),
        ('fatigue', '疲劳'),
        ('rest', '休息需求'),
    ]
    SEVERITY_CHOICES = [
        ('mild', '轻微'),
        ('moderate', '中等'),
        ('severe', '严重'),
    ]
    STATUS_CHOICES = [
        ('active', '活动中'),
        ('recovered', '已恢复'),
        ('chronic', '慢性'),
    ]

    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='injury_fatigue_records')
    reported_by = models.ForeignKey(Coach, on_delete=models.SET_NULL, null=True, blank=True, related_name='reported_records')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='mild')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    description = models.TextField()
    affected_body_part = models.CharField(max_length=100, blank=True)
    onset_date = models.DateField()
    expected_recovery_date = models.DateField(null=True, blank=True)
    actual_recovery_date = models.DateField(null=True, blank=True)
    training_restriction_days = models.IntegerField(default=0)
    no_sparring_days = models.IntegerField(default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.member.name} - {self.get_type_display()} - {self.get_severity_display()}"


class MatchingWeightConfig(models.Model):
    INTENSITY_CHOICES = [
        ('very_light', '极轻量'),
        ('light', '轻量'),
        ('moderate', '中等'),
        ('intense', '高强度'),
        ('very_intense', '极高强度'),
    ]

    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)
    weight_similarity_weight = models.FloatField(default=35)
    skill_similarity_weight = models.FloatField(default=35)
    time_compatibility_weight = models.FloatField(default=20)
    fight_type_match_weight = models.FloatField(default=10)
    recent_match_avoidance_weight = models.FloatField(default=5)
    load_risk_penalty_weight = models.FloatField(default=30)
    injury_risk_penalty_weight = models.FloatField(default=40)
    max_allowed_weight_diff = models.FloatField(default=5)
    max_allowed_skill_diff = models.IntegerField(default=2)
    max_allowed_risk_score = models.FloatField(default=60)
    min_recent_match_interval_days = models.IntegerField(default=3)
    auto_block_high_risk = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class TrainingPlanGoal(models.Model):
    PERIOD_CHOICES = [
        ('weekly', '每周'),
        ('biweekly', '每两周'),
        ('monthly', '每月'),
    ]
    INTENSITY_CHOICES = [
        ('very_light', '极轻量'),
        ('light', '轻量'),
        ('moderate', '中等'),
        ('intense', '高强度'),
        ('very_intense', '极高强度'),
    ]

    training_plan = models.OneToOneField(TrainingPlan, on_delete=models.CASCADE, related_name='plan_goals')
    period_type = models.CharField(max_length=50, default='weekly')
    target_load_per_week = models.FloatField(default=500)
    max_load_per_week = models.FloatField(default=800)
    max_sessions_per_week = models.IntegerField(default=5)
    max_consecutive_training_days = models.IntegerField(default=3)
    min_rest_days_per_week = models.IntegerField(default=1)
    target_intensity = models.CharField(max_length=20, choices=INTENSITY_CHOICES, default='moderate')
    max_intensity = models.CharField(max_length=20, choices=INTENSITY_CHOICES, default='intense')
    allow_sparring = models.BooleanField(default=True)
    max_sparring_per_week = models.IntegerField(default=2)
    weight_gain_goal = models.FloatField(null=True, blank=True)
    weight_loss_goal = models.FloatField(null=True, blank=True)
    skill_improvement_goals = models.JSONField(default=list)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Goals for {self.training_plan.name}"


class TrainingLoadAssessment(models.Model):
    LOAD_LEVEL_CHOICES = [
        ('very_low', '极低'),
        ('low', '低'),
        ('moderate', '中等'),
        ('high', '高'),
        ('very_high', '极高'),
    ]
    RECOVERY_STATUS_CHOICES = [
        ('exhausted', '疲惫'),
        ('fatigued', '疲劳'),
        ('normal', '正常'),
        ('recovered', '恢复良好'),
        ('fresh', '状态极佳'),
    ]

    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='load_assessments')
    assessment_date = models.DateField()
    training_load_index = models.FloatField(default=0)
    load_level = models.CharField(max_length=20, choices=LOAD_LEVEL_CHOICES, default='moderate')
    recovery_status = models.CharField(max_length=20, choices=RECOVERY_STATUS_CHOICES, default='normal')
    recovery_score = models.FloatField(default=50)
    acute_load = models.FloatField(default=0)
    chronic_load = models.FloatField(default=0)
    acwr = models.FloatField(default=0)
    fatigue_score = models.FloatField(default=0)
    injury_risk_score = models.FloatField(default=0)
    available_training_minutes = models.IntegerField(default=0)
    recommended_intensity = models.CharField(max_length=50, default='moderate')
    data_sources = models.JSONField(default=dict)
    calculation_details = models.JSONField(default=dict)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-assessment_date']
        unique_together = ('member', 'assessment_date')

    def __str__(self):
        return f"{self.member.name} - {self.assessment_date} - TLI: {self.training_load_index}"


class MatchRiskAssessment(models.Model):
    RISK_LEVEL_CHOICES = [
        ('safe', '安全'),
        ('low', '低风险'),
        ('moderate', '中等风险'),
        ('high', '高风险'),
        ('dangerous', '危险'),
    ]

    member1 = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='risk_assessments_as_1')
    member2 = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='risk_assessments_as_2')
    fight_type = models.ForeignKey(FightType, on_delete=models.CASCADE)
    assessment_date = models.DateTimeField(auto_now_add=True)
    risk_level = models.CharField(max_length=20, choices=RISK_LEVEL_CHOICES, default='safe')
    risk_score = models.FloatField(default=0)
    weight_diff_score = models.FloatField(default=0)
    skill_diff_score = models.FloatField(default=0)
    fatigue_risk_score = models.FloatField(default=0)
    injury_risk_score = models.FloatField(default=0)
    recent_match_penalty = models.FloatField(default=0)
    risk_factors = models.JSONField(default=list)
    recommendations = models.JSONField(default=list)
    is_blocked = models.BooleanField(default=False)
    block_reason = models.TextField(blank=True)

    class Meta:
        ordering = ['-assessment_date']

    def __str__(self):
        return f"{self.member1.name} vs {self.member2.name} - {self.get_risk_level_display()}"
