import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import useMangoStore, { serumProgramId } from '../stores/useMangoStore'
import {
  getMarketByBaseSymbolAndKind,
  getMarketIndexBySymbol,
} from '@blockworks-foundation/mango-client'
import TradePageGrid from '../components/TradePageGrid'
import useLocalStorageState from '../hooks/useLocalStorageState'
import AlphaModal, { ALPHA_MODAL_KEY } from '../components/AlphaModal'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import IntroTips, { SHOW_TOUR_KEY } from '../components/IntroTips'
import { useViewport } from '../hooks/useViewport'
import { breakpoints } from '../components/TradePageGrid'
import {
  actionsSelector,
  mangoAccountSelector,
  marketConfigSelector,
} from '../stores/selectors'
import { PublicKey } from '@solana/web3.js'
import { useWallet } from '@solana/wallet-adapter-react'
import AccountsModal from 'components/AccountsModal'
import dayjs from 'dayjs'
import { tokenPrecision } from 'utils'
import SerumCompModal, { SEEN_SERUM_COMP_KEY } from 'components/SerumCompModal'

import api from "utils/api";

const DISMISS_CREATE_ACCOUNT_KEY = 'show-create-account'

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, [
        'common',
        'delegate',
        'tv-chart',
        'alerts',
        'share-modal',
        'profile',
      ])),
      // Will be passed to the page component as props
    },
  }
}

