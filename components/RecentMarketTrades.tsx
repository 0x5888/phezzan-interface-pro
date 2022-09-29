import { useCallback, useEffect, useState } from 'react'
import { ChartTradeType } from '../@types/types'
import useInterval from '../hooks/useInterval'
import ChartApi from '../utils/chartDataConnector'
import { ElementTitle, ElementTitlePP } from './styles'
import { getDecimalCount, isEqual, usdFormatter } from '../utils/index'
import useMangoStore, { CLUSTER } from '../stores/useMangoStore'
import { useViewport } from '../hooks/useViewport'
import { breakpoints } from './TradePageGrid'
import { ExpandableRow } from './TableElements'
import { useTranslation } from 'next-i18next'
import useDeepCompareEffect from 'use-deep-compare-effect'

import {
  marketFillsSelector,
} from '../stores/selectors'

function numStringToSymbol(str, decimals) {
  const lookup = [
    { value: 1e6, symbol: "M" },
    // { value: 1e3, symbol: "k" }, uncomment for thousands abbreviation
  ];

  const item = lookup.find((item) => str >= item.value);

  if (!item) return str;
  return (str / item.value).toFixed(decimals) + item.symbol;
}

export default function RecentMarketTrades() {
  const { t } = useTranslation('common')
  const mangoConfig = useMangoStore((s) => s.selectedMangoGroup.config)
  const marketConfig = useMangoStore((s) => s.selectedMarket.config)
  const { width } = useViewport()
  const isMobile = width ? width < breakpoints.sm : false

  const marketFills = useMangoStore(marketFillsSelector)

  const [fillData, setFillData] = useState<any[]>([])
  const one_day_ago = Date.now() - 86400 * 1000;

  useDeepCompareEffect(() => {
    if (Object.values(marketFills).length > 0) {
      Object.values(marketFills)
        .map((fe) => {
          return fe
        })
        //.filter((fill) => Date.parse(fill[12]) > one_day_ago)
        // @ts-ignore
        .sort((a, b) => b[1] - a[1])
        .forEach((fill) => {
          fillData.push({
            // @ts-ignore
            td1: fill[12], // timestamp
            // @ts-ignore
            td2: Number(fill[4]), // price
            // @ts-ignore
            td3: Number(fill[5]), // amount
            // @ts-ignore
            side: fill[3],
          });
      });

      setFillData(fillData)
    }
  }, [marketFills]);

  return !isMobile ? (
    <>
      <div className="flex items-center justify-between bg-[#1F2025] h-8 pl-7">
        <ElementTitlePP noMarginBottom>{t('recent-trades')}</ElementTitlePP>
      </div>
      
      <div className="px-7 mt-2">
        <div className={`mb-2 grid grid-cols-3 text-xs text-[#818599]`}>
          <div>{`${t('price')} (${mangoConfig.quoteSymbol})`} </div>
          <div className={`text-right`}>
            {t('size')} ({marketConfig.baseSymbol})
          </div>
          <div className={`text-right`}>{t('time')}</div>
        </div>
        {!!fillData.length && (
          <div className="text-xs">
            {fillData.map((trade: ChartTradeType, i: number) => {
              const d = trade

              let time = "--:--:--"
              // @ts-ignore
              if(d.td1) time = new Date(d.td1).toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
              // @ts-ignore
              const price = typeof d.td2 === "number" ? d.td2.toPrecision(6) : d.td2;
              // @ts-ignore
              const amount = typeof d.td3 === "number" ? d.td3.toPrecision(6) : d.td3;

              return (
              <div key={i} className={`grid grid-cols-3 leading-5`}>
                <div
                  className={`${
                    trade.side === 'b' ? `text-th-green` : `text-th-red`
                  }`}
                >
                  {numStringToSymbol(price, 2)}
                </div>
                <div className={`text-right text-[#B6BCD9]`}>
                  {numStringToSymbol(amount, 2)}
                </div>
                <div className={`text-right text-[#B6BCD9]`}>
                  {time}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </>
  ) : (
    <div className="my-3 border-b border-th-bkg-3">
      <ExpandableRow
        buttonTemplate={
          <div className="flex w-full justify-between text-left">
            <div className="text-fgd-1 mb-0.5">{t('recent-trades')}</div>
          </div>
        }
        panelTemplate={
          !!fillData.length && (
            <div className="col-span-2">
              {fillData.map((trade: ChartTradeType, i: number) => {
                const d = trade
                
                const color = d.side === "b" ? "#27302F" : "#2C232D";
                console.log("color_____", color)

                let time = "--:--:--"
                // @ts-ignore
                if(d.td1) time = new Date(d.td1).toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
                // @ts-ignore
                const price = typeof d.td2 === "number" ? d.td2.toPrecision(6) : d.td2;
                // @ts-ignore
                const amount = typeof d.td3 === "number" ? d.td3.toPrecision(6) : d.td3;

                return (
                <div key={i} className={`grid grid-cols-3 text-xs leading-5`}>
                  <div
                    className={`${
                      trade.side === 'b' ? `text-th-green` : `text-th-red`
                    }`}
                  >
                    {numStringToSymbol(price, 2)}
                  </div>
                  <div className={`text-right`}>
                    {numStringToSymbol(amount, 2)}
                  </div>
                  <div className={`text-right text-th-fgd-4`}>
                    {time}
                  </div>
                </div>
              )})}
            </div>
          )
        }
      />
    </div>
  )
}
