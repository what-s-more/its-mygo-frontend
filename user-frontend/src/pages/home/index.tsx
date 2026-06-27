import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <main>
      <h1>一次买够用户端测试入口</h1>
      <p>当前可测试：注册登录、商品浏览、加购、结算、模拟支付、确认收货、评价、售后申请。</p>
      <ol>
        <li>
          先进入 <Link to="/register">注册</Link> 或 <Link to="/login">登录</Link>。
        </li>
        <li>
          到 <Link to="/products">商品列表</Link>，选择管理端已上架商品并加入购物车。
        </li>
        <li>
          到 <Link to="/cart">购物车</Link> 查看商品，再进入结算。
        </li>
        <li>
          在 <Link to="/checkout">结算页</Link> 提交订单并模拟支付。
        </li>
        <li>
          到 <Link to="/orders">订单列表</Link> 测试确认收货、评价和售后申请。
        </li>
      </ol>
      <p>占位：地址管理、真实支付、优惠券、积分、物流跟踪后续阶段补充。</p>
    </main>
  )
}
