import { useEffect, useMemo, useState } from 'react'
import { Listbox } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/solid'
import { abbreviateAddress } from '../utils'
import useMangoStore, { WalletToken } from '../stores/useMangoStore'
import { RefreshClockwiseIcon } from './icons'
import { useTranslation } from 'next-i18next'
import { LinkButton } from './Button'
import { Label } from './Input'
import { useWallet } from '@solana/wallet-adapter-react'

type AccountSelectProps = {
  accounts?: WalletToken[]
  selectedAccount?: WalletToken
  onSelectAccount?: (WalletToken) => any
  hideAddress?: boolean
  handleRefresh?: () => void
}

const AccountSelect = ({
  accounts,
  selectedAccount,
  handleRefresh
}: AccountSelectProps) => {
  const { t } = useTranslation('common')
  const missingTokenSymbols = ["USDC"]

  const handleChange = (value: string) => {
  }

  const handleRefreshBalances = async () => {
    handleRefresh && handleRefresh()
  }

  const loading = false

  const usdcBalance = selectedAccount?.uiBalance

  return (
    <div className={`relative inline-block w-fit`}>
      {/* <div className="flex justify-between">
        {missingTokenSymbols && missingTokenSymbols.length > 0 ? (
          <LinkButton className="mb-1.5 ml-2" onClick={handleRefreshBalances}>
            <div className="flex items-center">
              <RefreshClockwiseIcon
                className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              {t('refresh')}
            </div>
          </LinkButton>
        ) : null}
      </div> */}
      <Listbox
        //value={selectedAccount?.account.publicKey.toBase58()}
        value={"USDC"}
        onChange={handleChange}
      >
        {({ open }) => (
          <div className="relative h-full">
            <div className="flex items-center h-full">
              <Listbox.Button
                className={`default-transition w-full h-full rounded-md border border-th-bkg-4 bg-th-bkg-1 p-2 font-normal hover:border-th-fgd-4 focus:border-th-fgd-4 focus:outline-none`}
              >
                <div
                  className={`flex px-4 items-between justify-between text-th-fgd-1`}
                >
                  {(
                    <div className={`flex flex-grow items-center`}>
                      <img
                        alt=""
                        width="20"
                        height="20"
                        src={`/assets/icons/usdc.svg`}
                        className={`mr-2`}
                      />
                      <div className="text-left">
                        USDC
                      </div>
                      {/* <div className={`ml-4 flex-grow text-right`}>
                        {usdcBalance}
                      </div> */}
                    </div>
                  )}
                  <ChevronDownIcon
                    className={`default-transition ml-6 h-5 w-5 text-th-fgd-1 ${
                      open ? 'rotate-180 transform' : 'rotate-360 transform'
                    }`}
                  />
                </div>
              </Listbox.Button>
            </div>
            <Listbox.Options
              className={`thin-scroll absolute left-0 top-14 z-20 max-h-60 w-max overflow-auto rounded-md bg-th-bkg-2 p-1`}
            >
              {missingTokenSymbols?.map((token) => 
              {
                return (
                <Listbox.Option key={token} value={token}>
                  <div
                    className={`px-2 py-1`}
                  >
                    <div className={`flex items-center text-th-fgd-1`}>
                      <img
                        alt=""
                        width="16"
                        height="16"
                        src={`/assets/icons/${token.toLowerCase()}.svg`}
                        className="mr-2"
                      />
                      <div className={`flex-grow text-left`}>{token}</div>
                      <div className={`text-xs ml-10`}>{usdcBalance}</div>
                    </div>
                  </div>
                </Listbox.Option>
              )}
              )}
            </Listbox.Options>
          </div>
        )}
      </Listbox>
    </div>
  )
}

export default AccountSelect
