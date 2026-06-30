type ApiResult = {
  title: string
  ok: boolean
  data: unknown
}

export function DataPanel({ result }: { result: ApiResult | null }) {
  return (
    <details className="debug-panel">
      <summary>接口返回排查</summary>
      {result ? (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      ) : (
        <p className="muted">正常使用时不用看这里。接口报错或数据异常时，可展开查看最近一次请求结果。</p>
      )}
    </details>
  )
}

export type { ApiResult }
