import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { ExclamationIcon, PencilIcon } from '@heroicons/react/solid'
import { ZERO_I80F48 } from '@blockworks-foundation/mango-client'
import useMangoStore from '../stores/useMangoStore'
import Button, { LinkButton } from '../components/Button'
import { useViewport } from '../hooks/useViewport'
import { breakpoints } from './TradePageGrid'
import { ExpandableRow, Table, Td, Th, TrBody, TrHead } from './TableElements'
import {
  formatUsdValue,
  getPrecisionDigits,
  roundPerpSize,
  usdFormatter,
} from '../utils'
import Loading from './Loading'
import MarketCloseModal from './MarketCloseModal'
import PerpSideBadge from './PerpSideBadge'
import PnlText from './PnlText'
import { settlePnl } from './MarketPosition'
import MobileTableHeader from './mobile/MobileTableHeader'
import ShareModal from './ShareModal'
import { TwitterIcon } from './icons'
import { marketSelector } from '../stores/selectors'
import { useWallet } from '@solana/wallet-adapter-react'
import RedeemButtons from './RedeemButtons'
import Tooltip from './Tooltip'
import useMangoAccount from 'hooks/useMangoAccount'
import useLocalStorageState from 'hooks/useLocalStorageState'
import EditTableColumnsModal from './EditTableColumnsModal'

import api from "utils/api";

const TABLE_COLUMNS = {
  market: true,
  side: true,
  'position-size': true,
  'notional-size': true,
  'average-entry': true,
  'break-even': true,
  'estimated-liq-price': true,
  'unrealized-pnl': true,
  'unsettled-balance': true,
}

const PERP_TABLE_COLUMNS_KEY = 'perpPositionTableColumns'

