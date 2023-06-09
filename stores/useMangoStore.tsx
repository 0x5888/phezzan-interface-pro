import create, { GetState, SetState, Mutate, StoreApi } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import produce from 'immer'
import { Market } from '@project-serum/serum'
import {
  IDS,
  Config,
  MangoClient,
  MangoGroup,
  MangoAccount,
  MarketConfig,
  getMarketByBaseSymbolAndKind,
  GroupConfig,
  TokenConfig,
  getTokenAccountsByOwnerWithWrappedSol,
  getTokenByMint,
  TokenAccount,
  nativeToUi,
  MangoCache,
  PerpMarket,
  getAllMarkets,
  getMultipleAccounts,
  PerpMarketLayout,
  msrmMints,
  MangoAccountLayout,
  BlockhashTimes,
  MarketMode,
  I80F48,
  PerpAccount,
  PerpMarketConfig,
} from '@blockworks-foundation/mango-client'
import { AccountInfo, Commitment, Connection, PublicKey } from '@solana/web3.js'
import { EndpointInfo } from '../@types/types'
import { isDefined, zipDict } from '../utils'
import { Notification, notify } from '../utils/notifications'
import {
  DEFAULT_MARKET_KEY,
  initialMarket,
  NODE_URL_KEY,
} from '../components/SettingsModal'
import { MSRM_DECIMALS } from '@project-serum/serum/lib/token-instructions'
import { getProfilePicture, ProfilePicture } from '@solflare-wallet/pfp'
import { decodeBook } from '../hooks/useHydrateStore'
import { IOrderLineAdapter } from '../public/charting_library/charting_library'
import { Wallet } from '@solana/wallet-adapter-react'
import { coingeckoIds, fetchNftsFromHolaplexIndexer } from 'utils/tokens'
import { getTokenAccountsByMint } from 'utils/tokens'
import { sign } from 'tweetnacl'
import bs58 from 'bs58'
import { PerpMarketInfo } from '@blockworks-foundation/mango-client'

export const ENDPOINTS: EndpointInfo[] = [
  {
    name: 'mainnet',
    url: process.env.NEXT_PUBLIC_ENDPOINT || 'https://mango.rpcpool.com',
    websocket: process.env.NEXT_PUBLIC_ENDPOINT || 'https://mango.rpcpool.com',
    custom: false,
  },
  {
    name: 'devnet',
    // url: 'https://mango.devnet.rpcpool.com',
    // websocket: 'https://mango.devnet.rpcpool.com',
    url: 'https://api.devnet.solana.com',
    websocket: 'https://api.devnet.solana.com',
    custom: false,
  },
  {
    name: 'testnet',
    url: 'https://api.testnet.solana.com',
    websocket: 'https://api.testnet.solana.com',
    custom: false,
  },
]

type ClusterType = 'mainnet' | 'devnet' | 'testnet'
const DEFAULT_MANGO_GROUP_NAME = process.env.NEXT_PUBLIC_GROUP || 'mainnet.1'
export const CLUSTER = DEFAULT_MANGO_GROUP_NAME.split('.')[0] as ClusterType
const ENDPOINT = ENDPOINTS.find((e) => e.name === CLUSTER) as EndpointInfo

export const WEBSOCKET_CONNECTION = new Connection(
  ENDPOINT.websocket,
  'processed' as Commitment
)

export const DEFAULT_MANGO_GROUP_CONFIG = Config.ids().getGroup(
  CLUSTER,
  DEFAULT_MANGO_GROUP_NAME
) as GroupConfig

const defaultMangoGroupIds = IDS['groups'].find(
  (group) => group.name === DEFAULT_MANGO_GROUP_NAME
)

export const MNGO_INDEX = defaultMangoGroupIds!.oracles.findIndex(
  (t) => t.symbol === 'MNGO'
)

export const programId = new PublicKey(defaultMangoGroupIds!.mangoProgramId)
export const serumProgramId = new PublicKey(
  defaultMangoGroupIds!.serumProgramId
)
const mangoGroupPk = new PublicKey(defaultMangoGroupIds!.publicKey)

export const SECONDS = 1000
export const CLIENT_TX_TIMEOUT = 90000

export const LAST_ACCOUNT_KEY = 'lastAccountViewed-3.0'

// Used to retry loading the MangoGroup and MangoAccount if an rpc node error occurs
let mangoGroupRetryAttempt = 0
let mangoAccountRetryAttempt = 0

// an object with keys of Solana account addresses that we are
// subscribing to with connection.onAccountChange() in the
// useHydrateStore hook
interface AccountInfoList {
  [key: string]: AccountInfo<Buffer>
}

export interface WalletToken {
  account?: TokenAccount
  config?: TokenConfig
  uiBalance?: number
}

export interface Orderbook {
  bids: number[][]
  asks: number[][]
}

export interface Alert {
  acc: PublicKey
  alertProvider: 'mail'
  health: number
  _id: string
  open: boolean
  timestamp: number
  triggeredTimestamp: number | undefined
}

export interface AlertRequest {
  alertProvider: 'mail'
  health: number
  mangoGroupPk: string
  mangoAccountPk: string
  email: string | undefined
}

interface NFTFiles {
  type: string
  uri: string
}

interface NFTProperties {
  category: string
  files: NFTFiles[]
}

