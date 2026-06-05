from django.core.management.base import BaseCommand
from core.models import FightType, WeightClass, TrainingGoal, Member, Coach
from django.contrib.auth.models import User
import random


class Command(BaseCommand):
    help = 'Initialize fight gym data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Initializing fight gym data...')

        fight_types_data = [
            {'name': '拳击', 'description': '站立式格斗，以拳头攻击为主'},
            {'name': '巴西柔术', 'description': '地面格斗技术，以降服技为主'},
            {'name': '泰拳', 'description': '泰国传统武术，拳脚肘膝并用'},
            {'name': '综合格斗', 'description': '综合各种格斗技术的自由格斗'},
            {'name': '散打', 'description': '中国武术实战形式，踢打摔结合'},
            {'name': '摔跤', 'description': '以摔倒对手为目的的格斗项目'},
        ]

        for ft in fight_types_data:
            FightType.objects.get_or_create(name=ft['name'], defaults={'description': ft['description']})

        weight_classes_data = [
            {'name': '蝇量级', 'min_weight': 50, 'max_weight': 57},
            {'name': '羽量级', 'min_weight': 57, 'max_weight': 63},
            {'name': '轻量级', 'min_weight': 63, 'max_weight': 70},
            {'name': '次中量级', 'min_weight': 70, 'max_weight': 77},
            {'name': '中量级', 'min_weight': 77, 'max_weight': 84},
            {'name': '轻重量级', 'min_weight': 84, 'max_weight': 93},
            {'name': '重量级', 'min_weight': 93, 'max_weight': 120},
        ]

        for wc in weight_classes_data:
            WeightClass.objects.get_or_create(
                name=wc['name'],
                defaults={'min_weight': wc['min_weight'], 'max_weight': wc['max_weight']}
            )

        training_goals_data = [
            {'name': '健身塑形', 'description': '通过格斗训练改善体型和健康'},
            {'name': '防身自卫', 'description': '学习实用的自卫技术'},
            {'name': '竞技比赛', 'description': '参加格斗比赛提升竞技水平'},
            {'name': '减压释放', 'description': '通过运动释放压力'},
            {'name': '提升自信', 'description': '通过训练建立自信心'},
            {'name': '专业训练', 'description': '成为专业格斗选手'},
        ]

        for tg in training_goals_data:
            TrainingGoal.objects.get_or_create(name=tg['name'], defaults={'description': tg['description']})

        fight_types = list(FightType.objects.all())
        weight_classes = list(WeightClass.objects.all())
        training_goals = list(TrainingGoal.objects.all())

        skill_levels = ['beginner', 'intermediate', 'advanced', 'competitor']
        available_times_options = [
            ['周一18:00', '周三18:00', '周五18:00'],
            ['周二19:00', '周四19:00', '周六10:00'],
            ['周一19:00', '周三19:00', '周五19:00', '周日15:00'],
            ['周二18:00', '周四18:00', '周六15:00'],
        ]

        names_male = ['张伟', '李强', '王磊', '刘洋', '陈涛', '杨波', '赵峰', '黄磊', '周杰', '吴鹏']
        names_female = ['李娜', '王芳', '张丽', '刘敏', '陈静', '杨燕', '赵雪', '黄丽', '周婷', '吴倩']

        all_names = names_male + names_female
        random.shuffle(all_names)

        for i, name in enumerate(all_names[:15]):
            gender = 'male' if name in names_male else 'female'
            base_weight = 65 if gender == 'male' else 55
            weight = base_weight + random.randint(-10, 20)

            wc = None
            for w in weight_classes:
                if w.min_weight <= weight <= w.max_weight:
                    wc = w
                    break

            user, _ = User.objects.get_or_create(
                username=f'member{i+1}',
                defaults={'email': f'member{i+1}@gym.com'}
            )

            member = Member.objects.create(
                user=user,
                name=name,
                phone=f'138{random.randint(10000000, 99999999)}',
                email=f'{name.lower()}@gym.com',
                age=random.randint(18, 45),
                gender=gender,
                weight=weight,
                height=165 + random.randint(0, 25),
                weight_class=wc,
                skill_level=random.choice(skill_levels),
                skill_score=random.randint(0, 500),
                available_times=random.choice(available_times_options),
                is_active=True,
                notes=''
            )

            num_fight_types = random.randint(1, 3)
            member.fight_types.set(random.sample(fight_types, num_fight_types))

            num_goals = random.randint(1, 3)
            member.training_goals.set(random.sample(training_goals, num_goals))

            member.save()

        coach_names = ['陈教练', '李教练', '王教练', '张教练']
        for i, name in enumerate(coach_names):
            user, _ = User.objects.get_or_create(
                username=f'coach{i+1}',
                defaults={'email': f'coach{i+1}@gym.com'}
            )

            coach = Coach.objects.create(
                user=user,
                name=name,
                phone=f'139{random.randint(10000000, 99999999)}',
                email=f'coach{i+1}@gym.com',
                experience_years=random.randint(3, 15),
                certification='国际教练认证'
            )

            num_specialty = random.randint(2, 4)
            coach.specialty.set(random.sample(fight_types, num_specialty))
            coach.save()

        self.stdout.write(self.style.SUCCESS(
            f'Successfully initialized: {FightType.objects.count()} fight types, '
            f'{WeightClass.objects.count()} weight classes, '
            f'{TrainingGoal.objects.count()} training goals, '
            f'{Member.objects.count()} members, '
            f'{Coach.objects.count()} coaches'
        ))
