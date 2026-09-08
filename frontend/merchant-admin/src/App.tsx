import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  ConfigProvider,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import type { TableProps } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  type Category,
  type CategoryDraft,
  type MerchantSession,
  type Order,
  type Product,
  type ProductDraft,
  type Store,
  type StoreDraft,
  type StoreStatus,
  isRealApiMode,
  merchantApi,
} from './services/merchantApi'
import './App.css'

const { Header, Content, Sider } = Layout
const { Title, Text } = Typography

type Page = 'orders' | 'products' | 'categories' | 'store' | 'login'
type StoreFormValues = StoreDraft & { status: StoreStatus }

const merchantPages: Page[] = ['orders', 'products', 'categories', 'store']

const statusMeta: Record<StoreStatus, { label: string; color: string }> = {
  OPEN: { label: '营业中', color: 'success' },
  CLOSED: { label: '已关店', color: 'default' },
  TEMPORARILY_CLOSED: { label: '临时闭店', color: 'warning' },
}

function getPageFromHash(): Page {
  const page = window.location.hash.replace(/^#/, '') as Page
  return merchantPages.includes(page) ? page : 'orders'
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请稍后重试。'
}

function formatMoney(value: number) {
  return `¥${Number(value || 0).toFixed(2)}`
}

function orderStatusLabel(status: string) {
  return status === 'PROCESSING' ? '进行中' : status
}

function StoreStatusTag({ status }: { status: StoreStatus }) {
  const meta = statusMeta[status] ?? { label: status, color: 'default' }
  return <Tag color={meta.color}>{meta.label}</Tag>
}

function PageFailure({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Alert
      className="page-feedback"
      type="error"
      showIcon
      message="加载失败"
      description={
        <Space direction="vertical" size={8}>
          <span>{error}</span>
          <Button size="small" onClick={onRetry}>重新加载</Button>
        </Space>
      }
    />
  )
}

function LoginPage({
  initialError,
  onAuthenticated,
}: {
  initialError?: string
  onAuthenticated: (session: MerchantSession) => void
}) {
  const { message } = AntdApp.useApp()
  const [activeKey, setActiveKey] = useState<'login' | 'register'>('login')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(initialError)

  async function signIn(values: { account: string; password: string }) {
    setSubmitting(true)
    setError(undefined)
    try {
      const session = await merchantApi.login(values.account.trim(), values.password)
      message.success('登录成功')
      onAuthenticated(session)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  async function register(values: { account: string; password: string; storeName: string; contactPhone: string }) {
    setSubmitting(true)
    setError(undefined)
    try {
      const session = await merchantApi.register({
        account: values.account.trim(),
        password: values.password,
        storeName: values.storeName.trim(),
        contactPhone: values.contactPhone.trim(),
      })
      message.success('注册成功，店铺已创建为关店状态。')
      onAuthenticated(session)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <div className="auth-brand">
          <div className="brand-logo">E</div>
          <div>
            <Title level={3}>校园外卖商家版</Title>
            <Text type="secondary">商家经营后台</Text>
          </div>
        </div>
        {error && <Alert className="page-feedback" type="error" showIcon message={error} />}
        {!isRealApiMode && (
          <Alert
            className="page-feedback"
            type="warning"
            showIcon
            message="当前为 Mock 演示模式"
            description="演示账号：merchant-a / 123456。真实联调请设置 VITE_API_MODE=real。"
          />
        )}
        <Tabs
          activeKey={activeKey}
          onChange={(key) => {
            setActiveKey(key as 'login' | 'register')
            setError(undefined)
          }}
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form layout="vertical" onFinish={signIn} autoComplete="off">
                  <Form.Item label="账号" name="account" rules={[{ required: true, message: '请输入商家账号' }]}>
                    <Input placeholder="请输入商家账号" />
                  </Form.Item>
                  <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
                    <Input.Password placeholder="请输入密码" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block loading={submitting}>登录</Button>
                </Form>
              ),
            },
            {
              key: 'register',
              label: '注册',
              children: (
                <Form layout="vertical" onFinish={register} autoComplete="off">
                  <Form.Item label="账号" name="account" rules={[{ required: true, message: '请输入账号' }]}>
                    <Input placeholder="请输入商家账号" />
                  </Form.Item>
                  <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少 6 位' }]}>
                    <Input.Password placeholder="请输入密码" />
                  </Form.Item>
                  <Form.Item label="店铺名称" name="storeName" rules={[{ required: true, message: '请输入店铺名称' }]}>
                    <Input placeholder="请输入店铺名称" />
                  </Form.Item>
                  <Form.Item label="联系电话" name="contactPhone" rules={[{ required: true, message: '请输入联系电话' }]}>
                    <Input placeholder="请输入联系电话" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block loading={submitting}>注册并创建店铺</Button>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </main>
  )
}

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [selectedOrder, setSelectedOrder] = useState<Order>()
  const [detailLoading, setDetailLoading] = useState(false)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      setOrders(await merchantApi.listOrders())
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(loadOrders)
  }, [loadOrders])

  async function openDetail(order: Order) {
    setSelectedOrder(order)
    setDetailLoading(true)
    try {
      setSelectedOrder(await merchantApi.getOrder(order.orderId))
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setDetailLoading(false)
    }
  }

  const columns: TableProps<Order>['columns'] = [
    { title: '订单号', dataIndex: 'orderId', key: 'orderId' },
    { title: '顾客', key: 'customer', render: (_, record) => record.customerName ?? record.contactName ?? '暂无' },
    { title: '金额', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right', render: (value) => formatMoney(Number(value)) },
    { title: '状态', dataIndex: 'status', key: 'status', render: (status) => <Tag color="processing">{orderStatusLabel(String(status))}</Tag> },
    { title: '下单时间', dataIndex: 'createdAt', key: 'createdAt', render: (value) => value || '暂无' },
    { title: '操作', key: 'actions', render: (_, record) => <Button type="link" onClick={() => void openDetail(record)}>查看详情</Button> },
  ]

  return (
    <section>
      <div className="page-heading">
        <div>
          <Title level={2}>订单管理</Title>
          <Text type="secondary">查看当前店铺的订单和下单快照。</Text>
        </div>
        <Button onClick={() => void loadOrders()}>刷新</Button>
      </div>
      {error && <PageFailure error={error} onRetry={() => void loadOrders()} />}
      <Card>
        <Table<Order>
          loading={loading}
          rowKey="orderId"
          columns={columns}
          dataSource={orders}
          locale={{ emptyText: <Empty description="暂时没有订单" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>
      <Drawer
        title="订单详情"
        width={520}
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(undefined)}
      >
        {detailLoading ? <Spin /> : selectedOrder && (
          <Space direction="vertical" size={16} className="drawer-stack">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="订单号">{selectedOrder.orderId}</Descriptions.Item>
              <Descriptions.Item label="订单状态"><Tag color="processing">{orderStatusLabel(selectedOrder.status)}</Tag></Descriptions.Item>
              <Descriptions.Item label="顾客">{selectedOrder.contactName ?? selectedOrder.customerName ?? '暂无'}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{selectedOrder.contactPhone ?? '暂无'}</Descriptions.Item>
              <Descriptions.Item label="配送地址">{selectedOrder.address ?? '暂无'}</Descriptions.Item>
              <Descriptions.Item label="下单时间">{selectedOrder.createdAt ?? '暂无'}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="商品明细">
              <Table
                size="small"
                rowKey={(item) => `${item.productId ?? item.name}-${item.price}`}
                pagination={false}
                dataSource={selectedOrder.items ?? []}
                columns={[
                  { title: '商品', dataIndex: 'name' },
                  { title: '数量', dataIndex: 'quantity' },
                  { title: '单价', dataIndex: 'price', align: 'right', render: (value) => formatMoney(Number(value)) },
                  { title: '小计', key: 'subtotal', align: 'right', render: (_, item) => formatMoney(item.subtotal ?? item.price * item.quantity) },
                ]}
              />
            </Card>
            <Card size="small" title="金额汇总">
              <div className="money-line"><span>商品合计</span><strong>{formatMoney(selectedOrder.productTotal)}</strong></div>
              <div className="money-line"><span>打包费</span><strong>{formatMoney(selectedOrder.packagingFee)}</strong></div>
              <div className="money-line total"><span>实付金额</span><strong>{formatMoney(selectedOrder.totalAmount)}</strong></div>
            </Card>
          </Space>
        )}
      </Drawer>
    </section>
  )
}

function StorePage({ currentStore, onStoreChange }: { currentStore: Store; onStoreChange: (store: Store) => void }) {
  const { message } = AntdApp.useApp()
  const [form] = Form.useForm<StoreFormValues>()
  const [store, setStore] = useState(currentStore)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  const loadStore = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const nextStore = await merchantApi.getStore()
      setStore(nextStore)
      onStoreChange(nextStore)
      form.setFieldsValue({ ...nextStore })
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [form, onStoreChange])

  useEffect(() => {
    form.setFieldsValue({ ...currentStore })
  }, [currentStore, form])

  useEffect(() => {
    void Promise.resolve().then(loadStore)
  }, [loadStore])

  async function saveStore(values: StoreFormValues) {
    setSaving(true)
    setError(undefined)
    try {
      const savedStore = await merchantApi.updateStore({
        name: values.name.trim(),
        description: values.description?.trim(),
        contactPhone: values.contactPhone?.trim(),
      })
      const finalStore = savedStore.status === values.status
        ? savedStore
        : await merchantApi.updateStoreStatus(values.status)
      setStore(finalStore)
      onStoreChange(finalStore)
      form.setFieldsValue(finalStore)
      message.success('店铺设置已保存')
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <Title level={2}>店铺设置</Title>
          <Text type="secondary">修改当前店铺资料和营业状态。</Text>
        </div>
        <StoreStatusTag status={store.status} />
      </div>
      {error && <PageFailure error={error} onRetry={() => void loadStore()} />}
      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={saveStore} className="settings-form">
          <Form.Item label="店铺名称" name="name" rules={[{ required: true, message: '请输入店铺名称' }]}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item label="店铺简介" name="description">
            <Input.TextArea rows={4} maxLength={200} showCount />
          </Form.Item>
          <Form.Item label="联系电话" name="contactPhone" rules={[{ required: true, message: '请输入联系电话' }]}>
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item label="营业状态" name="status" rules={[{ required: true, message: '请选择营业状态' }]}>
            <Select
              options={(Object.keys(statusMeta) as StoreStatus[]).map((status) => ({
                value: status,
                label: statusMeta[status].label,
              }))}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>保存店铺设置</Button>
        </Form>
      </Card>
    </section>
  )
}

function CategoriesPage() {
  const { message } = AntdApp.useApp()
  const [form] = Form.useForm<CategoryDraft>()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [editing, setEditing] = useState<Category>()
  const [editorOpen, setEditorOpen] = useState(false)
  const [deleting, setDeleting] = useState<Category>()

  const loadCategories = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      setCategories(await merchantApi.listCategories())
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(loadCategories)
  }, [loadCategories])

  function openEditor(category?: Category) {
    setEditing(category)
    form.setFieldsValue(category ?? { name: '', sortOrder: categories.length + 1 })
    setEditorOpen(true)
  }

  async function saveCategory(values: CategoryDraft) {
    setSaving(true)
    setError(undefined)
    try {
      if (editing) {
        await merchantApi.updateCategory(editing.categoryId, values)
        message.success('分类已保存')
      } else {
        await merchantApi.createCategory(values)
        message.success('分类已新增')
      }
      setEditorOpen(false)
      await loadCategories()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setSaving(true)
    setError(undefined)
    try {
      await merchantApi.deleteCategory(deleting.categoryId)
      setDeleting(undefined)
      message.success('分类已删除')
      await loadCategories()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  const columns: TableProps<Category>['columns'] = [
    { title: '分类名称', dataIndex: 'name', key: 'name' },
    { title: '排序值', dataIndex: 'sortOrder', key: 'sortOrder', align: 'right', render: (value) => value ?? '—' },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openEditor(record)}>编辑</Button>
          <Button type="link" danger onClick={() => setDeleting(record)}>删除</Button>
        </Space>
      ),
    },
  ]

  return (
    <section>
      <div className="page-heading">
        <div>
          <Title level={2}>分类管理</Title>
          <Text type="secondary">通过排序值调整顾客端菜单顺序。</Text>
        </div>
        <Button type="primary" onClick={() => openEditor()}>新增分类</Button>
      </div>
      {error && <PageFailure error={error} onRetry={() => void loadCategories()} />}
      <Card>
        <Table<Category>
          loading={loading}
          rowKey="categoryId"
          columns={columns}
          dataSource={categories}
          locale={{ emptyText: <Empty description="暂无分类，请先新增分类" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>
      <Modal
        open={editorOpen}
        title={editing ? '编辑分类' : '新增分类'}
        onCancel={() => setEditorOpen(false)}
        onOk={() => form.submit()}
        okText="保存"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={saveCategory}>
          <Form.Item label="分类名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入分类名称' }, { max: 30, message: '分类名称不能超过 30 个字符' }]}>
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item label="排序值" name="sortOrder" rules={[{ type: 'number', min: 0, message: '排序值不能小于 0' }]}>
            <InputNumber min={0} precision={0} className="full-width" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={Boolean(deleting)}
        title="确认删除分类"
        okText="确认删除"
        okButtonProps={{ danger: true }}
        confirmLoading={saving}
        onCancel={() => setDeleting(undefined)}
        onOk={() => void confirmDelete()}
      >
        <p>删除后不可恢复。有商品的分类不能删除，请先处理商品归属。</p>
      </Modal>
    </section>
  )
}

function ProductsPage() {
  const { message } = AntdApp.useApp()
  const [form] = Form.useForm<ProductDraft>()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categoryId, setCategoryId] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editorLoading, setEditorLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [editing, setEditing] = useState<Product>()
  const [editorOpen, setEditorOpen] = useState(false)
  const [deleting, setDeleting] = useState<Product>()

  const loadProducts = useCallback(async (selectedCategoryId?: string) => {
    setLoading(true)
    setError(undefined)
    try {
      const [nextCategories, nextProducts] = await Promise.all([
        merchantApi.listCategories(),
        merchantApi.listProducts(selectedCategoryId),
      ])
      setCategories(nextCategories)
      setProducts(nextProducts)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => loadProducts(categoryId))
  }, [categoryId, loadProducts])

  function changeCategory(nextCategoryId?: string) {
    setCategoryId(nextCategoryId)
  }

  function openCreate() {
    setEditing(undefined)
    form.setFieldsValue({ categoryId: categoryId ?? categories[0]?.categoryId, name: '', description: '', price: 0, stock: 0, onSale: true })
    setEditorOpen(true)
  }

  async function openEdit(product: Product) {
    setEditing(product)
    setEditorOpen(true)
    setEditorLoading(true)
    form.setFieldsValue(product)
    try {
      form.setFieldsValue(await merchantApi.getProduct(product.productId))
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setEditorLoading(false)
    }
  }

  async function saveProduct(values: ProductDraft) {
    setSaving(true)
    setError(undefined)
    const draft: ProductDraft = {
      ...values,
      name: values.name.trim(),
      description: values.description?.trim(),
      price: Number(values.price),
      stock: Number(values.stock),
    }
    try {
      if (editing) {
        await merchantApi.updateProduct(editing.productId, draft)
        message.success('商品已保存')
      } else {
        await merchantApi.createProduct(draft)
        message.success('商品已新增')
      }
      setEditorOpen(false)
      await loadProducts(categoryId)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function changeAvailability(product: Product, onSale: boolean) {
    setSaving(true)
    setError(undefined)
    try {
      await merchantApi.updateProductAvailability(product.productId, { onSale, stock: product.stock })
      message.success(onSale ? '商品已上架' : '商品已下架')
      await loadProducts(categoryId)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setSaving(true)
    setError(undefined)
    try {
      await merchantApi.deleteProduct(deleting.productId)
      setDeleting(undefined)
      message.success('商品已删除')
      await loadProducts(categoryId)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  const columns: TableProps<Product>['columns'] = [
    { title: '商品名称', dataIndex: 'name', key: 'name', render: (name, record) => <Space direction="vertical" size={0}><strong>{String(name)}</strong><Text type="secondary">{record.description || '暂无说明'}</Text></Space> },
    { title: '价格', dataIndex: 'price', key: 'price', align: 'right', render: (value) => formatMoney(Number(value)) },
    { title: '库存', dataIndex: 'stock', key: 'stock', align: 'right', render: (value) => Number(value) === 0 ? <Tag color="error">售罄</Tag> : value },
    { title: '状态', key: 'onSale', render: (_, record) => <Switch checked={record.onSale} checkedChildren="上架" unCheckedChildren="下架" onChange={(checked) => void changeAvailability(record, checked)} loading={saving} /> },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => void openEdit(record)}>编辑</Button>
          <Button type="link" danger onClick={() => setDeleting(record)}>删除</Button>
        </Space>
      ),
    },
  ]

  return (
    <section>
      <div className="page-heading">
        <div>
          <Title level={2}>商品管理</Title>
          <Text type="secondary">管理商品、库存和上下架状态。</Text>
        </div>
        <Space>
          <Select
            allowClear
            placeholder="全部分类"
            value={categoryId}
            onChange={changeCategory}
            options={categories.map((category) => ({ value: category.categoryId, label: category.name }))}
            className="category-filter"
          />
          <Button type="primary" onClick={openCreate}>新增商品</Button>
        </Space>
      </div>
      {error && <PageFailure error={error} onRetry={() => void loadProducts(categoryId)} />}
      <Card>
        <Table<Product>
          loading={loading}
          rowKey="productId"
          columns={columns}
          dataSource={products}
          locale={{ emptyText: <Empty description="暂无商品，请先新增商品" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>
      <Modal
        open={editorOpen}
        title={editing ? '编辑商品' : '新增商品'}
        onCancel={() => setEditorOpen(false)}
        onOk={() => form.submit()}
        okText="保存"
        confirmLoading={saving || editorLoading}
        destroyOnHidden
        width={640}
      >
        <Spin spinning={editorLoading}>
          <Form form={form} layout="vertical" onFinish={saveProduct}>
            <Form.Item label="商品名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入商品名称' }, { max: 50, message: '商品名称不能超过 50 个字符' }]}>
              <Input maxLength={50} />
            </Form.Item>
            <Form.Item label="商品分类" name="categoryId" rules={[{ required: true, message: '请选择商品分类' }]}>
              <Select options={categories.map((category) => ({ value: category.categoryId, label: category.name }))} />
            </Form.Item>
            <Form.Item label="商品说明" name="description">
              <Input.TextArea rows={3} maxLength={200} showCount />
            </Form.Item>
            <div className="form-grid">
              <Form.Item label="商品价格（元）" name="price" rules={[{ required: true, message: '请输入商品价格' }, { type: 'number', min: 0, message: '价格不能小于 0' }]}>
                <InputNumber min={0} precision={2} step={0.01} className="full-width" />
              </Form.Item>
              <Form.Item label="商品库存" name="stock" rules={[{ required: true, message: '请输入商品库存' }, { type: 'number', min: 0, message: '库存必须为非负整数' }, { validator: (_, value) => Number.isInteger(Number(value)) ? Promise.resolve() : Promise.reject(new Error('库存必须为整数')) }]}>
                <InputNumber min={0} precision={0} className="full-width" />
              </Form.Item>
            </div>
            <Form.Item label="上架状态" name="onSale" valuePropName="checked">
              <Switch checkedChildren="上架" unCheckedChildren="下架" />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
      <Modal
        open={Boolean(deleting)}
        title="确认删除商品"
        okText="确认删除"
        okButtonProps={{ danger: true }}
        confirmLoading={saving}
        onCancel={() => setDeleting(undefined)}
        onOk={() => void confirmDelete()}
      >
        <p>只有下架商品可以删除。删除后历史订单仍保留商品快照。</p>
      </Modal>
    </section>
  )
}

function MerchantWorkspace() {
  const { message } = AntdApp.useApp()
  const [page, setPage] = useState<Page>(getPageFromHash)
  const [session, setSession] = useState<MerchantSession>()
  const [booting, setBooting] = useState(true)
  const [bootError, setBootError] = useState<string>()

  const navigate = useCallback((nextPage: Page) => {
    if (nextPage === 'login') {
      window.location.hash = ''
      setPage('login')
      return
    }
    window.location.hash = nextPage
    setPage(nextPage)
  }, [])

  const restoreSession = useCallback(async () => {
    setBooting(true)
    setBootError(undefined)
    try {
      setSession(await merchantApi.me())
    } catch (requestError) {
      const apiError = requestError as ApiError
      setSession(undefined)
      if (apiError.status && apiError.status !== 401 && apiError.status !== 403) {
        setBootError(errorMessage(requestError))
      }
      navigate('login')
    } finally {
      setBooting(false)
    }
  }, [navigate])

  useEffect(() => {
    void Promise.resolve().then(restoreSession)
  }, [restoreSession])

  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  async function signOut() {
    try {
      await merchantApi.logout()
      message.success('已退出登录')
    } catch (requestError) {
      message.error(errorMessage(requestError))
    } finally {
      setSession(undefined)
      navigate('login')
    }
  }

  const updateSessionStore = useCallback((store: Store) => {
    setSession((current) => current ? { ...current, store } : current)
  }, [])

  if (booting) {
    return <main className="boot-screen"><Spin size="large" tip="正在恢复商家会话…" fullscreen /></main>
  }

  if (!session) {
    return <LoginPage initialError={bootError} onAuthenticated={(nextSession) => {
      setSession(nextSession)
      navigate('orders')
    }} />
  }

  const menuItems = [
    { key: 'orders', label: '订单管理' },
    { key: 'products', label: '商品管理' },
    { key: 'categories', label: '分类管理' },
    { key: 'store', label: '店铺设置' },
  ]

  return (
    <Layout className="merchant-layout">
      <Sider className="merchant-sider" width={232}>
        <div className="brand-wrap">
          <div className="brand-logo">E</div>
          <div>
            <Title level={4} className="brand-title">Elm 商家后台</Title>
            <Text type="secondary">运营中心</Text>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[page]}
          items={menuItems}
          onClick={({ key }) => navigate(key as Page)}
        />
      </Sider>
      <Layout>
        <Header className="merchant-header">
          <Space>
            <Text strong>{session.store.name}</Text>
            <StoreStatusTag status={session.store.status} />
          </Space>
          <Space>
            {!isRealApiMode && <Tag color="warning">Mock 演示模式</Tag>}
            <Text type="secondary">{session.merchant.account}</Text>
            <Button type="link" onClick={() => void signOut()}>退出登录</Button>
          </Space>
        </Header>
        <Content className="merchant-content">
          {!isRealApiMode && (
            <Alert
              className="page-feedback"
              type="warning"
              showIcon
              message="当前使用 Mock 演示数据"
              description="真实联调前设置 VITE_API_MODE=real、VITE_API_BASE_URL=<后端地址>/api/v1，并将 VITE_MOCK_FALLBACK=false。真实模式失败时不会回退为演示数据。"
            />
          )}
          {page === 'orders' && <OrdersPage />}
          {page === 'products' && <ProductsPage />}
          {page === 'categories' && <CategoriesPage />}
          {page === 'store' && <StorePage currentStore={session.store} onStoreChange={updateSessionStore} />}
        </Content>
      </Layout>
    </Layout>
  )
}

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#ff5a1f',
          colorInfo: '#ff5a1f',
          borderRadius: 8,
        },
      }}
    >
      <AntdApp>
        <MerchantWorkspace />
      </AntdApp>
    </ConfigProvider>
  )
}