interface NFTData {
  image: string
  name: string
  description: string
  properties: NFTProperties
  collection: {
    family: string
    name: string
  }
}

interface NFTWithMint {
  val: NFTData
  mint: string
  tokenAddress: string
}

interface ProfileDetails {
  profile_name: string
  trader_category: string
  wallet_pk: string
}

export interface SpotBalance {
  market: null
  key: string
  symbol: string
  deposits: I80F48
  borrows: I80F48
  orders: number
  unsettled: number
  net: I80F48
  value: I80F48
  depositRate: I80F48
  borrowRate: I80F48
  decimals: number
}

export interface PerpPosition {
  perpMarketInfo: PerpMarketInfo
  marketConfig: PerpMarketConfig
  perpMarket: PerpMarket
  perpAccount: PerpAccount
  basePosition: number
  indexPrice: number
  avgEntryPrice: number
  breakEvenPrice: number
  notionalSize: number
  unrealizedPnl: number
  unsettledPnl: number
}

export type MangoStore = {
  notificationIdCounter: number
  notifications: Array<Notification>
  accountInfos: AccountInfoList
  connection: {
    cluster: ClusterType
    current: Connection
    websocket: Connection
    endpoint: string
    client: MangoClient
    slot: number
    blockhashTimes: BlockhashTimes[]
  }
  selectedMarket: {
    config: MarketConfig | any
    current: Market | PerpMarket | null
    markPrice: number
    kind: string
    orderBook: Orderbook,
    fills: any[],
    marketFills: any
  }
  mangoGroups: Array<MangoGroup>
  selectedMangoGroup: {
    config: GroupConfig
    name: string
    current: MangoGroup | null
    markets: {
      [address: string]: Market | PerpMarket | undefined
    }
    cache: MangoCache | null
  }
  mangoAccounts: MangoAccount[]
  referrals: {
    total: number
    history: any[]
  }
  referrerPk: PublicKey | null
  selectedMangoAccount: {
    current: MangoAccount | null
    initialLoad: boolean
    lastUpdatedAt: string
    lastSlot: number
    openOrders: any[]
    totalOpenOrders: number
    spotBalances: SpotBalance[]
    perpPositions: (PerpPosition | undefined)[]
    openPerpPositions: PerpPosition[]
    unsettledPerpPositions: PerpPosition[]
    totalOpenPerpPositions: number
  }
  tradeForm: {
    side: 'buy' | 'sell'
    price: number | ''
    baseSize: number | ''
    quoteSize: number | ''
    tradeType:
      | 'Market'
      | 'Limit'
      | 'Stop Loss'
      | 'Take Profit'
      | 'Stop Limit'
      | 'Take Profit Limit'
    triggerPrice: number | ''
    triggerCondition: 'above' | 'below'
  }
  wallet: {
    tokens: WalletToken[] | any[]
    pfp: ProfilePicture | undefined
    loadPfp: boolean
    id: any
    address: any
    committed: any
    nfts: {
      data: NFTWithMint[] | []
      initialLoad: boolean
      loading: boolean
      loadingTransaction: boolean
    }
    
  }
  settings: {
    uiLocked: boolean
  }
  tradeHistory: {
    initialLoad: boolean
    spot: any[]
    perp: any[]
    parsed: any[]
  }
  profile: {
    loadProfileFollowing: boolean
    loadFollowers: boolean
    loadDetails: boolean
    details: ProfileDetails
    following: any[]
  }
  set: (x: (x: MangoStore) => void) => void
  actions: {
    updateUserWalletBalance: (payload: any, any) => void,
    setUserWallet: (payload: any, any) => void,
    setWallet: (any) => void
    fetchMarketTrades: (payload: any, any) => void
    fetchOrderBook: (payload: any, any) => void
    fetchWalletTokens: (wallet: Wallet) => void
    fetchProfilePicture: (wallet: Wallet) => void
    fetchNfts: (
      connection: Connection,
      walletPk: PublicKey | null,
      offset?: number
    ) => void
    fetchAllMangoAccounts: (wallet: Wallet) => Promise<void>
    fetchMangoGroup: () => Promise<void>
    fetchTradeHistory: () => void
    reloadMangoAccount: () => void
    reloadOrders: () => void
    updateOpenOrders: () => void
    loadMarketFills: () => void
    loadReferralData: () => void
    fetchMangoGroupCache: () => void
    updateConnection: (url: string) => void
    createAlert: (alert: AlertRequest) => void
    deleteAlert: (id: string) => void
    loadAlerts: (pk: PublicKey) => void
    gethMarketsInfo: (payload: any, args: any) => void
    fetchMarketsInfo: () => void
  
    fetchProfileDetails: (pk: string) => void
   
   
  }
  alerts: {
    activeAlerts: Array<Alert>
    triggeredAlerts: Array<Alert>
    loading: boolean
    error: string
    submitting: boolean
    success: string
  }
  marketsInfo: any[]
  tradingView: {
    orderLines: Map<string, IOrderLineAdapter>
  }
  coingeckoPrices: { data: any[]; loading: boolean }
}

const useMangoStore = create<
  MangoStore,
  SetState<MangoStore>,
  GetState<MangoStore>,
  Mutate<StoreApi<MangoStore>, [['zustand/subscribeWithSelector', never]]>
