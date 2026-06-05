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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  trainingPlanApi,
  memberApi,
  coachApi,
  fightTypeApi,
  trainingSessionApi,
} from '../services/api';
import type {
  TrainingPlan,
  Member,
  Coach,
  FightType,
  TrainingSession,
} from '../types';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;

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

const TrainingPlansPage = () => {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [fightTypes, setFightTypes] = useState<FightType[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TrainingPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [form] = Form.useForm<PlanFormValues>();
  const [filterForm] = Form.useForm<FilterFormValues>();

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
    await fetchSessions(plan.id);
    setDetailModalVisible(true);
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
        title={
          selectedPlan
            ? `${selectedPlan.name} - 课程详情`
            : '课程详情'
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedPlan && (
          <div style={{ marginBottom: 16 }}>
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
          </div>
        )}
        <Table
          columns={sessionColumns}
          dataSource={sessions}
          rowKey="id"
          pagination={{ pageSize: 5 }}
        />
      </Modal>
    </div>
  );
};

export default TrainingPlansPage;
