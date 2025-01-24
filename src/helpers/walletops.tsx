import {TonClient} from '@ton/ton';
import {
  AssetBridgingData,
  Network,
  SenderFactory,
  TacSdk,
  TransactionLinker,
  TransactionStatus
} from "tac-sdk";

import {ethers} from "ethers";
import {fromNano, toNano} from "@ton/ton";
import {Address, beginCell} from "@ton/core";

import {data} from '../helpers/config.tsx';
import {TonConnectUI} from "@tonconnect/ui-react";

// @dev
// * Helper function to retrieve the JettonWalletAddress associated to the User's Wallet Address for a specific Jetton Token Master
// *
const getUserJettonWalletAddress = async (userAddress: Address, jettonAddress: Address, client: TonClient) => {
  try {
    const cell = beginCell().storeAddress(userAddress).endCell();
    const result = await client.runMethod(jettonAddress, 'get_wallet_address', [{
      type: 'slice',
      cell
    }])
    return result.stack.readAddress().toString()
  } catch (e) {
    console.log("Failed to getUserJettonWalletAddress: " + e)
    return "";
  }
}

// @dev
// * Helper function to retrive the Balance associated to the User's Jetton Address for a specific Jetton Token Master
// *
const getJettonBalance = async (userJettonAddress: Address, client: TonClient) => {

  try {
    const result = await client.runMethod(userJettonAddress, 'get_wallet_data')
    return Number(fromNano(result.stack.readNumber())).toFixed(4)
  } catch (e) {
    console.log("Failed to getJettonBalance: " + e)
    return 0;
  }

}

// @dev
// * Helper function to retrive the TON Balance associated to the User's Wallet Address
// *
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
const getSigleJettonBalance = async (userAddress: Address, tokenIndex: number) => {
  const client = new TonClient({
    endpoint: data.tonclientUrl,
  })

  try {
    const userJettonWalletAddress = await getUserJettonWalletAddress(userAddress, Address.parse(data.cards[tokenIndex].jettonMaster), client);
    if (userJettonWalletAddress) {
      const userJettonBalance = await getJettonBalance(Address.parse(userJettonWalletAddress), client);
      if (userJettonBalance) {
        return userJettonBalance;
      }
    }
  } catch (e) {
    console.log("Failed to getSigleJettonBalance: " + e);
    return 0;
  }

}

// @dev
// * Helper function to trigger the drip of new tokens
// *
const drip = async (
  tonConnectUI: TonConnectUI,
  tonAmount: number,
  erc20ProxyApp: string,
  setCclMessage: (str: string) => void,
  setIsCCLDone: (bool: boolean) => void,
  setStage: (n: number) => void
) => {
  try {
    const tacSdk = new TacSdk({
      network: Network.Testnet,
      delay: 0
    });

    await tacSdk.init();

    setStage(10);

    setCclMessage("Opening Wallet");

    //User's EVM Wallet Address is abstracted away from the Proxy Contract itself that act as a user wallet in its internal logic (the "to" param in the mint() method)
    const evmWalletAddress = erc20ProxyApp;

    console.log("tonAmount: " + tonAmount);
    console.log("erc20ProxyApp: " + erc20ProxyApp)

    // create evm proxy msg
    const abi = new ethers.AbiCoder();
    const encodedParameters = abi.encode(
      ["address", "uint256"],
      [
        evmWalletAddress,
        Number(toNano(tonAmount))
      ]
    );

    const evmProxyMsg = {
      evmTargetAddress: erc20ProxyApp,
      methodName:
        "mint(address,uint256)",
      encodedParameters,
    };

    const sender = await SenderFactory.getSender({
      tonConnect: tonConnectUI,
    });

    // we are sending NATIVE TON, no need to specify a jetton address
    const assets: AssetBridgingData[] = [{
      amount: Number(tonAmount)
    }]

    const txLinker = await tacSdk.sendCrossChainTransaction(evmProxyMsg, sender, assets);

    setStage(20);

    const result = await pollStatus(txLinker, 200, 2, setCclMessage, setIsCCLDone, setStage);
    console.log(result)

  } catch (e) {
    console.log("TX failed with err: " + e);
    setCclMessage("TX failed with err: " + e);
    setIsCCLDone(true);
  }

}

