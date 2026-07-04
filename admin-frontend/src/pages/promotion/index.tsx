import { FormEvent, useEffect, useState } from 'react'

import { adminPromotionService, type CouponPayload, type CouponTemplate } from '../../services/promotion'

function parseIds(value: string) {
  return value
    .split(/[,\uFF0C;；\s]+/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
}

export function PromotionAdminPage() {
  const [templates, setTemplates] = useState<CouponTemplate[]>([])
  const [name, setName] = useState('测试优惠券')
  const [scopeType, setScopeType] = useState('all')
  const [scopeIds, setScopeIds] = useState('')
  const [discountType, setDiscountType] = useState('amount')
  const [discountValue, setDiscountValue] = useState('1000')
  const [minAmountCent, setMinAmountCent] = useState('0')
  const [totalQuantity, setTotalQuantity] = useState('100')
  const [perUserLimit, setPerUserLimit] = useState('1')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [grantUserIds, setGrantUserIds] = useState('')
  const [message, setMessage] = useState('')

  function buildPayload(): CouponPayload {
    return {
      name,
      scope_type: scopeType,
      scope_ids: parseIds(scopeIds),
      discount_type: discountType,
      discount_value: Number(discountValue),
      min_amount_cent: Number(minAmountCent),
      total_quantity: Number(totalQuantity),
      per_user_limit: Number(perUserLimit),
    }
  }

  async function loadTemplates() {
    const response = await adminPromotionService.listCoupons()
    setTemplates(response.data)
  }

  useEffect(() => {
    void loadTemplates()
  }, [])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    try {
      const response = await adminPromotionService.createCoupon(buildPayload())
      setMessage(`优惠券模板已创建，ID：${response.data.id}`)
      await loadTemplates()
    } catch {
      setMessage('创建失败。商家运营只能创建本店铺、本店商品或本店 SKU 范围的优惠券。')
    }
  }

  async function handleUpdate() {
    setMessage('')
    try {
      const response = await adminPromotionService.updateCoupon(Number(selectedTemplateId), buildPayload())
      setMessage(`模板已更新，当前状态：${response.data.status}`)
      await loadTemplates()
    } catch {
      setMessage('更新失败，请检查模板 ID、权限和表单数据。')
    }
  }

  async function handleDisable(templateId: number) {
    setMessage('')
    try {
      const response = await adminPromotionService.disableCoupon(templateId)
      setMessage(`模板 #${templateId} 已停用，状态：${response.data.status}`)
      await loadTemplates()
    } catch {
      setMessage('停用失败，请确认当前账号有权限管理该模板。')
    }
  }

  async function handleBatchGrant() {
    setMessage('')
    try {
      const response = await adminPromotionService.batchGrant(Number(selectedTemplateId), parseIds(grantUserIds))
      setMessage(
        `批量发券完成：成功 ${response.data.granted_count}；跳过用户 ${response.data.skipped_user_ids.join(',') || '无'}`,
      )
    } catch {
      setMessage('批量发券失败，请确认当前账号为平台运营。')
    }
  }

  async function handleExpire() {
    setMessage('')
    try {
      const response = await adminPromotionService.expireUserCoupons()
      setMessage(`手动过期完成，处理用户券数量：${response.data.expired_count}`)
    } catch {
      setMessage('手动过期失败，请确认当前账号为平台运营。')
    }
  }

  return (
    <main>
      <h1>促销管理</h1>
      <p>当前备用页覆盖优惠券模板、停用、批量发券和手动过期；日常联调优先使用平台运营工作台。</p>
      <form onSubmit={handleCreate}>
        <h2>创建/编辑优惠券模板</h2>
        <label>
          名称
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          适用范围
          <select value={scopeType} onChange={(event) => setScopeType(event.target.value)}>
            <option value="all">全平台</option>
            <option value="platform">平台通用</option>
            <option value="merchant">店铺</option>
            <option value="category">分类</option>
            <option value="product">商品</option>
            <option value="sku">SKU</option>
          </select>
        </label>
        <label>
          范围 ID，可用中文逗号、英文逗号或空格分隔
          <input value={scopeIds} onChange={(event) => setScopeIds(event.target.value)} />
        </label>
        <label>
          折扣类型
          <select value={discountType} onChange={(event) => setDiscountType(event.target.value)}>
            <option value="amount">立减金额，单位分</option>
            <option value="percent">折扣比例</option>
          </select>
        </label>
        <label>
          折扣值
          <input value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} />
        </label>
        <label>
          门槛金额，单位分
          <input value={minAmountCent} onChange={(event) => setMinAmountCent(event.target.value)} />
        </label>
        <label>
          总量，0 表示不限
          <input value={totalQuantity} onChange={(event) => setTotalQuantity(event.target.value)} />
        </label>
        <label>
          每人限领
          <input value={perUserLimit} onChange={(event) => setPerUserLimit(event.target.value)} />
        </label>
        <button type="submit">创建模板</button>
        <label>
          模板 ID
          <input value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} />
        </label>
        <button type="button" onClick={handleUpdate}>
          按模板 ID 更新
        </button>
      </form>
      <section>
        <h2>批量发券 / 过期</h2>
        <label>
          用户 ID，可用中文逗号、英文逗号或空格分隔
          <input value={grantUserIds} onChange={(event) => setGrantUserIds(event.target.value)} />
        </label>
        <button type="button" onClick={handleBatchGrant}>
          批量发券
        </button>
        <button type="button" onClick={handleExpire}>
          手动过期用户券
        </button>
      </section>
      <section>
        <h2>模板列表</h2>
        <button type="button" onClick={() => loadTemplates().catch(() => setMessage('刷新失败'))}>
          刷新模板
        </button>
        {templates.length > 0 ? (
          <ul>
            {templates.map((template) => (
              <li key={template.id}>
                #{template.id} {template.name} - {template.scope_type} [{template.scope_ids.join(',') || '全部'}] - 状态
                {template.status} - 已领 {template.claimed_quantity}/{template.total_quantity || '不限'}
                <button type="button" onClick={() => handleDisable(template.id)}>
                  停用
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>暂无模板。</p>
        )}
      </section>
      {message && <p>{message}</p>}
    </main>
  )
}
