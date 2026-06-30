import { http } from './http'

export type Address = {
  id: number
  user_id: number
  receiver_name: string
  receiver_mobile: string
  province: string
  city: string
  district?: string | null
  detail_address: string
  is_default: boolean
}

export type AddressPayload = {
  receiver_name: string
  receiver_mobile: string
  province: string
  city: string
  district?: string | null
  detail_address: string
  is_default?: boolean
}

export const addressService = {
  listAddresses() {
    return http.get<unknown, { data: Address[] }>('/addresses')
  },

  createAddress(payload: AddressPayload) {
    return http.post<unknown, { data: Address }>('/addresses', payload)
  },

  updateAddress(addressId: number, payload: Partial<AddressPayload>) {
    return http.put<unknown, { data: Address }>(`/addresses/${addressId}`, payload)
  },

  deleteAddress(addressId: number) {
    return http.delete(`/addresses/${addressId}`)
  },
}
