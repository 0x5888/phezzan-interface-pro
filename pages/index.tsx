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

    console.log("name___mangoGroup___", name, mangoGroup)

    if (name && marketConfig && marketConfig.name !== name) {
      console.log("name___mangoGroup___ update")
      const CONFIG = {
        kind: "perp",
        name: name,
        //"publicKey": "2TgaaVoHgnSeEtXvWTx13zQeTf4hYWAMEiMQdcG6EwHi",
        baseSymbol: (name.split("-"))[0].toUpperCase(),
        baseDecimals: 9,
        quoteDecimals: 6,
        marketIndex: 3,
        //"bidsKey": "Fu8q5EiFunGwSRrjFKjRUoMABj5yCoMEPccMbUiAT6PD",
        //"asksKey": "9qUxMSWBGAeNmXusQHuLfgSuYJqADyYoNLwZ63JJSi6V",
        //"eventsKey": "31cKs646dt1YkA3zPyxZ7rUAkxTBz279w4XEobFXcAKP"
      }
      setMangoStore((state) => {
        state.selectedMarket.kind = "perp"
        state.selectedMarket.config = CONFIG
      })
    }
    if (name && groupConfig) {
      marketQueryParam = name.toString().split(/-|\//)
      marketBaseSymbol = marketQueryParam[0]
      marketType = marketQueryParam[1]?.includes('PERP') ? 'perp' : 'spot'

      // newMarket = getMarketByBaseSymbolAndKind(
      //   groupConfig,
      //   marketBaseSymbol.toUpperCase(),
      //   marketType
      // )
      //marketIndex = getMarketIndexBySymbol(
      //  groupConfig,
      //  marketBaseSymbol.toUpperCase()
      //)

      //if (!newMarket?.baseSymbol) {
      //  router.push('/')
      //  return
      //}
    }

    //if (newMarket?.name === marketConfig?.name) return

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
      if (newMarket?.name !== marketConfig?.name) {
        //setMangoStore((state) => {
        //  state.selectedMarket.kind = marketType
        //  state.selectedMarket.config = newMarket
        //})
      }
    }
  }, [router, marketConfig])

  useEffect(() => {
    api.on("message", (operation, args) => {     
      console.log("operation___11", operation, args)
      if (operation == "err" && args[0] == "login") {
        const MOCK_USER = {
          "user": {
            "id":"0x21EfC0BD5D286dd20747516abdEF8ec52f378058",
            "address":"0x21EfC0BD5D286dd20747516abdEF8ec52f378058",
            "committed": {"balances":{}},
            "profile":{
              "description": null,
              "website": null,
              "image":"data:imagepng;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAALxJREFUWEdj9N7Q9J8BCWyRM0DmUp3t8+gCipmMow4Y8BDQf1KOkgZkznCjxBF6mkCPQ/REQkj9E5OvqGlg1AEDHgIDnghHHTDoQgA9n154ZY2Sbw3EjuKtHwipRy9nMOqCUQcMeAgQKstJbSAQMo9ge4BQ5UPIQaMOIBgC89tQmkPoOdz9HxNKMjR5QmZxzjqgEEXAujZjlAiIrVNiG4eRhoYdQDdQwC9QUIoTkltDxAqyjHqglEH0DsEAGzHISBYya6AAAAAElFTkSuQmCC",
              "address":"0x21EfC0BD5D286dd20747516abdEF8ec52f378058",
              "name":"0x21Ef…378058"
            }
          },
          "_persist": {
            "version": -1,
            "rehydrated": true
          }
        }
      }

      if (operation === "lastprice") {
        actions?.gethMarketsInfo(args, operation)
      }

      const mockData = {"op":"liquidity2","args":[1,"ETH-USDC",[["s",1544.9473941316407,0.081196692958],["s",1555.378646665665,0.086624576434],["s",1554.647946439149,0.11926677338893003],["s",1554.8698281432378,1.25],["s",1554.869830086475,1.25],["s",1554.8698320297126,1.25],["s",1554.86983397295,1.25],["s",1556.1561505706989,0.09974081430142799],["s",1556.1577011413979,0.09974081430142799],["s",1556.1592517120973,0.09974081430142799],["s",1556.1608022827963,0.09974081430142799],["s",1556.1623528534953,0.09974081430142799],["s",1556.1639034241944,0.09974081430142799],["s",1556.1654539948938,0.09974081430142799],["s",1556.1670045655928,0.09974081430142799],["s",1556.1685551362918,0.09974081430142799],["s",1556.170105706991,0.09974081430142799],["s",1555.342300227925,11.40378501230665],["s",1555.3423179558501,11.40378501230665],["s",1555.3423356837752,11.40378501230665],["s",1555.3423534117003,11.40378501230665],["s",1555.3795355569823,0.14380271339446],["s",1567.028692490348,0.12688170823],["b",1553.88635496516,0.26241869817765456],["b",1542.1486162300002,0.075],["b",1542.1497821725002,0.075],["b",1542.1509481150001,0.075],["b",1542.1521140575,0.075],["b",1553.82118457594,0.09747999871349544],["b",1554.5558768681599,0.0868607513999093],["b",1554.4652239713641,0.2629816453212744],["b",1553.7873705228546,55.79971658132661],["b",1553.7874572671408,55.79971658132661],["b",1553.7875440114274,55.79971658132661],["b",1553.7876307557137,55.79971658132661],["b",1554.5855136019,0.09318408658175736],["b",1554.58696224171,0.09318408658175736],["b",1554.5884108815198,0.09318408658175736],["b",1554.5898595213298,0.09318408658175736],["b",1554.59130816114,0.09318408658175736],["b",1554.59275680095,0.09318408658175736],["b",1554.5942054407599,0.09318408658175736],["b",1554.59565408057,0.09318408658175736],["b",1554.59710272038,0.09318408658175736],["b",1554.59855136019,0.09318408658175736],["b",1554.310173260975,0.34673125068346],["b",1553.0557211550001,0.075],["b",1553.05688711625,0.075],["b",1553.0580530775,0.075],["b",1553.05921903875,0.075],["b",1554.2224130913903,0.32697056343870273],["b",1554.5191608,0.2],["b",1544.17001213465,0.24912372131869273],["b",1554.54561824674,0.30616729179062474],["b",1554.66218577,0.075],["b",1554.6633518849999,0.075]]]}

      //actions?.fetchOrderBook(mockData.args, mockData.op)

    

      const mockData_market_trades = {
        "op": "fills",
        "args": [
            [
                [
                    1,
                    2967138,
                    "WBTC-USDC",
                    "s",
                    18478.408406790637,
                    0.00530066,
                    "f",
                    "49dc9786af41eb3db8dbc028f9c2b56479210850fdde2588c6596405a0137276",
                    "1215331",
                    "881179",
                    0.0000010395,
                    "WBTC",
                    "2022-09-19T08:35:06.581Z"
                ],
                [
                    1,
                    2967022,
                    "WBTC-USDC",
                    "b",
                    18499.774300035722,
                    0.00254738,
                    "f",
                    "4b55b0a4e5c09c6b85e0761d2d9456467750098b89b4b9880e0bbaca517f5c29",
                    "1119027",
                    "1066910",
                    0.020286,
                    "USDC",
                    "2022-09-19T08:25:22.371Z"
                ],
                [
                    1,
                    2966995,
                    "WBTC-USDC",
                    "b",
                    18495.410734343222,
                    0.00131751,
                    "f",
                    "4e3c30b5573d64ecfdcf7418f4a985903fd97e7d2b84d0220230cf63b5675e38",
                    "1119027",
                    "1066910",
                    0.020727,
                    "USDC",
                    "2022-09-19T08:22:56.058Z"
                ],
                [
                    1,
                    2966573,
                    "WBTC-USDC",
                    "b",
                    18430.392921572722,
                    0.01356267,
                    "f",
                    "88a2ed2ad77b152e8eab5b9029a2a75d368226fce67d7cb88b3db948e010a4ec",
                    "950631",
                    "1066910",
                    0.0185115,
                    "USDC",
                    "2022-09-19T07:35:58.477Z"
                ],
                [
                    1,
                    2966532,
                    "WBTC-USDC",
                    "b",
                    18443.76734296067,
                    0.01355241,
                    "f",
                    "c5370e959190afa57b61217b5b4bcda89f8689170eef8096eabd7876fe28196a",
                    "950631",
                    "1066910",
                    0.0174195,
                    "USDC",
                    "2022-09-19T07:29:26.552Z"
                ],
                [
                    1,
                    2966476,
                    "WBTC-USDC",
                    "b",
                    18484.846413278094,
                    0.01352228,
                    "f",
                    "e5db5f619fdb8dd1e7fff78cf5b36166890e4450a79b9a1aaf04e5b708a982d0",
                    "950631",
                    "881179",
                    0.0177765,
                    "USDC",
                    "2022-09-19T07:21:44.664Z"
                ],
                [
                    1,
                    2966469,
                    "WBTC-USDC",
                    "b",
                    18472.174297528887,
                    0.13130864,
                    "f",
                    "7639fc7a66833d54a9240b56b50f421ce222024417fef05c69b9aac210ff5c99",
                    "1066910",
                    "881179",
                    0.0177765,
                    "USDC",
                    "2022-09-19T07:20:36.413Z"
                ],
                [
                    1,
                    2966237,
                    "WBTC-USDC",
                    "s",
                    18413.242254237266,
                    0.00303772,
                    "f",
                    "8ac826cdaca57f68ba3100a40a0ca7492f496bda5a24837e57278a4a744dfc3e",
                    "1214967",
                    "881179",
                    0.000001092,
                    "WBTC",
                    "2022-09-19T07:09:39.121Z"
                ],
                [
                    1,
                    2966230,
                    "WBTC-USDC",
                    "b",
                    18443.129551110702,
                    0.00303742,
                    "f",
                    "969d1e14e93e5bfe101e57e0b5f46642c500a544e591dd859fe5db0776b12d22",
                    "1214967",
                    "1066910",
                    0.0202965,
                    "USDC",
                    "2022-09-19T07:09:30.481Z"
                ],
                [
                    1,
                    2966207,
                    "WBTC-USDC",
                    "s",
                    18432.8740439372,
                    0.00305973,
                    "f",
                    "f78e1ccd0af24096cc471660a1676f16e5e96f47acd3122dcfa429fcb9b2d79d",
                    "1214967",
                    "881179",
                    0.000001092,
                    "WBTC",
                    "2022-09-19T07:08:20.589Z"
                ],
                [
                    1,
                    2966203,
                    "WBTC-USDC",
                    "b",
                    18435.462052313764,
                    0.01355836,
                    "f",
                    "da4c84b0cd0676b251bb9a95966ebd7147d8e6d7f6706873761964a0362ce34b",
                    "950631",
                    "1066910",
                    0.0202965,
                    "USDC",
                    "2022-09-19T07:07:58.492Z"
                ],
                [
                    1,
                    2966199,
                    "WBTC-USDC",
                    "b",
                    18437.26632307052,
                    0.04880824,
                    "f",
                    "9d4ee0249df8dbb668827971e37708f27e78f880c265d41b63d8995730cbc217",
                    "1105359",
                    "881179",
                    0.0202965,
                    "USDC",
                    "2022-09-19T07:07:46.563Z"
                ],
                [
                    1,
                    2966198,
                    "WBTC-USDC",
                    "s",
                    18420.827951775143,
                    0.00306557,
                    "f",
                    "5e28623a84aa2da1fe5e06ed5a1327e21b97363dd19d8b0d1054d733a4b959a0",
                    "1214967",
                    "881179",
                    0.000001092,
                    "WBTC",
                    "2022-09-19T07:07:41.843Z"
                ],
                [
                    1,
                    2966194,
                    "WBTC-USDC",
                    "b",
                    18435.550811105273,
                    0.00306526,
                    "f",
                    "f623b4ee69928c693289c1d6fe7b439e294fca295c1732810f4adc3017f103bb",
                    "1214967",
                    "1066910",
                    0.0202965,
                    "USDC",
                    "2022-09-19T07:07:33.493Z"
                ],
                [
                    1,
                    2965975,
                    "WBTC-USDC",
                    "s",
                    18492.43963910754,
                    0.00340082,
                    "f",
                    "5ea39dc3c1f9c67518dd01984804739dd882b38d162bd6ce05a37c5649dc2eb4",
                    "1214986",
                    "881179",
                    0.0000010815,
                    "WBTC",
                    "2022-09-19T06:57:22.857Z"
                ],
                [
                    1,
                    2965961,
                    "WBTC-USDC",
                    "b",
                    18515.52552031569,
                    0.00340048,
                    "f",
                    "7cc8675bd902ff6c583b5ada1f4213bc8033fcea916b80a0f622cf7a45c2d082",
                    "1214986",
                    "1066910",
                    0.0213885,
                    "USDC",
                    "2022-09-19T06:57:06.667Z"
                ],
                [
                    1,
                    2965914,
                    "WBTC-USDC",
                    "s",
                    18466.417264785785,
                    0.00345136,
                    "f",
                    "e85895e16f4f7353df11629358e72453c23ca5c0c4e299d2abbb26fc102f53ee",
                    "1214986",
                    "881179",
                    0.000001239,
                    "WBTC",
                    "2022-09-19T06:53:51.508Z"
                ],
                [
                    1,
                    2965913,
                    "WBTC-USDC",
                    "b",
                    18499.961174725326,
                    0.00345101,
                    "f",
                    "3e812d13205fabf1e2d1b427a2050066c4903948a8bd551022d48c581dd324ba",
                    "1214986",
                    "1066910",
                    0.0231,
                    "USDC",
                    "2022-09-19T06:53:43.437Z"
                ],
                [
                    1,
                    2965909,
                    "WBTC-USDC",
                    "b",
                    18470.558484684894,
                    0.02522682,
                    "f",
                    "d28ff62fab74ea2cec8da31af55da80a58039f67939268fc2be6bd0982c42305",
                    "1097393",
                    "1066910",
                    0.0231,
                    "USDC",
                    "2022-09-19T06:53:13.925Z"
                ],
                [
                    1,
                    2965802,
                    "WBTC-USDC",
                    "s",
                    18432.26902672334,
                    0.00308147,
                    "f",
                    "55a479c2f4336fefbe9cf1cd97bae6a76ba0f736a5fc52f0b99310a51654ec77",
                    "1214962",
                    "881179",
                    0.000001092,
                    "WBTC",
                    "2022-09-19T06:43:18.012Z"
                ],
                [
                    1,
                    2965799,
                    "WBTC-USDC",
                    "b",
                    18460.636481938815,
                    0.00308116,
                    "f",
                    "f14ebad1799dda0e839609d73619c1dd0d58ae16abe2017a4970c763fc69dd03",
                    "1214962",
                    "1066910",
                    0.0204225,
                    "USDC",
                    "2022-09-19T06:43:10.494Z"
                ],
                [
                    1,
                    2965793,
                    "WBTC-USDC",
                    "s",
                    18436.85952128674,
                    0.00310839,
                    "f",
                    "895cc42e06f99e891a408a26a94a21d6cb3cd71ff5ff407a517df1f84b2e04e8",
                    "1214962",
                    "881179",
                    9.975e-7,
                    "WBTC",
                    "2022-09-19T06:41:56.440Z"
                ],
                [
                    1,
                    2965788,
                    "WBTC-USDC",
                    "s",
                    18444.605090664176,
                    0.00311896,
                    "f",
                    "ea424fa443ebf3eb056dfa18f944c6ad5e7989cf3d908f17101db95d2098c511",
                    "1214962",
                    "881179",
                    9.975e-7,
                    "WBTC",
                    "2022-09-19T06:41:21.190Z"
                ],
                [
                    1,
                    2965782,
                    "WBTC-USDC",
                    "b",
                    18482.767012080953,
                    0.00311865,
                    "f",
                    "3ce289cc8ddee26a7db23a0d43e088bc18d638a2dfeb73cdf75ae3ee31f57a0b",
                    "1214962",
                    "1066910",
                    0.018522,
                    "USDC",
                    "2022-09-19T06:41:13.632Z"
                ],
                [
                    1,
                    2965716,
                    "WBTC-USDC",
                    "s",
                    18470.71270730709,
                    0.00307874,
                    "f",
                    "efbb89f5c8daba409f4cb4acc0fefd72897887e9ddbab1d135efaca0ecdcd7ed",
                    "1214953",
                    "881179",
                    0.0000012705,
                    "WBTC",
                    "2022-09-19T06:36:17.672Z"
                ],
                [
                    1,
                    2965712,
                    "WBTC-USDC",
                    "b",
                    18494.346063649413,
                    0.00307843,
                    "f",
                    "da96ec3e3265459b50742f1ce486cdc8eaf03331a377c811dfe24332dc530e38",
                    "1214953",
                    "1066910",
                    0.023625,
                    "USDC",
                    "2022-09-19T06:36:08.101Z"
                ],
                [
                    1,
                    2965690,
                    "WBTC-USDC",
                    "s",
                    18459.411708075517,
                    0.00311226,
                    "f",
                    "5831436a6c2212212770cbdbc35b6e8aba55886c5ac22415b2439f374cf55dd1",
                    "1214953",
                    "881179",
                    0.0000012705,
                    "WBTC",
                    "2022-09-19T06:34:43.369Z"
                ],
                [
                    1,
                    2965684,
                    "WBTC-USDC",
                    "b",
                    18496.836061254522,
                    0.00311195,
                    "f",
                    "451ffb01b5d28ac22eb639966cd33d03410d2ee70babaa87d93166fee0b16695",
                    "1214953",
                    "1066910",
                    0.023625,
                    "USDC",
                    "2022-09-19T06:34:18.087Z"
                ],
                [
                    1,
                    2965636,
                    "WBTC-USDC",
                    "s",
                    18426.60364952012,
                    0.00291651,
                    "f",
                    "c710d6e53343e42d7153bc6014d880f114ac45d882a45599719bcd9ed0bec670",
                    "1214948",
                    "881179",
                    0.000001113,
                    "WBTC",
                    "2022-09-19T06:29:53.379Z"
                ],
                [
                    1,
                    2965632,
                    "WBTC-USDC",
                    "b",
                    18466.208927793832,
                    0.00291622,
                    "f",
                    "be8d89ec1ece479cab3cef22cf95d50a3d6b56750a0a795e6702c0cc051133c1",
                    "1214948",
                    "1066910",
                    0.020769,
                    "USDC",
                    "2022-09-19T06:29:46.278Z"
                ]
            ]
        ]
    }

      actions?.fetchMarketTrades(mockData_market_trades.args, mockData_market_trades.op);
      if (operation === "_liquidity2") {
        actions?.fetchOrderBook(operation, args)
      }
    });

    api.on("signIn", (data) => {
      console.log("operation____22", data)
        actions?.setUserWallet(data, "signIn")
    });

    api.on("balanceUpdate", (operation, args) => {
      console.log("operation____33", args)
        actions?.updateUserWalletBalance(args, "balanceUpdate")
    })

    api.start()
  }, [])

  //wss://zigzag-exchange.herokuapp.com

  return (
    <>
      {showTour && !hideTips ? (
        <IntroTips connected={connected} mangoAccount={mangoAccount} />
      ) : null}
      <TradePageGrid />
      {/* {!alphaAccepted && (
        <AlphaModal isOpen={!alphaAccepted} onClose={() => {}} />
      )} */}
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
