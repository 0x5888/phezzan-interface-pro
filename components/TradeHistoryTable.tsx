import { ArrowSmDownIcon } from '@heroicons/react/solid'
import BN from 'bn.js'
import Link from 'next/link'
import { useRouter } from 'next/router'
import SideBadge from './SideBadge'
import Button, { LinkButton } from './Button'
import { useSortableData } from '../hooks/useSortableData'
import { useViewport } from '../hooks/useViewport'
import { breakpoints } from './TradePageGrid'
import {
  Table,
  TableDateDisplay,
  Td,
  Th,
  TrBody,
  TrHead,
} from './TableElements'
import { ExpandableRow } from './TableElements'
import { formatUsdValue } from '../utils'
import { useTranslation } from 'next-i18next'
import Pagination from './Pagination'
import usePagination from '../hooks/usePagination'
import { useEffect, useMemo, useState } from 'react'
import { useFilteredData } from '../hooks/useFilteredData'
import TradeHistoryFilterModal from './TradeHistoryFilterModal'
import {
  FilterIcon,
  InformationCircleIcon,
  RefreshIcon,
  SaveIcon,
} from '@heroicons/react/solid'
import { fetchHourlyPerformanceStats } from './account_page/AccountOverview'
import useMangoStore from '../stores/useMangoStore'
import Loading from './Loading'
import { exportDataToCSV } from '../utils/export'
import Tooltip from './Tooltip'
import { useWallet } from '@solana/wallet-adapter-react'

const formatTradeDateTime = (timestamp: BN | string) => {
  // don't compare to BN because of npm maddness
  // prototypes can be different due to multiple versions being imported
  if (typeof timestamp === 'string') {
    return timestamp
  } else {
    return timestamp.toNumber() * 1000
  }
}

