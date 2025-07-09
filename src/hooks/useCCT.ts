import {TonConnectUI, UserRejectsError} from "@tonconnect/ui-react";
import {
  Network,
  OperationTracker,
  SenderFactory,
  StageName,
  TacSdk,
  TransactionLinker
} from "@tonappchain/sdk";
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

  async function pollStatus(txLinker: TransactionLinker, maxAttempts = 200, delay = 5) {
    const tracker = new OperationTracker(Network.TESTNET);
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
        const { stage } = await tracker.getOperationStatus(operationId).catch(() => ({ stage: '' }));
        switch (stage) {
          case StageName.COLLECTED_IN_TAC:
            //All events collected for sharded message
            store.setProgress(40);
            store.setMessage("Collected in TAC...");
            break;
          case StageName.INCLUDED_IN_TAC_CONSENSUS:
            //Message added to Merkle tree
            store.setProgress(60);
            store.setMessage("Included in TAC consensus...");
            break;
          case StageName.EXECUTED_IN_TAC:
            //Executed on EVM side
            store.setProgress(70);
            store.setMessage("Executed in TAC...");
            break;
          case StageName.COLLECTED_IN_TON:
            //Return message generated
            store.setProgress(80);
            store.setMessage("Collected in TON...");
            break;
          case StageName.INCLUDED_IN_TON_CONSENSUS:
            //TVM message added to tree
            store.setMessage("Executing in TON, finishing...");
            store.setProgress(90);
            break;
          case StageName.EXECUTED_IN_TON:
            //Executed on TVM side
            //We skip this step as the time is
            store.setMessage("Finished!");
            store.setProgress(100);
            store.setIsDone(true);
            return true;
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
        network: Network.TESTNET,
        TONParams: {
          contractOpener: new TonClient({
            endpoint: "https://rp-testnet.turin.tac.build/api/v2/jsonRPC",
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
      console.log(result)
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

  const refund = async (tonConnectUI: TonConnectUI, tokenAmount: number, proxyAddress: string, jettonAddress: string, decimals: number = 9) => {
    console.log(tokenAmount, tokenAmount * 10 ** decimals, Math.floor(tokenAmount * 10 ** decimals))
    console.log(BigInt(Math.floor(tokenAmount * 10 ** decimals)))
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
        network: Network.TESTNET,
        TONParams: {
          contractOpener: new TonClient({
            endpoint: "https://rp-testnet.turin.tac.build/api/v2/jsonRPC",
          })
        }
      });

      store.setProgress(10);
      store.setMessage("Opening Wallet");

      await new Promise((resolve) => setTimeout(resolve, 2000));
      const tvmAddress = await tacSdk.getTVMTokenAddress(jettonAddress)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const encodedArguments = ethers.AbiCoder.defaultAbiCoder().encode(["tuple(address,uint256)"], [[proxyAddress, BigInt(Math.floor(tokenAmount * 10 ** decimals))]]);
      const evmProxyMsg = {
        evmTargetAddress: proxyAddress,
        methodName: "burn(bytes,bytes)",
        encodedParameters: encodedArguments,
      };
      const sender = await SenderFactory.getSender({tonConnect: tonConnectUI});
      const assets = [{address: tvmAddress, rawAmount: BigInt(Math.floor(tokenAmount * 10 ** decimals))}];
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
      if (e instanceof UserRejectsError) {
        store.setMessage('You rejected the transaction');
      }
      store.setMessage('Transaction was not send');
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
