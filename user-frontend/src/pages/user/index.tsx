import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Avatar,
  Button,
  Card,
  DatePicker,
  Divider,
  Empty,
  Form,
  Image,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Switch,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadProps } from 'antd'
import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  HeartOutlined,
  HeartFilled,
  ShopOutlined,
  StarOutlined,
  StarFilled,
  PlusOutlined,
  PhoneOutlined,
  UserOutlined,
  HomeOutlined,
  GiftOutlined,
  FireOutlined,
  CrownOutlined,
  TagOutlined,
  MessageOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

import { addressService, type Address, type AddressPayload } from '../../services/address'
import { authService, type MemberLevel, type PointsAccount, type PointsLog, type UserProfile } from '../../services/auth'
import { communityService, type CommunityFavoritePostItem, type CommunityPost, type CommunityComment } from '../../services/community'
import { productService, type MerchantFollowItem, type ProductFavoriteItem } from '../../services/product'
import { promotionService, type CouponTemplate, type UserCoupon } from '../../services/promotion'
import { uploadService } from '../../services/upload'
import { getApiErrorMessage } from '../../services/http'
import { absoluteAssetUrl, pickErrorMessage, statusText, yuan } from '../../utils/format'
import { REGION_DATA } from '../../utils/region-data'

const { Text, Paragraph } = Typography

const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'secret', label: '保密' },
]

const SCOPE_TEXT: Record<string, string> = {
  all: '全平台',
  platform: '全平台',
  merchant: '指定店铺',
  category: '指定分类',
  product: '指定商品',
  sku: '指定 SKU',
}

const COUPON_STATUS_TEXT: Record<string, { text: string; cls: string }> = {
  active: { text: '可领取', cls: 'uc-coupon-status-active' },
  disabled: { text: '已停用', cls: 'uc-coupon-status-disabled' },
  unused: { text: '未使用', cls: 'uc-coupon-status-unused' },
  used: { text: '已使用', cls: 'uc-coupon-status-used' },
  expired: { text: '已过期', cls: 'uc-coupon-status-expired' },
  void: { text: '已作废', cls: 'uc-coupon-status-used' },
}

type AddressFormValues = {
  receiver_name: string
  receiver_mobile: string
  province: string
  city: string
  district?: string
  street?: string
  detail_address: string
  postal_code?: string
  address_tag?: string
  is_default?: boolean
}

type SectionTab = 'points' | 'coupons' | 'favorites' | 'follows' | 'addresses' | 'favoritePosts'

function buildRegionText(address: Address) {
  return [address.province, address.city, address.district ?? '', address.street ?? '']
    .filter(Boolean)
    .join(' ')
}

