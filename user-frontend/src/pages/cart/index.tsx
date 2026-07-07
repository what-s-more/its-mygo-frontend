import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Checkbox, Empty, Image, InputNumber, Spin, Tag, Typography, message } from 'antd'
import { DeleteOutlined, ReloadOutlined, ShoppingCartOutlined } from '@ant-design/icons'

import { authService } from '../../services/auth'
import { orderService, type CartItem } from '../../services/order'
import { absoluteAssetUrl, pickErrorMessage, yuan } from '../../utils/format'

const { Text, Title, Paragraph } = Typography

export function CartPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)

  async function loadCart() {
    if (!authService.hasToken()) return
    setLoading(true)
    try {
      const response = await orderService.listCart()
      setCart(response.data ?? [])
    } catch (error) {
      message.error(`加载购物车失败：${pickErrorMessage(error) ?? '请求失败'}`)
      setCart([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCart()
  }, [])

  async function changeCartQuantity(item: CartItem, nextQuantity: number) {
    const safeQuantity = Math.max(1, Number(nextQuantity) || 1)
    setLoading(true)
    try {
      const response = await orderService.updateCartItem(item.sku_id, {
        quantity: safeQuantity,
        checked: item.checked,
      })
      setCart(response.data ?? [])
    } catch (error) {
      message.error(`修改数量失败：${pickErrorMessage(error) ?? '请求失败'}`)
    } finally {
      setLoading(false)
    }
  }

  async function toggleCartChecked(item: CartItem, checked: boolean) {
    setLoading(true)
    try {
      const response = await orderService.updateCartItem(item.sku_id, {
        quantity: item.quantity,
        checked,
      })
      setCart(response.data ?? [])
    } catch (error) {
      message.error(`勾选失败：${pickErrorMessage(error) ?? '请求失败'}`)
    } finally {
      setLoading(false)
    }
  }

  async function removeCartItem(item: CartItem) {
    setLoading(true)
    try {
      const response = await orderService.deleteCartItem(item.sku_id)
      setCart(response.data ?? [])
      message.success('已移除商品')
    } catch (error) {
      message.error(`移除失败：${pickErrorMessage(error) ?? '请求失败'}`)
    } finally {
      setLoading(false)
    }
  }

  async function batchSetCartChecked(checked: boolean) {
    const skuIds = cart.filter((item) => !item.invalid_reason).map((item) => item.sku_id)
    if (skuIds.length === 0) {
      message.info('没有可勾选的有效商品')
      return
    }
    setLoading(true)
    try {
      const response = await orderService.batchUpdateCartItems({ sku_ids: skuIds, checked })
      setCart(response.data ?? [])
    } catch (error) {
      message.error(`批量勾选失败：${pickErrorMessage(error) ?? '请求失败'}`)
    } finally {
      setLoading(false)
    }
  }

  async function clearInvalidItems() {
    const invalidItems = cart.filter((item) => item.invalid_reason)
    if (invalidItems.length === 0) {
      message.info('没有失效商品')
      return
    }
    setLoading(true)
    try {
      await Promise.all(invalidItems.map((item) => orderService.deleteCartItem(item.sku_id)))
      message.success('已清空失效商品')
      await loadCart()
    } catch (error) {
      message.error(`清空失效商品失败：${pickErrorMessage(error) ?? '请求失败'}`)
    } finally {
      setLoading(false)
    }
  }

  const validItems = useMemo(() => cart.filter((item) => !item.invalid_reason), [cart])
  const validCheckedItems = useMemo(
    () => cart.filter((item) => item.checked && !item.invalid_reason),
    [cart],
  )
  const invalidItems = useMemo(() => cart.filter((item) => item.invalid_reason), [cart])
  const totalCent = validCheckedItems.reduce((sum, item) => sum + item.price_cent * item.quantity, 0)
  const totalQuantity = validCheckedItems.reduce((sum, item) => sum + item.quantity, 0)
  const allChecked = validItems.length > 0 && validItems.every((item) => item.checked)

  return (
    <div className="cart-page">
      <header className="cart-header">
        <Title level={3} className="cart-header-title">
          <ShoppingCartOutlined /> 购物车
        </Title>
        <Paragraph className="cart-header-sub">
          勾选要结算的商品并调整数量，失效商品不会参与结算。点击“去结算”进入结算页提交订单并使用支付宝沙箱支付。
        </Paragraph>
      </header>

      <div className="cart-toolbar">
        <div className="cart-toolbar-left">
          <Checkbox
            checked={allChecked}
            onChange={(event) => void batchSetCartChecked(event.target.checked)}
            disabled={cart.length === 0}
          >
            全选
          </Checkbox>
          <Text type="secondary">已选 {validCheckedItems.length} 件有效商品</Text>
        </div>
        <div className="cart-toolbar-actions">
          <Button size="small" icon={<ShoppingCartOutlined />} onClick={() => batchSetCartChecked(true)} disabled={cart.length === 0}>
            全选有效商品
          </Button>
          <Button size="small" onClick={() => batchSetCartChecked(false)} disabled={cart.length === 0}>
            取消全选
          </Button>
          <Button size="small" danger onClick={() => void clearInvalidItems()} disabled={invalidItems.length === 0 || loading}>
            清空失效商品
          </Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => void loadCart()} loading={loading}>
            刷新
          </Button>
        </div>
      </div>

      <Spin spinning={loading}>
        {cart.length === 0 ? (
          <Empty description="购物车为空" className="cart-empty" />
        ) : (
          <div className="cart-list">
            {cart.map((item) => (
              <div
                key={item.sku_id}
                className={`cart-item-card ${item.invalid_reason ? 'cart-item-invalid' : ''}`}
              >
                <Checkbox
                  checked={item.checked}
                  disabled={Boolean(item.invalid_reason)}
                  onChange={(event) => void toggleCartChecked(item, event.target.checked)}
                />
                <div className="cart-item-image-wrapper">
                  <Image
                    src={absoluteAssetUrl(item.cover_url)}
                    alt={item.product_name}
                    fallback="/src/assets/placeholder-product.png"
                    className="cart-item-image"
                  />
                </div>
                <div className="cart-item-info" onClick={() => navigate(`/products/${item.product_id}`)}>
                  <div className="cart-item-name">{item.product_name}</div>
                  <div className="cart-item-meta">
                    <Tag>{item.sku_name}</Tag>
                    <Tag className="cart-item-sku-id">SKU #{item.sku_id}</Tag>
                  </div>
                  {(item.source_label || item.source_post_id) && (
                    <div className="cart-item-source">
                      {item.source_label ? <Tag color="purple">{item.source_label}</Tag> : null}
                      {item.source_post_id ? (
                        <Tag color="purple">种草来源 #{item.source_post_id}</Tag>
                      ) : null}
                    </div>
                  )}
                  {item.invalid_reason ? (
                    <div className="cart-item-invalid-tag">
                      <Tag color="red">失效：{item.invalid_reason}</Tag>
                    </div>
                  ) : null}
                </div>
                <div className="cart-item-actions">
                  <div className="cart-item-price">￥{yuan(item.price_cent)}</div>
                  <InputNumber
                    min={1}
                    value={item.quantity}
                    disabled={Boolean(item.invalid_reason) || loading}
                    onChange={(value) => void changeCartQuantity(item, Number(value) || 1)}
                    className="cart-item-qty"
                  />
                  <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    disabled={loading}
                    onClick={() => void removeCartItem(item)}
                  >
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Spin>

      {cart.length > 0 && (
        <div className="cart-checkout-bar">
          <div className="cart-checkout-left">
            <Checkbox
              checked={allChecked}
              onChange={(event) => void batchSetCartChecked(event.target.checked)}
              disabled={cart.length === 0}
            >
              全选
            </Checkbox>
            <Text type="secondary">
              已选 {validCheckedItems.length} 件，共 {totalQuantity} 件
            </Text>
          </div>
          <div className="cart-checkout-right">
            <Text type="secondary">合计：</Text>
            <span className="cart-total-price">￥{yuan(totalCent)}</span>
            <Button
              type="primary"
              size="large"
              className="btn-cart-primary"
              disabled={validCheckedItems.length === 0}
              onClick={() => navigate('/checkout')}
            >
              去结算
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
