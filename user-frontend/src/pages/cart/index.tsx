import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { orderService, type CartItem } from '../../services/order'

export function CartPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    orderService.listCart().then((response) => setItems(response.data)).catch(() => setItems([]))
  }, [])

  const total = items.reduce((sum, item) => sum + item.price_cent * item.quantity, 0)

  return (
    <main>
      <h1>购物车</h1>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item.sku_id}>
              {item.product_name} / {item.sku_name} x {item.quantity} - ¥
              {((item.price_cent * item.quantity) / 100).toFixed(2)}
            </li>
          ))}
        </ul>
      ) : (
        <p>购物车为空</p>
      )}
      <p>合计：¥{(total / 100).toFixed(2)}</p>
      <button type="button" onClick={() => navigate('/checkout')} disabled={items.length === 0}>
        去结算
      </button>
    </main>
  )
}