const TradeHistoryTable = ({
  numTrades,
  showActions,
}: {
  numTrades?: number
  showActions?: boolean
}) => {
  const { t } = useTranslation('common')
  const { asPath } = useRouter()
  const { width } = useViewport()
  
  const tradeHistory = [{
    marketName: "BTC-USDC",
    liquidity: "liquidity"
  }]
  const isMobile = width ? width < breakpoints.md : false
  const [filters, setFilters] = useState({})
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [loadExportData, setLoadExportData] = useState(false)

  //const filteredData = useFilteredData(tradeHistory, filters) 
  

  const renderMarketName = (trade: any) => {
    if (
      trade.marketName.includes('PERP') ||
      trade.marketName.includes('USDC')
    ) {
      const location = `/?name=${trade.marketName}`
      if (asPath.includes(location)) {
        return <span>{trade.marketName}</span>
      } else {
        return (
          <Link href={location} shallow={true}>
            <a className="text-th-fgd-1 underline hover:text-th-fgd-1 hover:no-underline">
              {trade.marketName}
            </a>
          </Link>
        )
      }
    } else {
      return <span>{trade.marketName}</span>
    }
  }


  console.log("tradeHistory___", tradeHistory)

  const requestSort = (type: string) => {}
  const sortConfig = {
    key: "marketName",
    direction: "ascending"
  };

  return (
    <>
      <div className={`flex flex-col sm:pb-4`}>
        <div className={`overflow-x-auto`}>
          <div
            className={`inline-block min-w-full align-middle sm:px-6 lg:px-8`}
          >
            {tradeHistory.length > 0 ? (
              !isMobile ? (
                <>
                  <Table>
                    <thead className="h-12">
                      <TrHead>
                        <Th>
                          <LinkButton
                            className="flex items-center no-underline"
                            onClick={() => requestSort('marketName')}
                          >
                            <span className="font-normal">{t('market')}</span>
                            <ArrowSmDownIcon
                              className={`default-transition ml-1 h-4 w-4 flex-shrink-0 ${
                                sortConfig?.key === 'marketName'
                                  ? sortConfig.direction === 'ascending'
                                    ? 'rotate-180 transform'
                                    : 'rotate-360 transform'
                                  : null
                              }`}
                            />
                          </LinkButton>
                        </Th>
                        <Th>
                          <LinkButton
                            className="flex items-center no-underline"
                            onClick={() => requestSort('side')}
                          >
                            <span className="font-normal">{t('side')}</span>
                            <ArrowSmDownIcon
                              className={`default-transition ml-1 h-4 w-4 flex-shrink-0 ${
                                sortConfig?.key === 'side'
                                  ? sortConfig.direction === 'ascending'
                                    ? 'rotate-180 transform'
                                    : 'rotate-360 transform'
                                  : null
                              }`}
                            />
                          </LinkButton>
                        </Th>
                        <Th>
                          <LinkButton
                            className="flex items-center no-underline"
                            onClick={() => requestSort('size')}
                          >
                            <span className="font-normal">{t('size')}</span>
                            <ArrowSmDownIcon
                              className={`default-transition ml-1 h-4 w-4 flex-shrink-0 ${
                                sortConfig?.key === 'size'
                                  ? sortConfig.direction === 'ascending'
                                    ? 'rotate-180 transform'
                                    : 'rotate-360 transform'
                                  : null
                              }`}
                            />
                          </LinkButton>
                        </Th>
                        <Th>
                          <LinkButton
                            className="flex items-center no-underline"
                            onClick={() => requestSort('price')}
                          >
                            <span className="font-normal">{t('price')}</span>
                            <ArrowSmDownIcon
                              className={`default-transition ml-1 h-4 w-4 flex-shrink-0 ${
                                sortConfig?.key === 'price'
                                  ? sortConfig.direction === 'ascending'
                                    ? 'rotate-180 transform'
                                    : 'rotate-360 transform'
                                  : null
                              }`}
                            />
                          </LinkButton>
                        </Th>
                        <Th>
                          <LinkButton
                            className="flex items-center no-underline"
                            onClick={() => requestSort('value')}
                          >
                            <span className="font-normal">{t('value')}</span>
                            <ArrowSmDownIcon
                              className={`default-transition ml-1 h-4 w-4 flex-shrink-0 ${
                                sortConfig?.key === 'value'
                                  ? sortConfig.direction === 'ascending'
                                    ? 'rotate-180 transform'
                                    : 'rotate-360 transform'
                                  : null
                              }`}
                            />
                          </LinkButton>
                        </Th>
                        <Th>
                          <LinkButton
                            className="flex items-center no-underline"
                            onClick={() => requestSort('liquidity')}
                          >
                            <span className="font-normal">
                              {t('liquidity')}
                            </span>
                            <ArrowSmDownIcon
                              className={`default-transition ml-1 h-4 w-4 flex-shrink-0 ${
                                sortConfig?.key === 'liquidity'
                                  ? sortConfig.direction === 'ascending'
                                    ? 'rotate-180 transform'
                                    : 'rotate-360 transform'
                                  : null
                              }`}
                            />
                          </LinkButton>
                        </Th>
                        <Th>
                          <LinkButton
                            className="flex items-center no-underline"
                            onClick={() => requestSort('feeCost')}
                          >
                            <span className="font-normal">{t('fee')}</span>
                            <ArrowSmDownIcon
                              className={`default-transition ml-1 h-4 w-4 flex-shrink-0 ${
                                sortConfig?.key === 'feeCost'
                                  ? sortConfig.direction === 'ascending'
                                    ? 'rotate-180 transform'
                                    : 'rotate-360 transform'
                                  : null
                              }`}
                            />
                          </LinkButton>
                        </Th>
                        <Th>
                          <LinkButton
                            className="flex items-center no-underline"
                            onClick={() => requestSort('loadTimestamp')}
                          >
                            <span className="font-normal">
                              {t('approximate-time')}
                            </span>
                            <ArrowSmDownIcon
                              className={`default-transition ml-1 h-4 w-4 flex-shrink-0 ${
                                sortConfig?.key === 'loadTimestamp'
                                  ? sortConfig.direction === 'ascending'
                                    ? 'rotate-180 transform'
                                    : 'rotate-360 transform'
                                  : null
                              }`}
                            />
                          </LinkButton>
                        </Th>
                      </TrHead>
                    </thead>
                    <tbody>
                      {tradeHistory.map((trade: any) => {
                        return (
                          <TrBody key={`${trade.seqNum}${trade.marketName}`}>
                            <Td className="!py-2 ">
                              <div className="flex items-center">
                                <img
                                  alt=""
                                  width="20"
                                  height="20"
                                  src={`/assets/icons/${trade.marketName
                                    .split(/-|\//)[0]
                                    .toLowerCase()}.svg`}
                                  className={`mr-2.5`}
                                />
                                {renderMarketName(trade)}
                              </div>
                            </Td>
                            <Td className="!py-2 ">
                              <SideBadge side={trade.side} />
                            </Td>
                            <Td className="!py-2 ">{trade.size}</Td>
                            <Td className="!py-2 ">
                              {formatUsdValue(trade.price, trade.symbol)}
                            </Td>
                            <Td className="!py-2 ">
                              {formatUsdValue(trade.value)}
                            </Td>
                            <Td className="!py-2 ">
                              {t(trade.liquidity.toLowerCase())}
                            </Td>
                            <Td className="!py-2 ">
                              {formatUsdValue(trade.feeCost)}
                            </Td>
                            <Td className="!py-2">
                              {trade.loadTimestamp || trade.timestamp ? (
                                <TableDateDisplay
                                  date={formatTradeDateTime(
                                    trade.loadTimestamp || trade.timestamp
                                  )}
                                  showSeconds
                                />
                              ) : (
                                t('recent')
                              )}
                            </Td>
                            <Td className="keep-break w-[0.1%] !py-2">
                              {trade.marketName.includes('PERP') ? (
                                <a
                                  className="text-xs text-th-fgd-4 underline underline-offset-4"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  href={`/account?pubkey=${
                                    trade.liquidity === 'Taker'
                                      ? trade.maker
                                      : trade.taker
                                  }`}
                                >
                                  {t('view-counterparty')}
                                </a>
                              ) : null}
                            </Td>
                          </TrBody>
                        )
                      })}
                    </tbody>
                  </Table>
                  {numTrades && tradeHistory.length > numTrades && (
                    <div className="mt-4 flex items-center justify-center">
                      <Link href="/account" shallow={true}>
                        {t('view-all-trades')}
                      </Link>
                    </div>
                  ) }
                </>
              ) : (null)
            ) :  (
              <div className="w-full rounded-md border border-th-bkg-3 py-6 text-center text-th-fgd-3">
                {t('no-history')}
              </div>
            )}
          </div>
        </div>
      </div>
      {showFiltersModal ? (
        <TradeHistoryFilterModal
          filters={filters}
          setFilters={setFilters}
          isOpen={showFiltersModal}
          onClose={() => setShowFiltersModal(false)}
          showApiWarning={tradeHistory.length > 10000}
        />
      ) : null}
    </>
  )
}

export default TradeHistoryTable
