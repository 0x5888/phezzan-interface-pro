import React, { useMemo, useEffect } from 'react'
import useMangoStore from '../stores/useMangoStore'
import UiLock from './UiLock'
import ManualRefresh from './ManualRefresh'
import useOraclePrice from '../hooks/useOraclePrice'
import DayHighLow from './DayHighLow'
import {
  getPrecisionDigits,
  perpContractPrecision,
  usdFormatter,
} from '../utils'
import { useViewport } from '../hooks/useViewport'
import { breakpoints } from './TradePageGrid'
import { useTranslation } from 'next-i18next'
import SwitchMarketDropdown from './SwitchMarketDropdown'
import Tooltip from './Tooltip'
import { useWallet } from '@solana/wallet-adapter-react'
import { InformationCircleIcon } from '@heroicons/react/solid'
import api from "utils/api";

const OraclePrice = (props) => {
  const oraclePrice = useOraclePrice()
  const selectedMarket = useMangoStore((s) => s.selectedMarket.current)

  const decimals = useMemo(
    () =>
      selectedMarket?.tickSize !== undefined
        ? getPrecisionDigits(selectedMarket?.tickSize)
        : null,
    [selectedMarket]
  )

  let className = "text-th-fgd-1 md:text-xs text-[#ffffff] text-base"

  if (props.className) {
    className = props.className
  }

  return (
    <div className={className}>
      {decimals && oraclePrice && selectedMarket
        ? oraclePrice.toNumber().toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        : '--'}
    </div>
  )
}

const MarketDetails = () => {
  const { t } = useTranslation('common')
  const { connected } = useWallet()
  const marketConfig = useMangoStore((s) => s.selectedMarket.config)
  const baseSymbol = marketConfig.baseSymbol
  const selectedMarketName = marketConfig.name
  const isPerpMarket = marketConfig.kind === 'perp'

  const { width } = useViewport()
  const isMobile = width ? width < breakpoints.sm : false

  const marketsInfo = useMangoStore((s) => s.marketsInfo)

  const market = useMemo(
    () => marketsInfo.find((market) => market.name === selectedMarketName),
    [marketsInfo, selectedMarketName]
  )

  const marketName = market?.baseSymbol;

  useEffect(() => {
    if (marketName) {
      api.subscribeToMarket(`${marketName.baseSymbol}-USDC`);
    }
    
  }, [marketName])

  console.log("market____111", api.marketInfo)

  return (
    <div
      className={`relative flex flex-col md:px-3 md:pt-3 md:pb-2 lg:flex-row lg:items-end lg:justify-between`}
    >
      <div className="flex flex-col lg:flex-row lg:flex-wrap">
        <div className="hidden md:block md:pr-6 lg:pb-0">
          <div className="flex">
            <SwitchMarketDropdown />
          </div>
        </div>
        <div className="grid grid-flow-row grid-cols-1 gap-2 md:grid-cols-3 md:pr-20 lg:grid-flow-col lg:grid-cols-none lg:grid-rows-1 lg:gap-10">
          <div className="h-full flex justify-center font-semibold text-2xl text-white">
            <OraclePrice className="font-semibold text-2xl" />
          </div>
          <div className="flex items-center justify-between md:block">
            <div className="text-th-fgd-3 text-xs md:pb-0.5 md:text-[0.65rem]">
              Mark Price
            </div>
            {market?.markPrice || "--"}
          </div>
          <div className="flex items-center justify-between md:block">
            <div className="text-th-fgd-3 text-xs md:pb-0.5 md:text-[0.65rem]">
              Index Price
            </div>
            <OraclePrice />
          </div>
          {market ? (
            <>
              <div className="flex items-center justify-between md:block">
                <div className="text-th-fgd-3 text-xs md:pb-0.5 md:text-[0.65rem]">
                  {t('rolling-change')}
                </div>
                <div
                  className={`md:text-xs ${
                    market.change24h > 0
                      ? `text-th-green`
                      : market.change24h < 0
                      ? `text-th-red`
                      : `text-[#ffffff]`
                  }`}
                >
                  {(market.change24h * 100).toFixed(2) + '%'}
                </div>
              </div>
              {isPerpMarket ? (
                <>
                  <div className="flex items-center justify-between md:block">
                    <div className="text-th-fgd-3 text-xs md:pb-0.5 md:text-[0.65rem]">
                      {t('daily-volume')}
                    </div>
                    <div className="text-th-fgd-1 md:text-xs text-[#ffffff]">
                      {usdFormatter(market?.volumeUsd24h, 0)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:block">
                    <div className="flex items-center text-xs text-th-fgd-3 md:pb-0.5 md:text-[0.65rem]">
                      {t('average-funding')}
                      <Tooltip
                        content={t('tooltip-funding')}
                        placement={'bottom'}
                      >
                        <InformationCircleIcon className="ml-1.5 h-4 w-4 text-th-fgd-4 hover:cursor-help" />
                      </Tooltip>
                    </div>
                    <div className="text-th-fgd-1 md:text-xs text-[#ffffff]">
                      {`${market?.funding1h?.toFixed(4)}% (${(
                        market?.funding1h *
                        24 *
                        365
                      ).toFixed(2)}% APR)`}
                    </div>
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <>
              <MarketDataLoader />
              <MarketDataLoader />
              {isPerpMarket ? (
                <>
                  <MarketDataLoader />
                  <MarketDataLoader />
                  <MarketDataLoader />
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
      <div className="absolute right-0 bottom-0 flex items-center justify-end space-x-2 sm:bottom-auto lg:right-3">
        {!isMobile ? (
          <div id="layout-tip">
            <UiLock />
          </div>
        ) : null}
        <div id="data-refresh-tip">
          {!isMobile && connected ? <ManualRefresh /> : null}
        </div>
      </div>
    </div>
  )
}

export default MarketDetails

export const MarketDataLoader = ({ width }: { width?: string }) => (
  <div
    className={`mt-0.5 h-8 ${
      width ? width : 'w-24'
    } animate-pulse rounded bg-th-bkg-3`}
  />
)
