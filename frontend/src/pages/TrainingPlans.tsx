import { useState, useEffect } from 'react';
import {
  Table,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Tag,
  Card,
  Space,
  Progress,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Slider,
  Switch,
  Tooltip,
  Empty,
} from 'antd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  trainingPlanApi,
  memberApi,
  coachApi,
  fightTypeApi,
  trainingSessionApi,
  trainingPlanApiExtended,
} from '../services/api';
import type {
  TrainingPlan,
  Member,
  Coach,
  FightType,
  TrainingSession,
  TrainingPlanGoal,
  LoadTrendItem,
  TrainingLoadAssessment,
} from '../types';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;

const loadLevelColors: Record<string, string> = {
  very_low: '#52c41a',
  low: '#73d13d',
  moderate: '#1890ff',
  high: '#faad14',
  very_high: '#f5222d',
};

const loadLevelText: Record<string, string> = {
  very_low: '极低',
  low: '低',
  moderate: '中等',
  high: '高',
  very_high: '极高',
};

const recoveryStatusColors: Record<string, string> = {
  exhausted: '#f5222d',
  fatigued: '#fa8c16',
  normal: '#1890ff',
  recovered: '#52c41a',
  fresh: '#13c2c2',
};

const recoveryStatusText: Record<string, string> = {
  exhausted: '疲惫',
  fatigued: '疲劳',
  normal: '正常',
  recovered: '恢复良好',
  fresh: '状态极佳',
};

const intensityOptions = [
  { value: 'very_light', label: '极轻量' },
  { value: 'light', label: '轻量' },
  { value: 'moderate', label: '中等' },
  { value: 'intense', label: '高强度' },
  { value: 'very_intense', label: '极高强度' },
];

interface FilterFormValues {
  member_id?: number;
  coach_id?: number;
  is_active?: boolean;
}

interface PlanFormValues {
  member_id: number;
  coach_id?: number;
  name: string;
  description?: string;
  fight_type_id: number;
  start_date: dayjs.Dayjs;
  end_date: dayjs.Dayjs;
  total_sessions?: number;
  sessions_per_week?: number;
  goals?: string;
  is_active?: boolean;
}

interface PlanGoalFormValues {
  period_type: string;
  target_load_per_week: number;
  max_load_per_week: number;
  max_sessions_per_week: number;
  max_consecutive_training_days: number;
  min_rest_days_per_week: number;
  target_intensity: string;
  max_intensity: string;
  allow_sparring: boolean;
  max_sparring_per_week: number;
  weight_gain_goal?: number;
  weight_loss_goal?: number;
  skill_improvement_goals?: string[];
  notes?: string;
}

