import {
  Alert,
  Badge,
  Card,
  Col,
  ConfigProvider,
  Layout,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import './App.css'

const { Header, Content, Sider } = Layout
const { Title, Text } = Typography

const stats = [
  { title: '今日订单', value: '1,248', prefix: '◈', color: '#ff5a1f' },
  { title: '营业额', value: '¥28,640', prefix: '¥', color: '#52c41a' },
  { title: '顾客数', value: '3,942', prefix: '◎', color: '#1677ff' },
  { title: '订单完成率', value: '96.8%', prefix: '✓', color: '#13c2c2' },
]

const columns = [
  { title: '订单号', dataIndex: 'id', key: 'id' },
  { title: '顾客', dataIndex: 'customer', key: 'customer' },
  { title: '金额', dataIndex: 'amount', key: 'amount' },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => (
      <Tag color={status === '已完成' ? 'success' : status === '待配送' ? 'processing' : 'warning'}>
        {status}
      </Tag>
    ),
  },
]

const dataSource = [
  { id: '#10234', customer: '王小明', amount: '¥128.00', status: '待配送', key: '1' },
  { id: '#10235', customer: '李女士', amount: '¥86.50', status: '已完成', key: '2' },
  { id: '#10236', customer: '赵同学', amount: '¥245.00', status: '待支付', key: '3' },
]

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#ff5a1f',
          colorInfo: '#ff5a1f',
          borderRadius: 12,
        },
      }}
    >
      <Layout className="merchant-layout">
        <Sider className="merchant-sider" width={220}>
          <div className="brand-wrap">
            <div className="brand-logo">E</div>
            <div>
              <Title level={4} className="brand-title">
                Elm 商家后台
              </Title>
              <Text type="secondary">运营中心</Text>
            </div>
          </div>

          <div className="nav-group">
            <div className="nav-item active">◈ 概览</div>
            <div className="nav-item">▣ 商品管理</div>
            <div className="nav-item">◎ 订单管理</div>
          </div>
        </Sider>

        <Layout>
          <Header className="merchant-header">
            <div>
              <Text strong>商家工作台</Text>
            </div>
            <Badge dot>
              <Text type="secondary">待处理消息</Text>
            </Badge>
          </Header>

          <Content className="merchant-content">
            <Alert
              type="info"
              showIcon
              message="后台为空壳状态"
              description="当前为商家端空壳页面，后续将接入商品、订单和店铺管理功能。"
              className="status-alert"
            />

            <Row gutter={[16, 16]} className="stats-row">
              {stats.map((item) => (
                <Col span={6} key={item.title}>
                  <Card className="stat-card">
                    <Statistic
                      title={item.title}
                      value={item.value}
                      prefix={<span style={{ color: item.color }}>{item.prefix}</span>}
                    />
                  </Card>
                </Col>
              ))}
            </Row>

            <Card title="最近订单" className="orders-card">
              <Table columns={columns} dataSource={dataSource} pagination={false} />
            </Card>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}

export default App
