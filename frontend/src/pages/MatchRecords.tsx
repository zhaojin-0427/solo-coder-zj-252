import { useState, useEffect } from 'react';
import {
  Table,
  Modal,
  Form,
  Input,
  Select,
  Button,
  Tag,
  Card,
  Space,
  Rate,
  List,
  Avatar,
  Tabs,
  message,
  Divider,
  Progress,
  Slider,
  DatePicker,
  InputNumber,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  trainingSessionApi,
  sparringMatchApi,
  memberApi,
  coachApi,
  fightTypeApi,
  skillProgressionApi,
  injuryFatigueRecordApi,
  memberApiExtended,
} from '../services/api';
import type {
  TrainingSession,
  SparringMatch,
  Member,
  Coach,
  FightType,
  FitnessData,
  SkillProgression,
  InjuryFatigueRecord,
} from '../types';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface SessionFilterValues {
  member_id?: number;
  coach_id?: number;
  status?: string;
}

interface MatchFilterValues {
  member_id?: number;
  fight_type_id?: number;
  status?: string;
}

interface CompleteSessionFormValues {
  attendance: boolean;
  content: string;
  performance_notes: string;
  techniques_practiced: string[];
  heart_rate_avg?: number;
  heart_rate_max?: number;
  calories_burned?: number;
  weight?: number;
  body_fat?: number;
  strength_score?: number;
  endurance_score?: number;
  flexibility_score?: number;
}

interface RecordResultFormValues {
  result: string;
  member1_score: number;
  member2_score: number;
  match_notes: string;
  techniques_used: string[];
}

interface SkillProgressionFormValues {
  technique: string;
  mastery_level: number;
  coach_notes: string;
}

interface InjuryFatigueFormValues {
  type: 'injury' | 'fatigue' | 'rest';
  severity: 'mild' | 'moderate' | 'severe';
  status: 'active' | 'recovered' | 'chronic';
  description: string;
  affected_body_part: string;
  onset_date: string;
  expected_recovery_date?: string;
  training_restriction_days: number;
  no_sparring_days: number;
  notes: string;
}

const sessionStatusColors: Record<string, string> = {
  scheduled: 'blue',
  completed: 'green',
  cancelled: 'red',
};

const matchResultColors: Record<string, string> = {
  win: 'gold',
  loss: 'red',
  draw: 'blue',
  cancelled: 'default',
};

const matchResultText: Record<string, string> = {
  win: '胜利',
  loss: '失败',
  draw: '平局',
  cancelled: '已取消',
};

const injuryTypeText: Record<string, string> = {
  injury: '伤病',
  fatigue: '疲劳',
  rest: '休息需求',
};

const injurySeverityText: Record<string, string> = {
  mild: '轻微',
  moderate: '中等',
  severe: '严重',
};

const injuryStatusText: Record<string, string> = {
  active: '活动中',
  recovered: '已恢复',
  chronic: '慢性',
};

const injuryTypeColors: Record<string, string> = {
  injury: 'red',
  fatigue: 'orange',
  rest: 'blue',
};

const injurySeverityColors: Record<string, string> = {
  mild: 'green',
  moderate: 'orange',
  severe: 'red',
};

const injuryStatusColors: Record<string, string> = {
  active: 'red',
  recovered: 'green',
  chronic: 'orange',
};

const bodyParts = [
  '头部', '颈部', '肩部', '手臂', '肘部', '手腕', '手掌', '手指',
  '胸部', '背部', '腰部', '腹部', '髋部', '臀部',
  '大腿', '膝盖', '小腿', '脚踝', '脚部', '脚趾',
  '全身', '其他',
];