export function UserCenterPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileNickname, setProfileNickname] = useState('')
  const [profileGender, setProfileGender] = useState<string>('')
  const [profileBirthday, setProfileBirthday] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('')
  const [pointsAccount, setPointsAccount] = useState<PointsAccount | null>(null)
  const [memberLevel, setMemberLevel] = useState<MemberLevel | null>(null)
  const [pointsLogs, setPointsLogs] = useState<PointsLog[]>([])
  const [followedMerchants, setFollowedMerchants] = useState<MerchantFollowItem[]>([])
  const [favoriteProducts, setFavoriteProducts] = useState<ProductFavoriteItem[]>([])
  const [favoritePosts, setFavoritePosts] = useState<CommunityFavoritePostItem[]>([])
  const [favoritePostsLoading, setFavoritePostsLoading] = useState(false)
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null)
  const [selectedPostComments, setSelectedPostComments] = useState<CommunityComment[]>([])
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set())
  const [couponTemplates, setCouponTemplates] = useState<CouponTemplate[]>([])
  const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<SectionTab>('points')
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<number | undefined>()
  const [addressForm] = Form.useForm<AddressFormValues>()
  const [addressSubmitting, setAddressSubmitting] = useState(false)
  const [selectedProvince, setSelectedProvince] = useState<string>('')
  const [selectedCity, setSelectedCity] = useState<string>('')

  async function loadProfile() {
    const response = await authService.profile()
    const data = response.data
    setProfile(data)
    setProfileNickname(data.nickname)
    setProfileGender(data.gender ?? '')
    setProfileBirthday(data.birthday ?? '')
    setProfileEmail(data.email ?? '')
    setProfileAvatarUrl(data.avatar_url ?? '')
  }

  async function loadMemberAndPoints() {
    const [pointsRes, levelRes, logsRes] = await Promise.all([
      authService.pointsAccount(),
      authService.memberLevel(),
      authService.pointsLogs(),
    ])
    setPointsAccount(pointsRes.data)
    setMemberLevel(levelRes.data)
    setPointsLogs(logsRes.data?.list ?? [])
  }

  async function loadFollowedMerchants() {
    const response = await productService.listFollowedMerchants({ page_size: 20 })
    setFollowedMerchants(response.data?.list ?? [])
  }

  async function loadFavoriteProducts() {
    const response = await productService.listFavoriteProducts({ page_size: 20 })
    setFavoriteProducts(response.data?.list ?? [])
  }

  async function loadFavoritePosts() {
    setFavoritePostsLoading(true)
    try {
      const response = await communityService.listFavoritePosts({ page_size: 20 })
      setFavoritePosts(response.data?.list ?? [])
    } catch {
      setFavoritePosts([])
    } finally {
      setFavoritePostsLoading(false)
    }
  }

  async function openPostDetail(post: CommunityPost) {
    setSelectedPost(post)
    try {
      const response = await communityService.listComments(post.id)
      setSelectedPostComments(response.data?.list ?? [])
    } catch {
      setSelectedPostComments([])
    }
  }

  async function likePost(postId: number) {
    try {
      const response = await communityService.likePost(postId)
      if (response.data) {
        setLikedPosts((prev) => {
          const next = new Set(prev)
          if (response.data.liked) {
            next.add(postId)
          } else {
            next.delete(postId)
          }
          return next
        })
        setSelectedPost((prev) => prev && prev.id === postId ? { ...prev, like_count: response.data.like_count } : prev)
        setFavoritePosts((prev) => prev.map((item) => item.post.id === postId ? { ...item, post: { ...item.post, like_count: response.data.like_count } } : item))
      }
    } catch (error) {
      message.error(`点赞失败：${getApiErrorMessage(error)}`)
    }
  }

  async function favoritePost(postId: number) {
    try {
      const response = await communityService.favoritePost(postId)
      if (response.data) {
        setSelectedPost((prev) => prev && prev.id === postId ? { ...prev, favorited: response.data.favorited, favorite_count: response.data.favorite_count } : prev)
        setFavoritePosts((prev) => prev.filter((item) => item.post.id !== postId))
        if (!response.data.favorited) {
          message.success('已取消收藏')
        }
      }
    } catch (error) {
      message.error(`收藏失败：${getApiErrorMessage(error)}`)
    }
  }

  async function deletePost(postId: number) {
    try {
      await communityService.deletePost(postId)
      setSelectedPost(null)
      setFavoritePosts((prev) => prev.filter((item) => item.post.id !== postId))
      message.success('帖子已删除')
    } catch (error) {
      message.error(`删除失败：${getApiErrorMessage(error)}`)
    }
  }

  async function loadCoupons() {
    const [templatesRes, myRes] = await Promise.all([
      promotionService.listCoupons(),
      promotionService.listMyCoupons(),
    ])
    setCouponTemplates(templatesRes.data ?? [])
    setMyCoupons(myRes.data ?? [])
  }

  async function loadAddresses() {
    try {
      const response = await addressService.listAddresses()
      setAddresses(response.data ?? [])
    } catch {
      setAddresses([])
    }
  }

  async function loadAll() {
    if (!authService.hasToken()) return
    setLoading(true)
    try {
      await Promise.all([
        loadProfile(),
        loadMemberAndPoints(),
        loadFollowedMerchants(),
        loadFavoriteProducts(),
        loadFavoritePosts(),
        loadCoupons(),
        loadAddresses(),
      ])
    } catch (error) {
      message.error(`加载个人中心失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authService.hasToken()) {
      message.warning('请先登录后查看个人中心')
      return
    }
    void loadAll()
  }, [])

  /* ── Profile Modal ── */

  async function updateProfile() {
    try {
      const response = await authService.updateProfile({
        nickname: profileNickname,
        gender: profileGender || null,
        birthday: profileBirthday || null,
        email: profileEmail || null,
        avatar_url: profileAvatarUrl || null,
      })
      setProfile(response.data)
      setProfileModalOpen(false)
      message.success('用户资料已更新')
    } catch (error) {
      message.error(`更新资料失败：${getApiErrorMessage(error)}`)
    }
  }

  async function signIn() {
    try {
      await authService.signIn()
      message.success('签到完成')
      await loadProfile()
      await loadMemberAndPoints()
    } catch (error) {
      message.error(`签到失败：${getApiErrorMessage(error)}`)
    }
  }

  async function uploadAvatar(file: File) {
    try {
      const response = await uploadService.uploadImage(file)
      setProfileAvatarUrl(response.data.url)
      message.success('头像已上传，请保存个人资料')
    } catch (error) {
      message.error(`上传头像失败：${getApiErrorMessage(error)}`)
    }
  }

  const uploadProps: UploadProps = {
    showUploadList: false,
    accept: 'image/*',
    beforeUpload: (file) => {
      void uploadAvatar(file)
      return false
    },
  }

  /* ── Favorites ── */

  async function removeFavoriteProduct(productId: number) {
    try {
      await productService.unfavoriteProduct(productId)
      message.success('已取消收藏')
      await loadFavoriteProducts()
    } catch (error) {
      message.error(`取消收藏失败：${getApiErrorMessage(error)}`)
    }
  }

  /* ── Coupons ── */

  const claimedCountByTemplateId = useMemo(() => {
    const map = new Map<number, number>()
    myCoupons.forEach((coupon) => {
      map.set(coupon.coupon_template_id, (map.get(coupon.coupon_template_id) ?? 0) + 1)
    })
    return map
  }, [myCoupons])

  async function claimCoupon(templateId: number) {
    try {
      await promotionService.claimCoupon(templateId)
      message.success('优惠券领取成功')
      await loadCoupons()
    } catch (error) {
      message.error(`领取失败：${pickErrorMessage(error) ?? '请确认已登录且未超过领取限制'}`)
    }
  }

  function scopeText(scopeType: string, scopeIds: number[]) {
    const label = SCOPE_TEXT[scopeType] ?? scopeType
    if (scopeIds.length === 0) return `${label}（全部）`
    return `${label} [${scopeIds.join(',')}]`
  }

  /* ── Address ── */

  function openCreateAddressModal() {
    setEditingAddressId(undefined)
    addressForm.resetFields()
    addressForm.setFieldValue('is_default', addresses.length === 0)
    setSelectedProvince('')
    setSelectedCity('')
    setAddressModalOpen(true)
  }

  function openEditAddressModal(address: Address) {
    setEditingAddressId(address.id)
    setSelectedProvince(address.province)
    setSelectedCity(address.city)
    addressForm.setFieldsValue({
      receiver_name: address.receiver_name,
      receiver_mobile: address.receiver_mobile,
      province: address.province,
      city: address.city,
      district: address.district ?? '',
      street: address.street ?? '',
      detail_address: address.detail_address,
      postal_code: address.postal_code ?? '',
      address_tag: address.address_tag ?? '',
      is_default: address.is_default,
    })
    setAddressModalOpen(true)
  }

  function closeAddressModal() {
    setAddressModalOpen(false)
    setEditingAddressId(undefined)
    addressForm.resetFields()
  }

  async function handleAddressSubmit() {
    let values: AddressFormValues
    try {
      values = await addressForm.validateFields()
    } catch {
      return
    }
    setAddressSubmitting(true)
    const payload: AddressPayload = {
      receiver_name: values.receiver_name,
      receiver_mobile: values.receiver_mobile,
      province: values.province,
      city: values.city,
      district: values.district || null,
      street: values.street || null,
      detail_address: values.detail_address,
      postal_code: values.postal_code || null,
      address_tag: values.address_tag || null,
      is_default: values.is_default ?? (addresses.length === 0),
    }
    try {
      if (editingAddressId) {
        await addressService.updateAddress(editingAddressId, payload)
        message.success('地址已修改')
      } else {
        await addressService.createAddress(payload)
        message.success('地址已保存')
      }
      closeAddressModal()
      await loadAddresses()
    } catch (error) {
      message.error(`保存地址失败：${pickErrorMessage(error) ?? '请求失败'}`)
    } finally {
      setAddressSubmitting(false)
    }
  }

  async function handleSetDefaultAddress(addressId: number) {
    try {
      await addressService.updateAddress(addressId, { is_default: true })
      message.success('默认地址已更新')
      await loadAddresses()
    } catch (error) {
      message.error(`设置默认地址失败：${pickErrorMessage(error) ?? '请求失败'}`)
    }
  }

  async function handleDeleteAddress(addressId: number) {
    try {
      await addressService.deleteAddress(addressId)
      message.success('地址已删除')
      if (editingAddressId === addressId) closeAddressModal()
      await loadAddresses()
    } catch (error) {
      message.error(`删除地址失败：${pickErrorMessage(error) ?? '请求失败'}`)
    }
  }

  /* ── Render ── */

  if (!authService.hasToken()) {
    return (
      <div className="uc-page">
        <Empty description="请先登录后查看个人中心" style={{ padding: '120px 0' }} />
      </div>
    )
  }

  const TABS: { key: SectionTab; label: string; icon: React.ReactNode }[] = [
    { key: 'points', label: '积分与会员', icon: <GiftOutlined /> },
    { key: 'coupons', label: `优惠券 (${myCoupons.length})`, icon: <TagOutlined /> },
    { key: 'addresses', label: `收货地址 (${addresses.length})`, icon: <EnvironmentOutlined /> },
    { key: 'favorites', label: `商品收藏 (${favoriteProducts.length})`, icon: <HeartOutlined /> },
    { key: 'favoritePosts', label: `收藏帖子 (${favoritePosts.length})`, icon: <StarOutlined /> },
    { key: 'follows', label: `关注店铺 (${followedMerchants.length})`, icon: <ShopOutlined /> },
  ]

  return (
    <div className="uc-page">
      <Spin spinning={loading}>
        {/* ── Profile Hero Banner ── */}
        <div className="uc-hero">
          <div className="uc-hero-bg" />
          <div className="uc-hero-content">
            <Upload {...uploadProps}>
              <div className="uc-avatar-wrap">
                <Avatar
                  size={80}
                  src={absoluteAssetUrl(profileAvatarUrl) || undefined}
                  className="uc-avatar"
                >
                  {profile?.nickname?.slice(0, 1) ?? 'U'}
                </Avatar>
                <div className="uc-avatar-edit"><EditOutlined /></div>
              </div>
            </Upload>
            <div className="uc-hero-info">
              <div className="uc-hero-name-row">
                <h1 className="uc-hero-name">{profile?.nickname ?? '用户'}</h1>
                <Button
                  type="primary"
                  size="small"
                  icon={<EditOutlined />}
                  className="btn-uc-edit-profile"
                  onClick={() => setProfileModalOpen(true)}
                >
                  编辑资料
                </Button>
              </div>
              <div className="uc-hero-meta">
                <Tag className="uc-tag-user-id">用户 #{profile?.id ?? '-'}</Tag>
                {memberLevel && (
                  <Tag className="uc-tag-level">
                    <CrownOutlined /> {memberLevel.level_name}
                  </Tag>
                )}
                {profile?.mobile && <Text className="uc-hero-mobile">{profile.mobile}</Text>}
              </div>
            </div>
            <div className="uc-hero-actions">
              {pointsAccount && !pointsAccount.sign_in_today && (
                <Button
                  type="primary"
                  icon={<FireOutlined />}
                  onClick={() => void signIn()}
                  className="btn-uc-signin"
                >
                  每日签到
                </Button>
              )}
              {pointsAccount?.sign_in_today && (
                <Tag className="uc-tag-signed">
                  <FireOutlined /> 今日已签到 · 连续 {pointsAccount.current_streak_days} 天
                </Tag>
              )}
            </div>
          </div>
        </div>

        {/* ── Main Layout: Sidebar + Content ── */}
        <div className="uc-main-layout">
          {/* ── Left Sidebar ── */}
          <aside className="uc-sidebar">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`uc-sidebar-item ${activeTab === tab.key ? 'uc-sidebar-item-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="uc-sidebar-icon">{tab.icon}</span>
                <span className="uc-sidebar-label">{tab.label}</span>
              </button>
            ))}
          </aside>

          {/* ── Right Content ── */}
          <div className="uc-content">
          {/* Points & Member Tab */}
          {activeTab === 'points' && (
            <>
              {/* Points Account */}
              <Card className="uc-card" title={<span className="uc-card-title">积分账户</span>}>
                {pointsAccount ? (
                  <div className="uc-points-grid">
                    <div className="uc-points-item">
                      <span className="uc-points-value">{pointsAccount.points}</span>
                      <span className="uc-points-label">积分余额</span>
                    </div>
                    <div className="uc-points-item">
                      <span className="uc-points-value">{pointsAccount.current_streak_days} 天</span>
                      <span className="uc-points-label">连续签到</span>
                    </div>
                    <div className="uc-points-item">
                      <span className="uc-points-value">{pointsAccount.today_reward_points}</span>
                      <span className="uc-points-label">今日签到奖励</span>
                    </div>
                    <div className="uc-points-item">
                      <span className="uc-points-value">{pointsAccount.sign_in_today ? '已完成' : '待完成'}</span>
                      <span className="uc-points-label">今日签到</span>
                    </div>
                  </div>
                ) : (
                  <Empty description="暂无积分账户信息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>

              {/* Member Level */}
              <Card className="uc-card" title={<span className="uc-card-title"><CrownOutlined /> 会员等级</span>}>
                {memberLevel ? (
                  <div className="uc-member">
                    <div className="uc-member-top">
                      <div className="uc-member-level-badge">
                        <CrownOutlined />
                        <span>{memberLevel.level_name}</span>
                      </div>
                      <Tag className="uc-tag-level-code">{memberLevel.level}</Tag>
                    </div>
                    <div className="uc-member-stats">
                      <div className="uc-member-stat">
                        <span className="uc-member-stat-label">成长值</span>
                        <span className="uc-member-stat-value">{memberLevel.growth_value_cent}</span>
                      </div>
                      <div className="uc-member-stat">
                        <span className="uc-member-stat-label">下一级</span>
                        <span className="uc-member-stat-value">
                          {memberLevel.next_level_name ?? '已满级'}
                        </span>
                      </div>
                      {memberLevel.next_level_need_cent != null && memberLevel.next_level_need_cent > 0 && (
                        <div className="uc-member-stat">
                          <span className="uc-member-stat-label">还需成长值</span>
                          <span className="uc-member-stat-value">{memberLevel.next_level_need_cent}</span>
                        </div>
                      )}
                    </div>
                    <div className="uc-member-benefits">
                      <Text type="secondary" className="uc-form-label">会员权益</Text>
                      <div className="uc-benefit-tags">
                        {memberLevel.benefits.length > 0 ? (
                          memberLevel.benefits.map((benefit) => (
                            <Tag className="uc-tag-benefit" key={benefit}>{benefit}</Tag>
                          ))
                        ) : (
                          <Text type="secondary">暂无权益</Text>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Empty description="暂无会员等级信息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>

              {/* Points Logs */}
              <Card className="uc-card" title={<span className="uc-card-title">积分流水</span>}>
                <List
                  dataSource={pointsLogs}
                  locale={{ emptyText: '暂无积分流水' }}
                  renderItem={(log) => (
                    <List.Item className="uc-log-item">
                      <div className="uc-log-left">
                        <Text className="uc-log-desc">{log.description}</Text>
                        <div className="uc-log-meta">
                          <Tag className="uc-tag-source">{log.source_type}</Tag>
                          <Text type="secondary" className="uc-log-date">{log.created_at}</Text>
                        </div>
                      </div>
                      <div className="uc-log-right">
                        <Text className={`uc-log-change ${log.change_points >= 0 ? 'uc-log-positive' : 'uc-log-negative'}`}>
                          {log.change_points >= 0 ? '+' : ''}{log.change_points}
                        </Text>
                        <Text type="secondary" className="uc-log-balance">余额 {log.balance_points}</Text>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </>
          )}

          {/* Coupons Tab */}
          {activeTab === 'coupons' && (
            <>
              {/* Claimable Coupons */}
              <Card
                className="uc-card"
                title={
                  <div className="uc-card-title-row">
                    <span className="uc-card-title"><TagOutlined /> 可领取优惠券</span>
                    <Button size="small" icon={<ReloadOutlined />} onClick={() => void loadCoupons()}>刷新</Button>
                  </div>
                }
              >
                {couponTemplates.length === 0 ? (
                  <Empty description="暂无可领取的优惠券" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '40px 0' }} />
                ) : (
                  <div className="uc-coupon-claim-grid">
                    {couponTemplates.map((template) => {
                      const claimedCount = claimedCountByTemplateId.get(template.id) ?? 0
                      const reachedUserLimit = claimedCount >= template.per_user_limit
                      const soldOut = template.total_quantity !== 0 && template.claimed_quantity >= template.total_quantity
                      const claimable = template.status === 'active' && !reachedUserLimit && !soldOut
                      return (
                        <div key={template.id} className={`uc-coupon-claim-card ${!claimable ? 'uc-coupon-claim-disabled' : ''}`}>
                          <div className="uc-coupon-claim-left">
                            <span className="uc-coupon-claim-amount">¥{yuan(template.discount_value)}</span>
                            <span className="uc-coupon-claim-min">满¥{yuan(template.min_amount_cent)}可用</span>
                          </div>
                          <div className="uc-coupon-claim-right">
                            <Text className="uc-coupon-claim-name" ellipsis>{template.name}</Text>
                            <Tag className="uc-coupon-scope-tag">{scopeText(template.scope_type, template.scope_ids)}</Tag>
                            <div className="uc-coupon-claim-meta">
                              <span>已领 {template.claimed_quantity}/{template.total_quantity || '不限'}</span>
                              <span>限领 {template.per_user_limit}</span>
                            </div>
                            {template.valid_to && (
                              <span className="uc-coupon-claim-date">截止 {template.valid_to.slice(0, 10)}</span>
                            )}
                            <div className="uc-coupon-usage">
                              <span>满¥{yuan(template.min_amount_cent)}可用</span>
                              <span>{scopeText(template.scope_type, template.scope_ids)}</span>
                              {template.valid_from && template.valid_to && (
                                <span>{template.valid_from.slice(0, 10)}~{template.valid_to.slice(0, 10)}</span>
                              )}
                              <span>每人限领 {template.per_user_limit} 张</span>
                            </div>
                          </div>
                          <Button
                            size="small"
                            type="primary"
                            disabled={!claimable}
                            onClick={() => void claimCoupon(template.id)}
                            className="btn-uc-primary"
                          >
                            {reachedUserLimit ? '已领取' : soldOut ? '已领完' : '领取'}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>

              {/* My Coupons */}
              <Card className="uc-card" title={<span className="uc-card-title">我的优惠券</span>}>
                {myCoupons.length === 0 ? (
                  <Empty description="暂无优惠券，去领取一张吧" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '40px 0' }} />
                ) : (
                  <div className="uc-coupon-mine-grid">
                    {myCoupons.map((coupon) => {
                      const statusMeta = COUPON_STATUS_TEXT[coupon.status] ?? { text: coupon.status, cls: 'uc-coupon-status-used' }
                      return (
                        <div key={coupon.id} className={`uc-coupon-mine-card ${statusMeta.cls}`}>
                          <div className="uc-coupon-mine-left">
                            <span className="uc-coupon-mine-amount">¥{yuan(coupon.template.discount_value)}</span>
                            <span className="uc-coupon-mine-min">满¥{yuan(coupon.template.min_amount_cent)}可用</span>
                          </div>
                          <div className="uc-coupon-mine-right">
                            <Text className="uc-coupon-mine-name" ellipsis>{coupon.template.name}</Text>
                            <Tag className="uc-coupon-scope-tag">{scopeText(coupon.template.scope_type, coupon.template.scope_ids)}</Tag>
                            <div className="uc-coupon-mine-meta">
                              <span>#{coupon.id}</span>
                              <span>领取 {coupon.claimed_at.slice(0, 10)}</span>
                              {coupon.used_at && <span>使用 {coupon.used_at.slice(0, 10)}</span>}
                            </div>
                            <div className="uc-coupon-usage">
                              <span>满¥{yuan(coupon.template.min_amount_cent)}可用</span>
                              <span>{scopeText(coupon.template.scope_type, coupon.template.scope_ids)}</span>
                              {coupon.template.valid_from && coupon.template.valid_to && (
                                <span>{coupon.template.valid_from.slice(0, 10)}~{coupon.template.valid_to.slice(0, 10)}</span>
                              )}
                            </div>
                          </div>
                          <div className="uc-coupon-mine-status">
                            {statusMeta.text}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </>
          )}

          {/* Addresses Tab */}
          {activeTab === 'addresses' && (
            <Card
              className="uc-card"
              title={
                <div className="uc-card-title-row">
                  <span className="uc-card-title"><EnvironmentOutlined /> 收货地址</span>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    className="btn-uc-primary"
                    onClick={openCreateAddressModal}
                  >
                    新增地址
                  </Button>
                </div>
              }
            >
              {addresses.length === 0 ? (
                <Empty
                  description="暂无收货地址"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ padding: '60px 0' }}
                >
                  <Button type="primary" icon={<PlusOutlined />} className="btn-uc-primary" onClick={openCreateAddressModal}>
                    添加第一个地址
                  </Button>
                </Empty>
              ) : (
                <div className="uc-addr-cards">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`uc-addr-card ${address.is_default ? 'uc-addr-card-default' : ''}`}
                    >
                      <div className="uc-addr-card-accent" />
                      <div className="uc-addr-card-body">
                        <div className="uc-addr-card-top">
                          <div className="uc-addr-card-user">
                            <span className="uc-addr-card-name">
                              <UserOutlined /> {address.receiver_name}
                            </span>
                            <span className="uc-addr-card-phone">
                              <PhoneOutlined /> {address.receiver_mobile}
                            </span>
                          </div>
                          <div className="uc-addr-card-tags">
                            {address.is_default && (
                              <Tag className="uc-addr-tag-default">
                                <StarFilled /> 默认
                              </Tag>
                            )}
                            {address.address_tag && (
                              <Tag className="uc-addr-tag-label">
                                <HomeOutlined /> {address.address_tag}
                              </Tag>
                            )}
                            <Tag className="uc-addr-tag-id">#{address.id}</Tag>
                          </div>
                        </div>
                        <div className="uc-addr-card-content">
                          <div className="uc-addr-card-region">
                            <EnvironmentOutlined className="uc-addr-region-icon" />
                            <Text className="uc-addr-region-text">{buildRegionText(address)}</Text>
                          </div>
                          <Paragraph className="uc-addr-detail-text">{address.detail_address}</Paragraph>
                          {address.postal_code && (
                            <Text type="secondary" className="uc-addr-postal">邮编 {address.postal_code}</Text>
                          )}
                        </div>
                        <div className="uc-addr-card-footer">
                          {!address.is_default && (
                            <Button
                              type="link"
                              size="small"
                              icon={<StarOutlined />}
                              onClick={() => void handleSetDefaultAddress(address.id)}
                              className="uc-addr-action-btn"
                            >
                              设为默认
                            </Button>
                          )}
                          <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => openEditAddressModal(address)}
                            className="uc-addr-action-btn"
                          >
                            编辑
                          </Button>
                          <Popconfirm
                            title="确认删除该地址？"
                            description="删除后不可恢复"
                            onConfirm={() => void handleDeleteAddress(address.id)}
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                          >
                            <Button
                              type="link"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              className="uc-addr-action-btn"
                            >
                              删除
                            </Button>
                          </Popconfirm>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Favorites Tab */}
          {activeTab === 'favorites' && (
            <Card className="uc-card" title={<span className="uc-card-title">商品收藏</span>}>
              {favoriteProducts.length === 0 ? (
                <Empty description="暂无收藏商品" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '40px 0' }} />
              ) : (
                <div className="uc-fav-grid">
                  {favoriteProducts.map((item) => (
                    <div key={item.product.id} className="uc-fav-card">
                      <Link to={`/products/${item.product.id}`}>
                        {item.product.cover_url ? (
                          <Image
                            src={absoluteAssetUrl(item.product.cover_url)}
                            preview={false}
                            className="uc-fav-img"
                          />
                        ) : (
                          <div className="uc-fav-noimg">暂无图片</div>
                        )}
                      </Link>
                      <div className="uc-fav-body">
                        <Link to={`/products/${item.product.id}`}>
                          <Text className="uc-fav-name" ellipsis>{item.product.name}</Text>
                        </Link>
                        <Text type="secondary" className="uc-fav-merchant">{item.product.merchant_name}</Text>
                        <div className="uc-fav-bottom">
                          <span className="uc-fav-price">¥{yuan(item.product.price_cent)}</span>
                          <Button
                            size="small"
                            danger
                            type="link"
                            onClick={() => void removeFavoriteProduct(item.product.id)}
                          >
                            取消收藏
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Follows Tab */}
          {activeTab === 'follows' && (
            <Card className="uc-card" title={<span className="uc-card-title">关注的店铺</span>}>
              {followedMerchants.length === 0 ? (
                <Empty description="暂无关注的店铺" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '40px 0' }} />
              ) : (
                <div className="uc-follow-grid">
                  {followedMerchants.map((item) => (
                    <Link to={`/merchants/${item.merchant.id}`} key={item.merchant.id} className="uc-follow-card">
                      <div className="uc-follow-left">
                        {item.merchant.logo_url ? (
                          <Avatar size={48} src={absoluteAssetUrl(item.merchant.logo_url)} />
                        ) : (
                          <Avatar size={48} className="uc-follow-avatar">
                            {item.merchant.name?.slice(0, 1) ?? '店'}
                          </Avatar>
                        )}
                      </div>
                      <div className="uc-follow-body">
                        <Text strong className="uc-follow-name">{item.merchant.name}</Text>
                        <div className="uc-follow-meta">
                          <span><ShopOutlined /> {item.follower_count} 人关注</span>
                          <span><CalendarOutlined /> {item.followed_at?.slice(0, 10) ?? '-'}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Favorite Posts Tab */}
          {activeTab === 'favoritePosts' && (
            <Card className="uc-card" title={<span className="uc-card-title">收藏帖子</span>}>
              <Spin spinning={favoritePostsLoading}>
                {favoritePosts.length === 0 ? (
                  <Empty description="暂无收藏帖子" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '40px 0' }} />
                ) : (
                  <List
                    dataSource={favoritePosts}
                    renderItem={(item) => {
                      const content = item.post.content ?? ''
                      const summary = content.length > 80 ? `${content.slice(0, 80)}...` : content
                      return (
                        <List.Item
                          key={item.post.id}
                          className="uc-log-item"
                          style={{ cursor: 'pointer' }}
                          onClick={() => void openPostDetail(item.post)}
                        >
                          <div className="uc-log-left">
                            <Text className="uc-log-desc">{item.post.title}</Text>
                            <div className="uc-log-meta">
                              <Tag className="uc-tag-source">{statusText(item.post.type)}</Tag>
                              <Text type="secondary" className="uc-log-date">
                                收藏于 {item.favorited_at?.slice(0, 10) ?? '-'}
                              </Text>
                            </div>
                            <Text type="secondary" className="uc-fav-post-summary">{summary}</Text>
                          </div>
                          <div className="uc-fav-post-stats">
                            <span><HeartOutlined /> {item.post.like_count}</span>
                            <span><StarOutlined /> {item.post.favorite_count}</span>
                            <span><MessageOutlined /> {item.post.comment_count}</span>
                          </div>
                        </List.Item>
                      )
                    }}
                  />
                )}
              </Spin>
            </Card>
          )}
          </div>
        </div>
      </Spin>

      <button
        className="uc-fab-cs"
        onClick={() => navigate('/customer-service')}
        title="联系客服"
      >
        <MessageOutlined />
      </button>

      {/* ── Edit Profile Modal ── */}
      <Modal
        open={profileModalOpen}
        title="编辑个人资料"
        onCancel={() => setProfileModalOpen(false)}
        width={560}
        footer={[
          <Button key="cancel" onClick={() => setProfileModalOpen(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={() => void updateProfile()} className="btn-uc-primary">
            保存资料
          </Button>,
        ]}
      >
        <div className="uc-form">
          <div className="uc-form-row">
            <div className="uc-form-item">
              <Text type="secondary" className="uc-form-label">昵称</Text>
              <Input
                value={profileNickname}
                onChange={(e) => setProfileNickname(e.target.value)}
                placeholder="昵称"
              />
            </div>
            <div className="uc-form-item">
              <Text type="secondary" className="uc-form-label">性别</Text>
              <Select
                style={{ width: '100%' }}
                value={profileGender || undefined}
                onChange={(value) => setProfileGender(value ?? '')}
                options={GENDER_OPTIONS}
                placeholder="选择性别"
                allowClear
              />
            </div>
          </div>
          <div className="uc-form-row">
            <div className="uc-form-item">
              <Text type="secondary" className="uc-form-label">生日</Text>
              <DatePicker
                style={{ width: '100%' }}
                value={profileBirthday ? dayjs(profileBirthday) : undefined}
                onChange={(value) => setProfileBirthday(value ? value.format('YYYY-MM-DD') : '')}
                placeholder="选择生日"
              />
            </div>
            <div className="uc-form-item">
              <Text type="secondary" className="uc-form-label">邮箱</Text>
              <Input
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="邮箱地址"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Create/Edit Address Modal ── */}
      <Modal
        open={addressModalOpen}
        title={editingAddressId ? `编辑地址 #${editingAddressId}` : '新增收货地址'}
        onCancel={closeAddressModal}
        width={640}
        footer={[
          <Button key="cancel" onClick={closeAddressModal}>取消</Button>,
          <Button key="reset" onClick={() => addressForm.resetFields()}>重置</Button>,
          <Button
            key="submit"
            type="primary"
            loading={addressSubmitting}
            onClick={() => void handleAddressSubmit()}
            className="btn-uc-primary"
          >
            {editingAddressId ? '保存修改' : '保存地址'}
          </Button>,
        ]}
      >
        <Form form={addressForm} layout="vertical" className="uc-addr-form">
          <Form.Item name="receiver_name" label="收货人" rules={[{ required: true, message: '请输入收货人姓名' }]}>
            <Input placeholder="收货人姓名" prefix={<UserOutlined />} />
          </Form.Item>
          <Form.Item name="receiver_mobile" label="手机号" rules={[{ required: true, message: '请输入收货人手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号' }]}>
            <Input placeholder="收货人手机号" prefix={<PhoneOutlined />} />
          </Form.Item>
          <Form.Item name="province" label="省" rules={[{ required: true, message: '请选择省' }]}>
            <Select
              showSearch
              placeholder="请选择省"
              optionFilterProp="label"
              onChange={(value: string) => {
                setSelectedProvince(value)
                setSelectedCity('')
                addressForm.setFieldValue('city', undefined)
                addressForm.setFieldValue('district', undefined)
              }}
              options={REGION_DATA.map((p) => ({ value: p.value, label: p.label }))}
            />
          </Form.Item>
          <Form.Item name="city" label="市" rules={[{ required: true, message: '请选择市' }]}>
            <Select
              showSearch
              placeholder="请选择市"
              optionFilterProp="label"
              disabled={!selectedProvince}
              onChange={(value: string) => {
                setSelectedCity(value)
                addressForm.setFieldValue('district', undefined)
              }}
              options={REGION_DATA.find((p) => p.value === selectedProvince)?.children?.map((c) => ({ value: c.value, label: c.label })) ?? []}
            />
          </Form.Item>
          <Form.Item name="district" label="区县">
            <Select
              showSearch
              placeholder="请选择区县"
              optionFilterProp="label"
              disabled={!selectedCity}
              options={REGION_DATA.find((p) => p.value === selectedProvince)?.children?.find((c) => c.value === selectedCity)?.children?.map((d) => ({ value: d.value, label: d.label })) ?? []}
            />
          </Form.Item>
          <Form.Item name="street" label="街道">
            <Input placeholder="街道/乡镇" />
          </Form.Item>
          <Form.Item name="detail_address" label="详细地址" rules={[{ required: true, message: '请输入详细地址' }]}>
            <Input.TextArea placeholder="楼栋、门牌等详细地址" autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
          <Form.Item name="postal_code" label="邮政编码">
            <Input placeholder="邮政编码" />
          </Form.Item>
          <Form.Item name="address_tag" label="地址标签">
            <Input placeholder="例如：家、公司" />
          </Form.Item>
          <Form.Item name="is_default" valuePropName="checked">
            <Switch checkedChildren="设为默认地址" unCheckedChildren="非默认" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!selectedPost}
        title={selectedPost?.title}
        onCancel={() => setSelectedPost(null)}
        footer={null}
        width={720}
        centered
        className="comm-post-modal"
      >
        {selectedPost ? (
          <div className="comm-detail">
            <div className="comm-detail-header">
              <Avatar size={40} src={absoluteAssetUrl(selectedPost.author.avatar_url)}>
                {selectedPost.author.nickname?.[0] ?? '用'}
              </Avatar>
              <div className="comm-detail-author-info">
                <Text strong>{selectedPost.author.nickname}</Text>
                <Text type="secondary" className="comm-detail-date">
                  {new Date(selectedPost.created_at).toLocaleString()}
                </Text>
              </div>
              <div className="comm-detail-tags">
                <Tag>{statusText(selectedPost.type)}</Tag>
              </div>
            </div>

            <Paragraph className="comm-detail-content">{selectedPost.content}</Paragraph>

            {selectedPost.topic_tags.length > 0 && (
              <div className="comm-detail-topics">
                {selectedPost.topic_tags.map((tag) => (
                  <Tag key={tag} className="clickable-tag">
                    #{tag}
                  </Tag>
                ))}
              </div>
            )}

            {selectedPost.image_urls.length > 0 && (
              <Image.PreviewGroup>
                <div className="comm-detail-images">
                  {selectedPost.image_urls.map((url) => (
                    <Image key={url} width="100%" src={absoluteAssetUrl(url)} className="comm-detail-image" />
                  ))}
                </div>
              </Image.PreviewGroup>
            )}

            <div className="comm-detail-actions">
              <Button
                icon={likedPosts.has(selectedPost.id) ? <HeartFilled style={{ color: '#f5222d' }} /> : <HeartOutlined />}
                onClick={() => void likePost(selectedPost.id)}
                className="comm-detail-like-btn"
              >
                {selectedPost.like_count}
              </Button>
              <Button
                icon={selectedPost.favorited ? <StarFilled style={{ color: '#f5a623' }} /> : <StarOutlined />}
                onClick={() => void favoritePost(selectedPost.id)}
                className="comm-detail-like-btn"
              >
                {selectedPost.favorite_count}
              </Button>
              <Text type="secondary"><MessageOutlined /> {selectedPost.comment_count} 条评论</Text>
              {profile?.id === selectedPost.author.id && (
                <Popconfirm
                  title="确认删除"
                  description="确定要删除这篇帖子吗？删除后不可恢复。"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => void deletePost(selectedPost.id)}
                >
                  <Button danger style={{ marginLeft: 'auto' }}>删除帖子</Button>
                </Popconfirm>
              )}
            </div>

            <Divider />

            <div className="comm-detail-comments">
              <Text strong className="comm-detail-section-title">评论</Text>
              <List
                dataSource={selectedPostComments}
                locale={{ emptyText: '暂无评论，快来抢沙发' }}
                renderItem={(comment) => (
                  <List.Item className="comm-comment-item">
                    <div className="comm-comment">
                      <Avatar size={28} src={absoluteAssetUrl(comment.author.avatar_url)}>
                        {comment.author.nickname?.[0] ?? '用'}
                      </Avatar>
                      <div className="comm-comment-body">
                        <Text strong className="comm-comment-author">
                          {comment.author.nickname || '匿名'}
                        </Text>
                        <Text className="comm-comment-text">{comment.content}</Text>
                        <Text type="secondary" className="comm-comment-date">
                          {new Date(comment.created_at).toLocaleString()}
                        </Text>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