const PositionsTable: React.FC = () => {
  const { t } = useTranslation('common')
  const [showShareModal, setShowShareModal] = useState(false)
  const [showMarketCloseModal, setShowMarketCloseModal] = useState(false)
  const [positionToClose, setPositionToClose] = useState<any>(null)
  const [isLoading, setLoading] = useState<boolean>(false)
  const [positionToShare, setPositionToShare] = useState<any>(null)
  const [settleSinglePos, setSettleSinglePos] = useState(null)
  const market = useMangoStore(marketSelector)
  const { wallet } = useWallet()
  const price = useMangoStore((s) => s.tradeForm.price)
  const setMangoStore = useMangoStore((s) => s.set)
  let openPositions = useMangoStore(
    (s) => s.selectedMangoAccount.openPerpPositions
  )

  const [has, setHas] = useLocalStorageState('positions', false)

  if (has == 1) {
    // @ts-ignore
    openPositions = [1]
  } else {
    openPositions = []
  }
  

  const unsettledPositions =
    useMangoStore.getState().selectedMangoAccount.unsettledPerpPositions
  const mangoGroup = useMangoStore((s) => s.selectedMangoGroup.current)
  const mangoCache = useMangoStore((s) => s.selectedMangoGroup.cache)
  const { mangoAccount } = useMangoAccount()
  const { width } = useViewport()
  const isMobile = width ? width < breakpoints.md : false
  const { asPath } = useRouter()
  const [tableColumnsToShow] = useLocalStorageState(
    PERP_TABLE_COLUMNS_KEY,
    TABLE_COLUMNS
  )
  const [showEditTableColumns, setShowEditTableColumns] = useState(false)

  useEffect(() => {
    if (positionToShare) {
      const updatedPosition = openPositions.find(
        (p) => p.marketConfig === positionToShare.marketConfig
      )
      setPositionToShare(updatedPosition)
    }
  }, [openPositions])

  useEffect(() => {
    if (positionToClose) {
      const updatedPosition = openPositions.find(
        (p) => p.marketConfig === positionToClose.marketConfig
      )
      if (updatedPosition) {
        setPositionToClose(updatedPosition)
      }
    }
  }, [openPositions])

  const handleCloseWarning = useCallback(() => {
    setShowMarketCloseModal(false)
    setPositionToClose(null)
  }, [])

  const handleSizeClick = (size, indexPrice) => {
    const sizePrecisionDigits = getPrecisionDigits(market!.minOrderSize)
    const priceOrDefault = price ? price : indexPrice
    const roundedSize = parseFloat(Math.abs(size).toFixed(sizePrecisionDigits))
    const quoteSize = parseFloat((roundedSize * priceOrDefault).toFixed(2))
    setMangoStore((state) => {
      state.tradeForm.baseSize = roundedSize
      state.tradeForm.quoteSize = quoteSize
      state.tradeForm.side = size > 0 ? 'sell' : 'buy'
    })
  }

  const handleCloseShare = useCallback(() => {
    setShowShareModal(false)
    setPositionToShare(null)
  }, [])

  const handleShowShare = (position) => {
    setPositionToShare(position)
    setShowShareModal(true)
  }

  const handleShowMarketCloseModal = (position) => {
    setPositionToClose(position)
    setShowMarketCloseModal(true)
  }

  const handleSettlePnl = async (perpMarket, perpAccount, index) => {
    if (wallet) {
      setSettleSinglePos(index)
      await settlePnl(perpMarket, perpAccount, t, undefined, wallet)
      setSettleSinglePos(null)
    }
  }

  const unsettledSum = useMemo(() => {
    if (unsettledPositions.length > 1) {
      return unsettledPositions.reduce((a, c) => a + c.unsettledPnl, 0)
    }
    return
  }, [unsettledPositions])

  return (
    <div className="flex flex-col bg-[#0A0B0D]">
      {unsettledPositions.length > 0 ? (
        <div className="mb-6 rounded-lg border border-th-bkg-3 p-4 sm:p-6">
          <div className="flex items-start justify-between pb-4">
            <div className="flex items-center">
              <ExclamationIcon className="mr-2 h-6 w-6 flex-shrink-0 text-th-primary" />
              <h3>
                {t('unsettled-positions')}{' '}
                {unsettledSum ? (
                  <div
                    className={
                      unsettledSum >= 0 ? 'text-th-green' : 'text-th-red'
                    }
                  >
                    {formatUsdValue(unsettledSum)}
                  </div>
                ) : null}
              </h3>
            </div>

            {unsettledPositions.length > 1 ? <RedeemButtons /> : null}
          </div>
          <div className="grid grid-flow-row grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {unsettledPositions.map((p, index) => {
              return (
                <div
                  className="col-span-1 flex items-center justify-between rounded-full bg-th-bkg-2 px-5 py-3"
                  key={p.marketConfig.baseSymbol}
                >
                  <div className="flex space-x-2">
                    <div className="flex items-center">
                      <img
                        alt=""
                        width="20"
                        height="20"
                        src={`/assets/icons/${p.marketConfig.baseSymbol.toLowerCase()}.svg`}
                        className={`mr-3`}
                      />
                      <div>
                        <p className="mb-0 text-xs text-th-fgd-1">
                          {p.marketConfig.name}
                        </p>
                        <PnlText className="font-bold" pnl={p.unsettledPnl} />
                      </div>
                    </div>
                  </div>
                  {settleSinglePos === index ? (
                    <Loading />
                  ) : (
                    <LinkButton
                      className="text-xs"
                      onClick={() =>
                        handleSettlePnl(p.perpMarket, p.perpAccount, index)
                      }
                    >
                      {t('redeem-pnl')}
                    </LinkButton>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
      <div className={`md:overflow-x-auto`}>
        <div className={`inline-block min-w-full align-middle`}>
          {openPositions.length ? (
            !isMobile ? (
              <div className="flex pt-5 px-6 justify-between">
                <div className="flex w-80 flex-col items-center">
                  <div className="flex w-full pb-5 justify-between border-b border-[#373C52]">
                    <div className="flex">
                      <img
                        alt=""
                        width="30"
                        height="30"
                        src={`/assets/icons/eth.svg`}
                        className={`mr-3`}
                      />
                      <div>
                        <p className="mb-0 text-lg font-medium text-[#FFFFFF]">
                          10 ETH
                        </p>
                        <PnlText className="font-bold" pnl={16301} />
                      </div>
                  </div>
                  <div className="flex">
                    <PerpSideBadge long/>
                  </div>
                  </div>

                  <div className="flex w-full justify-between mt-5 pb-5 border-b border-[#373C52]">
                    <div className="flex flex-col">
                      <div>Profit/Loss</div>
                      <PnlText className="font-bold mt-2" pnl={284.163} />
                    </div>
                    <div className="flex flex-col">
                      <div>Avg.Open Price</div>
                      <div className="mt-2">1630.1</div>
                    </div>
                  </div>
                  
                  <button
                      className="flex w-80 h-10 mt-5 items-center justify-center text-sm font-medium rounded-2xl text-[#0F1429]  bg-[#00CAD9]  hover:cursor-pointer focus:outline-none"
                      onClick={async () => {
                        setLoading(true)
                        try {
                          await api.approveExchangeContract(
                            "USDC",
                            0 // amount = 0 ==> MAX_ALLOWANCE
                          );
                        } catch (e) {
                          console.log("ERR____", e);
                          //toast.error(e.message);
                        }
                        setTimeout(() => {
                          setLoading(false);
                          setHas(0)
                        }, 3000);
                      }}
                  >
                      {isLoading ? "Loading..." : "Close Position"}
                  </button>
                </div>

                <div className="flex w-60 flex-col items-center">
                  <div className="w-full mt-2.5 text-xs text-[#FFFFFF]">Position Info</div>
                  <div className="w-full mt-5 flex justify-between text-xs text-[#8D8E99]">
                    <div>Liquidation Price</div>
                    <div>---</div>
                  </div>

                  <div className="w-full mt-5 flex justify-between text-xs text-[#8D8E99]">
                    <div>Account Margin Ratio</div>
                    <div className="text-xs text-[#FFFFFF]">161.53%</div>
                  </div>

                  <div className="w-full mt-5 flex justify-between text-xs text-[#8D8E99]">
                    <div>Account Leverage</div>
                    <div className="text-xs text-[#FFFFFF]">2X</div>
                  </div>


                  <a
                    className="h-8 mt-6 self-start text-[#00D1E0] hover:text-[#FFFFFF]"
                    href="https://docs.mango.markets/mango/account-delegation"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Funding Payment History
                  </a>
                </div>
                
                
              </div>
            ) : (
              <div className="border-b border-th-bkg-4">
                <MobileTableHeader
                  colOneHeader={t('market')}
                  colTwoHeader={t('unrealized-pnl')}
                />
                {openPositions.map(
                  (
                    {
                      marketConfig,
                      basePosition,
                      notionalSize,
                      avgEntryPrice,
                      breakEvenPrice,
                      perpAccount,
                      perpMarket,
                      unrealizedPnl,
                      unsettledPnl,
                    },
                    index
                  ) => {
                    const basePositionUi = roundPerpSize(
                      basePosition,
                      marketConfig.baseSymbol
                    )
                    const liquidationPrice =
                      mangoGroup &&
                      mangoAccount &&
                      marketConfig &&
                      mangoGroup &&
                      mangoCache
                        ? mangoAccount.getLiquidationPrice(
                            mangoGroup,
                            mangoCache,
                            marketConfig.marketIndex
                          )
                        : undefined
                    return (
                      <ExpandableRow
                        buttonTemplate={
                          <>
                            <div className="text-fgd-1 flex w-full items-center justify-between">
                              <div className="flex items-center">
                                <img
                                  alt=""
                                  width="20"
                                  height="20"
                                  src={`/assets/icons/${marketConfig.baseSymbol.toLowerCase()}.svg`}
                                  className={`mr-2.5`}
                                />
                                <div>
                                  <div className="mb-0.5 text-left">
                                    {marketConfig.name}
                                  </div>
                                  <div className="text-xs text-th-fgd-3">
                                    <span
                                      className={`mr-1 ${
                                        basePosition > 0
                                          ? 'text-th-green'
                                          : 'text-th-red'
                                      }`}
                                    >
                                      {basePosition > 0
                                        ? t('long').toUpperCase()
                                        : t('short').toUpperCase()}
                                    </span>
                                    {basePositionUi}
                                  </div>
                                </div>
                              </div>
                              {breakEvenPrice ? (
                                <PnlText pnl={unrealizedPnl} />
                              ) : (
                                '--'
                              )}
                            </div>
                          </>
                        }
                        key={`${index}`}
                        panelTemplate={
                          <div className="grid grid-flow-row grid-cols-2 gap-4">
                            <div className="col-span-1 text-left">
                              <div className="pb-0.5 text-xs text-th-fgd-3">
                                {t('average-entry')}
                              </div>
                              {avgEntryPrice
                                ? formatUsdValue(avgEntryPrice)
                                : '--'}
                            </div>
                            <div className="col-span-1 text-left">
                              <div className="pb-0.5 text-xs text-th-fgd-3">
                                {t('notional-size')}
                              </div>
                              {formatUsdValue(notionalSize)}
                            </div>
                            <div className="col-span-1 text-left">
                              <div className="pb-0.5 text-xs text-th-fgd-3">
                                {t('break-even')}
                              </div>
                              {breakEvenPrice
                                ? formatUsdValue(breakEvenPrice)
                                : '--'}
                            </div>
                            <div className="col-span-1 text-left">
                              <div className="pb-0.5 text-xs text-th-fgd-3">
                                {t('unsettled-balance')}
                              </div>
                              {unsettledPnl ? (
                                settleSinglePos === index ? (
                                  <Loading />
                                ) : (
                                  <Tooltip content={t('redeem-pnl')}>
                                    <LinkButton
                                      className={`font-bold ${
                                        unsettledPnl >= 0
                                          ? 'text-th-green'
                                          : 'text-th-red'
                                      }`}
                                      onClick={() =>
                                        handleSettlePnl(
                                          perpMarket,
                                          perpAccount,
                                          index
                                        )
                                      }
                                      disabled={unsettledPnl === 0}
                                    >
                                      {formatUsdValue(unsettledPnl)}
                                    </LinkButton>
                                  </Tooltip>
                                )
                              ) : (
                                '--'
                              )}
                            </div>
                            <div className="col-span-1 text-left">
                              <div className="pb-0.5 text-xs text-th-fgd-3">
                                {t('estimated-liq-price')}
                              </div>
                              {liquidationPrice &&
                              liquidationPrice.gt(ZERO_I80F48)
                                ? usdFormatter(liquidationPrice)
                                : 'N/A'}
                            </div>
                            <div className="col-span-2">
                              <Button
                                className="w-full"
                                primary={false}
                                onClick={() =>
                                  handleShowMarketCloseModal(
                                    openPositions[index]
                                  )
                                }
                              >
                                {t('market-close')}
                              </Button>
                            </div>
                          </div>
                        }
                      />
                    )
                  }
                )}
              </div>
            )
          ) : (
            <div
              className={`w-full rounded-md border border-th-bkg-3 py-6 text-center text-th-fgd-3`}
            >
              {t('no-perp')}
            </div>
          )}
        </div>
      </div>
      {showShareModal ? (
        <ShareModal
          isOpen={showShareModal}
          onClose={handleCloseShare}
          position={positionToShare!}
        />
      ) : null}
      {showMarketCloseModal ? (
        <MarketCloseModal
          isOpen={showMarketCloseModal}
          onClose={handleCloseWarning}
          position={positionToClose!}
        />
      ) : null}
      {showEditTableColumns ? (
        <EditTableColumnsModal
          isOpen={showEditTableColumns}
          onClose={() => setShowEditTableColumns(false)}
          columns={tableColumnsToShow}
          storageKey={PERP_TABLE_COLUMNS_KEY}
        />
      ) : null}
    </div>
  )
}

export default PositionsTable