const PerpMarket: React.FC = () => {
  const [alphaAccepted] = useLocalStorageState(ALPHA_MODAL_KEY, false)
  const [seenSerumCompInfo, setSeenSerumCompInfo] = useLocalStorageState(
    SEEN_SERUM_COMP_KEY,
    false
  )
  const [showTour] = useLocalStorageState(SHOW_TOUR_KEY, false)
  const [dismissCreateAccount, setDismissCreateAccount] = useLocalStorageState(
    DISMISS_CREATE_ACCOUNT_KEY,
    false
  )
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const { connected } = useWallet()
  const groupConfig = useMangoStore((s) => s.selectedMangoGroup.config)
  const setMangoStore = useMangoStore((s) => s.set)
  const mangoAccount = useMangoStore(mangoAccountSelector)
  const mangoGroup = useMangoStore((s) => s.selectedMangoGroup.current)
  const marketConfig = useMangoStore(marketConfigSelector)
  const actions = useMangoStore(actionsSelector)
  const router = useRouter()
  const [savedLanguage] = useLocalStorageState('language', '')
  const { pubkey } = router.query
  const { width } = useViewport()
  const hideTips = width ? width < breakpoints.md : false

  useEffect(() => {
    dayjs.locale(savedLanguage == 'zh_tw' ? 'zh-tw' : savedLanguage)
  })

  useEffect(() => {
    if (connected && !mangoAccount && !dismissCreateAccount) {
      setShowCreateAccount(true)
    }
  }, [connected, mangoAccount])

  const handleCloseCreateAccount = useCallback(() => {
    setShowCreateAccount(false)
    setDismissCreateAccount(true)
  }, [])

  useEffect(() => {
    async function loadUnownedMangoAccount() {
      if (!pubkey) return
      try {
        const unownedMangoAccountPubkey = new PublicKey(pubkey)
        const mangoClient = useMangoStore.getState().connection.client
        if (mangoGroup) {
          const unOwnedMangoAccount = await mangoClient.getMangoAccount(
            unownedMangoAccountPubkey,
            serumProgramId
          )

          setMangoStore((state) => {
            state.selectedMangoAccount.current = unOwnedMangoAccount
            state.selectedMangoAccount.initialLoad = false
          })
          actions.fetchTradeHistory()
          actions.reloadOrders()
          // setResetOnLeave(true)
        }
      } catch (error) {
        router.push('/account')
      }
    }

    if (pubkey) {
      loadUnownedMangoAccount()
    }
  }, [pubkey, mangoGroup])

  useEffect(() => {
    const name = decodeURIComponent(router.asPath).split('name=')[1]
    const mangoGroup = useMangoStore.getState().selectedMangoGroup.current

    let marketQueryParam, marketBaseSymbol, marketType, newMarket, marketIndex
    if (name && groupConfig) {
      marketQueryParam = name.toString().split(/-|\//)
      marketBaseSymbol = marketQueryParam[0]
      marketType = marketQueryParam[1]?.includes('PERP') ? 'perp' : 'spot'

      newMarket = getMarketByBaseSymbolAndKind(
        groupConfig,
        marketBaseSymbol.toUpperCase(),
        marketType
      )
      marketIndex = getMarketIndexBySymbol(
        groupConfig,
        marketBaseSymbol.toUpperCase()
      )

      if (!newMarket?.baseSymbol) {
        router.push('/')
        return
      }
    }

    if (newMarket?.name === marketConfig?.name) return

    if (name && mangoGroup) {
      const mangoCache = useMangoStore.getState().selectedMangoGroup.cache
      setMangoStore((state) => {
        state.selectedMarket.kind = marketType
        if (newMarket.name !== marketConfig.name) {
          state.selectedMarket.config = newMarket
          state.tradeForm.price = mangoCache
            ? parseFloat(
                mangoGroup.getPrice(marketIndex, mangoCache).toFixed(2)
              )
            : ''
          if (state.tradeForm.quoteSize) {
            state.tradeForm.baseSize = Number(
              (
                state.tradeForm.quoteSize / Number(state.tradeForm.price)
              ).toFixed(tokenPrecision[newMarket.baseSymbol])
            )
          }
        }
      })
    } else if (name && marketConfig) {
      // if mangoGroup hasn't loaded yet, set the marketConfig to the query param if different
      if (newMarket.name !== marketConfig.name) {
        setMangoStore((state) => {
          state.selectedMarket.kind = marketType
          state.selectedMarket.config = newMarket
        })
      }
    }
  }, [router, marketConfig])

  useEffect(() => {
    api.on("message", (operation, args) => {
      console.log("handleMessage___111", operation, args)
      

      if (operation === "lastprice") {
        actions?.gethMarketsInfo(args, operation)
      }

      const mockData = {"op":"liquidity2","args":[1,"ETH-USDC",[["s",1544.9473941316407,0.081196692958],["s",1555.378646665665,0.086624576434],["s",1554.647946439149,0.11926677338893003],["s",1554.8698281432378,1.25],["s",1554.869830086475,1.25],["s",1554.8698320297126,1.25],["s",1554.86983397295,1.25],["s",1556.1561505706989,0.09974081430142799],["s",1556.1577011413979,0.09974081430142799],["s",1556.1592517120973,0.09974081430142799],["s",1556.1608022827963,0.09974081430142799],["s",1556.1623528534953,0.09974081430142799],["s",1556.1639034241944,0.09974081430142799],["s",1556.1654539948938,0.09974081430142799],["s",1556.1670045655928,0.09974081430142799],["s",1556.1685551362918,0.09974081430142799],["s",1556.170105706991,0.09974081430142799],["s",1555.342300227925,11.40378501230665],["s",1555.3423179558501,11.40378501230665],["s",1555.3423356837752,11.40378501230665],["s",1555.3423534117003,11.40378501230665],["s",1555.3795355569823,0.14380271339446],["s",1567.028692490348,0.12688170823],["b",1553.88635496516,0.26241869817765456],["b",1542.1486162300002,0.075],["b",1542.1497821725002,0.075],["b",1542.1509481150001,0.075],["b",1542.1521140575,0.075],["b",1553.82118457594,0.09747999871349544],["b",1554.5558768681599,0.0868607513999093],["b",1554.4652239713641,0.2629816453212744],["b",1553.7873705228546,55.79971658132661],["b",1553.7874572671408,55.79971658132661],["b",1553.7875440114274,55.79971658132661],["b",1553.7876307557137,55.79971658132661],["b",1554.5855136019,0.09318408658175736],["b",1554.58696224171,0.09318408658175736],["b",1554.5884108815198,0.09318408658175736],["b",1554.5898595213298,0.09318408658175736],["b",1554.59130816114,0.09318408658175736],["b",1554.59275680095,0.09318408658175736],["b",1554.5942054407599,0.09318408658175736],["b",1554.59565408057,0.09318408658175736],["b",1554.59710272038,0.09318408658175736],["b",1554.59855136019,0.09318408658175736],["b",1554.310173260975,0.34673125068346],["b",1553.0557211550001,0.075],["b",1553.05688711625,0.075],["b",1553.0580530775,0.075],["b",1553.05921903875,0.075],["b",1554.2224130913903,0.32697056343870273],["b",1554.5191608,0.2],["b",1544.17001213465,0.24912372131869273],["b",1554.54561824674,0.30616729179062474],["b",1554.66218577,0.075],["b",1554.6633518849999,0.075]]]}

      actions?.fetchOrderBook(mockData.args, mockData.op)

      const mockData_market_trades = {"op":"fills","args":[[[1,2868190,"ETH-USDC","b","1672.90",0.013162998891454638,"m",null,"1201850","1016497",null,null]]]}

      actions?.fetchMarketTrades(mockData_market_trades.args, mockData_market_trades.op);
      if (operation === "_liquidity2") {
        actions?.fetchOrderBook(operation, args)
      }

      //console.log("handleMessage___", handleMessage({ operation, args }))
      //store.dispatch(handleMessage({ operation, args }));
    });

    api.start()
  }, [])

  

  return (
    <>
      {showTour && !hideTips ? (
        <IntroTips connected={connected} mangoAccount={mangoAccount} />
      ) : null}
      <TradePageGrid />
      {!alphaAccepted && (
        <AlphaModal isOpen={!alphaAccepted} onClose={() => {}} />
      )}
      {showCreateAccount ? (
        <AccountsModal
          isOpen={showCreateAccount}
          onClose={() => handleCloseCreateAccount()}
        />
      ) : null}
    </>
  )
}

export default PerpMarket