// @dev
// * Helper function to trigger the drip of new tokens
// *
const refund = async (
  tonConnectUI: TonConnectUI,
  tokenAmount: number,
  tokenDecimals: number,
  erc20ProxyApp: string,
  jettonMaster: string,
  setCclMessage: (str: string) => void,
  setIsCCLDone: (bool: boolean) => void,
  setStage: (n: number) => void
) => {

  try {
    const tacSdk = new TacSdk({
      network: Network.Testnet,
      delay: 0
    });

    await tacSdk.init();

    setStage(10);

    setCclMessage("Opening Wallet");

    // create evm proxy msg
    const abi = new ethers.AbiCoder();
    const encodedParameters = abi.encode(
      ["uint256"],
      [
        Number(tokenAmount) * 10 ** tokenDecimals
      ]
    );

    const evmProxyMsg = {
      evmTargetAddress: erc20ProxyApp,
      methodName: "burn(uint256)",
      encodedParameters,
    };

    const sender = await SenderFactory.getSender({
      tonConnect: tonConnectUI,
    });

    // create JettonTransferData (transfer jetton in TVM to swap)
    const assets: AssetBridgingData[] = []
    assets.push({
      address: jettonMaster,
      amount: Number(tokenAmount)
    });

    const txLinker = await tacSdk.sendCrossChainTransaction(evmProxyMsg, sender, assets);

    setStage(20);

    const result = await pollStatus(txLinker, 200, 2, setCclMessage, setIsCCLDone, setStage);
    console.log(result)
  } catch (e) {
    console.log("TX failed with err: " + e);
    setCclMessage("TX Failed! " + e);
    setIsCCLDone(true);
  }

}

async function pollStatus(
  txLinker: TransactionLinker,
  maxAttempts = 200,
  delay = 5,
  setCclMessage: (str: string) => void,
  setIsCCLDone: (bool: boolean) => void,
  setStage: (n: number) => void,
) {
  const tracker = new TransactionStatus();
  let attempts = 0;
  let operationId = ""
  let currentStage = 20;

  const updateStage = (newStage: number) => {
    if (newStage > currentStage) {
      currentStage = newStage;
      setStage(currentStage);
    }
  }

  const poll = async (): Promise<boolean | void> => {
    if (attempts >= maxAttempts) {
      setIsCCLDone(true);
      throw new Error("TX took more than expected, check execution on TAC Explorer");
    }

    if (operationId === "") {
      operationId = await tracker.getOperationId(txLinker);
      setCclMessage("Waiting for TAC OperationId");
    } else {
      updateStage(30);
      const status = await tracker.getStatusTransaction(operationId).catch(() => '');
      switch (status) {
        case "EVMMerkleMessageCollected":
          //All events collected for sharded message
          updateStage(40);
          setCclMessage("TX Collected by the TAC Adapter...");
          break;
        case "EVMMerkleRootSet":
          //Message added to Merkle tree
          updateStage(60);
          setCclMessage("TX Executed by TAC Adapter, waiting for the finalization...");
          break;
        case "EVMMerkleMessageExecuted":
          //Executed on EVM side
          updateStage(70);
          setCclMessage("TX finalized on TAC, going back to TON...");
          break;
        case "TVMMerkleMessageCollected":
          //Return message generated
          updateStage(80);
          setCclMessage("TX Collected by the TAC adapter...");
          break;
        case "TVMMerkleRootSet":
          //TVM message added to tree
          setCclMessage("TX scheduled on TON, you will see the updated balance on your wallet in a few seconds...");
          updateStage(100);
          setIsCCLDone(true);
          return true;
        case "TVMMerkleMessageExecuted":
          //Executed on TVM side
          //We skip this step as the time is
          break;
        default:
          break;
      }
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, delay * 1000)); // custom or 5 second (default) delay
    return poll();
  };

  return poll();
}

export {
  getUserJettonWalletAddress,
  getJettonBalance,
  getTONBalance,
  getSigleJettonBalance,
  drip,
  refund
}
