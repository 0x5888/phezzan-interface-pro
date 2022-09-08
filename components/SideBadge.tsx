import React, { FunctionComponent } from 'react'
import { useTranslation } from 'next-i18next'

type SideBadgeProps = {
  side: string
}

const SideBadge: FunctionComponent<SideBadgeProps> = ({ side }) => {
  const { t } = useTranslation('common')

  return (
    <div
      className={`inline-block h-6 rounded-xl uppercase ${
        side === 'buy' || side === 'long'
          ? 'border border-[#4c4ec253] text-[#4EC253] bg-[#4c4ec253]'
          : 'border border-[#4cde3a3d] text-[#DE3A3D] bg-[#4cde3a3d]'
      }
       -my-0.5 px-1.5 py-0.5 text-xs uppercase`}
    >
      {t(side)}
    </div>
  )
}

export default SideBadge
