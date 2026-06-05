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
} from '../services/api';
import type {
  TrainingSession,
  SparringMatch,
  Member,
  Coach,
  FightType,
  FitnessData,
  SkillProgression,
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

const MatchRecordsPage = () => {
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [matches, setMatches] = useState<SparringMatch[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [fightTypes, setFightTypes] = useState<FightType[]>([]);
  const [skillProgressions, setSkillProgressions] = useState<SkillProgression[]>([]);
  const [loading, setLoading] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [sessionDetailVisible, setSessionDetailVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [matchDetailVisible, setMatchDetailVisible] = useState(false);
  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<SparringMatch | null>(null);
  const [sessionFilterForm] = Form.useForm<SessionFilterValues>();
  const [matchFilterForm] = Form.useForm<MatchFilterValues>();
  const [completeForm] = Form.useForm<CompleteSessionFormValues>();
  const [resultForm] = Form.useForm<RecordResultFormValues>();
  const [skillForm] = Form.useForm<SkillProgressionFormValues>();

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
            <Button type="primary" onClick={handleAddSkill}>
              记录技能进步
            </Button>
          ) : null
        }
        width={800}
        destroyOnClose
      >
        {selectedSession && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
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
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
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
          </Space>
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
    </div>
  );
};

export default MatchRecordsPage;
