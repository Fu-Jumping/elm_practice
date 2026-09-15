import {
  Alert, App as AntdApp, Avatar, Badge, Button, Card, Col, Drawer, Empty,
  Form, Input, InputNumber, List, Progress, Radio, Rate, Row, Skeleton,
  Space, Statistic, Switch, Table, Tag, Typography,
} from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  merchantApi,
  type Analytics,
  type Conversation,
  type Overview,
  type PromotionConfig,
  type Review,
} from './services/merchantApi'
import { localizeStatusDistribution, preparePromotionConfig } from './merchantRules'

const { Title, Text, Paragraph } = Typography

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请稍后重试。'
}

function ErrorBlock({ error, retry }: { error?: string; retry: () => void }) {
  if (!error) return null
  return <Alert className="page-feedback" type="error" showIcon message="加载失败" description={<Space direction="vertical"><span>{error}</span><Button size="small" onClick={retry}>重新加载</Button></Space>} />
}

export function OverviewPage({ navigate }: { navigate: (page: string) => void }) {
  const [data, setData] = useState<Overview>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const load = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try { setData(await merchantApi.getOverview()) }
    catch (reason) { setError(errorText(reason)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void Promise.resolve().then(load) }, [load])
  const metrics = [
    { title: '今日营业额', value: data?.todaySalesAmount ?? 0, prefix: '¥' },
    { title: '有效订单', value: data?.validOrderCount ?? 0 },
    { title: '预计收入', value: data?.expectedIncome ?? 0, prefix: '¥' },
  ]
  const todos = [
    { label: '待接单', value: data?.pendingOrderCount ?? 0, page: 'orders' },
    { label: '待回复评价', value: data?.unrepliedReviewCount ?? 0, page: 'reviews' },
    { label: '未读消息', value: data?.unreadMessageCount ?? 0, page: 'messages' },
  ]
  return <section>
    <div className="page-heading"><div><Title level={2}>运营概览</Title><Text type="secondary">今日数据只统计已支付且未取消的有效订单。</Text></div><Button onClick={() => void load()}>刷新</Button></div>
    <ErrorBlock error={error} retry={() => void load()} />
    <Skeleton loading={loading} active>
      <Row gutter={[16, 16]}>{metrics.map((item) => <Col span={8} key={item.title}><Card hoverable onClick={() => navigate('analytics')}><Statistic title={item.title} value={item.value} precision={item.prefix ? 2 : 0} prefix={item.prefix} /></Card></Col>)}</Row>
      <Card title="待处理事项" className="feature-card"><Row gutter={[12, 12]}>{todos.map((item) => <Col span={8} key={item.label}><Button className="todo-button" onClick={() => navigate(item.page)}><Badge count={item.value} showZero><span>{item.label}</span></Badge></Button></Col>)}</Row>{todos.every((item) => item.value === 0) && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待处理" />}</Card>
    </Skeleton>
  </section>
}

export function PromotionsPage() {
  const { message } = AntdApp.useApp()
  const [form] = Form.useForm<PromotionConfig>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const load = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try { form.setFieldsValue(await merchantApi.getPromotion()) }
    catch (reason) { setError(errorText(reason)) }
    finally { setLoading(false) }
  }, [form])
  useEffect(() => { void Promise.resolve().then(load) }, [load])
  async function save(values: PromotionConfig) {
    setSaving(true)
    setError(undefined)
    try {
      const payload = preparePromotionConfig(values)
      form.setFieldsValue(await merchantApi.savePromotion(payload))
      message.success('优惠配置已保存，后续订单将按新规则计价。')
    } catch (reason) { setError(errorText(reason)) }
    finally { setSaving(false) }
  }
  const nonNegative = { type: 'number' as const, min: 0, message: '请输入不小于 0 的数值' }
  return <section>
    <div className="page-heading"><div><Title level={2}>优惠配置</Title><Text type="secondary">金额由后端统一计算，保存后立即影响新订单。</Text></div></div>
    <ErrorBlock error={error} retry={() => void load()} />
    <Card loading={loading}><Form form={form} layout="vertical" onFinish={save} initialValues={{ enabled: false, fullReductions: [], newCustomerEnabled: false, newCustomerAmount: 0, freeDeliveryEnabled: false, freeDeliveryThreshold: 0, memberDiscountEnabled: false, memberDiscountRate: 0.95 }}>
      <Form.Item name="enabled" label="满减启用" valuePropName="checked"><Switch /></Form.Item>
      <Form.List name="fullReductions">{(fields, { add, remove }) => <>
        {fields.map(({ key, ...field }) => <Space key={key} align="baseline" className="promotion-tier">
          <Form.Item {...field} name={[field.name, 'threshold']} label="满减门槛" rules={[{ required: true, message: '请输入门槛' }, nonNegative]}><InputNumber min={0} precision={2} addonBefore="满" addonAfter="元" /></Form.Item>
          <Form.Item {...field} name={[field.name, 'amount']} label="减免金额" dependencies={[['fullReductions', field.name, 'threshold']]} rules={[{ required: true, message: '请输入减额' }, nonNegative, ({ getFieldValue }) => ({ validator(_, value) { const threshold = getFieldValue(['fullReductions', field.name, 'threshold']); return Number(value) <= Number(threshold) ? Promise.resolve() : Promise.reject(new Error('减额不能超过门槛')) } })]}><InputNumber min={0} precision={2} addonBefore="减" addonAfter="元" /></Form.Item>
          <Button danger onClick={() => remove(field.name)}>删除</Button>
        </Space>)}
        <Button type="dashed" onClick={() => add({ threshold: 0, amount: 0 })}>新增满减阶梯</Button>
      </>}</Form.List>
      <div className="settings-grid">
        <Card size="small" title="新客立减"><Form.Item name="newCustomerEnabled" valuePropName="checked"><Switch checkedChildren="启用" unCheckedChildren="停用" /></Form.Item><Form.Item name="newCustomerAmount" label="立减金额" rules={[nonNegative]}><InputNumber min={0} precision={2} addonAfter="元" /></Form.Item></Card>
        <Card size="small" title="配送费优惠"><Form.Item name="freeDeliveryEnabled" valuePropName="checked"><Switch checkedChildren="启用" unCheckedChildren="停用" /></Form.Item><Form.Item name="freeDeliveryThreshold" label="免配送费门槛" dependencies={['freeDeliveryEnabled']} rules={[nonNegative, ({ getFieldValue }) => ({ validator(_, value) { return !getFieldValue('freeDeliveryEnabled') || Number(value) > 0 ? Promise.resolve() : Promise.reject(new Error('启用配送费优惠时，免配送费门槛须大于 0')) } })]}><InputNumber min={0} precision={2} addonAfter="元" /></Form.Item></Card>
        <Card size="small" title="会员折扣"><Form.Item name="memberDiscountEnabled" valuePropName="checked"><Switch checkedChildren="启用" unCheckedChildren="停用" /></Form.Item><Form.Item name="memberDiscountRate" label="折扣率" rules={[{ required: true }, { type: 'number', min: 0.01, max: 1, message: '折扣率须大于 0 且不超过 1' }]}><InputNumber min={0.01} max={1} step={0.01} precision={2} /></Form.Item></Card>
      </div>
      <Button type="primary" htmlType="submit" loading={saving}>保存优惠配置</Button>
    </Form></Card>
  </section>
}

