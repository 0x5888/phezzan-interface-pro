import { MangoAccount, TokenAccount } from '@blockworks-foundation/mango-client'
import { Wallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import useMangoStore from '../stores/useMangoStore'
import api from "utils/api"

export async function deposit({
  amount,
  address,
}: {
  amount: number
  address: string
}) {
  return await api.deposit(amount, address)
}


export async function withdraw({
  amount,
  token,
  allowBorrow,
  wallet,
  mangoAccount,
}: {
  amount: number
  token: PublicKey
  allowBorrow: boolean
  wallet: Wallet
  mangoAccount: MangoAccount | null
}) {
  const mangoGroup = useMangoStore.getState().selectedMangoGroup.current
  const tokenIndex = mangoGroup?.getTokenIndex(token)
  const mangoClient = useMangoStore.getState().connection.client

  if (tokenIndex === undefined || !mangoAccount) return

  const publicKey =
    mangoGroup?.rootBankAccounts?.[tokenIndex]?.nodeBankAccounts[0].publicKey
  const vault =
    mangoGroup?.rootBankAccounts?.[tokenIndex]?.nodeBankAccounts[0].vault

  if (
    mangoGroup &&
    mangoAccount &&
    wallet &&
    vault &&
    publicKey &&
    mangoGroup.rootBankAccounts[tokenIndex]?.nodeBankAccounts?.[0].vault !==
      undefined
  ) {
    return await mangoClient.withdraw(
      mangoGroup,
      mangoAccount,
      wallet?.adapter,
      mangoGroup.tokens[tokenIndex].rootBank,
      publicKey,
      vault,
      Number(amount),
      allowBorrow
    )
  }
}
