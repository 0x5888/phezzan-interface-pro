import API from "./API";
import APIZkSync2Provider from "./providers/APIZkSync2Provider";

const api = new API({
  //infuraId: process.env.REACT_APP_INFURA_ID,
  infuraId: "6a61248b8b314845ab82371de83ea99f",
  rpc: "https://zksync2-testnet.zksync.dev",
  networks: {
    zkSync2: [
      280,
      APIZkSync2Provider,
      "0x6Ad6138C66Bc3064fE165634CFaA0ff3e1126a25", // What is this for?
    ],
    // starknet: [1001, APIStarknetProvider],
  },
});

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  window?.api = api;
}

export { API };
export default api;
