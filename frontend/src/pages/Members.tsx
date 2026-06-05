import { useState, useEffect } from 'react';
import {
  Table,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Button,
  Tag,
  Card,
  Space,
  message,
  Progress,
  Popconfirm,
  Typography,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  memberApi,
  fightTypeApi,
  weightClassApi,
  trainingGoalApi,
} from '../services/api';
import type {
  Member,
  FightType,
  WeightClass,
  TrainingGoal,
  MatchScore,
} from '../types';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const skillLevelMap: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
  competitor: '竞技级',
};

const tagColors = [
  'blue',
  'green',
  'red',
  'orange',
  'purple',
  'cyan',
  'magenta',
  'lime',
  'gold',
  'geekblue',
];

interface MemberFormData {
  name: string;
  phone: string;
  email: string;
  age: number;
  gender: string;
  weight: number;
  height?: number;
  fight_type_ids?: number[];
  weight_class_id?: number;
  training_goal_ids?: number[];
  skill_level?: string;
  available_times?: string[];
  notes?: string;
  join_date?: dayjs.Dayjs;
}

const MembersPage = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [fightTypes, setFightTypes] = useState<FightType[]>([]);
  const [weightClasses, setWeightClasses] = useState<WeightClass[]>([]);
  const [trainingGoals, setTrainingGoals] = useState<TrainingGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [potentialPartners, setPotentialPartners] = useState<MatchScore[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [selectedFightType, setSelectedFightType] = useState<number | undefined>();
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string | undefined>();
  const [selectedFightTypeForPartners, setSelectedFightTypeForPartners] = useState<number | undefined>();
  const [form] = Form.useForm<MemberFormData>();

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersRes, fightTypesRes, weightClassesRes, trainingGoalsRes] =
        await Promise.all([
          memberApi.getAll({
            fight_type: selectedFightType,
            skill_level: selectedSkillLevel,
          }),
          fightTypeApi.getAll(),
          weightClassApi.getAll(),
          trainingGoalApi.getAll(),
        ]);
      setMembers(membersRes.data.results);
      setFightTypes(fightTypesRes.data);
      setWeightClasses(weightClassesRes.data);
      setTrainingGoals(trainingGoalsRes.data);
    } catch {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFightType, selectedSkillLevel]);

  const handleAdd = () => {
    setEditingMember(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    form.setFieldsValue({
      name: member.name,
      phone: member.phone,
      email: member.email,
      age: member.age,
      gender: member.gender,
      weight: member.weight,
      height: member.height,
      fight_type_ids: member.fight_types.map((ft) => ft.id),
      weight_class_id: member.weight_class?.id,
      training_goal_ids: member.training_goals.map((tg) => tg.id),
      skill_level: member.skill_level,
      available_times: member.available_times,
      notes: member.notes,
      join_date: dayjs(member.join_date),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await memberApi.delete(id);
      message.success('删除成功');
      loadData();
    } catch {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData: Partial<Member> = {
        ...values,
        join_date: values.join_date?.format('YYYY-MM-DD'),
      };

      if (editingMember) {
        await memberApi.update(editingMember.id, submitData);
        message.success('更新成功');
      } else {
        await memberApi.create(submitData);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleViewDetail = async (member: Member) => {
    setSelectedMember(member);
    setDetailModalVisible(true);
    if (member.fight_types.length > 0) {
      setSelectedFightTypeForPartners(member.fight_types[0].id);
      loadPotentialPartners(member.id, member.fight_types[0].id);
    }
  };

  const loadPotentialPartners = async (memberId: number, fightTypeId: number) => {
    setPartnersLoading(true);
    try {
      const res = await memberApi.getPotentialPartners(memberId, fightTypeId);
      setPotentialPartners(res.data);
    } catch {
      message.error('加载潜在对练伙伴失败');
    } finally {
      setPartnersLoading(false);
    }
  };

  const handleFightTypeChangeForPartners = (fightTypeId: number) => {
    setSelectedFightTypeForPartners(fightTypeId);
    if (selectedMember) {
      loadPotentialPartners(selectedMember.id, fightTypeId);
    }
  };

  const getTagColor = (index: number) => tagColors[index % tagColors.length];

  const columns: ColumnsType<Member> = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <UserOutlined />
          <span style={{ cursor: 'pointer', color: '#1890ff' }} onClick={() => handleViewDetail(record)}>
            {text}
          </span>
        </Space>
      ),
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
      width: 80,
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (text) => (text === '男' ? <Tag color="blue">男</Tag> : <Tag color="magenta">女</Tag>),
    },
    {
      title: '体重',
      dataIndex: 'weight',
      key: 'weight',
      width: 100,
      render: (text) => `${text} kg`,
    },
    {
      title: '格斗类型',
      dataIndex: 'fight_types',
      key: 'fight_types',
      render: (fightTypes: FightType[]) => (
        <Space wrap>
          {fightTypes.map((ft, index) => (
            <Tag key={ft.id} color={getTagColor(index)}>
              {ft.name}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '体重级别',
      dataIndex: 'weight_class',
      key: 'weight_class',
      render: (wc) => wc?.name || '-',
    },
    {
      title: '训练目标',
      dataIndex: 'training_goals',
      key: 'training_goals',
      render: (goals: TrainingGoal[]) => goals.map((g) => g.name).join(', ') || '-',
    },
    {
      title: '技术水平',
      dataIndex: 'skill_level',
      key: 'skill_level',
      width: 100,
      render: (level) => skillLevelMap[level] || level,
    },
    {
      title: '技能分',
      dataIndex: 'skill_score',
      key: 'skill_score',
      width: 180,
      render: (score) => (
        <Progress
          percent={score}
          size="small"
          status={score >= 80 ? 'success' : score >= 60 ? 'normal' : 'exception'}
        />
      ),
    },
    {
      title: '加入日期',
      dataIndex: 'join_date',
      key: 'join_date',
      width: 120,
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该会员吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <UserOutlined />
            <span>会员档案管理</span>
          </Space>
        }
        extra={
          <Space>
            <Select
              placeholder="筛选格斗类型"
              style={{ width: 150 }}
              allowClear
              value={selectedFightType}
              onChange={(value) => setSelectedFightType(value)}
            >
              {fightTypes.map((ft) => (
                <Option key={ft.id} value={ft.id}>
                  {ft.name}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="筛选技术水平"
              style={{ width: 150 }}
              allowClear
              value={selectedSkillLevel}
              onChange={(value) => setSelectedSkillLevel(value)}
            >
              <Option value="beginner">初级</Option>
              <Option value="intermediate">中级</Option>
              <Option value="advanced">高级</Option>
              <Option value="competitor">竞技级</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加会员
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={members}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title={editingMember ? '编辑会员' : '添加会员'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="phone"
              label="电话"
              rules={[{ required: true, message: '请输入电话' }]}
            >
              <Input placeholder="请输入电话" />
            </Form.Item>
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
              <Input placeholder="请输入邮箱" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Item
              name="age"
              label="年龄"
              rules={[
                { required: true, message: '请输入年龄' },
                { type: 'number', min: 1, max: 100, message: '年龄必须在1-100之间' },
              ]}
            >
              <InputNumber min={1} max={100} style={{ width: '100%' }} placeholder="年龄" />
            </Form.Item>
            <Form.Item
              name="gender"
              label="性别"
              rules={[{ required: true, message: '请选择性别' }]}
            >
              <Select placeholder="请选择性别">
                <Option value="男">男</Option>
                <Option value="女">女</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="join_date"
              label="加入日期"
              rules={[{ required: true, message: '请选择加入日期' }]}
            >
              <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="weight"
              label="体重 (kg)"
              rules={[{ required: true, message: '请输入体重' }]}
            >
              <InputNumber min={20} max={200} step={0.1} style={{ width: '100%' }} placeholder="体重" />
            </Form.Item>
            <Form.Item name="height" label="身高 (cm)">
              <InputNumber min={100} max={250} style={{ width: '100%' }} placeholder="身高" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="fight_type_ids"
              label="格斗类型"
            >
              <Select mode="multiple" placeholder="请选择格斗类型">
                {fightTypes.map((ft) => (
                  <Option key={ft.id} value={ft.id}>
                    {ft.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="weight_class_id"
              label="体重级别"
            >
              <Select placeholder="请选择体重级别">
                {weightClasses.map((wc) => (
                  <Option key={wc.id} value={wc.id}>
                    {wc.name} ({wc.min_weight}-{wc.max_weight}kg)
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="training_goal_ids"
              label="训练目标"
            >
              <Select mode="multiple" placeholder="请选择训练目标">
                {trainingGoals.map((tg) => (
                  <Option key={tg.id} value={tg.id}>
                    {tg.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="skill_level"
              label="技术水平"
            >
              <Select placeholder="请选择技术水平">
                <Option value="beginner">初级</Option>
                <Option value="intermediate">中级</Option>
                <Option value="advanced">高级</Option>
                <Option value="competitor">竞技级</Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item
            name="available_times"
            label="可训练时间"
          >
            <Select mode="tags" placeholder="输入可训练时间，如：周一18:00">
              {['周一18:00', '周一19:00', '周二18:00', '周二19:00', '周三18:00', '周三19:00', '周四18:00', '周四19:00', '周五18:00', '周五19:00', '周六10:00', '周六14:00', '周日10:00', '周日14:00'].map((time) => (
                <Option key={time} value={time}>
                  {time}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="会员详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedMember && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Title level={4} style={{ margin: 0 }}>
                  {selectedMember.name}
                </Title>
                <Space wrap>
                  <Text strong>电话：</Text>
                  <Text>{selectedMember.phone}</Text>
                </Space>
                <Space wrap>
                  <Text strong>邮箱：</Text>
                  <Text>{selectedMember.email}</Text>
                </Space>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <Space>
                    <Text strong>年龄：</Text>
                    <Text>{selectedMember.age} 岁</Text>
                  </Space>
                  <Space>
                    <Text strong>性别：</Text>
                    <Text>{selectedMember.gender}</Text>
                  </Space>
                  <Space>
                    <Text strong>技术水平：</Text>
                    <Tag color={selectedMember.skill_level === 'competitor' ? 'gold' : selectedMember.skill_level === 'advanced' ? 'red' : selectedMember.skill_level === 'intermediate' ? 'blue' : 'green'}>
                      {skillLevelMap[selectedMember.skill_level]}
                    </Tag>
                  </Space>
                  <Space>
                    <Text strong>体重：</Text>
                    <Text>{selectedMember.weight} kg</Text>
                  </Space>
                  <Space>
                    <Text strong>身高：</Text>
                    <Text>{selectedMember.height ? `${selectedMember.height} cm` : '-'}</Text>
                  </Space>
                  <Space>
                    <Text strong>体重级别：</Text>
                    <Text>{selectedMember.weight_class?.name || '-'}</Text>
                  </Space>
                </div>
                <Space direction="vertical" size="small">
                  <Text strong>格斗类型：</Text>
                  <Space wrap>
                    {selectedMember.fight_types.map((ft, index) => (
                      <Tag key={ft.id} color={getTagColor(index)}>
                        {ft.name}
                      </Tag>
                    ))}
                  </Space>
                </Space>
                <Space direction="vertical" size="small">
                  <Text strong>训练目标：</Text>
                  <Text>{selectedMember.training_goals.map((g) => g.name).join(', ') || '-'}</Text>
                </Space>
                <Space direction="vertical" size="small">
                  <Text strong>可训练时间：</Text>
                  <Space wrap>
                    {selectedMember.available_times.map((time, index) => (
                      <Tag key={index}>{time}</Tag>
                    ))}
                  </Space>
                </Space>
                <Space direction="vertical" size="small">
                  <Text strong>技能分：</Text>
                  <Progress
                    percent={selectedMember.skill_score}
                    status={selectedMember.skill_score >= 80 ? 'success' : selectedMember.skill_score >= 60 ? 'normal' : 'exception'}
                  />
                </Space>
                {selectedMember.notes && (
                  <Space direction="vertical" size="small">
                    <Text strong>备注：</Text>
                    <Text>{selectedMember.notes}</Text>
                  </Space>
                )}
              </Space>
            </Card>

            <Divider style={{ margin: '16px 0' }} />

            <div>
              <Space style={{ marginBottom: 16 }}>
                <Title level={5} style={{ margin: 0 }}>
                  潜在对练伙伴
                </Title>
                {selectedMember.fight_types.length > 0 && (
                  <Select
                    style={{ width: 150 }}
                    value={selectedFightTypeForPartners}
                    onChange={handleFightTypeChangeForPartners}
                  >
                    {selectedMember.fight_types.map((ft) => (
                      <Option key={ft.id} value={ft.id}>
                        {ft.name}
                      </Option>
                    ))}
                  </Select>
                )}
              </Space>
              <Table
                size="small"
                loading={partnersLoading}
                dataSource={potentialPartners}
                rowKey={(record) => record.member.id}
                pagination={false}
                columns={[
                  {
                    title: '姓名',
                    dataIndex: ['member', 'name'],
                    key: 'name',
                  },
                  {
                    title: '年龄',
                    dataIndex: ['member', 'age'],
                    key: 'age',
                    width: 80,
                  },
                  {
                    title: '技术水平',
                    dataIndex: ['member', 'skill_level'],
                    key: 'skill_level',
                    width: 100,
                    render: (level) => skillLevelMap[level] || level,
                  },
                  {
                    title: '匹配度',
                    dataIndex: 'match_score',
                    key: 'match_score',
                    width: 180,
                    render: (score) => (
                      <Progress
                        percent={Math.round(score * 100)}
                        size="small"
                        status={score >= 0.8 ? 'success' : score >= 0.6 ? 'normal' : 'exception'}
                      />
                    ),
                  },
                ]}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MembersPage;
