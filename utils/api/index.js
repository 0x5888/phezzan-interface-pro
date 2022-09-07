import API from "./API";
import APIZkSync2Provider from "./providers/APIZkSync2Provider";

const api = new API({
  //infuraId: process.env.REACT_APP_INFURA_ID,
  infuraId: "6a61248b8b314845ab82371de83ea99f",
  networks: {
    zkSync2: [
      280,
      APIZkSync2Provider,
      "0x82f67958a5474e40e1485742d648c0b0686b6e5d", // What is this for?
    ],
    // starknet: [1001, APIStarknetProvider],
  },
});

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  window?.api = api;
}

export { API };
export default api;