const MatchRecordsPage = () => {
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [matches, setMatches] = useState<SparringMatch[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [fightTypes, setFightTypes] = useState<FightType[]>([]);
  const [skillProgressions, setSkillProgressions] = useState<SkillProgression[]>([]);
  const [injuryFatigueRecords, setInjuryFatigueRecords] = useState<InjuryFatigueRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [injuryLoading, setInjuryLoading] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [sessionDetailVisible, setSessionDetailVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [matchDetailVisible, setMatchDetailVisible] = useState(false);
  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [injuryFatigueModalVisible, setInjuryFatigueModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<SparringMatch | null>(null);
  const [selectedMemberForInjury, setSelectedMemberForInjury] = useState<Member | null>(null);
  const [sessionDetailTab, setSessionDetailTab] = useState('info');
  const [matchDetailTab, setMatchDetailTab] = useState('info');
  const [sessionFilterForm] = Form.useForm<SessionFilterValues>();
  const [matchFilterForm] = Form.useForm<MatchFilterValues>();
  const [completeForm] = Form.useForm<CompleteSessionFormValues>();
  const [resultForm] = Form.useForm<RecordResultFormValues>();
  const [skillForm] = Form.useForm<SkillProgressionFormValues>();
  const [injuryFatigueForm] = Form.useForm<InjuryFatigueFormValues>();

  const fetchMembers = async () => {
    try {
      const response = await memberApi.getAll({ is_active: true });
      setMembers(response.data.results);
    } catch {
      message.error('获取会员列表失败');
    }
  };

  const fetchCoaches = async () => {
    try {
      const response = await coachApi.getAll();
      setCoaches(response.data);
    } catch {
      message.error('获取教练列表失败');
    }
  };

  const fetchFightTypes = async () => {
    try {
      const response = await fightTypeApi.getAll();
      setFightTypes(response.data);
    } catch {
      message.error('获取格斗类型失败');
    }
  };

  const fetchSessions = async (filters?: SessionFilterValues) => {
    setLoading(true);
    try {
      const params: { member?: number; coach?: number; status?: string } = {};
      if (filters?.member_id) params.member = filters.member_id;
      if (filters?.coach_id) params.coach = filters.coach_id;
      if (filters?.status) params.status = filters.status;
      const response = await trainingSessionApi.getAll(params);
      setSessions(response.data.results);
    } catch {
      message.error('获取训练课程列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async (filters?: MatchFilterValues) => {
    setLoading(true);
    try {
      const params: { member?: number; fight_type?: number; status?: string } = {};
      if (filters?.member_id) params.member = filters.member_id;
      if (filters?.fight_type_id) params.fight_type = filters.fight_type_id;
      if (filters?.status) params.status = filters.status;
      const response = await sparringMatchApi.getAll(params);
      setMatches(response.data.results);
    } catch {
      message.error('获取对练比赛列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchInjuryFatigueRecords = async (memberId: number) => {
    setInjuryLoading(true);
    try {
      const response = await memberApiExtended.getInjuryFatigueRecords(memberId);
      setInjuryFatigueRecords(response.data);
    } catch {
      message.error('获取伤病/疲劳记录失败');
    } finally {
      setInjuryLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchCoaches();
    fetchFightTypes();
  }, []);

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    } else {
      fetchMatches();
    }
  }, [activeTab]);

  const fetchSkillProgressions = async (memberId: number, fightTypeId: number) => {
    try {
      const response = await skillProgressionApi.getAll({
        member: memberId,
        fight_type: fightTypeId,
      });
      setSkillProgressions(response.data.results);
    } catch {
      message.error('获取技能进度失败');
    }
  };

  const handleCompleteSession = (session: TrainingSession) => {
    setSelectedSession(session);
    completeForm.resetFields();
    completeForm.setFieldsValue({
      attendance: true,
      content: session.content || '',
      performance_notes: session.performance_notes || '',
      techniques_practiced: session.techniques_practiced || [],
    });
    setCompleteModalVisible(true);
  };

  const handleViewSessionDetail = async (session: TrainingSession) => {
    setSelectedSession(session);
    setSessionDetailTab('info');
    await fetchSkillProgressions(session.member_id, session.fight_type_id);
    setSessionDetailVisible(true);
  };

  const handleSubmitComplete = async () => {
    if (!selectedSession) return;
    try {
      const values = await completeForm.validateFields();
      const {
        attendance,
        content,
        performance_notes,
        techniques_practiced,
        ...fitnessData
      } = values;

      await trainingSessionApi.complete(selectedSession.id, {
        attendance,
        content,
        performance_notes,
        techniques_practiced,
      });

      const hasFitnessData = Object.values(fitnessData).some(
        (v) => v !== undefined && v !== null
      );
      if (hasFitnessData) {
        await trainingSessionApi.recordFitness(selectedSession.id, fitnessData);
      }

      message.success('记录成绩成功');
      setCompleteModalVisible(false);
      fetchSessions(sessionFilterForm.getFieldsValue());
    } catch {
      message.error('记录成绩失败');
    }
  };

  const handleRecordResult = (match: SparringMatch) => {
    setSelectedMatch(match);
    resultForm.resetFields();
    resultForm.setFieldsValue({
      result: match.result || 'win',
      member1_score: match.member1_score || 0,
      member2_score: match.member2_score || 0,
      match_notes: match.match_notes || '',
      techniques_used: match.techniques_used || [],
    });
    setResultModalVisible(true);
  };

  const handleViewMatchDetail = (match: SparringMatch) => {
    setSelectedMatch(match);
    setMatchDetailTab('info');
    setMatchDetailVisible(true);
  };

  const handleSubmitResult = async () => {
    if (!selectedMatch) return;
    try {
      const values = await resultForm.validateFields();
      await sparringMatchApi.recordResult(selectedMatch.id, values);
      message.success('记录比赛结果成功');
      setResultModalVisible(false);
      fetchMatches(matchFilterForm.getFieldsValue());
    } catch {
      message.error('记录比赛结果失败');
    }
  };

  const handleAddSkill = () => {
    if (!selectedSession) return;
    skillForm.resetFields();
    skillForm.setFieldsValue({
      mastery_level: 50,
    });
    setSkillModalVisible(true);
  };

  const handleSubmitSkill = async () => {
    if (!selectedSession) return;
    try {
      const values = await skillForm.validateFields();
      await skillProgressionApi.create({
        ...values,
        member_id: selectedSession.member_id,
        fight_type_id: selectedSession.fight_type_id,
        date_recorded: dayjs().format('YYYY-MM-DD'),
      });
      message.success('记录技能进步成功');
      setSkillModalVisible(false);
      await fetchSkillProgressions(selectedSession.member_id, selectedSession.fight_type_id);
    } catch {
      message.error('记录技能进步失败');
    }
  };

  const handleRecordInjuryFatigueForSession = (session: TrainingSession) => {
    setSelectedMemberForInjury(session.member);
    injuryFatigueForm.resetFields();
    injuryFatigueForm.setFieldsValue({
      type: 'fatigue',
      severity: 'mild',
      status: 'active',
      onset_date: dayjs().format('YYYY-MM-DD'),
      training_restriction_days: 0,
      no_sparring_days: 0,
    });
    setInjuryFatigueModalVisible(true);
  };

  const handleRecordInjuryFatigueForMatch = (_match: SparringMatch, member: Member) => {
    setSelectedMemberForInjury(member);
    injuryFatigueForm.resetFields();
    injuryFatigueForm.setFieldsValue({
      type: 'fatigue',
      severity: 'mild',
      status: 'active',
      onset_date: dayjs().format('YYYY-MM-DD'),
      training_restriction_days: 0,
      no_sparring_days: 0,
    });
    setInjuryFatigueModalVisible(true);
  };

  const handleSubmitInjuryFatigue = async () => {
    if (!selectedMemberForInjury) return;
    try {
      const values = await injuryFatigueForm.validateFields();
      const formattedValues = {
        ...values,
        onset_date: values.onset_date ? dayjs(values.onset_date).format('YYYY-MM-DD') : undefined,
        expected_recovery_date: values.expected_recovery_date
          ? dayjs(values.expected_recovery_date).format('YYYY-MM-DD')
          : undefined,
      };
      await memberApiExtended.addInjuryFatigue(selectedMemberForInjury.id, formattedValues);
      message.success('记录伤病/疲劳成功');
      setInjuryFatigueModalVisible(false);
      if (selectedSession) {
        await fetchInjuryFatigueRecords(selectedSession.member_id);
      }
      if (selectedMatch) {
        await fetchInjuryFatigueRecords(selectedMatch.member1_id);
      }
    } catch {
      message.error('记录伤病/疲劳失败');
    }
  };

  const handleSessionFilter = () => {
    const values = sessionFilterForm.getFieldsValue();
    fetchSessions(values);
  };

  const handleSessionReset = () => {
    sessionFilterForm.resetFields();
    fetchSessions();
  };

  const handleMatchFilter = () => {
    const values = matchFilterForm.getFieldsValue();
    fetchMatches(values);
  };

  const handleMatchReset = () => {
    matchFilterForm.resetFields();
    fetchMatches();
  };

  const handleSessionDetailTabChange = async (key: string) => {
    setSessionDetailTab(key);
    if (key === 'injury' && selectedSession) {
      await fetchInjuryFatigueRecords(selectedSession.member_id);
    }
  };

  const handleMatchDetailTabChange = async (key: string, memberId: number) => {
    setMatchDetailTab(key);
    if (key === 'injury') {
      await fetchInjuryFatigueRecords(memberId);
    }
  };

  const handleMarkRecovered = async (record: InjuryFatigueRecord) => {
    try {
      await injuryFatigueRecordApi.markRecovered(record.id);
      message.success('标记已恢复成功');
      await fetchInjuryFatigueRecords(record.member_id);
    } catch {
      message.error('标记已恢复失败');
    }
  };

  const sessionColumns: ColumnsType<TrainingSession> = [
    {
      title: '会员',
      dataIndex: ['member', 'name'],
      key: 'member',
      render: (text, record) => (
        <Space>
          <Avatar src={record.member.avatar}>{text?.charAt(0)}</Avatar>
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '教练',
      dataIndex: ['coach', 'name'],
      key: 'coach',
      render: (text) => text || '-',
    },
    {
      title: '格斗类型',
      dataIndex: ['fight_type', 'name'],
      key: 'fight_type',
    },
    {
      title: '课程日期',
      dataIndex: 'session_date',
      key: 'session_date',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '时长(分钟)',
      dataIndex: 'duration_minutes',
      key: 'duration_minutes',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={sessionStatusColors[status] || 'default'}>{status}</Tag>
      ),
    },
    {
      title: '出勤',
      dataIndex: 'attendance',
      key: 'attendance',
      render: (attended) =>
        attended ? <Tag color="green">已出勤</Tag> : <Tag color="red">未出勤</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleViewSessionDetail(record)}
          >
            详情
          </Button>
          {record.status === 'scheduled' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleCompleteSession(record)}
            >
              记录成绩
            </Button>
          )}
          {record.status === 'completed' && (
            <Button
              type="link"
              size="small"
              danger
              onClick={() => handleRecordInjuryFatigueForSession(record)}
            >
              记录伤病/疲劳
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const matchColumns: ColumnsType<SparringMatch> = [
    {
      title: '对阵双方',
      key: 'opponents',
      render: (_, record) => (
        <Space>
          <Avatar src={record.member1.avatar}>{record.member1.name?.charAt(0)}</Avatar>
          <span>{record.member1.name}</span>
          <span style={{ color: '#999' }}>vs</span>
          {record.member2 && (
            <>
              <Avatar src={record.member2.avatar}>{record.member2.name?.charAt(0)}</Avatar>
              <span>{record.member2.name}</span>
            </>
          )}
        </Space>
      ),
    },
    {
      title: '格斗类型',
      dataIndex: ['fight_type', 'name'],
      key: 'fight_type',
    },
    {
      title: '体重级别',
      dataIndex: ['weight_class', 'name'],
      key: 'weight_class',
    },
    {
      title: '比赛时间',
      dataIndex: 'scheduled_date',
      key: 'scheduled_date',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      render: (result) =>
        result ? (
          <Tag color={matchResultColors[result] || 'default'}>
            {matchResultText[result] || result}
          </Tag>
        ) : (
          <Tag color="default">待记录</Tag>
        ),
    },
    {
      title: '比分',
      key: 'score',
      render: (_, record) =>
        record.member1_score !== undefined && record.member2_score !== undefined
          ? `${record.member1_score} : ${record.member2_score}`
          : '-',
    },
    {
      title: '匹配分',
      dataIndex: 'match_score',
      key: 'match_score',
      render: (score) => (
        <Space direction="vertical" size={0}>
          <Rate disabled allowHalf count={5} value={score ? score / 20 : 0} />
          <span style={{ fontSize: 12, color: '#666' }}>{score || 0}/100</span>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleViewMatchDetail(record)}
          >
            详情
          </Button>
          {record.status === 'scheduled' && !record.result && (
            <Button
              type="link"
              size="small"
              onClick={() => handleRecordResult(record)}
            >
              记录比赛结果
            </Button>
          )}
          {record.status === 'completed' && (
            <Space direction="vertical" size={0}>
              <Button
                type="link"
                size="small"
                danger
                onClick={() => handleRecordInjuryFatigueForMatch(record, record.member1)}
              >
                {record.member1.name}伤病/疲劳
              </Button>
              {record.member2 && (
                <Button
                  type="link"
                  size="small"
                  danger
                  onClick={() => handleRecordInjuryFatigueForMatch(record, record.member2!)}
                >
                  {record.member2.name}伤病/疲劳
                </Button>
              )}
            </Space>
          )}
        </Space>
      ),
    },
  ];

  const renderFitnessCard = (fitnessData?: FitnessData) => {
    if (!fitnessData) return <div style={{ color: '#999' }}>暂无体能数据</div>;

    const fitnessItems = [
      { label: '平均心率', value: fitnessData.heart_rate_avg, unit: 'bpm' },
      { label: '最高心率', value: fitnessData.heart_rate_max, unit: 'bpm' },
      { label: '消耗卡路里', value: fitnessData.calories_burned, unit: 'kcal' },
      { label: '体重', value: fitnessData.weight, unit: 'kg' },
      { label: '体脂率', value: fitnessData.body_fat, unit: '%' },
    ];

    const scoreItems = [
      { label: '力量评分', value: fitnessData.strength_score },
      { label: '耐力评分', value: fitnessData.endurance_score },
      { label: '柔韧评分', value: fitnessData.flexibility_score },
    ];

    return (
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap>
          {fitnessItems.map(
            (item) =>
              item.value !== undefined &&
              item.value !== null && (
                <Tag key={item.label} color="blue">
                  {item.label}: {item.value}
                  {item.unit}
                </Tag>
              )
          )}
        </Space>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {scoreItems.map(
            (item) =>
              item.value !== undefined &&
              item.value !== null && (
                <div key={item.label}>
                  <div style={{ marginBottom: 4 }}>
                    <span>{item.label}</span>
                    <span style={{ float: 'right' }}>{item.value}/100</span>
                  </div>
                  <Progress percent={item.value} size="small" />
                </div>
              )
          )}
        </Space>
      </Space>
    );
  };

  const renderSkillProgressionList = () => {
    if (skillProgressions.length === 0)
      return <div style={{ color: '#999' }}>暂无技能进步记录</div>;

    return (
      <List
        dataSource={skillProgressions}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              title={
                <Space>
                  <span>{item.technique}</span>
                  <Tag color="purple">
                    掌握度: {item.mastery_level}%
                  </Tag>
                </Space>
              }
              description={
                <Space direction="vertical" size={0}>
                  <div>
                    记录日期: {dayjs(item.date_recorded).format('YYYY-MM-DD')}
                  </div>
                  {item.coach_notes && (
                    <div style={{ color: '#666' }}>
                      教练备注: {item.coach_notes}
                    </div>
                  )}
                  <Progress
                    percent={item.mastery_level}
                    size="small"
                    style={{ width: 200, marginTop: 4 }}
                  />
                </Space>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  const renderInjuryFatigueList = () => {
    if (injuryFatigueRecords.length === 0)
      return <div style={{ color: '#999', padding: '16px 0' }}>暂无伤病/疲劳记录</div>;

    return (
      <List
        loading={injuryLoading}
        dataSource={injuryFatigueRecords}
        renderItem={(item) => (
          <List.Item
            actions={
              item.status === 'active'
                ? [
                    <Button
                      key="recover"
                      type="link"
                      size="small"
                      onClick={() => handleMarkRecovered(item)}
                    >
                      标记已恢复
                    </Button>,
                  ]
                : []
            }
          >
            <List.Item.Meta
              title={
                <Space wrap>
                  <Tag color={injuryTypeColors[item.type]}>
                    {injuryTypeText[item.type]}
                  </Tag>
                  <Tag color={injurySeverityColors[item.severity]}>
                    {injurySeverityText[item.severity]}
                  </Tag>
                  <Tag color={injuryStatusColors[item.status]}>
                    {injuryStatusText[item.status]}
                  </Tag>
                  <span style={{ fontWeight: 'bold' }}>{item.affected_body_part}</span>
                </Space>
              }
              description={
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <div>
                    <strong>描述:</strong> {item.description}
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                    <span>
                      <strong>发病日期:</strong>{' '}
                      {dayjs(item.onset_date).format('YYYY-MM-DD')}
                    </span>
                    {item.expected_recovery_date && (
                      <span>
                        <strong>预计恢复:</strong>{' '}
                        {dayjs(item.expected_recovery_date).format('YYYY-MM-DD')}
                      </span>
                    )}
                    {item.actual_recovery_date && (
                      <span>
                        <strong>实际恢复:</strong>{' '}
                        {dayjs(item.actual_recovery_date).format('YYYY-MM-DD')}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                    <Tag color="orange">训练限制: {item.training_restriction_days}天</Tag>
                    <Tag color="red">禁止对练: {item.no_sparring_days}天</Tag>
                  </div>
                  {item.notes && (
                    <div style={{ color: '#666', marginTop: 4 }}>
                      <strong>备注:</strong> {item.notes}
                    </div>
                  )}
                  <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                    记录时间: {dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
                  </div>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="训练课程记录" key="sessions">
            <Card size="small" style={{ marginBottom: 16 }}>
              <Form
                form={sessionFilterForm}
                layout="inline"
                onFinish={handleSessionFilter}
              >
                <Form.Item name="member_id" label="会员">
                  <Select placeholder="选择会员" allowClear style={{ width: 150 }}>
                    {members.map((member) => (
                      <Option key={member.id} value={member.id}>
                        {member.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="coach_id" label="教练">
                  <Select placeholder="选择教练" allowClear style={{ width: 150 }}>
                    {coaches.map((coach) => (
                      <Option key={coach.id} value={coach.id}>
                        {coach.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="status" label="状态">
                  <Select placeholder="选择状态" allowClear style={{ width: 120 }}>
                    <Option value="scheduled">scheduled</Option>
                    <Option value="completed">completed</Option>
                    <Option value="cancelled">cancelled</Option>
                  </Select>
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      筛选
                    </Button>
                    <Button onClick={handleSessionReset}>重置</Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>

            <Table
              columns={sessionColumns}
              dataSource={sessions}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>

          <TabPane tab="对练实战记录" key="matches">
            <Card size="small" style={{ marginBottom: 16 }}>
              <Form
                form={matchFilterForm}
                layout="inline"
                onFinish={handleMatchFilter}
              >
                <Form.Item name="member_id" label="会员">
                  <Select placeholder="选择会员" allowClear style={{ width: 150 }}>
                    {members.map((member) => (
                      <Option key={member.id} value={member.id}>
                        {member.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="fight_type_id" label="格斗类型">
                  <Select placeholder="选择格斗类型" allowClear style={{ width: 150 }}>
                    {fightTypes.map((type) => (
                      <Option key={type.id} value={type.id}>
                        {type.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="status" label="状态">
                  <Select placeholder="选择状态" allowClear style={{ width: 120 }}>
                    <Option value="scheduled">scheduled</Option>
                    <Option value="completed">completed</Option>
                    <Option value="cancelled">cancelled</Option>
                  </Select>
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      筛选
                    </Button>
                    <Button onClick={handleMatchReset}>重置</Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>

            <Table
              columns={matchColumns}
              dataSource={matches}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="记录课程成绩"
        open={completeModalVisible}
        onOk={handleSubmitComplete}
        onCancel={() => setCompleteModalVisible(false)}
        width={700}
        destroyOnClose
      >
        <Form form={completeForm} layout="vertical">
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="attendance"
              label="出勤情况"
              rules={[{ required: true, message: '请选择出勤情况' }]}
              style={{ flex: 1 }}
            >
              <Select>
                <Option value={true}>已出勤</Option>
                <Option value={false}>未出勤</Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item name="content" label="练习内容">
            <TextArea rows={3} placeholder="请输入练习内容" />
          </Form.Item>
          <Form.Item name="performance_notes" label="实战表现">
            <TextArea rows={3} placeholder="请输入实战表现" />
          </Form.Item>
          <Form.Item name="techniques_practiced" label="练习技术">
            <Select
              mode="tags"
              placeholder="输入技术名称后按回车"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Divider>体能数据</Divider>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Form.Item name="heart_rate_avg" label="平均心率" style={{ width: 180 }}>
              <Input type="number" placeholder="bpm" />
            </Form.Item>
            <Form.Item name="heart_rate_max" label="最高心率" style={{ width: 180 }}>
              <Input type="number" placeholder="bpm" />
            </Form.Item>
            <Form.Item name="calories_burned" label="消耗卡路里" style={{ width: 180 }}>
              <Input type="number" placeholder="kcal" />
            </Form.Item>
            <Form.Item name="weight" label="体重" style={{ width: 180 }}>
              <Input type="number" step="0.1" placeholder="kg" />
            </Form.Item>
            <Form.Item name="body_fat" label="体脂率" style={{ width: 180 }}>
              <Input type="number" step="0.1" placeholder="%" />
            </Form.Item>
            <Form.Item name="strength_score" label="力量评分" style={{ width: 180 }}>
              <Input type="number" min={0} max={100} placeholder="0-100" />
            </Form.Item>
            <Form.Item name="endurance_score" label="耐力评分" style={{ width: 180 }}>
              <Input type="number" min={0} max={100} placeholder="0-100" />
            </Form.Item>
            <Form.Item name="flexibility_score" label="柔韧评分" style={{ width: 180 }}>
              <Input type="number" min={0} max={100} placeholder="0-100" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        title={selectedSession ? `${selectedSession.member.name} - 课程详情` : '课程详情'}
        open={sessionDetailVisible}
        onCancel={() => setSessionDetailVisible(false)}
        footer={
          selectedSession?.status === 'completed' ? (
            <Space>
              <Button
                danger
                onClick={() => handleRecordInjuryFatigueForSession(selectedSession)}
              >
                记录伤病/疲劳
              </Button>
              <Button type="primary" onClick={handleAddSkill}>
                记录技能进步
              </Button>
            </Space>
          ) : null
        }
        width={800}
        destroyOnClose
      >
        {selectedSession && (
          <Tabs activeKey={sessionDetailTab} onChange={handleSessionDetailTabChange}>
            <TabPane tab="课程信息" key="info">
              <Space direction="vertical" size="middle" style={{ width: '100%', paddingTop: 16 }}>
                <Space wrap>
                  <Tag color="blue">会员: {selectedSession.member.name}</Tag>
                  <Tag color="cyan">
                    教练: {selectedSession.coach?.name || '未分配'}
                  </Tag>
                  <Tag color="purple">
                    格斗类型: {selectedSession.fight_type.name}
                  </Tag>
                  <Tag color={sessionStatusColors[selectedSession.status] || 'default'}>
                    {selectedSession.status}
                  </Tag>
                  <Tag color="green">
                    时长: {selectedSession.duration_minutes} 分钟
                  </Tag>
                </Space>

                <Card title="课程信息" size="small">
                  <p>
                    <strong>课程日期:</strong>{' '}
                    {dayjs(selectedSession.session_date).format('YYYY-MM-DD HH:mm')}
                  </p>
                  <p>
                    <strong>出勤:</strong>{' '}
                    {selectedSession.attendance ? '已出勤' : '未出勤'}
                  </p>
                  {selectedSession.content && (
                    <p>
                      <strong>练习内容:</strong> {selectedSession.content}
                    </p>
                  )}
                  {selectedSession.performance_notes && (
                    <p>
                      <strong>实战表现:</strong> {selectedSession.performance_notes}
                    </p>
                  )}
                  {selectedSession.techniques_practiced?.length > 0 && (
                    <p>
                      <strong>练习技术:</strong>{' '}
                      <Space wrap>
                        {selectedSession.techniques_practiced.map((tech, idx) => (
                          <Tag key={idx} color="blue">
                            {tech}
                          </Tag>
                        ))}
                      </Space>
                    </p>
                  )}
                </Card>

                <Card title="体能数据" size="small">
                  {renderFitnessCard(selectedSession.fitness_data)}
                </Card>

                <Card title="技术进步记录" size="small">
                  {renderSkillProgressionList()}
                </Card>
              </Space>
            </TabPane>
            <TabPane tab="伤病/疲劳记录" key="injury">
              <div style={{ paddingTop: 16 }}>
                {renderInjuryFatigueList()}
              </div>
            </TabPane>
          </Tabs>
        )}
      </Modal>

      <Modal
        title="记录比赛结果"
        open={resultModalVisible}
        onOk={handleSubmitResult}
        onCancel={() => setResultModalVisible(false)}
        width={600}
        destroyOnClose
      >
        <Form form={resultForm} layout="vertical">
          <Form.Item
            name="result"
            label="比赛结果"
            rules={[{ required: true, message: '请选择比赛结果' }]}
          >
            <Select>
              <Option value="win">胜利 (win)</Option>
              <Option value="loss">失败 (loss)</Option>
              <Option value="draw">平局 (draw)</Option>
              <Option value="cancelled">取消 (cancelled)</Option>
            </Select>
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="member1_score"
              label={selectedMatch?.member1?.name || '会员1'}
              rules={[{ required: true, message: '请输入得分' }]}
              style={{ flex: 1 }}
            >
              <Input type="number" min={0} placeholder="得分" />
            </Form.Item>
            <Form.Item
              name="member2_score"
              label={selectedMatch?.member2?.name || '会员2'}
              rules={[{ required: true, message: '请输入得分' }]}
              style={{ flex: 1 }}
            >
              <Input type="number" min={0} placeholder="得分" />
            </Form.Item>
          </div>
          <Form.Item name="match_notes" label="比赛记录">
            <TextArea rows={4} placeholder="请输入比赛记录" />
          </Form.Item>
          <Form.Item name="techniques_used" label="使用技术">
            <Select
              mode="tags"
              placeholder="输入技术名称后按回车"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={selectedMatch ? '比赛详情' : '比赛详情'}
        open={matchDetailVisible}
        onCancel={() => setMatchDetailVisible(false)}
        footer={null}
        width={700}
        destroyOnClose
      >
        {selectedMatch && (
          <Tabs
            activeKey={matchDetailTab}
            onChange={(key) => handleMatchDetailTabChange(key, selectedMatch.member1_id)}
          >
            <TabPane tab="比赛信息" key="info">
              <Space direction="vertical" size="middle" style={{ width: '100%', paddingTop: 16 }}>
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <Space size="large" align="center">
                    <Space direction="vertical" size={0} align="center">
                      <Avatar size={64} src={selectedMatch.member1.avatar}>
                        {selectedMatch.member1.name?.charAt(0)}
                      </Avatar>
                      <span style={{ fontWeight: 'bold', fontSize: 16 }}>
                        {selectedMatch.member1.name}
                      </span>
                      <span style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                        {selectedMatch.member1_score ?? '-'}
                      </span>
                    </Space>
                    <span style={{ fontSize: 20, color: '#999' }}>VS</span>
                    <Space direction="vertical" size={0} align="center">
                      <Avatar size={64} src={selectedMatch.member2?.avatar}>
                        {selectedMatch.member2?.name?.charAt(0)}
                      </Avatar>
                      <span style={{ fontWeight: 'bold', fontSize: 16 }}>
                        {selectedMatch.member2?.name}
                      </span>
                      <span style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                        {selectedMatch.member2_score ?? '-'}
                      </span>
                    </Space>
                  </Space>
                  {selectedMatch.result && (
                    <div style={{ marginTop: 16 }}>
                      <Tag
                        color={matchResultColors[selectedMatch.result] || 'default'}
                        style={{ fontSize: 16, padding: '4px 16px' }}
                      >
                        {matchResultText[selectedMatch.result] || selectedMatch.result}
                      </Tag>
                    </div>
                  )}
                </div>

                <Space wrap>
                  <Tag color="purple">
                    格斗类型: {selectedMatch.fight_type.name}
                  </Tag>
                  <Tag color="cyan">
                    体重级别: {selectedMatch.weight_class.name}
                  </Tag>
                  <Tag color="blue">
                    比赛时间:{' '}
                    {dayjs(selectedMatch.scheduled_date).format('YYYY-MM-DD HH:mm')}
                  </Tag>
                  <Tag color="gold">
                    匹配分: {selectedMatch.match_score}/100
                  </Tag>
                </Space>

                {selectedMatch.match_notes && (
                  <Card title="比赛记录" size="small">
                    <p>{selectedMatch.match_notes}</p>
                  </Card>
                )}

                {selectedMatch.techniques_used?.length > 0 && (
                  <Card title="技术统计" size="small">
                    <Space wrap>
                      {selectedMatch.techniques_used.map((tech, idx) => (
                        <Tag key={idx} color="blue">
                          {tech}
                        </Tag>
                      ))}
                    </Space>
                    <div style={{ marginTop: 16 }}>
                      <Rate
                        disabled
                        allowHalf
                        count={5}
                        value={selectedMatch.match_score / 20}
                      />
                      <span style={{ marginLeft: 8, color: '#666' }}>
                        综合评分: {selectedMatch.match_score}/100
                      </span>
                    </div>
                  </Card>
                )}

                {selectedMatch.status === 'completed' && (
                  <Card title="伤病/疲劳记录" size="small">
                    <Space wrap>
                      <Button
                        danger
                        onClick={() => handleRecordInjuryFatigueForMatch(selectedMatch, selectedMatch.member1)}
                      >
                        记录 {selectedMatch.member1.name} 伤病/疲劳
                      </Button>
                      {selectedMatch.member2 && (
                        <Button
                          danger
                          onClick={() => handleRecordInjuryFatigueForMatch(selectedMatch, selectedMatch.member2!)}
                        >
                          记录 {selectedMatch.member2.name} 伤病/疲劳
                        </Button>
                      )}
                    </Space>
                  </Card>
                )}
              </Space>
            </TabPane>
            <TabPane tab={`${selectedMatch.member1.name} 伤病/疲劳`} key="injury">
              <div style={{ paddingTop: 16 }}>
                {renderInjuryFatigueList()}
              </div>
            </TabPane>
          </Tabs>
        )}
      </Modal>

      <Modal
        title="记录技能进步"
        open={skillModalVisible}
        onOk={handleSubmitSkill}
        onCancel={() => setSkillModalVisible(false)}
        destroyOnClose
      >
        <Form form={skillForm} layout="vertical">
          <Form.Item
            name="technique"
            label="技术名称"
            rules={[{ required: true, message: '请输入技术名称' }]}
          >
            <Input placeholder="请输入技术名称" />
          </Form.Item>
          <Form.Item
            name="mastery_level"
            label="掌握程度"
            rules={[{ required: true, message: '请选择掌握程度' }]}
          >
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <Slider
                min={0}
                max={100}
                marks={{
                  0: '0%',
                  25: '25%',
                  50: '50%',
                  75: '75%',
                  100: '100%',
                }}
              />
            </div>
          </Form.Item>
          <Form.Item name="coach_notes" label="教练备注">
            <TextArea rows={3} placeholder="请输入教练备注" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          selectedMemberForInjury
            ? `记录 ${selectedMemberForInjury.name} 的伤病/疲劳`
            : '记录伤病/疲劳'
        }
        open={injuryFatigueModalVisible}
        onOk={handleSubmitInjuryFatigue}
        onCancel={() => setInjuryFatigueModalVisible(false)}
        width={700}
        destroyOnClose
      >
        <Form form={injuryFatigueForm} layout="vertical">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Form.Item
              name="type"
              label="类型"
              rules={[{ required: true, message: '请选择类型' }]}
              style={{ flex: 1, minWidth: 150 }}
            >
              <Select placeholder="请选择类型">
                <Option value="injury">伤病</Option>
                <Option value="fatigue">疲劳</Option>
                <Option value="rest">休息需求</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="severity"
              label="严重程度"
              rules={[{ required: true, message: '请选择严重程度' }]}
              style={{ flex: 1, minWidth: 150 }}
            >
              <Select placeholder="请选择严重程度">
                <Option value="mild">轻微</Option>
                <Option value="moderate">中等</Option>
                <Option value="severe">严重</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="status"
              label="状态"
              rules={[{ required: true, message: '请选择状态' }]}
              style={{ flex: 1, minWidth: 150 }}
            >
              <Select placeholder="请选择状态">
                <Option value="active">活动中</Option>
                <Option value="recovered">已恢复</Option>
                <Option value="chronic">慢性</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="affected_body_part"
            label="受影响身体部位"
            rules={[{ required: true, message: '请选择或输入受影响身体部位' }]}
          >
            <Select placeholder="请选择或输入身体部位">
              {bodyParts.map((part) => (
                <Option key={part} value={part}>
                  {part}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <TextArea rows={3} placeholder="请详细描述伤病/疲劳情况" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Form.Item
              name="onset_date"
              label="发病日期"
              rules={[{ required: true, message: '请选择发病日期' }]}
              style={{ flex: 1, minWidth: 200 }}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item
              name="expected_recovery_date"
              label="预计恢复日期"
              style={{ flex: 1, minWidth: 200 }}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Form.Item
              name="training_restriction_days"
              label="训练限制天数"
              rules={[{ required: true, message: '请输入训练限制天数' }]}
              style={{ flex: 1, minWidth: 200 }}
            >
              <InputNumber min={0} style={{ width: '100%' }} addonAfter="天" />
            </Form.Item>
            <Form.Item
              name="no_sparring_days"
              label="禁止对练天数"
              rules={[{ required: true, message: '请输入禁止对练天数' }]}
              style={{ flex: 1, minWidth: 200 }}
            >
              <InputNumber min={0} style={{ width: '100%' }} addonAfter="天" />
            </Form.Item>
          </div>

          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="请输入其他备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MatchRecordsPage;
