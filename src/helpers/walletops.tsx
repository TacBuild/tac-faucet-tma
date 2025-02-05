import {TonClient} from '@ton/ton';
import {fromNano} from "@ton/ton";
import {Address} from "@ton/core";

import {data} from '../helpers/config.tsx';
import {Network, TacSdk} from "tac-sdk";

const getTONBalance = async (userAddress: Address) => {
  const client = new TonClient({
    endpoint: data.tonclientUrl,
  })

  try {
    const balance = await client.getBalance(userAddress);
    return Number(fromNano(balance)).toFixed(4);
  } catch (e) {
    console.log("Failed to getTONBalance: " + e);
    return 0;
  }
};

// @dev
// * Helper function to query the Balance of Jetton listed in the config file at index position tokenIndex.
// *
const getJettonBalance = async (userAddress: Address, tokenIndex: number) => {
  try {
    const tacSdk = await TacSdk.create({
      network: Network.Testnet,
      TONParams: {
        contractOpener: new TonClient({
          endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
          apiKey: '***REMOVED***'
        })
      }
    });
    const tvmMasterAddress = await tacSdk.getTVMTokenAddress(data.cards[tokenIndex].tokenAddress)
    const userJettonBalance = await tacSdk.getUserJettonBalance(userAddress.toString(), tvmMasterAddress);
    const decimals = data.cards[tokenIndex].decimals;
    const balance = Number(userJettonBalance) / 10 ** decimals || 0

    tacSdk.closeConnections()
    return balance
  } catch (e) {
    console.log("Failed to getJettonBalance: " + e);
    if ((e as { status: number })?.status?.toString().startsWith('5')) {
      throw e;
    }
    return 0;
  }
}

export {
  getTONBalance,
  getJettonBalance
}
