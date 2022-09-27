import { ethers } from 'ethers';
import APIProvider from "./APIProvider";
import erc20ContractABI from "../../contracts/ERC20.json";
import PerpetualV1 from '../../contracts/artifacts-zk/contracts/protocol/v1/PerpetualV1.sol/PerpetualV1.json';
import { Contract } from "zksync-web3";
import { 
  ZK2_ADDRESSES
} from "../constants";
import {toBaseUnit} from "utils/number";

export default class APIZkSync2Provider extends APIProvider {

  accountState = {};
  evmCompatible = true;
  zksyncCompatible = false;
  _tokenInfo = {};
  _currencyAddresses = {
    "WETH": "0x000000000000000000000000000000000000800A",
    "USDC": "0x54a14D7559BAF2C8e8Fa504E019d32479739018c",
    "FRAX": "0x6e5056cBaa4082d4eeE06906Be7680A8524Ed675"
  }

  getAccountState = async () => {
    return this.accountState;
  };

  getBalances = async () => {
    const balances = {}
    if (!this.accountState.address) return balances;

    const address = this.accountState.address;

    const accountBalance = await this.getDydxAccountBalance(address);

    return this._getBalances(address, accountBalance);
  };

  getWalletBalances = async () => {
    const balances = {}
    const address = this.accountState.address
    if (!address) return balances;

    return this._getBalance("0xDBc19DE25039978f09d773539327A53C2930e083", address)
  }

  getDydxAccountBalance = async (address) => {
    const perpetual = await new ethers.Contract(
      "0x378a847e002971A7109672B22B6c647bf32bCD0B",
      PerpetualV1.abi,
      this.api.signer
    );

    //const perpetualSigner = perpetual.connect(wallet);

    const accountBalance = await perpetual.getAccountBalance(address);

    console.log("accountBalance___", accountBalance)

    return accountBalance;
  // console.log(await perpetualSigner.getAccountBalance(
  //   '0x037b993C2860F92fEd026a3136b0e4950450D385'));
  // console.log(await perpetualSigner.getAccountBalance(
  //   '0x460Cc2Ca6697D29F01be7AF3682066E0c7772be8'));
  }

  _getBalances = async (userAddress, accountBalance) => {
    const balances = {};
    
    console.log("balanceUpdate_____555", this._currencyAddresses)
    for (let currency in this._currencyAddresses) {
      const contractAddress = this._currencyAddresses[currency];
      if (contractAddress) {
        try {
          const currencyInfo = this.api.getCurrencyInfo(currency);
          let balanceBN = await this._getBalance(contractAddress, userAddress);
          console.log("currencyInfo___", currencyInfo, currencyInfo.decimals)
          const allowanceBN = (currency === 'WETH') 
            ? ethers.constants.MaxUint256
            : await this.allowance(contractAddress); // TODO replace
          const valueReadable = (balanceBN && currencyInfo)
            ? ethers.utils.formatUnits(balanceBN.toString(), currencyInfo.decimals)
            : 0 
          const allowanceReadable = (allowanceBN && currencyInfo)
            ? ethers.utils.formatUnits(allowanceBN.toString(), currencyInfo.decimals)
            : 0 

          balances[currency] = {
            value: balanceBN.toString(),
            valueReadable,
            allowance: allowanceBN.toString(),
            allowanceReadable
          }
        } catch (e) {
          console.error(e)
        }
      }
    }

    console.log("balanceUpdate_____666", balances)

    balances.accountBalance = accountBalance || []

    return balances;
  };

  _getBalance = async (tokenAddress, userAddress) => {
    const address = this.accountState.address;
    console.log("_getBalance___address___", address)
    if (!userAddress) return 0;

    if (tokenAddress === this._currencyAddresses["WETH"]) {
      return await this.api.web3.eth.getBalance(userAddress);
    }

    const erc20Contract = new Contract(
      tokenAddress,
      erc20ContractABI,
      this.api.signer
    );
  
    const balance = await erc20Contract.balanceOf(userAddress);
    return balance;
  };

  allowanceExchange = async () => {
    const address = this.accountState.address
    if (!address) return 0;

    const perpContract = new ethers.Contract(
      "0xDBc19DE25039978f09d773539327A53C2930e083",
      //PerpetualV1.abi,
      erc20ContractABI,
      this.api.signer
    );

    const allowance = await perpContract.allowance(
      //address,
      address,
      "0x6Ad6138C66Bc3064fE165634CFaA0ff3e1126a25",
      //"0xDBc19DE25039978f09d773539327A53C2930e083",
      //1000000000000
    );

    //
    // await erc20ContractSigner.approve(
    //   "0x6Ad6138C66Bc3064fE165634CFaA0ff3e1126a25",
    //   1_000_000_000_000
    // );

    console.log('Approved the spending.');

    return ethers.BigNumber.from(allowance);
  };

  // TODO replace
  allowance = async (tokenAddress) => {
    if (!this.accountState.address) return 0;

    const erc20Contract = new ethers.Contract(
      tokenAddress,
      erc20ContractABI,
      this.api.signer
    );

    const allowance = await erc20Contract.allowance(
      this.accountState.address,
      ZK2_ADDRESSES.EXCHANGE_ADDRESS
    );

    //
    // await erc20ContractSigner.approve(
    //   "0x6Ad6138C66Bc3064fE165634CFaA0ff3e1126a25",
    //   1_000_000_000_000
    // );

    console.log('Approved the spending.');

    return ethers.BigNumber.from(allowance);
  };

