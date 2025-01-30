import {TonConnectUI} from "@tonconnect/ui-react";
import {
  Network,
  OperationTracker,
  SenderFactory,
  TacSdk,
  TransactionLinker
} from "tac-sdk";
import {ethers} from "ethers";
import {toNano, TonClient} from "@ton/ton";
import {create} from "zustand";

interface State {
  isDone: boolean
  isFailed: boolean
  isRunning: boolean
  isSigning: boolean
  message: string
  progress: number
  setIsDone: (value: boolean) => void
  setIsFailed: (value: boolean) => void
  setIsRunning: (value: boolean) => void
  setIsSigning: (value: boolean) => void
  setMessage: (value: string) => void
  setProgress: (value: number) => void
  reset: () => void
}

let tacSdk: null | TacSdk = null
const useStore = create<State>()((set) => ({
  isDone: false,
  isFailed: false,
  isRunning: false,
  isSigning: false,
  message: '',
  progress: 0,
  setIsDone: (value) => set(() => ({isDone: value})),
  setIsFailed: (value) => set(() => ({isFailed: value})),
  setIsRunning: (value) => set(() => ({isRunning: value})),
  setIsSigning: (value) => set(() => ({isSigning: value})),
  setMessage: (value) => set(() => ({message: value})),
  setProgress: (value) => set(() => ({progress: value})),
  reset: () => set(() => ({
    isDone: false,
    isFailed: false,
    isRunning: false,
    isSigning: false,
    message: '',
    progress: 0,
  })),
}))

export function useCCT() {
  const store = useStore(state => state);

  const getOperationStatus = async (operationId: string) => {
    // TODO: sdk is not updated its getOperationStatus method yet

    const res = await fetch("https://turin.data.tac.build/status", {
      body: JSON.stringify({operationIds: [operationId]}),
      method: "POST",
    });
    const {response} = await res.json();
    return response[0].status;
  }

  async function pollStatus(txLinker: TransactionLinker, maxAttempts = 200, delay = 5) {
    const tracker = new OperationTracker(Network.Testnet);
    let attempts = 0;
    let operationId = ""

    const poll = async (): Promise<boolean | void> => {
      if (!useStore.getState().isRunning) {
        return
      }

      if (attempts >= maxAttempts) {
        store.setIsFailed(true);
        throw new Error("TX took more than expected, check execution on TAC Explorer");
      }

      if (operationId === "") {
        operationId = await tracker.getOperationId(txLinker).catch(() => '');
        store.setMessage("Waiting for TAC OperationId");
      } else {
        const status = await getOperationStatus(operationId).catch(() => '');
        switch (status) {
          case "EVMMerkleMessageCollected":
            //All events collected for sharded message
            store.setProgress(40);
            store.setMessage("TX Collected by the TAC Adapter...");
            break;
          case "EVMMerkleRootSet":
            //Message added to Merkle tree
            store.setProgress(60);
            store.setMessage("TX Executed by TAC Adapter, waiting for the finalization...");
            break;
          case "EVMMerkleMessageExecuted":
            //Executed on EVM side
            store.setProgress(70);
            store.setMessage("TX finalized on TAC, going back to TON...");
            break;
          case "TVMMerkleMessageCollected":
            //Return message generated
            store.setProgress(80);
            store.setMessage("TX Collected by the TAC adapter...");
            break;
          case "TVMMerkleRootSet":
            //TVM message added to tree
            store.setMessage("TX scheduled on TON, you will see the updated balance on your wallet in a few seconds...");
            store.setProgress(100);
            store.setIsDone(true);
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
      await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      return poll();
    };

    return poll();
  }

  const drip = async (tonConnectUI: TonConnectUI, tonAmount: number, proxyAddress: string) => {
    try {
      if (useStore.getState().isRunning) {
        store.setIsSigning(true);
        store.setIsRunning(false);
        await new Promise((resolve) => setTimeout(resolve, 5100));
      }

      store.reset();
      store.setIsSigning(true);
      store.setIsRunning(true);
      store.setMessage("Initializing SDK");

      tacSdk = await TacSdk.create({
        network: Network.Testnet,
        TONParams: {
          contractOpener: new TonClient({
            endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
            apiKey: '***REMOVED***'
          })
        }
      });

      store.setProgress(10);
      store.setMessage("Opening Wallet");


      const evmProxyMsg = {
        evmTargetAddress: proxyAddress,
        methodName: "mint(bytes,bytes)",
        encodedParameters: ethers.AbiCoder.defaultAbiCoder().encode(
          ["tuple(address,uint256)"],
          [[proxyAddress, Number(toNano(tonAmount))]]
        ),
      };
      const sender = await SenderFactory.getSender({tonConnect: tonConnectUI});
      const assets = [{amount: Number(tonAmount)}]
      const txLinker = await tacSdk.sendCrossChainTransaction(evmProxyMsg, sender, assets);
      tacSdk.closeConnections();

      store.setIsSigning(false);
      store.setProgress(20);

      const result = await pollStatus(txLinker);
      console.log(result);
    } catch (e) {
      console.warn("TX failed with err: " + e);
      if (tacSdk) {
        tacSdk.closeConnections();
      }
      store.setIsFailed(true);
      store.setIsSigning(false);
      store.setMessage('' + e);
    }

  }

  const refund = async (tonConnectUI: TonConnectUI, tokenAmount: number, proxyAddress: string, jettonAddress: string) => {
    try {
      if (useStore.getState().isRunning) {
        store.setIsSigning(true);
        store.setIsRunning(false);
        await new Promise((resolve) => setTimeout(resolve, 5100));
      }

      store.reset();
      store.setIsSigning(true);
      store.setIsRunning(true);
      store.setMessage("Initializing SDK");

      tacSdk = await TacSdk.create({
        network: Network.Testnet,
        TONParams: {
          contractOpener: new TonClient({
            endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
            apiKey: '***REMOVED***'
          })
        }
      });

      store.setProgress(10);
      store.setMessage("Opening Wallet");

      await new Promise((resolve) => setTimeout(resolve, 2000));
      const tvmAddress = await tacSdk.getTVMTokenAddress(jettonAddress)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const encodedArguments = ethers.AbiCoder.defaultAbiCoder().encode(["tuple(address,uint256)"], [[proxyAddress, Number(toNano(tokenAmount))]]);
      const evmProxyMsg = {
        evmTargetAddress: proxyAddress,
        methodName: "burn(bytes,bytes)",
        encodedParameters: encodedArguments,
      };
      const sender = await SenderFactory.getSender({tonConnect: tonConnectUI});
      const assets = [{address: tvmAddress, amount: Number(tokenAmount)}];
      const txLinker = await tacSdk.sendCrossChainTransaction(evmProxyMsg, sender, assets);
      tacSdk.closeConnections();

      // unlock ui here
      store.setIsSigning(false);
      store.setProgress(20);

      const result = await pollStatus(txLinker);
      console.log(result)
    } catch (e) {
      console.log("TX failed with err: " + e);
      store.setIsFailed(true);
      store.setMessage('' + e);
    }

  }

  const reset = () => {
    store.reset();
    if (tacSdk) {
      tacSdk.closeConnections();
      tacSdk = null
    }
  }

  return {
    isDone: store.isDone,
    isFailed: store.isFailed,
    isSigning: store.isSigning,
    isRunning: store.isRunning,
    message: store.message,
    progress: store.progress,
    drip,
    refund,
    reset
  };
}
