import { useCallback, useState } from 'react'
import type { ApiResult } from '../components/DataPanel'

type PageResult<T> = {
  list: T[]
  page: number
  page_size: number
  total: number
}

export function usePage<T>(
  fetchFn: (page: number, pageSize: number) => Promise<{ data: PageResult<T> }>,
  defaultPageSize = 12,
) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<ApiResult | null>(null)

  const load = useCallback(
    async (p?: number, ps?: number) => {
      const targetPage = p ?? page
      const targetPageSize = ps ?? pageSize
      setLoading(true)
      try {
        const response = await fetchFn(targetPage, targetPageSize)
        const data = response.data
        setList(data.list)
        setTotal(data.total)
        setPage(data.page)
        setPageSize(data.page_size)
        setLastResult({ title: '列表数据', ok: true, data })
      } catch (e) {
        setLastResult({ title: '列表数据', ok: false, data: e })
      } finally {
        setLoading(false)
      }
    },
    [fetchFn, page, pageSize],
  )

  function changePage(newPage: number, newPageSize?: number) {
    const ps = newPageSize ?? pageSize
    if (ps !== pageSize) {
      setPageSize(ps)
      setPage(1)
      void load(1, ps)
    } else {
      setPage(newPage)
      void load(newPage, ps)
    }
  }

  return { page, pageSize, total, list, loading, load, changePage, lastResult, setLastResult }
}
