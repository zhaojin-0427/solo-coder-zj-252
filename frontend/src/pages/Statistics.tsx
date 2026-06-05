import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Tabs,
  Tag,
  Space,
  Table,
  Typography,
  Spin,
  message,
} from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  ScheduleOutlined,
  TrophyOutlined,
  BookOutlined,
  RiseOutlined,
  HeatMapOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { ColumnsType } from 'antd/es/table';
import type { EChartsOption } from 'echarts';
import dayjs from 'dayjs';
import { statisticsApi, memberApi } from '../services/api';
import type {
  OverviewStats,
  FightTypeActivity,
  SkillProgress,
  MatchingStats,
  TrainingFrequency,
  Member,
} from '../types';

const { Title } = Typography;
const { Option } = Select;

const colors = ['#165DFF', '#00B42A', '#F53F3F', '#FF7D00', '#722ED1', '#14C9C9', '#CB26B6', '#94D53D'];

const StatisticsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [skillLoading, setSkillLoading] = useState(false);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [frequencyLoading, setFrequencyLoading] = useState(false);

  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [fightTypeActivity, setFightTypeActivity] = useState<FightTypeActivity[]>([]);
  const [skillProgression, setSkillProgression] = useState<SkillProgress[]>([]);
  const [matchingStats, setMatchingStats] = useState<MatchingStats | null>(null);
  const [trainingFreq, setTrainingFreq] = useState<TrainingFrequency | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  const [selectedMember, setSelectedMember] = useState<number | undefined>();
  const [matchingDays, setMatchingDays] = useState<number>(30);
  const [frequencyDays, setFrequencyDays] = useState<number>(30);

  const loadOverview = async () => {
    setOverviewLoading(true);
    try {
      const [overviewRes, activityRes] = await Promise.all([
        statisticsApi.getOverview(),
        statisticsApi.getFightTypeActivity(),
      ]);
      setOverview(overviewRes.data);
      setFightTypeActivity(activityRes.data);
    } catch {
      message.error('加载概览数据失败');
    } finally {
      setOverviewLoading(false);
    }
  };

  const loadSkillProgression = async () => {
    setSkillLoading(true);
    try {
      const [skillRes, membersRes] = await Promise.all([
        statisticsApi.getSkillProgression({ member: selectedMember }),
        memberApi.getAll(),
      ]);
      setSkillProgression(skillRes.data);
      setMembers(membersRes.data.results);
    } catch {
      message.error('加载技术进展数据失败');
    } finally {
      setSkillLoading(false);
    }
  };

  const loadMatchingStats = async () => {
    setMatchingLoading(true);
    try {
      const res = await statisticsApi.getMatchingSuccessRate(matchingDays);
      setMatchingStats(res.data);
    } catch {
      message.error('加载配对数据失败');
    } finally {
      setMatchingLoading(false);
    }
  };

  const loadTrainingFrequency = async () => {
    setFrequencyLoading(true);
    try {
      const res = await statisticsApi.getTrainingFrequency(frequencyDays);
      setTrainingFreq(res.data);
    } catch {
      message.error('加载训练频次数据失败');
    } finally {
      setFrequencyLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverview();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'skill') {
      loadSkillProgression();
    }
  }, [activeTab, selectedMember]);

  useEffect(() => {
    if (activeTab === 'matching') {
      loadMatchingStats();
    }
  }, [activeTab, matchingDays]);

  useEffect(() => {
    if (activeTab === 'frequency') {
      loadTrainingFrequency();
    }
  }, [activeTab, frequencyDays]);

  const getFightTypeChartOption = (): EChartsOption => {
    const xData = fightTypeActivity.map((item) => item.name);
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['会员数', '课程数', '比赛数'],
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLabel: {
          interval: 0,
          rotate: 0,
        },
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: '会员数',
          type: 'bar',
          data: fightTypeActivity.map((item) => item.member_count),
          itemStyle: { color: colors[0] },
          barWidth: '20%',
        },
        {
          name: '课程数',
          type: 'bar',
          data: fightTypeActivity.map((item) => item.session_count),
          itemStyle: { color: colors[1] },
          barWidth: '20%',
        },
        {
          name: '比赛数',
          type: 'bar',
          data: fightTypeActivity.map((item) => item.match_count),
          itemStyle: { color: colors[2] },
          barWidth: '20%',
        },
      ],
    };
  };

  const getSkillLineChartOption = (memberData: SkillProgress): EChartsOption => {
    const allDates = new Set<string>();
    memberData.techniques.forEach((tech) => {
      tech.records.forEach((r) => allDates.add(r.date));
    });
    const sortedDates = Array.from(allDates).sort();
    
    const series = memberData.techniques.map((tech, index) => ({
      name: tech.technique,
      type: 'line' as const,
      smooth: true,
      data: sortedDates.map((date) => {
        const record = tech.records.find((r) => r.date === date);
        return record ? record.mastery : null;
      }),
      itemStyle: { color: colors[index % colors.length] },
      connectNulls: true,
    }));

    return {
      title: {
        text: memberData.member_name,
        left: 'center',
        textStyle: { fontSize: 14, color: '#1f2937' },
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        top: 30,
        type: 'scroll',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '25%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: sortedDates.map((d) => dayjs(d).format('MM-DD')),
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
      },
      series,
    };
  };

  const getMatchingPieOption = (): EChartsOption => {
    if (!matchingStats) return {};
    const success = matchingStats.matched_requests;
    const fail = matchingStats.total_requests - matchingStats.matched_requests;
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
      },
      series: [
        {
          name: '配对结果',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
              fontWeight: 'bold',
            },
          },
          data: [
            { value: success, name: '配对成功', itemStyle: { color: colors[1] } },
            { value: fail, name: '配对失败', itemStyle: { color: colors[2] } },
          ],
        },
      ],
    };
  };

  const getMatchingBarOption = (): EChartsOption => {
    if (!matchingStats) return {};
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['已完成比赛', '已安排比赛'],
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: ['比赛统计'],
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: '已完成比赛',
          type: 'bar',
          data: [matchingStats.completed_matches],
          itemStyle: { color: colors[0] },
          barWidth: '30%',
        },
        {
          name: '已安排比赛',
          type: 'bar',
          data: [matchingStats.scheduled_matches],
          itemStyle: { color: colors[3] },
          barWidth: '30%',
        },
      ],
    };
  };

  const getDailyTrendOption = (): EChartsOption => {
    if (!trainingFreq) return {};
    return {
      tooltip: {
        trigger: 'axis',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: trainingFreq.daily_distribution.map((d) => dayjs(d.date).format('MM-DD')),
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: '训练次数',
          type: 'line',
          smooth: true,
          areaStyle: {
            color: {
              type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(22, 93, 255, 0.5)' },
              { offset: 1, color: 'rgba(22, 93, 255, 0.05)' },
            ],
          },
        },
          itemStyle: { color: colors[0] },
          data: trainingFreq.daily_distribution.map((d) => d.count),
        },
      ],
    };
  };

  const getWeekdayOption = (): EChartsOption => {
    if (!trainingFreq) return {};
    const weekdayMap: Record<string, string> = {
      'Monday': '周一', 'Tuesday': '周二', 'Wednesday': '周三', 'Thursday': '周四',
      'Friday': '周五', 'Saturday': '周六', 'Sunday': '周日',
    };
    const orderedDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const data = orderedDays.map((day) => {
      const item = trainingFreq.weekday_distribution.find(
        (w) => weekdayMap[w.day] === day || w.day === day
      );
      return item ? item.count : 0;
    });

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: orderedDays,
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: '训练次数',
          type: 'bar',
          data: data,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: colors[1] },
                { offset: 1, color: '#86efac' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '50%',
        },
      ],
    };
  };

  const getHourOption = (): EChartsOption => {
    if (!trainingFreq) return {};
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const data = hours.map((hour) => {
      const item = trainingFreq.hour_distribution.find((h) => h.hour === hour);
      return item ? item.count : 0;
    });

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: hours.map((h) => `${h}:00`),
        axisLabel: {
          interval: 2,
        },
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: '训练次数',
          type: 'bar',
          data: data,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: colors[3] },
                { offset: 1, color: '#fdba74' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '60%',
        },
      ],
    };
  };

  const skillColumns: ColumnsType<{ technique: string; currentMastery: number; improvement: number }> = [
    {
      title: '技术名称',
      dataIndex: 'technique',
      key: 'technique',
    },
    {
      title: '当前掌握度',
      dataIndex: 'currentMastery',
      key: 'currentMastery',
      width: 150,
      render: (value) => `${value}%`,
    },
    {
      title: '进步幅度',
      dataIndex: 'improvement',
      key: 'improvement',
      width: 150,
      render: (value) => (
        <Tag color={value > 0 ? 'green' : value < 0 ? 'red' : 'default'}>
          {value > 0 ? '+' : ''}
          {value}%
        </Tag>
      ),
    },
  ];

  const topMemberColumns: ColumnsType<{ member_id: number; member__name: string; count: number; rank: number }> = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (value) => {
        if (value === 1) return <Tag color="gold">🥇 第1名</Tag>;
        if (value === 2) return <Tag color="silver">🥈 第2名</Tag>;
        if (value === 3) return <Tag color="bronze">🥉 第3名</Tag>;
        return `第${value}名`;
      },
    },
    {
      title: '会员姓名',
      dataIndex: 'member__name',
      key: 'member__name',
    },
    {
      title: '训练次数',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      render: (value) => (
        <Space>
          <HeatMapOutlined style={{ color: colors[0] }} />
          <span>{value} 次</span>
        </Space>
      ),
    },
  ];

  const getSkillRankingData = () => {
    const allTechniques: Record<string, { currentMastery: number; improvement: number; total: number }> = {};
    skillProgression.forEach((member) => {
      member.techniques.forEach((tech) => {
        if (!allTechniques[tech.technique]) {
          allTechniques[tech.technique] = { currentMastery: 0, improvement: 0, total: 0 };
        }
        const latestRecord = tech.records[tech.records.length - 1];
        if (latestRecord) {
          allTechniques[tech.technique].currentMastery += latestRecord.mastery;
          allTechniques[tech.technique].improvement += tech.improvement;
          allTechniques[tech.technique].total += 1;
        }
      });
    });
    return Object.entries(allTechniques)
      .map(([technique, data]) => ({
        key: technique,
        technique,
        currentMastery: Math.round(data.currentMastery / Math.max(data.total, 1)),
        improvement: Math.round(data.improvement / Math.max(data.total, 1)),
      }))
      .sort((a, b) => b.improvement - a.improvement);
  };

  const tabItems = [
    {
      key: 'overview',
      label: (
        <Space>
          <BarChartOutlined />
          概览
        </Space>
      ),
      children: (
        <Spin spinning={overviewLoading}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={4.8}>
              <Card>
                <Statistic
                  title={<Space><TeamOutlined style={{ color: colors[0] }} /> 总会员数</Space>}
                  value={overview?.total_members || 0}
                  valueStyle={{ color: colors[0] }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4.8}>
              <Card>
                <Statistic
                  title={<Space><UserOutlined style={{ color: colors[1] }} /> 总教练数</Space>}
                  value={overview?.total_coaches || 0}
                  valueStyle={{ color: colors[1] }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4.8}>
              <Card>
                <Statistic
                  title={<Space><ScheduleOutlined style={{ color: colors[2] }} /> 活跃训练计划</Space>}
                  value={overview?.total_plans || 0}
                  valueStyle={{ color: colors[2] }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4.8}>
              <Card>
                <Statistic
                  title={<Space><TrophyOutlined style={{ color: colors[3] }} /> 已完成比赛</Space>}
                  value={overview?.total_matches || 0}
                  valueStyle={{ color: colors[3] }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4.8}>
              <Card>
                <Statistic
                  title={<Space><BookOutlined style={{ color: colors[4] }} /> 已完成课程</Space>}
                  value={overview?.total_sessions || 0}
                  valueStyle={{ color: colors[4] }}
                />
              </Card>
            </Col>
          </Row>

          <Card
            title={
              <Space>
                <BarChartOutlined />
                格斗类型活跃度
              </Space>
            }
            style={{ marginTop: 16 }}
          >
            <ReactECharts
              option={getFightTypeChartOption()}
              style={{ height: 400 }}
              notMerge
              lazyUpdate
            />
          </Card>
        </Spin>
      ),
    },
    {
      key: 'skill',
      label: (
        <Space>
          <LineChartOutlined />
          技术进展
        </Space>
      ),
      children: (
        <Spin spinning={skillLoading}>
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="选择会员"
              style={{ width: 200 }}
              allowClear
              value={selectedMember}
              onChange={setSelectedMember}
            >
              {members.map((m) => (
                <Option key={m.id} value={m.id}>
                  {m.name}
                </Option>
              ))}
            </Select>
          </Space>

          {skillProgression.length > 0 && (
            <>
              <Row gutter={[16, 16]}>
                {skillProgression.map((member) => (
                  <Col xs={24} lg={12} key={member.member_id}>
                    <Card>
                      <ReactECharts
                        option={getSkillLineChartOption(member)}
                        style={{ height: 350 }}
                        notMerge
                        lazyUpdate
                      />
                    </Card>
                  </Col>
                ))}
              </Row>

              <Card
                title={
                  <Space>
                    <RiseOutlined />
                    技术进步排名
                  </Space>
                }
                style={{ marginTop: 16 }}
              >
                <Table
                  columns={skillColumns}
                  dataSource={getSkillRankingData()}
                  rowKey="technique"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条记录`,
                  }}
                />
              </Card>
            </>
          )}
        </Spin>
      ),
    },
    {
      key: 'matching',
      label: (
        <Space>
          <PieChartOutlined />
          配对成功率
        </Space>
      ),
      children: (
        <Spin spinning={matchingLoading}>
          <Space style={{ marginBottom: 16 }}>
            <span>统计天数：</span>
            <Select value={matchingDays} onChange={setMatchingDays} style={{ width: 120 }}>
              <Option value={7}>最近 7 天</Option>
              <Option value={30}>最近 30 天</Option>
              <Option value={90}>最近 90 天</Option>
            </Select>
          </Space>

          {matchingStats && (
            <>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8} lg={4.8}>
                  <Card>
                    <Statistic
                      title={<Space><TeamOutlined style={{ color: colors[0] }} /> 总请求数</Space>}
                      value={matchingStats.total_requests}
                      valueStyle={{ color: colors[0] }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4.8}>
                  <Card>
                    <Statistic
                      title={<Space><UserOutlined style={{ color: colors[1] }} /> 成功配对数</Space>}
                      value={matchingStats.matched_requests}
                      valueStyle={{ color: colors[1] }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4.8}>
                  <Card>
                    <Statistic
                      title={<Space><TrophyOutlined style={{ color: colors[2] }} /> 配对成功率</Space>}
                      value={matchingStats.success_rate}
                      precision={2}
                      suffix="%"
                      valueStyle={{ color: colors[2] }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4.8}>
                  <Card>
                    <Statistic
                      title={<Space><RiseOutlined style={{ color: colors[3] }} /> 平均匹配分</Space>}
                      value={matchingStats.average_match_score}
                      precision={2}
                      valueStyle={{ color: colors[3] }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4.8}>
                  <Card>
                    <Statistic
                      title={<Space><ScheduleOutlined style={{ color: colors[4] }} /> 比赛完成率</Space>}
                      value={matchingStats.completion_rate}
                      precision={2}
                      suffix="%"
                      valueStyle={{ color: colors[4] }}
                    />
                  </Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} lg={12}>
                  <Card
                    title={
                      <Space>
                        <PieChartOutlined />
                        配对成功vs失败比例
                      </Space>
                    }
                  >
                    <ReactECharts
                      option={getMatchingPieOption()}
                      style={{ height: 350 }}
                      notMerge
                      lazyUpdate
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card
                    title={
                      <Space>
                        <BarChartOutlined />
                        已完成vs已安排比赛
                      </Space>
                    }
                  >
                    <ReactECharts
                      option={getMatchingBarOption()}
                      style={{ height: 350 }}
                      notMerge
                      lazyUpdate
                    />
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Spin>
      ),
    },
    {
      key: 'frequency',
      label: (
        <Space>
          <HeatMapOutlined />
          训练频次
        </Space>
      ),
      children: (
        <Spin spinning={frequencyLoading}>
          <Space style={{ marginBottom: 16 }}>
            <span>统计天数：</span>
            <Select value={frequencyDays} onChange={setFrequencyDays} style={{ width: 120 }}>
              <Option value={7}>最近 7 天</Option>
              <Option value={30}>最近 30 天</Option>
              <Option value={90}>最近 90 天</Option>
            </Select>
          </Space>

          {trainingFreq && (
            <>
              <Card
                title={
                  <Space>
                    <LineChartOutlined />
                    每日训练次数趋势
                  </Space>
                }
                style={{ marginBottom: 16 }}
              >
                <ReactECharts
                  option={getDailyTrendOption()}
                  style={{ height: 350 }}
                  notMerge
                  lazyUpdate
                />
              </Card>

              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} lg={12}>
                  <Card
                    title={
                      <Space>
                        <BarChartOutlined />
                        每周各天训练分布
                      </Space>
                    }
                  >
                    <ReactECharts
                      option={getWeekdayOption()}
                      style={{ height: 350 }}
                      notMerge
                      lazyUpdate
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card
                    title={
                      <Space>
                        <HeatMapOutlined />
                        每日各时段训练分布
                      </Space>
                    }
                  >
                    <ReactECharts
                      option={getHourOption()}
                      style={{ height: 350 }}
                      notMerge
                      lazyUpdate
                    />
                  </Card>
                </Col>
              </Row>

              <Card
                title={
                  <Space>
                    <TrophyOutlined />
                    训练最活跃会员 TOP10
                  </Space>
                }
              >
                <Table
                  columns={topMemberColumns}
                  dataSource={trainingFreq.top_members.slice(0, 10).map((item, index) => ({
                    ...item,
                    key: item.member_id,
                    rank: index + 1,
                  }))}
                  rowKey="member_id"
                  pagination={false}
                />
              </Card>
            </>
          )}
        </Spin>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <BarChartOutlined />
            <Title level={4} style={{ margin: 0 }}>
              数据统计中心
            </Title>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>
    </div>
  );
};

export default StatisticsPage;