  deposit = async (address, amount) => {
    console.log("deposit____222", amount, address);

    const amountNum = toBaseUnit(String(amount), 6);

    const perpetual = await new ethers.Contract(
      //config["proxyResult"],
      "0x6Ad6138C66Bc3064fE165634CFaA0ff3e1126a25",
      PerpetualV1.abi,
      this.api.signer
    );
  
    await perpetual.deposit(address, amountNum, {
      gasLimit: 2500000,
      gasPrice: 550000000
  });
  }

  
  // buy: 
  // sell
  submitOrder = async (market, side, price, baseAmount, quoteAmount, orderType) => {
    const marketInfo = this.api.marketInfo[market];

    //quoteAmount: 1 baseAmount: 0, b
    //quoteAmount: 0, baseAmount: 1, s
    console.log("quoteAmount_______", quoteAmount, baseAmount, side)
    //if (!quoteAmount) quoteAmount = baseAmount * price;

    if (side === "s") {
      quoteAmount = baseAmount;
      baseAmount = 0;
    }

    if (!baseAmount) baseAmount = quoteAmount / price;

    


    let makerToken, takerToken, makerAmountBN, takerAmountBN, gasFee;
    if(side === 's') {
      makerToken = marketInfo.baseAsset.address;
      takerToken = marketInfo.quoteAsset.address;
      makerAmountBN = ethers.utils.parseUnits (
        baseAmount.toFixed(marketInfo.baseAsset.decimals),
        marketInfo.baseAsset.decimals
      );
      takerAmountBN = ethers.utils.parseUnits (
        quoteAmount.toFixed(marketInfo.quoteAsset.decimals),
        marketInfo.quoteAsset.decimals
      );
      gasFee = ethers.utils.parseUnits (
        marketInfo.baseFee.toFixed(marketInfo.baseAsset.decimals),
        marketInfo.baseAsset.decimals
      )
    } else {
      makerToken = marketInfo.quoteAsset.address;
      takerToken = marketInfo.baseAsset.address;
      makerAmountBN = ethers.utils.parseUnits (
        quoteAmount.toFixed(marketInfo.quoteAsset.decimals),
        marketInfo.quoteAsset.decimals
      )
      takerAmountBN = ethers.utils.parseUnits (
        baseAmount.toFixed(marketInfo.baseAsset.decimals),
        marketInfo.baseAsset.decimals
      )
      gasFee = ethers.utils.parseUnits (
        (+(marketInfo.quoteFee)).toFixed(marketInfo.quoteAsset.decimals),
        marketInfo.quoteAsset.decimals
      )
    }

    const expirationTimeSeconds = (orderType === 'market')
      ? Date.now() / 1000 + 60 * 2 // two minutes
      : Date.now() / 1000 + 60 * 60 * 24 * 7 // one week

    const Order = {
      makerAddress: this.accountState.address,
      makerToken: makerToken,
      takerToken: takerToken,
      feeRecipientAddress: ZK2_ADDRESSES.FEE_RECIPIENT_ADDRESS,
      makerAssetAmount:  makerAmountBN.toString(),
      takerAssetAmount: takerAmountBN.toString(),
      makerVolumeFee: '0',
      takerVolumeFee: '0',
      gasFee: gasFee.toString(),
      expirationTimeSeconds: expirationTimeSeconds.toFixed(0),
      salt: (Math.random() * 123456789).toFixed(0),
    };
    
    // Todo: update to Phezzan
    const domain = {
      name: 'Phezzan',
      version: '1',
      chainId: this.network,
    };

    const types = {
      "Order": [
        { "name": 'makerAddress', "type": 'address' },
        { "name": 'makerToken', "type": 'address' },
        { "name": 'takerToken', "type": 'address' },
        { "name": 'feeRecipientAddress', "type": 'address' },
        { "name": 'makerAssetAmount', "type": 'uint256' },
        { "name": 'takerAssetAmount', "type": 'uint256' },
        { "name": 'makerVolumeFee', "type": 'uint256' },
        { "name": 'takerVolumeFee', "type": 'uint256' },
        { "name": 'gasFee', "type": 'uint256' },
        { "name": 'expirationTimeSeconds', "type": 'uint256' },
        { "name": 'salt', "type": 'uint256' }
      ]
    };

    console.log(domain, types, Order);
    const signature = await this.api.signer._signTypedData(domain, types, Order);
    console.log(signature);

    Order.signature = signature;
    //
    this.api.send("submitorder3", [this.network, market, Order]);
    return Order;    
  }

  signIn = async () => {
    console.log('signing in to zkSync 2.0');
    const [account] = await this.api.web3.eth.getAccounts();
    const balances = await this.getBalances();
    this.accountState = {
      id: account,
      address: account,
      committed: {
        balances,
      },
    };

    return this.accountState;
  }

  approveExchangeContract = async (token, amount) => {
    //const currencyInfo = this.api.getCurrencyInfo(token);
    //if (!currencyInfo.address) throw new Error(`ERC20 address for ${token} not found`);
    let amountBN;
    if(!amount) {
      amountBN = ethers.constants.MaxUint256;
    } else {
      amountBN = ethers.constants.MaxUint256;
    }

    const erc20Contract = new ethers.Contract(
      "0xDBc19DE25039978f09d773539327A53C2930e083",
      erc20ContractABI,
      this.api.signer
    );

    await erc20Contract.approve(
      //ZK2_ADDRESSES.EXCHANGE_ADDRESS,
      "0x6Ad6138C66Bc3064fE165634CFaA0ff3e1126a25",
      amountBN
    );

    // update account balance
    //await this.api.getBalances();
    return true;
  };
}