>(
  subscribeWithSelector((set, get) => {
    let rpcUrl = ENDPOINT?.url

    if (typeof window !== 'undefined' && CLUSTER === 'mainnet') {
      const urlFromLocalStorage = localStorage.getItem(NODE_URL_KEY)
      rpcUrl = urlFromLocalStorage
        ? JSON.parse(urlFromLocalStorage)
        : ENDPOINT?.url
    }

    console.log("rpcUrl____", rpcUrl)

    let defaultMarket = initialMarket

    if (typeof window !== 'undefined') {
      const marketFromLocalStorage = localStorage.getItem(DEFAULT_MARKET_KEY)
      defaultMarket = marketFromLocalStorage
        ? JSON.parse(marketFromLocalStorage)
        : initialMarket
    }

    console.log("defaultMarket____", defaultMarket)

    const connection = new Connection(rpcUrl, 'processed' as Commitment)
    const client = new MangoClient(connection, programId, {
      timeout: CLIENT_TX_TIMEOUT,
      prioritizationFee: 2,
      postSendTxCallback: ({ txid }: { txid: string }) => {
        notify({
          title: 'Transaction sent',
          description: 'Waiting for confirmation',
          type: 'confirm',
          txid: txid,
        })
      },
      blockhashCommitment: 'confirmed',
    })

    console.log("data___", getMarketByBaseSymbolAndKind(
      DEFAULT_MANGO_GROUP_CONFIG,
      defaultMarket.base,
      defaultMarket.kind
    ))

    const DEFAULT_CONFIG = {
      "kind": "perp",
      "name": "SOL-PERP",
      "publicKey": "2TgaaVoHgnSeEtXvWTx13zQeTf4hYWAMEiMQdcG6EwHi",
      "baseSymbol": "SOL",
      "baseDecimals": 9,
      "quoteDecimals": 6,
      "marketIndex": 3,
      "bidsKey": "Fu8q5EiFunGwSRrjFKjRUoMABj5yCoMEPccMbUiAT6PD",
      "asksKey": "9qUxMSWBGAeNmXusQHuLfgSuYJqADyYoNLwZ63JJSi6V",
      "eventsKey": "31cKs646dt1YkA3zPyxZ7rUAkxTBz279w4XEobFXcAKP"
  }

    return {
      marketsInfo: [],
      notificationIdCounter: 0,
      notifications: [],
      accountInfos: {},
      connection: {
        cluster: CLUSTER,
        current: connection,
        websocket: WEBSOCKET_CONNECTION,
        client,
        endpoint: ENDPOINT.url,
        slot: 0,
        blockhashTimes: [],
      },
      selectedMangoGroup: {
        config: DEFAULT_MANGO_GROUP_CONFIG,
        name: DEFAULT_MANGO_GROUP_NAME,
        current: null,
        markets: {},
        rootBanks: [],
        cache: null,
      },
      selectedMarket: {
        config: DEFAULT_CONFIG,
        kind: defaultMarket.kind,
        current: null,
        markPrice: 0,
        orderBook: { bids: [], asks: [] },
        marketFills: {},
        fills: [],
      },
      mangoGroups: [],
      mangoAccounts: [],
      referrals: {
        total: 0,
        history: [],
      },
      referrerPk: null,
      selectedMangoAccount: {
        current: null,
        initialLoad: true,
        lastUpdatedAt: '0',
        lastSlot: 0,
        openOrders: [],
        totalOpenOrders: 0,
        spotBalances: [],
        perpPositions: [],
        openPerpPositions: [],
        totalOpenPerpPositions: 0,
        unsettledPerpPositions: [],
      },
      tradeForm: {
        side: 'buy',
        baseSize: '',
        quoteSize: '',
        tradeType: 'Limit',
        price: '',
        triggerPrice: '',
        triggerCondition: 'above',
      },
      wallet: {
        tokens: [],
        pfp: undefined,
        loadPfp: true,
        nfts: {
          data: [],
          initialLoad: false,
          loading: false,
          loadingTransaction: false,
        },
        address: undefined,
        id: undefined,
        committed: {
          balances: {},
        }
      },
      settings: {
        uiLocked: true,
      },
      alerts: {
        activeAlerts: [],
        triggeredAlerts: [],
        loading: false,
        error: '',
        submitting: false,
        success: '',
      },
      tradeHistory: {
        initialLoad: false,
        spot: [],
        perp: [],
        parsed: [],
      },
      tradingView: {
        orderLines: new Map(),
      },
      coingeckoPrices: { data: [], loading: false },
      profile: {
        loadProfileFollowing: false,
        loadFollowers: false,
        loadDetails: false,
        details: { profile_name: '', trader_category: '', wallet_pk: '' },
        following: [],
      },
      set: (fn) => set(produce(fn)),
      actions: {
        updateUserWalletBalance(payload: any = {}, args: any) {
          const set = get().set;

          if (payload && Object.keys(payload).length > 0) {
            set((state) => {
              state.wallet.committed.balances = {...payload}
            })
          }
          
        },
        setWallet(payload: any) {
          const set = get().set
          if (payload?.id) {
            set((state) => {
              state.wallet.id = payload.id
            })
            
          }

          if (payload?.address) {
            set((state) => {
              state.wallet.address = payload.address
            })
          }
        },
        setUserWallet(payload: any, args: any) {
          console.log("payload___wallet", payload, args)
          const set = get().set

          set((state) => {
            state.wallet.id = payload.id
            state.wallet.address = payload.address;
            state.wallet.committed.balance = payload.balance
          })
        },
        fetchMarketTrades(payload: any, args: any) {
          const set = get().set

          payload[0].forEach((fill) => {
            const fillid = fill[1];
            // taker and maker user ids have to be matched lowercase because addresses
            // sometimes come back in camelcase checksum format
            // const takerUserId = fill[8] && fill[8].toLowerCase();
            // const makerUserId = fill[9] && fill[9].toLowerCase();

            const market = fill[2];
            const network = fill[0];

            // feeCost: 0
            // marketAddress: "DVXWg6mfwFvHQbGyaHke4h3LE9pSkgbooDSDgA4JBC8d"
            // orderId: ""
            // price: 1663.9
            // side: "sell"
            // size: 6.585
            // time: 1662449293023

            if (["f", "pf", "m"].includes(fill[6])) {
              set((state) => {
                state.selectedMarket.marketFills[fillid] = fill || [];
              });
            }

            // if (
            //   ["f", "pf", "m"].includes(fill[6]) &&
            //   fill[2] === state.currentMarket &&
            //   fill[0] === state.network
            // ) {
            //   state.marketFills[fillid] = fill;
            // }
          })
        },
        fetchOrderBook(payload: any, args: any) {
          const set = get().set


          // liquidity.forEach((liq) => {
          //   const side = liq[0];
          //   const price = liq[1];
          //   const quantity = liq[2];
          //   if (side === "b") {
          //     orderbookBids.push({
          //       td1: price,
          //       td2: quantity,
          //       td3: price * quantity,
          //       side: "b",
          //     });
          //   }
          //   if (side === "s") {
          //     orderbookAsks.push({
          //       td1: price,
          //       td2: quantity,
          //       td3: price * quantity,
          //       side: "s",
          //     });
          //   }
          // });

          let orderbookAsks = [];
          let orderbookBids = [];

          if (payload[1]) {
            const list = payload[2]

            for (let i = list.length - 1; i >= 0; i--) {
              const data = list[i];
              const side = data[0];
              const price = data[1];
              const quantity = data[2];

              if (side === "b") {
                // use
                // @ts-ignore
                orderbookBids.push([price, quantity])
              }

              if (side === "s") {
                // use
                // @ts-ignore
                orderbookAsks.push([price, quantity])
              }
            }            

            if (Array.isArray(orderbookBids) && orderbookBids.length > 0) {
              console.log("orderbookBids_____", orderbookBids)
              set((state) => {
                state.selectedMarket.orderBook.bids = [...(orderbookBids || [])]
              });
            }

            if (Array.isArray(orderbookAsks) && orderbookAsks.length > 0) {
              set((state) => {
                state.selectedMarket.orderBook.asks = [...(orderbookAsks || [])]
              })
            }
          }
        },
        async fetchWalletTokens(wallet: Wallet) {
          const groupConfig = get().selectedMangoGroup.config
          const connected = wallet?.adapter?.connected
          const connection = get().connection.current
          const cluster = get().connection.cluster
          const set = get().set

          if (wallet?.adapter?.publicKey && connected) {
            const ownedTokenAccounts =
              await getTokenAccountsByOwnerWithWrappedSol(
                connection,
                wallet.adapter.publicKey
              )
            const tokens: any = []
            ownedTokenAccounts?.forEach((account) => {
              const config = getTokenByMint(groupConfig, account.mint)
              if (config) {
                const uiBalance = nativeToUi(account.amount, config.decimals)
                tokens.push({ account, config, uiBalance })
              } else if (msrmMints[cluster].equals(account.mint)) {
                const uiBalance = nativeToUi(account.amount, 6)
                tokens.push({
                  account,
                  config: {
                    symbol: 'MSRM',
                    mintKey: msrmMints[cluster],
                    decimals: MSRM_DECIMALS,
                  },
                  uiBalance,
                })
              }
            })

            set((state) => {
              state.wallet.tokens = tokens
            })
          } else {
            set((state) => {
              state.wallet.tokens = []
            })
          }
        },
        async fetchProfilePicture(wallet: Wallet) {
          const set = get().set
          const walletPk = wallet?.adapter?.publicKey
          const connection = get().connection.current

          if (!walletPk) return

          try {
            const result = await getProfilePicture(connection, walletPk)

            set((state) => {
              state.wallet.pfp = result
              state.wallet.loadPfp = false
            })
          } catch (e) {
            console.log('Could not get profile picture', e)
            set((state) => {
              state.wallet.loadPfp = false
            })
          }
        },
        async fetchNfts(connection: Connection, ownerPk: PublicKey) {
          const set = get().set
          set((state) => {
            state.wallet.nfts.loading = true
          })
          try {
            const data = await fetchNftsFromHolaplexIndexer(ownerPk)
            for (const nft of data.nfts) {
              const tokenAccount = await getTokenAccountsByMint(
                connection,
                nft.mintAddress
              )
              nft.tokenAccount = tokenAccount[0] || null
            }
            set((state) => {
              state.wallet.nfts.data = data.nfts
              state.wallet.nfts.loading = false
            })
          } catch (error) {
            notify({
              type: 'error',
              title: 'Unable to fetch nfts',
            })
          }
          return []
        },
        async fetchAllMangoAccounts(wallet) {
          const set = get().set
          const mangoGroup = get().selectedMangoGroup.current
          const mangoClient = get().connection.client
          const actions = get().actions

          if (!wallet?.adapter?.publicKey || !mangoGroup) return

          const delegateFilter = [
            {
              memcmp: {
                offset: MangoAccountLayout.offsetOf('delegate'),
                bytes: wallet.adapter.publicKey?.toBase58(),
              },
            },
          ]
          const accountSorter = (a, b) =>
            a.publicKey.toBase58() > b.publicKey.toBase58() ? 1 : -1

          return Promise.all([
            mangoClient.getMangoAccountsForOwner(
              mangoGroup,
              wallet.adapter.publicKey,
              true
            ),
            mangoClient.getAllMangoAccounts(mangoGroup, delegateFilter, false),
          ])
            .then((values) => {
              const [mangoAccounts, delegatedAccounts] = values
              if (mangoAccounts.length + delegatedAccounts.length > 0) {
                const sortedAccounts = mangoAccounts
                  .slice()
                  .sort(accountSorter)
                  .concat(delegatedAccounts.sort(accountSorter))

                set((state) => {
                  state.selectedMangoAccount.initialLoad = false
                  state.mangoAccounts = sortedAccounts
                  if (!state.selectedMangoAccount.current) {
                    const lastAccount = localStorage.getItem(LAST_ACCOUNT_KEY)
                    let currentAcct = sortedAccounts[0]
                    if (lastAccount) {
                      currentAcct =
                        mangoAccounts.find(
                          (ma) =>
                            ma.publicKey.toString() === JSON.parse(lastAccount)
                        ) || sortedAccounts[0]
                    }

                    state.selectedMangoAccount.current = currentAcct
                  }
                })
              } else {
                set((state) => {
                  state.selectedMangoAccount.initialLoad = false
                })
              }
            })
            .catch((err) => {
              if (mangoAccountRetryAttempt < 2) {
                actions.fetchAllMangoAccounts(wallet)
                mangoAccountRetryAttempt++
              } else {
                notify({
                  type: 'error',
                  title: 'Unable to load mango account',
                  description: err.message,
                })
                console.log('Could not get margin accounts for wallet', err)
              }
            })
        },
        async fetchMangoGroup() {
          const set = get().set
          const mangoGroupConfig = get().selectedMangoGroup.config
          const selectedMarketConfig = get().selectedMarket.config
          console.log("selectedMarketConfig___1", selectedMarketConfig)
          const mangoClient = get().connection.client
          const connection = get().connection.current
          const actions = get().actions

          return mangoClient
            .getMangoGroup(mangoGroupPk)
            .then(async (mangoGroup) => {
              mangoGroup.loadCache(connection).then((mangoCache) => {
                console.log("mangoCache___", mangoCache)
                set((state) => {
                  state.selectedMangoGroup.cache = mangoCache
                })
              })
              mangoGroup.loadRootBanks(connection).then(() => {
                console.log("mangoGroup___", mangoGroup)
                set((state) => {
                  state.selectedMangoGroup.current = mangoGroup
                })
              })

              const allMarketConfigs = getAllMarkets(mangoGroupConfig)
              const allMarketPks = allMarketConfigs.map((m) => m.publicKey)
              const allBidsAndAsksPks = allMarketConfigs
                .map((m) => [m.bidsKey, m.asksKey])
                .flat()

              let allMarketAccountInfos, allBidsAndAsksAccountInfos
              try {
                const resp = await Promise.all([
                  getMultipleAccounts(connection, allMarketPks),
                  getMultipleAccounts(connection, allBidsAndAsksPks),
                ]);

                console.log("resp____", resp)

                allMarketAccountInfos = resp[0]
                allBidsAndAsksAccountInfos = resp[1]
              } catch {
                console.log("error________")
                notify({
                  type: 'error',
                  title: 'Failed to load the mango group. Please refresh.',
                })
              }

              const allMarketAccounts = allMarketConfigs.map((config, i) => {
                if (config.kind == 'perp') {
                  const decoded = PerpMarketLayout.decode(
                    allMarketAccountInfos[i].accountInfo.data
                  )
                  return new PerpMarket(
                    config.publicKey,
                    config.baseDecimals,
                    config.quoteDecimals,
                    decoded
                  )
                }
              })

              const allMarkets = zipDict(
                allMarketPks.map((pk) => pk.toBase58()),
                allMarketAccounts
              )

              console.log("allMarkets____", allMarkets)

              const currentSelectedMarket = allMarketAccounts.find((mkt) =>
                mkt?.publicKey.equals(selectedMarketConfig.publicKey)
              )

              console.log("currentSelectedMarket___", currentSelectedMarket)

              set((state) => {
                state.selectedMangoGroup.markets = allMarkets
                state.selectedMarket.current = currentSelectedMarket
                  ? currentSelectedMarket
                  : null

                console.log("selectedMarket____111", currentSelectedMarket)

                allBidsAndAsksAccountInfos.forEach(
                  ({ publicKey, context, accountInfo }) => {
                    if (context.slot >= state.connection.slot) {
                      state.connection.slot = context.slot
                      const perpMarket = allMarketAccounts.find((mkt) => {
                        if (mkt instanceof PerpMarket) {
                          return (
                            mkt.bids.equals(publicKey) ||
                            mkt.asks.equals(publicKey)
                          )
                        }
                      })

                      if (perpMarket) {
                        accountInfo['parsed'] = decodeBook(
                          perpMarket,
                          accountInfo
                        )
                      }
                      console.log("perpMarket____", perpMarket)
                      state.accountInfos[publicKey.toBase58()] = accountInfo
                    }
                  }
                )
              })
            })
            .catch((err) => {
              if (mangoGroupRetryAttempt < 2) {
                actions.fetchMangoGroup()
                mangoGroupRetryAttempt++
              } else {
                console.log("error________111")
                notify({
                  title: 'Failed to load mango group. Please refresh',
                  description: `${err}`,
                  type: 'error',
                })
                console.log('Could not get mango group: ', err)
              }
            })
        },
        async fetchTradeHistory() {
          const selectedMangoAccount = get().selectedMangoAccount.current
          const set = get().set
          if (!selectedMangoAccount) return

          fetch(
            `https://trade-history-api-v3.onrender.com/perp_trades/${selectedMangoAccount.publicKey.toString()}`
          )
            .then((response) => response.json())
            .then((jsonPerpHistory) => {
              const perpHistory = jsonPerpHistory?.data || []
              if (perpHistory.length === 5000) {
                fetch(
                  `https://trade-history-api-v3.onrender.com/perp_trades/${selectedMangoAccount.publicKey.toString()}?page=2`
                )
                  .then((response) => response.json())
                  .then((jsonPerpHistory) => {
                    const perpHistory2 = jsonPerpHistory?.data || []
                    set((state) => {
                      state.tradeHistory.perp = perpHistory.concat(perpHistory2)
                    })
                  })
                  .catch((e) => {
                    console.error('Error fetching trade history', e)
                  })
              } else {
                set((state) => {
                  state.tradeHistory.perp = perpHistory
                })
              }
            })
            .catch((e) => {
              console.error('Error fetching trade history', e)
            })

          if (selectedMangoAccount.spotOpenOrdersAccounts.length) {
            const openOrdersAccounts =
              selectedMangoAccount.spotOpenOrdersAccounts.filter(isDefined)
            const publicKeys = openOrdersAccounts.map((act) =>
              act.publicKey.toString()
            )
            Promise.all(
              publicKeys.map(async (pk) => {
                const response = await fetch(
                  `https://trade-history-api-v3.onrender.com/trades/open_orders/${pk.toString()}`
                )
                const parsedResponse = await response.json()
                return parsedResponse?.data ? parsedResponse.data : []
              })
            )
              .then((serumTradeHistory) => {
                set((state) => {
                  state.tradeHistory.spot = serumTradeHistory
                })
              })
              .catch((e) => {
                console.error('Error fetching trade history', e)
              })
          }
          set((state) => {
            state.tradeHistory.initialLoad = true
          })
        },
        async reloadMangoAccount() {
          const set = get().set
          const mangoAccount = get().selectedMangoAccount.current
          const connection = get().connection.current
          const mangoClient = get().connection.client

          if (!mangoAccount) return

          const [reloadedMangoAccount, lastSlot] =
            await mangoAccount.reloadFromSlot(connection, mangoClient.lastSlot)
          const lastSeenSlot = get().selectedMangoAccount.lastSlot

          if (lastSlot > lastSeenSlot) {
            set((state) => {
              state.selectedMangoAccount.current = reloadedMangoAccount
              state.selectedMangoAccount.lastUpdatedAt =
                new Date().toISOString()
              state.selectedMangoAccount.lastSlot = lastSlot
            })
          }
        },
        async reloadOrders() {
          const set = get().set
          const mangoAccount = get().selectedMangoAccount.current
          const connection = get().connection.current
          if (mangoAccount) {
            const [spotOpenOrdersAccounts, advancedOrders] = await Promise.all([
              mangoAccount.loadOpenOrders(
                connection,
                new PublicKey(serumProgramId)
              ),
              mangoAccount.loadAdvancedOrders(connection),
            ])
            mangoAccount.spotOpenOrdersAccounts = spotOpenOrdersAccounts
            mangoAccount.advancedOrders = advancedOrders
            set((state) => {
              state.selectedMangoAccount.current = mangoAccount
              state.selectedMangoAccount.lastUpdatedAt =
                new Date().toISOString()
            })
          }
        },
        async updateOpenOrders() {
          const set = get().set
          const connection = get().connection.current
          const bidAskAccounts = Object.keys(get().accountInfos).map(
            (pk) => new PublicKey(pk)
          )
          const markets = Object.values(
            useMangoStore.getState().selectedMangoGroup.markets
          )
          const allBidsAndAsksAccountInfos = await getMultipleAccounts(
            connection,
            bidAskAccounts
          )

          set((state) => {
            allBidsAndAsksAccountInfos.forEach(
              ({ publicKey, context, accountInfo }) => {
                state.connection.slot = context.slot

                const perpMarket = markets.find((mkt) => {
                  if (mkt instanceof PerpMarket) {
                    return (
                      mkt.bids.equals(publicKey) || mkt.asks.equals(publicKey)
                    )
                  }
                })
                if (perpMarket) {
                  accountInfo['parsed'] = decodeBook(perpMarket, accountInfo)
                }
                state.accountInfos[publicKey.toBase58()] = accountInfo
              }
            )
          })
        },
        async loadMarketFills() {
          const set = get().set
          const selectedMarket = get().selectedMarket.current
          const connection = get().connection.current
          if (!selectedMarket) {
            return null
          }
          try {
            const loadedFills = await selectedMarket.loadFills(
              connection,
              10000
            )
            set((state) => {
              state.selectedMarket.fills = loadedFills
            })
          } catch (err) {
            console.log('Error fetching fills:', err)
          }
        },
        async loadReferralData() {
          const set = get().set
          const mangoAccount = get().selectedMangoAccount.current
          const pk = mangoAccount?.publicKey.toString()
          if (!pk) {
            return
          }

          const getData = async (type: 'history' | 'total') => {
            const res = await fetch(
              `https://mango-transaction-log.herokuapp.com/v3/stats/referral-fees-${type}?referrer-account=${pk}`
            )
            const data =
              type === 'history' ? await res.json() : await res.text()
            return data
          }

          const data = await getData('history')
          const totalBalance = await getData('total')

          set((state) => {
            state.referrals.total = parseFloat(totalBalance)
            state.referrals.history = data
          })
        },
        async fetchMangoGroupCache() {
          const set = get().set
          const mangoGroup = get().selectedMangoGroup.current
          const connection = get().connection.current
          if (mangoGroup) {
            try {
              const mangoCache = await mangoGroup.loadCache(connection)

              set((state) => {
                state.selectedMangoGroup.cache = mangoCache
              })
            } catch (e) {
              console.warn('Error fetching mango group cache:', e)
            }
          }
        },
        updateConnection(endpointUrl) {
          const set = get().set

          const newConnection = new Connection(endpointUrl, 'processed')

          const newClient = new MangoClient(newConnection, programId)

          set((state) => {
            state.connection.endpoint = endpointUrl
            state.connection.current = newConnection
            state.connection.client = newClient
          })
        },
        async createAlert(req: AlertRequest) {
          const set = get().set
          const alert = {
            acc: new PublicKey(req.mangoAccountPk),
            alertProvider: req.alertProvider,
            health: req.health,
            open: true,
            timestamp: Date.now(),
          }

          set((state) => {
            state.alerts.submitting = true
            state.alerts.error = ''
            state.alerts.success = ''
          })

          const mangoAccount = get().selectedMangoAccount.current
          const mangoGroup = get().selectedMangoGroup.current
          const mangoCache = get().selectedMangoGroup.cache
          if (!mangoGroup || !mangoAccount || !mangoCache) return
          const currentAccHealth = await mangoAccount.getHealthRatio(
            mangoGroup,
            mangoCache,
            'Maint'
          )

          if (currentAccHealth && currentAccHealth.toNumber() <= req.health) {
            set((state) => {
              state.alerts.submitting = false
              state.alerts.error = `Current account health is already below ${req.health}%`
            })
            return false
          }

          const fetchUrl = `https://mango-alerts-v3.herokuapp.com/alerts`
          const headers = { 'Content-Type': 'application/json' }

          const response = await fetch(fetchUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(req),
          })

          if (response.ok) {
            const alerts = get().alerts.activeAlerts

            set((state) => {
              state.alerts.activeAlerts = [alert as Alert].concat(alerts)
              state.alerts.submitting = false
              state.alerts.success = 'Alert saved'
            })
            notify({
              title: 'Alert saved',
              type: 'success',
            })
            return true
          } else {
            set((state) => {
              state.alerts.error = 'Something went wrong'
              state.alerts.submitting = false
            })
            notify({
              title: 'Something went wrong',
              type: 'error',
            })
            return false
          }
        },
        async deleteAlert(id: string) {
          const set = get().set

          set((state) => {
            state.alerts.submitting = true
            state.alerts.error = ''
            state.alerts.success = ''
          })

          const fetchUrl = `https://mango-alerts-v3.herokuapp.com/delete-alert`
          const headers = { 'Content-Type': 'application/json' }

          const response = await fetch(fetchUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ id }),
          })

          if (response.ok) {
            const alerts = get().alerts.activeAlerts
            set((state) => {
              state.alerts.activeAlerts = alerts.filter(
                (alert) => alert._id !== id
              )
              state.alerts.submitting = false
              state.alerts.success = 'Alert deleted'
            })
            notify({
              title: 'Alert deleted',
              type: 'success',
            })
          } else {
            set((state) => {
              state.alerts.error = 'Something went wrong'
              state.alerts.submitting = false
            })
            notify({
              title: 'Something went wrong',
              type: 'error',
            })
          }
        },
        async loadAlerts(mangoAccountPk: PublicKey) {
          const set = get().set

          set((state) => {
            state.alerts.error = ''
            state.alerts.loading = true
          })

          const headers = { 'Content-Type': 'application/json' }
          const response = await fetch(
            `https://mango-alerts-v3.herokuapp.com/alerts/${mangoAccountPk}`,
            {
              method: 'GET',
              headers: headers,
            }
          )

          if (response.ok) {
            const parsedResponse = await response.json()
            // sort active by latest creation time first
            const activeAlerts = parsedResponse.alerts
              .filter((alert) => alert.open)
              .sort((a, b) => {
                return b.timestamp - a.timestamp
              })

            // sort triggered by latest trigger time first
            const triggeredAlerts = parsedResponse.alerts
              .filter((alert) => !alert.open)
              .sort((a, b) => {
                return b.triggeredTimestamp - a.triggeredTimestamp
              })

            set((state) => {
              state.alerts.activeAlerts = activeAlerts
              state.alerts.triggeredAlerts = triggeredAlerts
              state.alerts.loading = false
            })
          } else {
            set((state) => {
              state.alerts.error = 'Error loading alerts'
              state.alerts.loading = false
            })
          }
        },
        gethMarketsInfo(payload: any, args: any) {
          const set = get().set
          const state = {}
          
          const chainId = payload[1];

          //baseSymbol: "BTC"
          //baseVolume24h: 5.490100000000003
          //bestAsk: 19811.2
          //bestBid: 19770.9
          //change1h: 0
          //change24h: -0.0034256926952141056
          //changeBod: -0.0034809154152665874
          //high24h: 20160.2
          //last: 19782
          //low24h: 19624.7
          //markPrice: 19828.23249999
          //maxLeverage: 5
          //midPrice: 19791.050000000003
          //name: "BTC/USDC"
          //negSlipLiq2pct: 675438.7588199999
          //posSlipLiq2pct: 519318.34454
          //quoteVolume24h: 108801.44890999993
          //volumeUsd24h: 108801.44890999993

          let parsedMarketsInfo = [];

          payload[0].forEach((update) => {
            const market = update[0];
            const price = update[1];
            const change = update[2];

            const quoteVolume = update[3];


            if (!price || Number.isNaN(price)) return;

            // @ts-ignore
            parsedMarketsInfo.push({
              // @ts-ignore
              baseSymbol: (market.split("-"))[0].toUpperCase(),
              // @ts-ignore
              baseVolume24h: 5.490100000000003,
              // @ts-ignore
              bestAsk: 19811.2,
              // @ts-ignore
              bestBid: 19770.9,
              // @ts-ignore
              change1h: 0,
              // @ts-ignore
              change24h: change,
              // @ts-ignore
              changeBod: -0.0034809154152665874,
              // @ts-ignore
              high24h: 20160.2,
              // @ts-ignore
              last: 19782,
              // @ts-ignore
              low24h: 19624.7,
              // @ts-ignore
              markPrice: price,
              // @ts-ignore
              maxLeverage: 5,
              // @ts-ignore
              midPrice: price,
              // @ts-ignore
              name: market,
              // @ts-ignore
              negSlipLiq2pct: 675438.7588199999,
              // @ts-ignore
              posSlipLiq2pct: 519318.34454,
              // @ts-ignore
              quoteVolume24h: quoteVolume,
              // @ts-ignore
              volumeUsd24h: 108801.44890999993
            })

            // if (!state.lastPrices[chainId]) state.lastPrices[chainId] = {};

            // state.lastPrices[chainId][market] = {
            //   price: update[1],
            //   change: update[2],
            //   quoteVolume: state.lastPrices[chainId][market]
            //     ? state.lastPrices[chainId][market].quoteVolume
            //   : 0,
            // };

            // Sometimes lastprice doesn't have volume data
            // Keep the old data if it doesn't
            // if (update[3]) {
            //   state.lastPrices[chainId][market].quoteVolume = update[3];
            // }

            // if (update[0] === state.currentMarket) {
            //   state.marketSummary.price = price;
            //   state.marketSummary.priceChange = change;
            // }
          });

          set((state) => {
            state.marketsInfo = parsedMarketsInfo
          })
          
        },
        async fetchMarketsInfo() {
          const set = get().set
          const groupConfig = get().selectedMangoGroup.config
          const mangoGroup = get().selectedMangoGroup.current

          try {
            const data = await fetch(
              `https://mango-all-markets-api.herokuapp.com/markets/`
            )

            console.log("data____", data)

            if (data?.status === 200) {
              const parsedMarketsInfo = (await data.json()).filter((market) => {
                const marketKind = market.name.includes('PERP')
                  ? 'perp'
                  : 'spot'

                const marketConfig = getMarketByBaseSymbolAndKind(
                  groupConfig,
                  market.baseSymbol,
                  marketKind
                )

                console.log("marketConfig___", marketConfig)

                if (!marketConfig || !marketConfig.publicKey) return false

                const marketMode: MarketMode =
                  mangoGroup?.tokens[marketConfig.marketIndex][
                    marketKind + 'MarketMode'
                  ]
                const isInactive =
                  marketMode == MarketMode.ForceCloseOnly ||
                  marketMode == MarketMode.Inactive

                return !isInactive
              })
              
              // mango state
              // set((state) => {
              //   state.marketsInfo = parsedMarketsInfo
              // })

            }
          } catch (e) {
            console.log('ERORR: Unable to load all market info')
          }
        },
        async fetchProfileDetails(walletPk: string) {
          const set = get().set
          set((state) => {
            state.profile.loadDetails = true
          })
          try {
            const response = await fetch(
              `https://mango-transaction-log.herokuapp.com/v3/user-data/profile-details?wallet-pk=${walletPk}`
            )
            const data = await response.json()
            set((state) => {
              state.profile.details = data
              state.profile.loadDetails = false
            })
          } catch (e) {
            // notify({ type: 'error', title: t('profile:profile-fetch-fail') })
            console.log(e)
            set((state) => {
              state.profile.loadDetails = false
            })
          }
        },
      },
    }
  })
)

export default useMangoStore
