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
  Collapse,
  Slider,
  Switch,
  Divider,
  Row,
  Col,
  Descriptions,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  ThunderboltOutlined,
  UserAddOutlined,
  TeamOutlined,
  SettingOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  matchRequestApi,
  sparringMatchApi,
  memberApi,
  fightTypeApi,
  matchingWeightConfigApi,
} from '../services/api';
import type {
  MatchRequest,
  SparringMatch,
  MatchScore,
  Member,
  FightType,
  MatchingWeightConfig,
  MatchScoreDetails,
  TrainingLoadAssessment,
} from '../types';

const { Option } = Select;
const { TabPane } = Tabs;
const { Panel } = Collapse;

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

const riskLevelColors: Record<string, string> = {
  safe: 'green',
  low: 'blue',
  moderate: 'orange',
  high: 'red',
  dangerous: 'magenta',
};

const riskLevelText: Record<string, string> = {
  safe: '安全',
  low: '低风险',
  moderate: '中风险',
  high: '高风险',
  dangerous: '危险',
};

const riskLevelIcons: Record<string, React.ReactNode> = {
  safe: <CheckCircleOutlined />,
  low: <InfoCircleOutlined />,
  moderate: <WarningOutlined />,
  high: <ExclamationCircleOutlined />,
  dangerous: <CloseCircleOutlined />,
};

const loadLevelText: Record<string, string> = {
  very_low: '极低',
  low: '低',
  moderate: '中等',
  high: '高',
  very_high: '极高',
};

const recoveryStatusText: Record<string, string> = {
  exhausted: '精疲力竭',
  fatigued: '疲劳',
  normal: '正常',
  recovered: '已恢复',
  fresh: '状态极佳',
};

