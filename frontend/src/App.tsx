import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, theme, Typography, Space } from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  SwapOutlined,
  TrophyOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import MembersPage from './pages/Members';
import TrainingPlansPage from './pages/TrainingPlans';
import SparringMatchPage from './pages/SparringMatch';
import MatchRecordsPage from './pages/MatchRecords';
import StatisticsPage from './pages/Statistics';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const menuItems = [
  {
    key: '/members',
    icon: <UserOutlined />,
    label: <Link to="/members">会员档案</Link>,
  },
  {
    key: '/training-plans',
    icon: <CalendarOutlined />,
    label: <Link to="/training-plans">训练计划</Link>,
  },
  {
    key: '/sparring-match',
    icon: <SwapOutlined />,
    label: <Link to="/sparring-match">对练匹配</Link>,
  },
  {
    key: '/match-records',
    icon: <TrophyOutlined />,
    label: <Link to="/match-records">实战记录</Link>,
  },
  {
    key: '/statistics',
    icon: <BarChartOutlined />,
    label: <Link to="/statistics">数据统计</Link>,
  },
];

function AppContent() {
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={240}
        style={{
          background: colorBgContainer,
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <div
          style={{
            padding: '24px 16px',
            borderBottom: '1px solid #f0f0f0',
            marginBottom: '8px',
          }}
        >
          <Space align="center" size="middle">
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              🥊
            </div>
            <Title level={4} style={{ margin: 0 }}>
              格斗健身房
            </Title>
          </Space>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ borderRight: 'none' }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Title level={3} style={{ margin: 0 }}>
            {
              menuItems.find(item => item.key === location.pathname)?.label?.props?.children || '格斗健身房管理系统'
            }
          </Title>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: '24px',
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 280,
          }}
        >
          <Routes>
            <Route path="/" element={<MembersPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/training-plans" element={<TrainingPlansPage />} />
            <Route path="/sparring-match" element={<SparringMatchPage />} />
            <Route path="/match-records" element={<MatchRecordsPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
