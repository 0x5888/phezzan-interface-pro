import { FunctionComponent } from 'react'
import { PerpMarket } from '@blockworks-foundation/mango-client'
import useMangoStore from '../../stores/useMangoStore'
import { useTranslation } from 'next-i18next'
import { capitalize } from '../../utils'

interface OrderSideTabsProps {
  isSimpleForm?: boolean
  onChange: (x) => void
  side: string
}

const OrderSideTabs: FunctionComponent<OrderSideTabsProps> = ({
  isSimpleForm,
  onChange,
  side,
}) => {
  const { t } = useTranslation('common')
  const market = useMangoStore((s) => s.selectedMarket.current)
  return (
    <div className={`relative mb-3 md:-mt-2.5 md:border-b md:border-th-bkg-3`}>
      <nav className="-mb-px flex space-x-2 bg-[#0A0B0D]" aria-label="Tabs">
        <button
          onClick={() => onChange('buy')}
          className={`default-transition relative flex w-1/2 cursor-pointer
            items-center justify-center whitespace-nowrap py-1 text-sm font-semibold md:text-base md:hover:opacity-100
            ${
              side === 'buy'
                ? `border border-th-green text-th-green`
                : `border border-th-fgd-4 border-transparent text-th-fgd-4`
            }
          `}
        >
          {market instanceof PerpMarket && isSimpleForm ? 'Long' : t('buy')}
        </button>
        <button
          onClick={() => onChange('sell')}
          className={`default-transition relative flex w-1/2 cursor-pointer
            items-center justify-center whitespace-nowrap py-1 text-sm font-semibold md:text-base md:hover:opacity-100
            ${
              side === 'sell'
                ? `border border-th-red text-th-red`
                : `border border-transparent border-th-fgd-4 text-th-fgd-4`
            }
          `}
        >
          {market instanceof PerpMarket && isSimpleForm
            ? capitalize(t('short'))
            : t('sell')}
        </button>
      </nav>
    </div>
  )
}

export default OrderSideTabs
