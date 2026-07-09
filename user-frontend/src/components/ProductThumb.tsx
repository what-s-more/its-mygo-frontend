import { useEffect, useState } from 'react'
import { absoluteAssetUrl } from '../utils/format'

type ProductThumbProps = {
  src?: string | null
  alt: string
  className?: string
  placeholderClassName?: string
}

export function ProductThumb({ src, alt, className, placeholderClassName }: ProductThumbProps) {
  const [failed, setFailed] = useState(false)
  const resolvedSrc = !failed ? absoluteAssetUrl(src) : undefined

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!resolvedSrc) {
    return <span className={placeholderClassName}>暂无图片</span>
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
