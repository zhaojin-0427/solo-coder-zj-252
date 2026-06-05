import React, { useState, useEffect } from 'react';
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
  Rate,
  List,
  Avatar,
  Tabs,
  message,
  Progress,
} from 'antd';
import { PlusOutlined, ThunderboltOutlined, UserAddOutlined, TeamOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  matchRequestApi,
  sparringMatchApi,
  memberApi,
  fightTypeApi,
} from '../services/api';
import type {
  MatchRequest,
  SparringMatch,
  MatchScore,
  Member,
  FightType,
} from '../types';

const { Option } = Select;
const { TabPane } = Tabs;

const statusColors: Record<string, string> = {
  open: 'blue',
  matched: 'green',
  expired: 'default',
  pending: 'orange',
  scheduled: 'blue',
  completed: 'green',
  cancelled: 'red',
};

const statusText: Record<string, string> = {
  open: '开放',
  matched: '已匹配',
  expired: '已过期',
  pending: '待处理',
  scheduled: '已安排',
  completed: '已完成',
  cancelled: '已取消',
};

const skillLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
const skillLevelText: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
  expert: '专家',
};

const SparringMatchPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [matches, setMatches] = useState<SparringMatch[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [fightTypes, setFightTypes] = useState<FightType[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [partnerModalVisible, setPartnerModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MatchRequest | null>(null);
  const [potentialPartners, setPotentialPartners] = useState<MatchScore[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [filters, setFilters] = useState({
    member_id: undefined as number | undefined,
    status: undefined as string | undefined,
    fight_type_id: undefined as number | undefined,
  });
  const [form] = Form.useForm();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'requests') {
      loadRequests();
    } else {
      loadMatches();
    }
  }, [activeTab, filters]);

  const loadInitialData = async () => {
    try {
      const [membersRes, fightTypesRes] = await Promise.all([
        memberApi.getAll({ is_active: true }),
        fightTypeApi.getAll(),
      ]);
      setMembers(membersRes.data.results);
      setFightTypes(fightTypesRes.data);
    } catch (error) {
      message.error('加载基础数据失败');
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params: Record<string, number | string> = {};
      if (filters.member_id) params.member = filters.member_id;
      if (filters.status) params.status = filters.status;
      if (filters.fight_type_id) params.fight_type = filters.fight_type_id;
      const res = await matchRequestApi.getAll(params);
      setRequests(res.data.results);
    } catch (error) {
      message.error('加载配对请求失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    setLoading(true);
    try {
      const params: Record<string, number | string> = {};
      if (filters.member_id) params.member = filters.member_id;
      if (filters.status) params.status = filters.status;
      if (filters.fight_type_id) params.fight_type = filters.fight_type_id;
      const res = await sparringMatchApi.getAll(params);
      setMatches(res.data.results);
    } catch (error) {
      message.error('加载比赛列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (values: any) => {
    try {
      const data = {
        ...values,
        preferred_date: values.preferred_date.format('YYYY-MM-DDTHH:mm:ss'),
      };
      await matchRequestApi.create(data);
      message.success('发布对练请求成功');
      setRequestModalVisible(false);
      form.resetFields();
      loadRequests();
    } catch (error) {
      message.error('发布对练请求失败');
    }
  };

  const handleViewPartners = async (request: MatchRequest) => {
    setSelectedRequest(request);
    setPartnersLoading(true);
    try {
      const res = await matchRequestApi.getPartners(request.id);
      setPotentialPartners(res.data);
      setPartnerModalVisible(true);
    } catch (error) {
      message.error('加载潜在对练伙伴失败');
    } finally {
      setPartnersLoading(false);
    }
  };

  const handleAutoMatch = async () => {
    try {
      const res = await matchRequestApi.autoMatch();
      message.success(`自动配对成功，已配对 ${res.data.matched_count} 场比赛`);
      loadRequests();
      loadMatches();
    } catch (error) {
      message.error('自动配对失败');
    }
  };

  const handleManualMatch = async (partner: MatchScore) => {
    if (!selectedRequest) return;
    try {
      const matchedWeightClass = { id: 1, name: '默认级别', min_weight: 0, max_weight: 200 };
      
      await sparringMatchApi.create({
        member1_id: selectedRequest.member_id,
        member2_id: partner.member.id,
        fight_type_id: selectedRequest.fight_type_id,
        weight_class_id: matchedWeightClass.id,
        scheduled_date: selectedRequest.preferred_date,
        duration_minutes: 30,
        status: 'scheduled',
        match_notes: '手动配对',
        match_score: partner.match_score,
      });
      message.success('手动配对成功');
      setPartnerModalVisible(false);
      loadRequests();
      loadMatches();
    } catch (error) {
      message.error('手动配对失败');
    }
  };

  const handleCancelRequest = async (id: number) => {
    try {
      await matchRequestApi.delete(id);
      message.success('取消请求成功');
      loadRequests();
    } catch (error) {
      message.error('取消请求失败');
    }
  };

  const handleCancelMatch = async (id: number) => {
    try {
      await sparringMatchApi.update(id, { status: 'cancelled' });
      message.success('取消比赛成功');
      loadMatches();
    } catch (error) {
      message.error('取消比赛失败');
    }
  };

  const requestColumns: ColumnsType<MatchRequest> = [
    {
      title: '请求会员',
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
      title: '格斗类型',
      dataIndex: ['fight_type', 'name'],
      key: 'fight_type',
    },
    {
      title: '期望日期',
      dataIndex: 'preferred_date',
      key: 'preferred_date',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '体重范围',
      key: 'weight_range',
      render: (_, record) => (
        <span>{record.weight_range_min} - {record.weight_range_max} kg</span>
      ),
    },
    {
      title: '期望水平',
      dataIndex: 'skill_level_preference',
      key: 'skill_level_preference',
      render: (level) => level ? skillLevelText[level] || level : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status] || 'default'}>
          {statusText[status] || status}
        </Tag>
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
            icon={<TeamOutlined />}
            onClick={() => handleViewPartners(record)}
            disabled={record.status !== 'open'}
          >
            查看伙伴
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleCancelRequest(record.id)}
            disabled={record.status !== 'open'}
          >
            取消
          </Button>
        </Space>
      ),
    },
  ];

  const matchColumns: ColumnsType<SparringMatch> = [
    {
      title: '对阵',
      key: 'vs',
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
      title: '匹配分',
      dataIndex: 'match_score',
      key: 'match_score',
      render: (score) => (
        <Space direction="vertical" size={0}>
          <Rate
            disabled
            allowHalf
            count={5}
            value={score ? score / 20 : 0}
          />
          <Progress
            percent={score || 0}
            size="small"
            showInfo={false}
            style={{ width: 80 }}
          />
          <span style={{ fontSize: 12, color: '#666' }}>{score || 0}/100</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status] || 'default'}>
          {statusText[status] || status}
        </Tag>
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
            danger
            onClick={() => handleCancelMatch(record.id)}
            disabled={!['scheduled', 'pending'].includes(record.status)}
          >
            取消
          </Button>
        </Space>
      ),
    },
  ];

  const filterSection = (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space wrap>
        <Select
          placeholder="选择会员"
          style={{ width: 150 }}
          allowClear
          value={filters.member_id}
          onChange={(value) => setFilters({ ...filters, member_id: value })}
        >
          {members.map((m) => (
            <Option key={m.id} value={m.id}>{m.name}</Option>
          ))}
        </Select>
        <Select
          placeholder="选择状态"
          style={{ width: 150 }}
          allowClear
          value={filters.status}
          onChange={(value) => setFilters({ ...filters, status: value })}
        >
          {Object.entries(statusText).map(([key, text]) => (
            <Option key={key} value={key}>{text}</Option>
          ))}
        </Select>
        <Select
          placeholder="选择格斗类型"
          style={{ width: 150 }}
          allowClear
          value={filters.fight_type_id}
          onChange={(value) => setFilters({ ...filters, fight_type_id: value })}
        >
          {fightTypes.map((ft) => (
            <Option key={ft.id} value={ft.id}>{ft.name}</Option>
          ))}
        </Select>
        <Button onClick={() => setFilters({ member_id: undefined, status: undefined, fight_type_id: undefined })}>
          重置
        </Button>
      </Space>
    </Card>
  );

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>对练匹配管理</h2>
          <Space>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleAutoMatch}
            >
              一键自动配对
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setRequestModalVisible(true)}
            >
              发布对练请求
            </Button>
          </Space>
        </div>

        {filterSection}

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="配对请求" key="requests">
            <Table
              columns={requestColumns}
              dataSource={requests}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
          <TabPane tab="已安排比赛" key="matches">
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
        title="发布对练请求"
        open={requestModalVisible}
        onCancel={() => setRequestModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateRequest}
        >
          <Form.Item
            name="member_id"
            label="发起会员"
            rules={[{ required: true, message: '请选择会员' }]}
          >
            <Select placeholder="请选择会员">
              {members.map((m) => (
                <Option key={m.id} value={m.id}>{m.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="fight_type_id"
            label="格斗类型"
            rules={[{ required: true, message: '请选择格斗类型' }]}
          >
            <Select placeholder="请选择格斗类型">
              {fightTypes.map((ft) => (
                <Option key={ft.id} value={ft.id}>{ft.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="preferred_date"
            label="期望日期时间"
            rules={[{ required: true, message: '请选择期望日期时间' }]}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="选择期望日期时间"
            />
          </Form.Item>
          <Form.Item
            name="weight_range_min"
            label="最小体重 (kg)"
            rules={[{ required: true, message: '请输入最小体重' }]}
          >
            <Input type="number" placeholder="请输入最小体重" />
          </Form.Item>
          <Form.Item
            name="weight_range_max"
            label="最大体重 (kg)"
            rules={[{ required: true, message: '请输入最大体重' }]}
          >
            <Input type="number" placeholder="请输入最大体重" />
          </Form.Item>
          <Form.Item
            name="skill_level_preference"
            label="期望技术水平"
          >
            <Select placeholder="请选择期望技术水平">
              {skillLevels.map((level) => (
                <Option key={level} value={level}>{skillLevelText[level]}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setRequestModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">提交</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <Space>
            <UserAddOutlined />
            <span>潜在对练伙伴 - {selectedRequest?.member.name}</span>
          </Space>
        }
        open={partnerModalVisible}
        onCancel={() => setPartnerModalVisible(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        {partnersLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : potentialPartners.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            暂无潜在对练伙伴
          </div>
        ) : (
          <List
            dataSource={potentialPartners}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => handleManualMatch(item)}
                  >
                    选择配对
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar src={item.member.avatar}>{item.member.name?.charAt(0)}</Avatar>}
                  title={
                    <Space>
                      <span>{item.member.name}</span>
                      <Tag color="blue">{item.member.skill_level}</Tag>
                      <span style={{ color: '#666', fontSize: 12 }}>
                        {item.member.weight} kg
                      </span>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Space>
                        <span>匹配分:</span>
                        <Rate
                          disabled
                          allowHalf
                          count={5}
                          value={item.match_score / 20}
                        />
                        <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                          {item.match_score}/100
                        </span>
                      </Space>
                      <Progress
                        percent={item.match_score}
                        size="small"
                        style={{ width: 200, marginTop: 4 }}
                      />
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  );
};

export default SparringMatchPage;
