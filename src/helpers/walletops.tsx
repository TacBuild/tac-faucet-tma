import React, { useState, useEffect, useCallback } from 'react';
import { useTonWallet, useTonAddress } from "@tonconnect/ui-react";
import { TonClient } from '@ton/ton';
import { AssetBridgingData, EvmProxyMsg, Network, SenderFactory, TacSdk, TacSDKTonClientParams, startTracking } from "tac-sdk";

import { ethers } from "ethers";
import { fromNano, toNano } from "@ton/ton";
import { Address, beginCell} from "@ton/core";

import { data } from '../helpers/config.tsx';

// @dev
// * Helper function to retrive the JettonWalletAddress associated to the User's Wallet Address for a specific Jetton Token Master
// *
const getUserJettonWalletAddress = async (userAddress: Address, jettonAddress: Address, client: TonClient) => {

  userAddress = Address.parse(userAddress);

  try {
    const cell = beginCell().storeAddress(userAddress).endCell();
    const result = await client.runMethod(jettonAddress, 'get_wallet_address', [{
      type: 'slice',
      cell
    }])
    return result.stack.readAddress().toString()
  } catch (e) {
    console.log("Failed to getUserJettonWalletAddress: "+e)
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
    console.log("Failed to getJettonBalance: "+e)
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
      console.log("Failed to getTONBalance: "+e);
      return 0;
    }
  };

  // @dev
  // * Helper function to query the Balance of Jetton listed in the config file at index position tokenIndex.
  // *
const getSigleJettonBalance = async (userAddress: Address, tokenIndex: int) => {
  const client = new TonClient({
    endpoint: data.tonclientUrl,
  })

  try{
    const userJettonWalletAddress = await getUserJettonWalletAddress(userAddress, data.cards[tokenIndex].jettonMaster, client);
      if(userJettonWalletAddress) {
        const userJettonBalance = await getJettonBalance(userJettonWalletAddress, client);
        if (userJettonBalance) {
          return userJettonBalance;
        }
      }
  } catch (e) {
    console.log("Failed to getSigleJettonBalance: "+e);
    return 0;
  }

}

// @dev
// * Helper function to aggregate queries to get Balance of ALL Jettons listed in the config file. Avoid using for too many tokens as it will generate too many 429 with public APIs.
// *
const getAllJettonsBalance = async (userAddress: Address) => {
  const client = new TonClient({
    endpoint: data.tonclientUrl,
  })

  let allJettonsBalance = [];

  data.cards.map(async (card, index) => {
    try{
      const userJettonWalletAddress = await getUserJettonWalletAddress(userAddress, card.jettonMaster, client);
        if(userJettonWalletAddress) {
          const userJettonBalance = await getJettonBalance(userJettonWalletAddress, client);
          if (userJettonBalance) {
            allJettonsBalance[card.tokenName] = userJettonBalance;
          }
        }
    } catch (e) {
      console.log("Failed to allJettonsBalance: "+e);
    }
  });
  return allJettonsBalance;
}

// @dev
// * Helper function to trigger the drip of new tokens
// *
const drip = async (tonConnectUI, tonAmount, erc20ProxyApp) => {

  try {
    const tacSdk = new TacSdk({
      network: Network.Testnet,
      delay: 0
    });

    await tacSdk.init();

    //User's EVM Wallet Address is abstracted away from the Proxy Contract itself that act as a user wallet in its internal logic (the "to" param in the mint() method)
    const evmWalletAddress = erc20ProxyApp;

    console.log("tonAmount: "+tonAmount);
    console.log("erc20ProxyApp: "+erc20ProxyApp)

    // create evm proxy msg
    const abi = new ethers.AbiCoder();
    const encodedParameters = abi.encode(
      ["address", "uint256"],
      [
        evmWalletAddress,
        Number(tonAmount)
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

    const result = await tacSdk.sendCrossChainTransaction(evmProxyMsg, sender, assets);

    console.log('Transaction sent:', result);

    await startTracking(result);

    return result;

  } catch (e) {
    console.log(e);
  }

}

// @dev
// * Helper function to trigger the drip of new tokens
// *
const refund = async (tonConnectUI, tokenAmount, erc20ProxyApp, jettonMaster) => {

  try {
    const tacSdk = new TacSdk({
      network: Network.Testnet,
    });

    await tacSdk.init();

    // create evm proxy msg
    const abi = new ethers.AbiCoder();
    const encodedParameters = abi.encode(
      ["uint256"],
      [
        Number(toNano(tokenAmount))
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
      amount: tokenAmount
    });

    const result = await tacSdk.sendCrossChainTransaction(evmProxyMsg, sender, assets);

    console.log('Transaction sent:', result);

    await startTracking(result);

    return result;

  } catch (e) {
    console.log(e);
  }

}

const JSsleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

export {
  getUserJettonWalletAddress,
  getJettonBalance,
  getTONBalance,
  getSigleJettonBalance,
  drip,
  refund
}