const scoreDimensionLabels: Record<string, string> = {
  weight_similarity: '体重相似性',
  skill_similarity: '技术相似性',
  time_compatibility: '时间兼容性',
  fight_type_match: '格斗类型匹配',
  recent_match_avoidance: '近期对练规避',
  load_risk_penalty: '负荷风险惩罚',
  injury_risk_penalty: '伤病风险惩罚',
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
  const [weightConfigModalVisible, setWeightConfigModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MatchRequest | null>(null);
  const [potentialPartners, setPotentialPartners] = useState<MatchScore[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [activeWeightConfig, setActiveWeightConfig] = useState<MatchingWeightConfig | null>(null);
  const [weightConfigLoading, setWeightConfigLoading] = useState(false);
  const [weightConfigForm] = Form.useForm();
  const [filters, setFilters] = useState({
    member_id: undefined as number | undefined,
    status: undefined as string | undefined,
    fight_type_id: undefined as number | undefined,
  });
  const [form] = Form.useForm();

  useEffect(() => {
    loadInitialData();
    loadActiveWeightConfig();
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

  const loadActiveWeightConfig = async () => {
    try {
      const res = await matchingWeightConfigApi.getActive();
      setActiveWeightConfig(res.data);
    } catch (error) {
      message.error('加载权重配置失败');
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
    if (partner.score_details?.is_blocked) {
      message.error('该伙伴为高风险，已被屏蔽，无法选择');
      return;
    }
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

  const handleOpenWeightConfig = () => {
    if (activeWeightConfig) {
      weightConfigForm.setFieldsValue({
        name: activeWeightConfig.name,
        weight_similarity_weight: activeWeightConfig.weight_similarity_weight,
        skill_similarity_weight: activeWeightConfig.skill_similarity_weight,
        time_compatibility_weight: activeWeightConfig.time_compatibility_weight,
        fight_type_match_weight: activeWeightConfig.fight_type_match_weight,
        recent_match_avoidance_weight: activeWeightConfig.recent_match_avoidance_weight,
        load_risk_penalty_weight: activeWeightConfig.load_risk_penalty_weight,
        injury_risk_penalty_weight: activeWeightConfig.injury_risk_penalty_weight,
        max_allowed_weight_diff: activeWeightConfig.max_allowed_weight_diff,
        max_allowed_skill_diff: activeWeightConfig.max_allowed_skill_diff,
        max_allowed_risk_score: activeWeightConfig.max_allowed_risk_score,
        min_recent_match_interval_days: activeWeightConfig.min_recent_match_interval_days,
        auto_block_high_risk: activeWeightConfig.auto_block_high_risk,
      });
    }
    setWeightConfigModalVisible(true);
  };

  const handleSaveWeightConfig = async (values: any) => {
    setWeightConfigLoading(true);
    try {
      const totalWeight = 
        values.weight_similarity_weight +
        values.skill_similarity_weight +
        values.time_compatibility_weight +
        values.fight_type_match_weight +
        values.recent_match_avoidance_weight +
        values.load_risk_penalty_weight +
        values.injury_risk_penalty_weight;

      if (Math.abs(totalWeight - 100) > 0.1) {
        message.error('所有权重之和必须等于100，当前总和为: ' + totalWeight.toFixed(1));
        setWeightConfigLoading(false);
        return;
      }

      if (activeWeightConfig) {
        await matchingWeightConfigApi.update(activeWeightConfig.id, values);
        message.success('权重配置保存成功');
        loadActiveWeightConfig();
        setWeightConfigModalVisible(false);
      }
    } catch (error) {
      message.error('保存权重配置失败');
    } finally {
      setWeightConfigLoading(false);
    }
  };

  const renderScoreBreakdown = (scoreDetails: MatchScoreDetails) => {
    const breakdownItems = [
      { key: 'weight_similarity', data: scoreDetails.score_breakdown.weight_similarity },
      { key: 'skill_similarity', data: scoreDetails.score_breakdown.skill_similarity },
      { key: 'time_compatibility', data: scoreDetails.score_breakdown.time_compatibility },
      { key: 'fight_type_match', data: scoreDetails.score_breakdown.fight_type_match },
      { key: 'recent_match_avoidance', data: scoreDetails.score_breakdown.recent_match_avoidance },
      { key: 'load_risk_penalty', data: scoreDetails.score_breakdown.load_risk_penalty },
      { key: 'injury_risk_penalty', data: scoreDetails.score_breakdown.injury_risk_penalty },
    ];

    return (
      <Collapse size="small" style={{ marginTop: 8 }}>
        {breakdownItems.map(({ key, data }) => (
          <Panel
            key={key}
            header={
              <Space>
                <span style={{ fontWeight: 500 }}>{scoreDimensionLabels[key]}</span>
                <Tag color="blue">原始分: {data.raw_score.toFixed(1)}</Tag>
                <Tag color="orange">权重: {data.weight.toFixed(1)}%</Tag>
                <Tag color="green" style={{ fontWeight: 'bold' }}>
                  加权分: {data.weighted_score.toFixed(1)}
                </Tag>
                {data.penalty_amount && data.penalty_amount > 0 && (
                  <Tag color="red">惩罚: -{data.penalty_amount.toFixed(1)}</Tag>
                )}
              </Space>
            }
          >
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="原始分">{data.raw_score.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="权重">{data.weight.toFixed(2)}%</Descriptions.Item>
              <Descriptions.Item label="加权分" span={2}>
                <span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: 16 }}>
                  {data.weighted_score.toFixed(2)}
                </span>
              </Descriptions.Item>
              {data.penalty_amount !== undefined && (
                <Descriptions.Item label="惩罚值" span={2}>
                  <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                    {data.penalty_amount > 0 ? `-${data.penalty_amount.toFixed(2)}` : '无'}
                  </span>
                </Descriptions.Item>
              )}
              {data.risk_factors && data.risk_factors.length > 0 && (
                <Descriptions.Item label="风险因素" span={2}>
                  {data.risk_factors.map((factor, idx) => (
                    <Tag key={idx} color="orange" style={{ marginBottom: 4 }}>
                      {factor}
                    </Tag>
                  ))}
                </Descriptions.Item>
              )}
              {data.details && Object.keys(data.details).length > 0 && (
                <Descriptions.Item label="详细信息" span={2}>
                  {Object.entries(data.details).map(([k, v]) => (
                    <div key={k} style={{ fontSize: 12, color: '#666' }}>
                      {k}: {String(v)}
                    </div>
                  ))}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Panel>
        ))}
      </Collapse>
    );
  };

  const renderRiskLevelTag = (riskLevel: string, isBlocked: boolean) => {
    if (isBlocked) {
      return (
        <Tag color="red" icon={<CloseCircleOutlined />} style={{ fontWeight: 'bold', fontSize: 14 }}>
          高风险，已屏蔽
        </Tag>
      );
    }
    return (
      <Tag
        color={riskLevelColors[riskLevel] || 'default'}
        icon={riskLevelIcons[riskLevel]}
        style={{ fontWeight: 500 }}
      >
        {riskLevelText[riskLevel] || riskLevel}
      </Tag>
    );
  };

  const renderLoadAssessment = (load: TrainingLoadAssessment, memberName: string) => {
    const loadColor = load.load_level === 'very_high' || load.load_level === 'high' ? '#ff4d4f' :
                     load.load_level === 'moderate' ? '#faad14' : '#52c41a';
    const recoveryColor = load.recovery_status === 'exhausted' || load.recovery_status === 'fatigued' ? '#ff4d4f' :
                          load.recovery_status === 'normal' ? '#faad14' : '#52c41a';

    return (
      <Card size="small" title={`${memberName} 当前负荷状态`} style={{ marginTop: 8 }}>
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: '#666', fontSize: 12 }}>训练负荷指数</span>
              <Progress
                percent={load.training_load_index}
                size="small"
                strokeColor={loadColor}
                format={(percent) => `${percent?.toFixed(0)}`}
              />
              <Tag color={loadColor === '#52c41a' ? 'green' : loadColor === '#faad14' ? 'orange' : 'red'}>
                {loadLevelText[load.load_level]}
              </Tag>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: '#666', fontSize: 12 }}>恢复评分</span>
              <Progress
                percent={load.recovery_score}
                size="small"
                strokeColor={recoveryColor}
                format={(percent) => `${percent?.toFixed(0)}`}
              />
              <Tag color={recoveryColor === '#52c41a' ? 'green' : recoveryColor === '#faad14' ? 'orange' : 'red'}>
                {recoveryStatusText[load.recovery_status]}
              </Tag>
            </div>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: load.acwr > 1.5 ? '#ff4d4f' : load.acwr > 1.0 ? '#faad14' : '#52c41a' }}>
                {load.acwr.toFixed(2)}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>ACWR</div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: load.injury_risk_score > 70 ? '#ff4d4f' : load.injury_risk_score > 40 ? '#faad14' : '#52c41a' }}>
                {load.injury_risk_score.toFixed(0)}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>伤病风险</div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>
                {load.available_training_minutes}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>可训练分钟</div>
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  const renderPartnerCard = (item: MatchScore) => {
    const scoreDetails = item.score_details;

    if (!scoreDetails) {
      return (
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
                <Tag color="blue">{skillLevelText[item.member.skill_level] || item.member.skill_level}</Tag>
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
      );
    }

    return (
      <Card
        size="small"
        style={{ marginBottom: 12 }}
        title={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Avatar src={item.member.avatar}>{item.member.name?.charAt(0)}</Avatar>
              <span style={{ fontWeight: 500, fontSize: 16 }}>{item.member.name}</span>
              <Tag color="blue">{skillLevelText[item.member.skill_level] || item.member.skill_level}</Tag>
              <span style={{ color: '#666', fontSize: 12 }}>{item.member.weight} kg</span>
              {renderRiskLevelTag(scoreDetails.risk_level, scoreDetails.is_blocked)}
            </Space>
            <Space>
              <span style={{ color: '#1890ff', fontWeight: 'bold', fontSize: 18 }}>
                {item.match_score.toFixed(1)}/100
              </span>
              <Rate
                disabled
                allowHalf
                count={5}
                value={item.match_score / 20}
              />
            </Space>
          </Space>
        }
        extra={
          <Button
            type="primary"
            size="small"
            onClick={() => handleManualMatch(item)}
            disabled={scoreDetails.is_blocked}
            danger={scoreDetails.is_blocked}
          >
            {scoreDetails.is_blocked ? '已屏蔽' : '选择配对'}
          </Button>
        }
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Progress
            percent={item.match_score}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />

          <Row gutter={16}>
            <Col span={12}>
              <Card size="small" title="匹配分拆解" style={{ height: '100%' }}>
                {renderScoreBreakdown(scoreDetails)}
              </Card>
            </Col>
            <Col span={12}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Card size="small" title="风险评估">
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space>
                      <span>风险评分:</span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: scoreDetails.risk_score > 70 ? '#ff4d4f' : scoreDetails.risk_score > 40 ? '#faad14' : '#52c41a' 
                      }}>
                        {scoreDetails.risk_score.toFixed(1)}
                      </span>
                    </Space>
                    {scoreDetails.risk_assessment.risk_factors.length > 0 && (
                      <div>
                        <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>风险因素:</div>
                        {scoreDetails.risk_assessment.risk_factors.map((factor, idx) => (
                          <Tag key={idx} color="orange" style={{ marginBottom: 4 }}>
                            <WarningOutlined /> {factor}
                          </Tag>
                        ))}
                      </div>
                    )}
                    {scoreDetails.risk_assessment.recommendations.length > 0 && (
                      <div>
                        <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>建议:</div>
                        {scoreDetails.risk_assessment.recommendations.map((rec, idx) => (
                          <Tag key={idx} color="blue" style={{ marginBottom: 4 }}>
                            <InfoCircleOutlined /> {rec}
                          </Tag>
                        ))}
                      </div>
                    )}
                    {scoreDetails.is_blocked && scoreDetails.block_reason && (
                      <Alert
                        message="屏蔽原因"
                        description={scoreDetails.block_reason}
                        type="error"
                        showIcon
                      />
                    )}
                  </Space>
                </Card>

                {scoreDetails.member1_load && selectedRequest && (
                  renderLoadAssessment(scoreDetails.member1_load, selectedRequest.member.name)
                )}
                {scoreDetails.member2_load && (
                  renderLoadAssessment(scoreDetails.member2_load, item.member.name)
                )}
              </Space>
            </Col>
          </Row>
        </Space>
      </Card>
    );
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

  const weightSliderMarks = {
    0: '0%',
    10: '10%',
    20: '20%',
    30: '30%',
    40: '40%',
    50: '50%',
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space direction="vertical" size={4}>
            <h2 style={{ margin: 0 }}>对练匹配管理</h2>
            {activeWeightConfig && (
              <Tag color="blue" style={{ marginTop: 4 }}>
                当前配置: {activeWeightConfig.name}
              </Tag>
            )}
          </Space>
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={handleOpenWeightConfig}
            >
              权重配置
            </Button>
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
        width={1200}
        destroyOnClose
      >
        {partnersLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : potentialPartners.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            暂无潜在对练伙伴
          </div>
        ) : (
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {potentialPartners.map((item) => (
              <div key={item.member.id}>
                {renderPartnerCard(item)}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        title={
          <Space>
            <SettingOutlined />
            <span>匹配权重配置</span>
          </Space>
        }
        open={weightConfigModalVisible}
        onCancel={() => setWeightConfigModalVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form
          form={weightConfigForm}
          layout="vertical"
          onFinish={handleSaveWeightConfig}
        >
          <Card size="small" title="基本信息" style={{ marginBottom: 16 }}>
            <Form.Item
              name="name"
              label="配置名称"
              rules={[{ required: true, message: '请输入配置名称' }]}
            >
              <Input placeholder="请输入配置名称" />
            </Form.Item>
          </Card>

          <Card size="small" title="权重配置（总和必须为100%）" style={{ marginBottom: 16 }}>
            <Form.Item
              name="weight_similarity_weight"
              label="体重相似性权重"
              rules={[{ required: true, message: '请设置权重' }]}
            >
              <Slider
                min={0}
                max={50}
                marks={weightSliderMarks}
                tooltip={{ formatter: (value) => `${value}%` }}
              />
            </Form.Item>
            <Form.Item
              name="skill_similarity_weight"
              label="技术相似性权重"
              rules={[{ required: true, message: '请设置权重' }]}
            >
              <Slider
                min={0}
                max={50}
                marks={weightSliderMarks}
                tooltip={{ formatter: (value) => `${value}%` }}
              />
            </Form.Item>
            <Form.Item
              name="time_compatibility_weight"
              label="时间兼容性权重"
              rules={[{ required: true, message: '请设置权重' }]}
            >
              <Slider
                min={0}
                max={50}
                marks={weightSliderMarks}
                tooltip={{ formatter: (value) => `${value}%` }}
              />
            </Form.Item>
            <Form.Item
              name="fight_type_match_weight"
              label="格斗类型匹配权重"
              rules={[{ required: true, message: '请设置权重' }]}
            >
              <Slider
                min={0}
                max={50}
                marks={weightSliderMarks}
                tooltip={{ formatter: (value) => `${value}%` }}
              />
            </Form.Item>
            <Form.Item
              name="recent_match_avoidance_weight"
              label="近期对练规避权重"
              rules={[{ required: true, message: '请设置权重' }]}
            >
              <Slider
                min={0}
                max={50}
                marks={weightSliderMarks}
                tooltip={{ formatter: (value) => `${value}%` }}
              />
            </Form.Item>
            <Form.Item
              name="load_risk_penalty_weight"
              label="负荷风险惩罚权重"
              rules={[{ required: true, message: '请设置权重' }]}
            >
              <Slider
                min={0}
                max={50}
                marks={weightSliderMarks}
                tooltip={{ formatter: (value) => `${value}%` }}
              />
            </Form.Item>
            <Form.Item
              name="injury_risk_penalty_weight"
              label="伤病风险惩罚权重"
              rules={[{ required: true, message: '请设置权重' }]}
            >
              <Slider
                min={0}
                max={50}
                marks={weightSliderMarks}
                tooltip={{ formatter: (value) => `${value}%` }}
              />
            </Form.Item>
          </Card>

          <Card size="small" title="限制配置" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="max_allowed_weight_diff"
                  label="最大允许体重差 (kg)"
                  rules={[{ required: true, message: '请输入最大允许体重差' }]}
                >
                  <Input type="number" placeholder="例如: 5" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="max_allowed_skill_diff"
                  label="最大允许技术差"
                  rules={[{ required: true, message: '请输入最大允许技术差' }]}
                >
                  <Input type="number" placeholder="例如: 2" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="max_allowed_risk_score"
                  label="最大允许风险评分 (0-100)"
                  rules={[{ required: true, message: '请输入最大允许风险评分' }]}
                >
                  <Input type="number" placeholder="例如: 70" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="min_recent_match_interval_days"
                  label="最小近期对练间隔天数"
                  rules={[{ required: true, message: '请输入最小间隔天数' }]}
                >
                  <Input type="number" placeholder="例如: 3" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card size="small" title="安全设置" style={{ marginBottom: 16 }}>
            <Form.Item
              name="auto_block_high_risk"
              label="自动屏蔽高风险配对"
              valuePropName="checked"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            <div style={{ color: '#666', fontSize: 12, marginTop: -8 }}>
              开启后，系统将自动屏蔽超过最大允许风险评分的配对组合
            </div>
          </Card>

          <Divider />

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setWeightConfigModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={weightConfigLoading}>
                保存配置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SparringMatchPage;