const TrainingPlansPage = () => {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [fightTypes, setFightTypes] = useState<FightType[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TrainingPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [form] = Form.useForm<PlanFormValues>();
  const [goalsForm] = Form.useForm<PlanGoalFormValues>();
  const [filterForm] = Form.useForm<FilterFormValues>();

  const [loadSummary, setLoadSummary] = useState<{
    current_load: TrainingLoadAssessment;
    trend: LoadTrendItem[];
    weekly_summary: { sessions_completed: number; matches_completed: number };
  } | null>(null);
  const [planGoals, setPlanGoals] = useState<TrainingPlanGoal | null>(null);
  const [loadLoading, setLoadLoading] = useState(false);

  useEffect(() => {
    fetchData();
    fetchMembers();
    fetchCoaches();
    fetchFightTypes();
  }, []);

  const fetchData = async (filters?: FilterFormValues) => {
    setLoading(true);
    try {
      const params: { member?: number; coach?: number; is_active?: boolean } = {};
      if (filters?.member_id) params.member = filters.member_id;
      if (filters?.coach_id) params.coach = filters.coach_id;
      if (filters?.is_active !== undefined) params.is_active = filters.is_active;
      const response = await trainingPlanApi.getAll(params);
      setPlans(response.data.results);
    } catch {
      message.error('获取训练计划列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await memberApi.getAll();
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

  const fetchSessions = async (planId: number) => {
    try {
      const response = await trainingSessionApi.getAll({ plan: planId });
      setSessions(response.data.results);
    } catch {
      message.error('获取课程列表失败');
    }
  };

  const fetchLoadSummary = async (planId: number) => {
    setLoadLoading(true);
    try {
      const response = await trainingPlanApiExtended.getMemberLoadSummary(planId);
      setLoadSummary(response.data);
    } catch {
      message.error('获取负荷数据失败');
    } finally {
      setLoadLoading(false);
    }
  };

  const fetchPlanGoals = async (planId: number) => {
    try {
      const response = await trainingPlanApiExtended.getPlanGoals(planId);
      setPlanGoals(response.data);
      if (response.data) {
        goalsForm.setFieldsValue({
          period_type: response.data.period_type,
          target_load_per_week: response.data.target_load_per_week,
          max_load_per_week: response.data.max_load_per_week,
          max_sessions_per_week: response.data.max_sessions_per_week,
          max_consecutive_training_days: response.data.max_consecutive_training_days,
          min_rest_days_per_week: response.data.min_rest_days_per_week,
          target_intensity: response.data.target_intensity,
          max_intensity: response.data.max_intensity,
          allow_sparring: response.data.allow_sparring,
          max_sparring_per_week: response.data.max_sparring_per_week,
          weight_gain_goal: response.data.weight_gain_goal,
          weight_loss_goal: response.data.weight_loss_goal,
          skill_improvement_goals: response.data.skill_improvement_goals,
          notes: response.data.notes,
        });
      }
    } catch {
      message.error('获取计划目标失败');
    }
  };

  const handleAdd = () => {
    setEditingPlan(null);
    form.resetFields();
    form.setFieldsValue({
      total_sessions: 12,
      sessions_per_week: 3,
      is_active: true,
    });
    setModalVisible(true);
  };

  const handleEdit = (plan: TrainingPlan) => {
    setEditingPlan(plan);
    form.setFieldsValue({
      member_id: plan.member_id,
      coach_id: plan.coach_id,
      name: plan.name,
      description: plan.description,
      fight_type_id: plan.fight_type_id,
      start_date: dayjs(plan.start_date),
      end_date: dayjs(plan.end_date),
      total_sessions: plan.total_sessions,
      sessions_per_week: plan.sessions_per_week,
      goals: plan.goals,
      is_active: plan.is_active,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await trainingPlanApi.delete(id);
      message.success('删除成功');
      fetchData(filterForm.getFieldsValue());
    } catch {
      message.error('删除失败');
    }
  };

  const handleGenerateSessions = async (id: number) => {
    try {
      await trainingPlanApi.generateSessions(id);
      message.success('生成课程成功');
      fetchData(filterForm.getFieldsValue());
    } catch {
      message.error('生成课程失败');
    }
  };

  const handleViewDetail = async (plan: TrainingPlan) => {
    setSelectedPlan(plan);
    await Promise.all([
      fetchSessions(plan.id),
      fetchLoadSummary(plan.id),
      fetchPlanGoals(plan.id),
    ]);
    setDetailModalVisible(true);
  };

  const handleEditGoals = (plan: TrainingPlan) => {
    setSelectedPlan(plan);
    fetchPlanGoals(plan.id);
    goalsForm.setFieldsValue({
      period_type: 'weekly',
      target_load_per_week: 500,
      max_load_per_week: 800,
      max_sessions_per_week: 5,
      max_consecutive_training_days: 3,
      min_rest_days_per_week: 1,
      target_intensity: 'moderate',
      max_intensity: 'intense',
      allow_sparring: true,
      max_sparring_per_week: 2,
      skill_improvement_goals: [],
    });
    setGoalsModalVisible(true);
  };

  const handleSubmitGoals = async () => {
    if (!selectedPlan) return;
    try {
      const values = await goalsForm.validateFields();
      await trainingPlanApiExtended.setPlanGoals(selectedPlan.id, {
        ...values,
        training_plan_id: selectedPlan.id,
      });
      message.success('保存计划目标成功');
      setGoalsModalVisible(false);
      fetchPlanGoals(selectedPlan.id);
      if (detailModalVisible) {
        fetchLoadSummary(selectedPlan.id);
      }
    } catch {
      message.error('保存计划目标失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        start_date: values.start_date.format('YYYY-MM-DD'),
        end_date: values.end_date.format('YYYY-MM-DD'),
      };

      if (editingPlan) {
        await trainingPlanApi.update(editingPlan.id, data);
        message.success('更新成功');
      } else {
        await trainingPlanApi.create(data);
        message.success('创建成功');
      }

      setModalVisible(false);
      fetchData(filterForm.getFieldsValue());
    } catch {
      message.error('提交失败');
    }
  };

  const handleFilter = () => {
    const values = filterForm.getFieldsValue();
    fetchData(values);
  };

  const handleReset = () => {
    filterForm.resetFields();
    fetchData();
  };

  const renderLoadTrendChart = () => {
    if (!loadSummary || loadSummary.trend.length === 0) {
      return <Empty description="暂无负荷趋势数据" />;
    }

    const chartData = loadSummary.trend.map((item) => ({
      date: dayjs(item.date).format('MM-DD'),
      tli: item.tli,
      recovery_score: item.recovery_score,
      fatigue_score: item.fatigue_score,
      injury_risk: item.injury_risk,
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <RechartsTooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="tli"
            stroke="#1890ff"
            name="训练负荷指数"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="recovery_score"
            stroke="#52c41a"
            name="恢复评分"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="fatigue_score"
            stroke="#faad14"
            name="疲劳评分"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="injury_risk"
            stroke="#f5222d"
            name="伤病风险"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderLoadDistributionChart = () => {
    if (!loadSummary || loadSummary.trend.length === 0) {
      return null;
    }

    const chartData = loadSummary.trend.map((item) => ({
      date: dayjs(item.date).format('MM-DD'),
      acwr: item.acwr,
    }));

    return (
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 2]} />
          <RechartsTooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="acwr"
            stroke="#722ed1"
            fill="#9254de"
            fillOpacity={0.3}
            name="ACWR (急慢性负荷比)"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const columns: ColumnsType<TrainingPlan> = [
    {
      title: '计划名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => handleViewDetail(record)}>{text}</a>
      ),
    },
    {
      title: '会员',
      dataIndex: ['member', 'name'],
      key: 'member',
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
      title: '开始日期',
      dataIndex: 'start_date',
      key: 'start_date',
    },
    {
      title: '结束日期',
      dataIndex: 'end_date',
      key: 'end_date',
    },
    {
      title: '总课程',
      dataIndex: 'total_sessions',
      key: 'total_sessions',
    },
    {
      title: '完成进度',
      key: 'progress',
      render: (_, record) => (
        <Progress
          percent={Math.round((record.completed_sessions / record.total_sessions) * 100)}
          format={() => `${record.completed_sessions}/${record.total_sessions}`}
          size="small"
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? 'active' : 'inactive'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleGenerateSessions(record.id)}
          >
            生成课程
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleEditGoals(record)}
          >
            强度配置
          </Button>
          <Popconfirm
            title="确定要删除这个训练计划吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const sessionColumns: ColumnsType<TrainingSession> = [
    {
      title: '课程日期',
      dataIndex: 'session_date',
      key: 'session_date',
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
      render: (status) => {
        const colorMap: Record<string, string> = {
          scheduled: 'blue',
          completed: 'green',
          cancelled: 'red',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '出勤',
      dataIndex: 'attendance',
      key: 'attendance',
      render: (attended) => (attended ? '是' : '否'),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 16 }}>
        <Form form={filterForm} layout="inline" onFinish={handleFilter}>
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
          <Form.Item name="is_active" label="是否激活">
            <Select placeholder="选择状态" allowClear style={{ width: 120 }}>
              <Option value={true}>激活</Option>
              <Option value={false}>未激活</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                筛选
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title="训练计划管理"
        extra={
          <Button type="primary" onClick={handleAdd}>
            添加计划
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={plans}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title={editingPlan ? '编辑训练计划' : '添加训练计划'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="member_id"
            label="会员"
            rules={[{ required: true, message: '请选择会员' }]}
          >
            <Select placeholder="选择会员">
              {members.map((member) => (
                <Option key={member.id} value={member.id}>
                  {member.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="coach_id" label="教练">
            <Select placeholder="选择教练" allowClear>
              {coaches.map((coach) => (
                <Option key={coach.id} value={coach.id}>
                  {coach.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="name"
            label="计划名称"
            rules={[{ required: true, message: '请输入计划名称' }]}
          >
            <Input placeholder="请输入计划名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item
            name="fight_type_id"
            label="格斗类型"
            rules={[{ required: true, message: '请选择格斗类型' }]}
          >
            <Select placeholder="选择格斗类型">
              {fightTypes.map((type) => (
                <Option key={type.id} value={type.id}>
                  {type.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name={['start_date', 'end_date']}
            label="日期范围"
            rules={[{ required: true, message: '请选择日期范围' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="total_sessions"
              label="总课程数"
              style={{ flex: 1 }}
            >
              <Input type="number" min={1} placeholder="请输入总课程数" />
            </Form.Item>
            <Form.Item
              name="sessions_per_week"
              label="每周课程"
              style={{ flex: 1 }}
            >
              <Input type="number" min={1} placeholder="请输入每周课程数" />
            </Form.Item>
          </div>
          <Form.Item name="goals" label="目标">
            <TextArea rows={3} placeholder="请输入训练目标" />
          </Form.Item>
          <Form.Item name="is_active" label="是否激活" valuePropName="checked">
            <Select>
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="训练计划目标与强度配置"
        open={goalsModalVisible}
        onOk={handleSubmitGoals}
        onCancel={() => setGoalsModalVisible(false)}
        width={700}
      >
        <Form form={goalsForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="period_type"
                label="周期类型"
                rules={[{ required: true, message: '请选择周期类型' }]}
              >
                <Select>
                  <Option value="weekly">每周</Option>
                  <Option value="biweekly">每两周</Option>
                  <Option value="monthly">每月</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Card size="small" title="负荷目标" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="target_load_per_week"
                  label="每周目标负荷"
                  rules={[{ required: true, message: '请输入目标负荷' }]}
                >
                  <Slider
                    min={100}
                    max={1200}
                    step={50}
                    marks={{
                      200: '200',
                      400: '400',
                      600: '600',
                      800: '800',
                      1000: '1000',
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="max_load_per_week"
                  label="每周最大负荷"
                  rules={[{ required: true, message: '请输入最大负荷' }]}
                >
                  <Slider
                    min={200}
                    max={1500}
                    step={50}
                    marks={{
                      400: '400',
                      600: '600',
                      800: '800',
                      1000: '1000',
                      1200: '1200',
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card size="small" title="训练频率限制" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="max_sessions_per_week"
                  label="每周最大训练次数"
                  rules={[{ required: true, message: '请输入最大训练次数' }]}
                >
                  <Input type="number" min={1} max={7} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="max_consecutive_training_days"
                  label="最大连续训练天数"
                  rules={[{ required: true, message: '请输入最大连续训练天数' }]}
                >
                  <Input type="number" min={1} max={7} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="min_rest_days_per_week"
                  label="每周最少休息天数"
                  rules={[{ required: true, message: '请输入最少休息天数' }]}
                >
                  <Input type="number" min={0} max={6} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card size="small" title="强度控制" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="target_intensity"
                  label="目标强度"
                  rules={[{ required: true, message: '请选择目标强度' }]}
                >
                  <Select>
                    {intensityOptions.map((opt) => (
                      <Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="max_intensity"
                  label="强度上限"
                  rules={[{ required: true, message: '请选择强度上限' }]}
                >
                  <Select>
                    {intensityOptions.map((opt) => (
                      <Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card size="small" title="对练限制" style={{ marginBottom: 16 }}>
            <Row gutter={16} align="middle">
              <Col span={8}>
                <Form.Item
                  name="allow_sparring"
                  label="允许对练"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="max_sparring_per_week"
                  label="每周最大对练次数"
                  rules={[{ required: true, message: '请输入最大对练次数' }]}
                >
                  <Input type="number" min={0} max={7} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card size="small" title="其他目标" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="weight_gain_goal" label="增重目标 (kg)">
                  <Input type="number" step="0.1" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="weight_loss_goal" label="减重目标 (kg)">
                  <Input type="number" step="0.1" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="skill_improvement_goals" label="技能提升目标">
              <Select mode="tags" placeholder="输入技能目标后按回车" style={{ width: '100%' }} />
            </Form.Item>
          </Card>

          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          selectedPlan
            ? `${selectedPlan.name} - 课程详情与负荷监控`
            : '课程详情'
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={1000}
      >
        {selectedPlan && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card size="small">
              <Space wrap>
                <Tag color="blue">会员: {selectedPlan.member.name}</Tag>
                <Tag color="cyan">
                  教练: {selectedPlan.coach?.name || '未分配'}
                </Tag>
                <Tag color="purple">
                  格斗类型: {selectedPlan.fight_type.name}
                </Tag>
                <Tag color={selectedPlan.is_active ? 'green' : 'default'}>
                  {selectedPlan.is_active ? 'active' : 'inactive'}
                </Tag>
              </Space>
              <div style={{ marginTop: 12 }}>
                <Progress
                  percent={Math.round(
                    (selectedPlan.completed_sessions /
                      selectedPlan.total_sessions) *
                      100
                  )}
                  format={() =>
                    `已完成 ${selectedPlan.completed_sessions}/${selectedPlan.total_sessions} 课程`
                  }
                />
              </div>
            </Card>

            {loadSummary && (
              <>
                <Card
                  title="当前负荷状态"
                  size="small"
                  extra={
                    <Button
                      size="small"
                      onClick={() => fetchLoadSummary(selectedPlan.id)}
                    >
                      刷新数据
                    </Button>
                  }
                  loading={loadLoading}
                >
                  <Row gutter={16}>
                    <Col span={6}>
                      <Statistic
                        title="训练负荷指数 (TLI)"
                        value={loadSummary.current_load.training_load_index}
                        valueStyle={{
                          color:
                            loadLevelColors[
                              loadSummary.current_load.load_level
                            ],
                        }}
                        suffix={
                          <Tag
                            color={
                              loadLevelColors[
                                loadSummary.current_load.load_level
                              ]
                            }
                          >
                            {loadLevelText[loadSummary.current_load.load_level]}
                          </Tag>
                        }
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="恢复评分"
                        value={loadSummary.current_load.recovery_score}
                        suffix="/100"
                        valueStyle={{
                          color:
                            recoveryStatusColors[
                              loadSummary.current_load.recovery_status
                            ],
                        }}
                      />
                      <Tag
                        color={
                          recoveryStatusColors[
                            loadSummary.current_load.recovery_status
                          ]
                        }
                      >
                        {
                          recoveryStatusText[
                            loadSummary.current_load.recovery_status
                          ]
                        }
                      </Tag>
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="ACWR (急慢性负荷比)"
                        value={loadSummary.current_load.acwr}
                        precision={2}
                        valueStyle={{
                          color:
                            loadSummary.current_load.acwr > 1.3
                              ? '#f5222d'
                              : loadSummary.current_load.acwr > 1.1
                                ? '#faad14'
                                : '#52c41a',
                        }}
                      />
                      <Tooltip title="ACWR > 1.3 提示伤病风险增加">
                        <Tag
                          color={
                            loadSummary.current_load.acwr > 1.3
                              ? 'red'
                              : loadSummary.current_load.acwr > 1.1
                                ? 'orange'
                                : 'green'
                          }
                        >
                          {loadSummary.current_load.acwr > 1.3
                            ? '高风险'
                            : loadSummary.current_load.acwr > 1.1
                              ? '注意'
                              : '正常'}
                        </Tag>
                      </Tooltip>
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="伤病风险评分"
                        value={loadSummary.current_load.injury_risk_score}
                        suffix="%"
                        valueStyle={{
                          color:
                            loadSummary.current_load.injury_risk_score > 50
                              ? '#f5222d'
                              : loadSummary.current_load.injury_risk_score > 30
                                ? '#faad14'
                                : '#52c41a',
                        }}
                      />
                      <Tag
                        color={
                          loadSummary.current_load.injury_risk_score > 50
                            ? 'red'
                            : loadSummary.current_load.injury_risk_score > 30
                              ? 'orange'
                              : 'green'
                        }
                      >
                        {loadSummary.current_load.injury_risk_score > 50
                          ? '高风险'
                          : loadSummary.current_load.injury_risk_score > 30
                            ? '中等'
                            : '低风险'}
                      </Tag>
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ marginTop: 16 }}>
                    <Col span={12}>
                      <div>
                        <strong>推荐训练强度:</strong>{' '}
                        <Tag color="blue">
                          {
                            intensityOptions.find(
                              (o) =>
                                o.value ===
                                loadSummary.current_load.recommended_intensity
                            )?.label
                          }
                        </Tag>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <strong>可训练时间:</strong>{' '}
                        {loadSummary.current_load.available_training_minutes}{' '}
                        分钟/天
                      </div>
                    </Col>
                    <Col span={12}>
                      <div>
                        <strong>本周训练:</strong>{' '}
                        {loadSummary.weekly_summary.sessions_completed} 次课程,{' '}
                        {loadSummary.weekly_summary.matches_completed} 次对练
                      </div>
                    </Col>
                  </Row>
                </Card>

                {planGoals && (
                  <Card
                    title="计划目标与限制"
                    size="small"
                    extra={
                      <Button
                        size="small"
                        onClick={() => {
                          setGoalsModalVisible(false);
                          handleEditGoals(selectedPlan);
                        }}
                      >
                        编辑目标
                      </Button>
                    }
                  >
                    <Row gutter={16}>
                      <Col span={8}>
                        <div>
                          <strong>每周目标负荷:</strong>{' '}
                          {planGoals.target_load_per_week}
                        </div>
                      </Col>
                      <Col span={8}>
                        <div>
                          <strong>每周最大负荷:</strong>{' '}
                          {planGoals.max_load_per_week}
                        </div>
                      </Col>
                      <Col span={8}>
                        <div>
                          <strong>目标强度:</strong>{' '}
                          {
                            intensityOptions.find(
                              (o) => o.value === planGoals.target_intensity
                            )?.label
                          }
                        </div>
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 8 }}>
                      <Col span={8}>
                        <div>
                          <strong>每周最大训练:</strong>{' '}
                          {planGoals.max_sessions_per_week} 次
                        </div>
                      </Col>
                      <Col span={8}>
                        <div>
                          <strong>每周最大对练:</strong>{' '}
                          {planGoals.max_sparring_per_week} 次
                        </div>
                      </Col>
                      <Col span={8}>
                        <div>
                          <strong>对练权限:</strong>{' '}
                          <Tag color={planGoals.allow_sparring ? 'green' : 'red'}>
                            {planGoals.allow_sparring ? '允许' : '禁止'}
                          </Tag>
                        </div>
                      </Col>
                    </Row>
                    <Progress
                      percent={Math.round(
                        (loadSummary.current_load.training_load_index /
                          planGoals.max_load_per_week) *
                          100
                      )}
                      format={() =>
                        `当前 ${loadSummary.current_load.training_load_index} / 上限 ${planGoals.max_load_per_week}`
                      }
                      strokeColor={
                        loadSummary.current_load.training_load_index >
                        planGoals.max_load_per_week
                          ? '#f5222d'
                          : loadSummary.current_load.training_load_index >
                              planGoals.target_load_per_week
                            ? '#faad14'
                            : '#52c41a'
                      }
                      style={{ marginTop: 12 }}
                    />
                  </Card>
                )}

                <Card title="30天负荷趋势" size="small">
                  {renderLoadTrendChart()}
                </Card>

                <Card title="ACWR 变化趋势" size="small">
                  {renderLoadDistributionChart()}
                </Card>
              </>
            )}

            <Card title="课程列表" size="small">
              <Table
                columns={sessionColumns}
                dataSource={sessions}
                rowKey="id"
                pagination={{ pageSize: 5 }}
              />
            </Card>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default TrainingPlansPage;
