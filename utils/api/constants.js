import { ethers } from "ethers";


export const MAX_ALLOWANCE = ethers.BigNumber.from(
  "3402823669209384634633746074310"
);

export const balanceBundlerAddress = '0x1b7ad12c73b9fea574cd2320650676c0a0bde8a0';

export const ARBITRUM_ADDRESSES = {
  "FEE_RECIPIENT_ADDRESS": "0x243c63b79e9Ac23768fD5469Fa20692c82308914",
  "EXCHANGE_ADDRESS": "0x5998a3569ec138b19c07d3369aecc5871a9c0f61",
  "WETH_ADDRESS": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
}

//0x6Ad6138C66Bc3064fE165634CFaA0ff3e1126a25
export const ZK2_ADDRESSES = {
  "FEE_RECIPIENT_ADDRESS": "0x53be8CB82A838ac047bD0C2c3696Dc97Ae97AAD0",
  "EXCHANGE_ADDRESS": "0x1A89954C8dF8Fd2Cbd52015A1a962463327051B0",
  "WETH_ADDRESS": "0x000000000000000000000000000000000000800A"
}



export const POLYGON_MUMBAI_WETH_ADDRESS = "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa";
export const POLYGON_MAINNET_WETH_ADDRESS = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";

export const ZKSYNC_POLYGON_BRIDGE = {
  address: "0xbb256f544b8087596e8e6cdd7fe9726cc98cb400",
  key: "zksync_polygon",
  eligibleTokensZkSync: ["ETH"],
  eligibleTokensPolygon: ["WETH"],
  zkSyncToPolygon: "zkSync_to_polygon",
  polygonToZkSync: "polygon_to_zkSync"
}

export const  ETH_ZKSYNC_BRIDGE = {
  ethTozkSync: "eth_to_zksync"
}

export const ZKSYNC_ETHEREUM_FAST_BRIDGE = {
  address: "0xCC9557F04633d82Fb6A1741dcec96986cD8689AE",
  key: "zksync_ethereum",
  eligibleTokensZkSync: ["ETH", "FRAX", "UST"],
  eligibleTokensEthereum: [],
  receiptKeyZkSync: "withdraw_fast",
}

export const NETWORKS = [
  {
    from: {
      network: 'Ethereum',
      key: 'ethereum',
      //icon: ethLogo,
    }, to: [{ 
      network: 'zkSync', key: 'zksync', //icon: zksyncLogo 
    }]
  },
  {
    from: {
      network: 'zkSync',
      key: 'zksync',
      //icon: zksyncLogo
    }, to: [{ network: 'Ethereum', key: 'ethereum', 
    //icon: ethLogo 
  }, { network: 'Polygon', key: 'polygon', 
    //icon: polygonLogo 
  }]
  },
  {
    from: {
      network: 'Polygon',
      key: 'polygon',
      //icon: polygonLogo
    }, to: [{ network: 'zkSync', key: 'zksync', 
    //icon: zksyncLogo 
  }]
  },
];