export function ReviewsPage() {
  const { message } = AntdApp.useApp()
  const [reviews, setReviews] = useState<Review[]>([])
  const [filter, setFilter] = useState<'all' | 'unreplied' | 'replied'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [selected, setSelected] = useState<Review>()
  const [reply, setReply] = useState('')
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    setLoading(true); setError(undefined)
    try { setReviews(await merchantApi.listReviews()) }
    catch (reason) { setError(errorText(reason)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void Promise.resolve().then(load) }, [load])
  const visible = useMemo(() => reviews.filter((review) => filter === 'all' || (filter === 'replied' ? Boolean(review.reply) : !review.reply)), [filter, reviews])
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({ rating, count: reviews.filter((item) => item.rating === rating).length }))
  const openReply = (review: Review) => { setSelected(review); setReply(review.reply ?? '') }
  async function submitReply() {
    if (!selected || !reply.trim()) return
    setSaving(true)
    try {
      const updated = await merchantApi.replyReview(selected.reviewId, reply.trim())
      setReviews((items) => items.map((item) => item.reviewId === updated.reviewId ? updated : item))
      setSelected(updated); setReply(updated.reply ?? '')
      message.success('回复已保存，顾客端可查看最新内容。')
    } catch (reason) { message.error(errorText(reason)) }
    finally { setSaving(false) }
  }
  return <section>
    <div className="page-heading"><div><Title level={2}>评价管理</Title><Text type="secondary">查看本店真实评价并回复顾客。</Text></div><Button onClick={() => void load()}>刷新</Button></div>
    <ErrorBlock error={error} retry={() => void load()} />
    <Card title="评分分布" className="feature-card"><Row gutter={[12, 8]}>{distribution.map((item) => <Col span={8} key={item.rating}><Space><span>{item.rating} 星</span><Progress percent={reviews.length ? Math.round(item.count / reviews.length * 100) : 0} size="small" style={{ width: 130 }} /><Text>{item.count}</Text></Space></Col>)}</Row></Card>
    <Card><Radio.Group value={filter} onChange={(event) => { setFilter(event.target.value); void load() }} className="filter-row"><Radio.Button value="all">全部</Radio.Button><Radio.Button value="unreplied">未回复</Radio.Button><Radio.Button value="replied">已回复</Radio.Button></Radio.Group>
      <Table<Review> loading={loading} rowKey="reviewId" dataSource={visible} locale={{ emptyText: <Empty description="暂无评价" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} columns={[
        { title: '顾客', dataIndex: 'userNickname', render: (value) => value || '匿名顾客' },
        { title: '评分', dataIndex: 'rating', render: (value) => <Rate disabled value={Number(value)} /> },
        { title: '评价内容', dataIndex: 'content', render: (value, record) => <Space direction="vertical" size={4}><span>{String(value || '无文字评价')}</span>{record.tags.length > 0 && <Space wrap>{record.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space>}</Space> },
        { title: '回复状态', key: 'reply', render: (_, record) => <Tag color={record.reply ? 'success' : 'warning'}>{record.reply ? '已回复' : '未回复'}</Tag> },
        { title: '操作', key: 'action', render: (_, record) => <Button type="link" onClick={() => openReply(record)}>{record.reply ? '更新回复' : '回复'}</Button> },
      ]} />
    </Card>
    <Drawer title={selected?.reply ? '更新评价回复' : '回复评价'} width={520} open={Boolean(selected)} onClose={() => setSelected(undefined)} extra={<Button type="primary" loading={saving} disabled={!reply.trim()} onClick={() => void submitReply()}>保存回复</Button>}>
      {selected && <Space direction="vertical" size={16} className="drawer-stack"><Card size="small"><Space direction="vertical"><Space><Avatar>{selected.userNickname.slice(0, 1)}</Avatar><Text strong>{selected.userNickname}</Text><Rate disabled value={selected.rating} /></Space><Paragraph>{selected.content || '无文字评价'}</Paragraph>{selected.images.length > 0 && <div className="review-images">{selected.images.map((src) => <img key={src} src={src} alt="评价图片" />)}</div>}</Space></Card><Input.TextArea aria-label="商家回复" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={500} showCount rows={6} placeholder="请输入回复内容" />{selected.repliedAt && <Text type="secondary">上次回复：{selected.repliedAt}</Text>}</Space>}
    </Drawer>
  </section>
}

export function MessagesPage({ orderId }: { orderId?: string }) {
  const { message } = AntdApp.useApp()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const load = useCallback(async () => {
    setLoading(true); setError(undefined)
    try {
      const items = await merchantApi.listConversations()
      setConversations(items)
      const target = orderId ? items.find((item) => item.orderId === orderId) : undefined
      if (target) {
        const detail = await merchantApi.getConversation(target.conversationId)
        setSelected(await merchantApi.markConversationRead(detail.conversationId))
      }
    } catch (reason) { setError(errorText(reason)) }
    finally { setLoading(false) }
  }, [orderId])
  useEffect(() => { void Promise.resolve().then(load) }, [load])
  const selectedConversationId = selected?.conversationId
  useEffect(() => {
    if (!selectedConversationId) return
    const timer = window.setInterval(async () => {
      try { setSelected(await merchantApi.getConversation(selectedConversationId)) } catch { /* 下次轮询重试 */ }
    }, 10000)
    return () => window.clearInterval(timer)
  }, [selectedConversationId])
  async function openConversation(item: Conversation) {
    try { setSelected(await merchantApi.markConversationRead(item.conversationId)); setConversations((items) => items.map((entry) => entry.conversationId === item.conversationId ? { ...entry, unreadCount: 0, merchantRead: true } : entry)) }
    catch (reason) { message.error(errorText(reason)) }
  }
  async function send() {
    if (!selected || !draft.trim()) return
    setSending(true)
    try { setSelected(await merchantApi.sendMessage(selected.conversationId, draft.trim())); setDraft('') }
    catch (reason) { message.error(errorText(reason)) }
    finally { setSending(false) }
  }
  return <section>
    <div className="page-heading"><div><Title level={2}>消息</Title><Text type="secondary">仅展示与本店订单关联的顾客会话。</Text></div><Button onClick={() => void load()}>刷新</Button></div>
    <ErrorBlock error={error} retry={() => void load()} />
    {orderId && !loading && !conversations.some((item) => item.orderId === orderId) && <Alert className="page-feedback" showIcon type="info" message={`订单 ${orderId} 暂无可用会话`} />}
    <Card loading={loading}><div className="chat-layout"><div className="conversation-list"><List dataSource={conversations} locale={{ emptyText: <Empty description="暂无会话" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} renderItem={(item) => <List.Item className={selected?.conversationId === item.conversationId ? 'conversation-active' : ''} onClick={() => void openConversation(item)}><List.Item.Meta avatar={<Badge count={item.unreadCount}><Avatar>{item.userNickname.slice(0, 1)}</Avatar></Badge>} title={item.userNickname} description={<><div>订单 {item.orderId ?? '暂无'}</div><Text ellipsis>{item.lastMessage || '暂无消息'}</Text></>} /></List.Item>} /></div>
      <div className="chat-panel">{selected ? <><div className="message-timeline">{selected.messages.length ? selected.messages.map((item) => <div key={item.messageId} className={`message-bubble ${item.senderRole.toUpperCase() === 'MERCHANT' ? 'mine' : ''}`}><div>{item.content}</div><small>{item.createdAt}</small></div>) : <Empty description="还没有消息，发送第一条回复吧" image={Empty.PRESENTED_IMAGE_SIMPLE} />}</div><Space.Compact block><Input aria-label="消息内容" value={draft} maxLength={1000} onChange={(event) => setDraft(event.target.value)} onPressEnter={() => void send()} placeholder="请输入消息" /><Button type="primary" loading={sending} disabled={!draft.trim()} onClick={() => void send()}>发送</Button></Space.Compact></> : <Empty description="选择会话查看聊天详情" />}</div></div></Card>
  </section>
}

export function AnalyticsPage() {
  const [range, setRange] = useState<Analytics['range']>('7d')
  const [data, setData] = useState<Analytics>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const load = useCallback(async (nextRange: Analytics['range']) => {
    setLoading(true); setError(undefined)
    try { setData(await merchantApi.getAnalytics(nextRange)) }
    catch (reason) { setError(errorText(reason)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void Promise.resolve().then(() => load(range)) }, [load, range])
  const rangeLabel = { today: '今天', '7d': '近 7 天', '30d': '近 30 天' }[range]
  return <section>
    <div className="page-heading"><div><Title level={2}>数据统计</Title><Text type="secondary">查询范围：{rangeLabel}；仅统计已支付且未取消的有效订单。</Text></div><Radio.Group value={range} onChange={(event) => setRange(event.target.value)}><Radio.Button value="today">今天</Radio.Button><Radio.Button value="7d">近 7 天</Radio.Button><Radio.Button value="30d">近 30 天</Radio.Button></Radio.Group></div>
    <ErrorBlock error={error} retry={() => void load(range)} />
    <Skeleton loading={loading} active>
      <Row gutter={[16, 16]}><Col span={8}><Card><Statistic title="营业额" value={data?.salesAmount ?? 0} prefix="¥" precision={2} /></Card></Col><Col span={8}><Card><Statistic title="有效订单" value={data?.orderCount ?? 0} /></Card></Col><Col span={8}><Card><Statistic title="客单价" value={data?.avgOrderAmount ?? 0} prefix="¥" precision={2} /></Card></Col></Row>
      <Card title="每日趋势" className="feature-card"><Table pagination={false} rowKey="date" dataSource={data?.trend ?? []} locale={{ emptyText: <Empty description="当前范围暂无趋势数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} columns={[{ title: '日期', dataIndex: 'date' }, { title: '订单数', dataIndex: 'orderCount', align: 'right' }, { title: '营业额', dataIndex: 'salesAmount', align: 'right', render: (value) => `¥${Number(value || 0).toFixed(2)}` }]} /></Card>
      <Row gutter={[16, 16]}><Col span={12}><DistributionCard title="渠道占比" items={data?.channelDistribution ?? []} /></Col><Col span={12}><DistributionCard title="状态分布" items={localizeStatusDistribution(data?.statusDistribution ?? [])} /></Col></Row>
    </Skeleton>
  </section>
}

function DistributionCard({ title, items }: { title: string; items: Array<{ name: string; value: number }> }) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  return <Card title={title}>{items.length ? <List dataSource={items} renderItem={(item) => <List.Item><span>{item.name}</span><Space><Progress percent={total ? Math.round(item.value / total * 100) : 0} size="small" style={{ width: 160 }} /><strong>{item.value}</strong></Space></List.Item>} /> : <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />}</Card>
}


