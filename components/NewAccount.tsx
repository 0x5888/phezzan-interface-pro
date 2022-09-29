import React, { FunctionComponent, useState, useEffect } from 'react'
import {
  ExclamationCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/solid'
import Input, { Label } from './Input'
import AccountSelect from './AccountSelect'
import { ElementTitle } from './styles'
import useMangoStore from '../stores/useMangoStore'
import {
  getSymbolForTokenMintAddress,
  trimDecimals,
  sleep,
} from '../utils/index'
import Loading from './Loading'
import Button from './Button'
import Tooltip from './Tooltip'
import { notify } from '../utils/notifications'
import { deposit } from '../utils/mango'
import { useTranslation } from 'next-i18next'
import ButtonGroup from './ButtonGroup'
import InlineNotification from './InlineNotification'
import Modal from './Modal'
import { useWallet } from '@solana/wallet-adapter-react'
import api from "utils/api";
import { bigNum2Big } from "../utils/number"
interface NewAccountProps {
  onAccountCreation: (x?) => void
}

const NewAccount: FunctionComponent<NewAccountProps> = ({
  onAccountCreation,
}) => {
  const { t } = useTranslation('common')
  const [inputAmount, setInputAmount] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [invalidAmountMessage, setInvalidAmountMessage] = useState('')
  const [depositPercentage, setDepositPercentage] = useState('')
  const [invalidNameMessage, setInvalidNameMessage] = useState('')
  const [name, setName] = useState('')
  const { wallet } = useWallet()
  //const walletTokens = useMangoStore((s) => s.wallet.tokens)

  const [selectedAccount, setSelectedAccount] = useState<any>({})
  const [usdcBalance, setUsdcBalance] = useState<any>();

  const getBalance = async () => {
    const balance = await api.getWalletBalances()


    setUsdcBalance(bigNum2Big(balance, 6).toString())
  }

  useEffect(() => {
    setSelectedAccount({
      config: {
        symbol: 'USDC',
        decimals: 8,
      },
      uiBalance: usdcBalance,
    })
  }, usdcBalance)

  useEffect(() => {
    getBalance().catch((err) => console.log(err))
  }, [])

  const actions = useMangoStore((s) => s.actions)

  

  const symbol = getSymbolForTokenMintAddress(
    selectedAccount?.account?.mint.toString()
  )

  const handleAccountSelect = (account) => {
    setInputAmount('')
    setDepositPercentage('')
    setInvalidAmountMessage('')
    setSelectedAccount(account)
  }

  const allowanceExchange = async() => {
    const allowance = await api.allowanceExchange();
    console.log("allowance____", allowance, allowance.toString())
  }

  useEffect(() => {
    allowanceExchange().catch((err) => {
      console.log("allowance____ccccccccc", err)
    })
  }, [])

  const handleNewAccountDeposit = () => {
    if (!(selectedAccount && selectedAccount.uiBalance)) return
  
    validateAmountInput(inputAmount)
    if (inputAmount) {
      setSubmitting(true)
      
      deposit({
        amount: parseFloat(inputAmount),
        address: "0xEE61C60aE6d426E9A6cc817975c0301208222d09"
      })
        .then(async (response) => {
          await sleep(1000)

          console.log("response____", response)
          
          //actions.fetchWalletTokens(wallet)
          //actions.fetchAllMangoAccounts(wallet)
          
          if (response && response.length > 0) {
            onAccountCreation(response[0])
            notify({
              title: 'Mango Account Created',
              txid: response[1],
            })
          }
          setSubmitting(false)
        })
        .catch((e) => {
          setSubmitting(false)
          console.error(e)
          notify({
            title: t('init-error'),
            description: e.message,
            type: 'error',
          })
          onAccountCreation()
        })
    }
  }

  console.log("selectedAccount____", selectedAccount)

  const validateAmountInput = (amount) => {
    if (Number(amount) <= 0) {
      setInvalidAmountMessage(t('enter-amount'))
    }
    if (Number(amount) > selectedAccount.uiBalance) {
      setInvalidAmountMessage(t('insufficient-balance-deposit'))
    }
  }

  const onChangeAmountInput = (amount) => {
    setInputAmount(amount)
    setDepositPercentage('')
    setInvalidAmountMessage('')
  }

  const onChangeAmountButtons = async (percentage) => {
    setDepositPercentage(percentage)
    console.log("onChangeAmountButtons___", percentage, selectedAccount)

    if (!selectedAccount) {
      setInvalidAmountMessage(t('supported-assets'))
      return
    }

    const max = selectedAccount.uiBalance
    const amount = ((parseInt(percentage) / 100) * max).toString()
    if (percentage === '100') {
      setInputAmount(amount)
    } else {
      setInputAmount(trimDecimals(amount, 6).toString())
    }
    setInvalidAmountMessage('')
    validateAmountInput(amount)
  }

  const validateNameInput = () => {
    if (name.length >= 33) {
      setInvalidNameMessage(t('character-limit'))
    }
  }

  const onChangeNameInput = (name) => {
    setName(name)
    if (invalidNameMessage) {
      setInvalidNameMessage('')
    }
  }

  const [loading, setLoading] = useState(false)

  const handleRefreshBalances = async () => {
    setLoading(true)
    const balance = await api.getWalletBalances()
    setUsdcBalance(bigNum2Big(balance, 6).toString())
    setLoading(false)
  }

  console.log("selectedAccount___111",inputAmount,  parseFloat(inputAmount), selectedAccount, parseFloat(inputAmount) <= 0,
  parseFloat(inputAmount) > selectedAccount.uiBalance)

  return (
    <>
      <Modal.Header align="items-start">
        <ElementTitle noMarginBottom>Deposit</ElementTitle>
      </Modal.Header>
      <div className="flex h-11 mt-9">
        <AccountSelect
          //accounts={walletTokens}
          selectedAccount={selectedAccount}
          onSelectAccount={handleAccountSelect}
          handleRefresh={handleRefreshBalances}
        />
        <Input
          wrapperClassName="w-full ml-2 grow"
          //className="h-full"
          type="number"
          min="0"
          placeholder="0.00"
          error={!!invalidAmountMessage}
          onBlur={(e) => validateAmountInput(e.target.value)}
          value={inputAmount || ''}
          onChange={(e) => onChangeAmountInput(e.target.value)}
          suffix={symbol}
        />
      </div>
      <div className="flex text-th-fgd-1 mt-2">
        <div className="text-right">{usdcBalance}<span className="ml-4">available</span></div>
      </div>
      
      {invalidAmountMessage ? (
        <div className="flex items-center py-1.5 text-th-red">
          <ExclamationCircleIcon className="mr-1.5 h-4 w-4" />
          {invalidAmountMessage}
        </div>
      ) : null}
      <div className="pt-1 mt-2">
        <ButtonGroup
          activeValue={depositPercentage}
          onChange={(v) => onChangeAmountButtons(v)}
          unit="%"
          values={['25', '50', '75', '100']}
        />
      </div>
      <div className={`flex justify-center pt-6`}>
        <Button
          disabled={
            parseFloat(inputAmount) <= 0 ||
            parseFloat(inputAmount) > selectedAccount.uiBalance
          }
          onClick={handleNewAccountDeposit}
          className="w-full"
        >
          <div className={`flex items-center justify-center`}>
            {submitting && <Loading className="-ml-1 mr-3" />}
            Deposit
          </div>
        </Button>
      </div>
    </>
  )
}

export default NewAccount
