import React, { useState, useEffect } from 'react';
import { Box, TextField, Typography, Button, Grid2 } from '@mui/material';
import { type FC, } from 'react';
import { Progress } from "../Progress/Progress.tsx";

import { useTonWallet, useTonAddress, useTonConnectUI} from '@tonconnect/ui-react';
import { getSigleJettonBalance, drip, refund } from '../../helpers/walletops.tsx';

import { data } from '../../helpers/config.tsx';

import { useDebouncedCallback } from 'use-debounce';
import {Address} from "@ton/core";

const validateAmount = (isDrip: boolean, value: number, lowerBound: number, upperBound: number, decimals: number, tokenValue: number, tonBalance: number, jettonBalance: number) => {
  if (isNaN(value))
    return {
      status: false,
      message: "Incomplete Value"
    };
  if (!value)
    return {
      status: false,
      message: "No Value"
    };
  if (value < 0)
    return {
      status: false,
      message: "Negative Value"
    };
  if (isDrip) {
    if (value > tonBalance)
      return {
        status: false,
        message: "Insufficient Funds"
      };
    const amount = (value * tokenValue);
    if (amount < lowerBound)
      return {
        status: false,
        message: "Amount too low"
      };
    if (amount > upperBound)
      return {
        status: false,
        message: "Amount too big"
      };
    return {
      status: true,
      message: null
    };
  } else {
    //it's a refund
    if (value > jettonBalance)
      return {
        status: false,
        message: "Insufficient Funds"
      };
    if ((value * 10 ** decimals) > upperBound)
      return {
        status: false,
        message: "Amount too big"
      };
    return {
      status: true,
      message: null
    };
  }
}

export const TokenActions: FC<{ tonBalance: number, updateBalance: () => void, tokenIndex: number }>
  = ({tonBalance, updateBalance, tokenIndex}) => {
  const card = data.cards[tokenIndex];

  const [jettonBalance, setJettonBalance] = useState(0);
  const [isDripValid, setIsDripValid] = useState(false);
  const [isRefundValid, setIsRefundValid] = useState(false);
  const [dripAmount, setDripAmount] = useState();
  const [refundAmount, setRefundAmount] = useState();
  const [refundError, setRefundError] = useState('');
  const [dripError, setDripError] = useState('');

  const [isCCLPending, setIsCCLPending] = useState(false);
  const [isCCLDone, setIsCCLDone] = useState(false);
  const [stage, setStage] = useState(0);
  const [cclMessage, setCclMessage] = useState("");

  const wallet = useTonWallet();
  const userAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();

  const updateJettonBalance = async () => {
    const jettonBalance = await getSigleJettonBalance(Address.parse(userAddress), tokenIndex);
    setJettonBalance(Number(jettonBalance || 0));
  }

  useEffect(() => {
    if (tokenIndex != null) {
      updateJettonBalance()
        .catch(console.error);
    }
  }, [tokenIndex]);

  const debouncedDripAmount = useDebouncedCallback(
    // function
    (value) => {
      //reset status
      setIsDripValid(false);
      setDripError("...")
      //run validation
      const validationResult = validateAmount(
        true,
        value,
        Number(card.lowerBound),
        Number(card.upperBound),
        card.decimals,
        Number(card.tokenValue),
        tonBalance,
        jettonBalance
      );
      setIsDripValid(validationResult.status);
      //prepare execution
      if (validationResult.status){
        setDripAmount(value)
      }
      //show errors
      if (validationResult.message)
        setDripError(validationResult.message);
    },
    // delay in ms
    500
  );

  const debouncedRefundAmount = useDebouncedCallback(
    // function
    (value) => {
      //reset status
      setIsRefundValid(false);
      setRefundError("...")
      //run validation
      const validationResult = validateAmount(
        false,
        value,
        Number(card.lowerBound),
        Number(card.upperBound),
        card.decimals,
        Number(card.tokenValue),
        tonBalance,
        jettonBalance
      );
      setIsRefundValid(validationResult.status);
      //prepare execution
      if (validationResult.status){
        setRefundAmount(value)
      }
      //show errors
      if (validationResult.message)
        setRefundError(validationResult.message);
    },
    // delay in ms
    500
  );

  const executeDrip = async (erc20ProxyApp: string) => {
    if(!wallet || !dripAmount || dripAmount === "")
      return console.log("Wallet not ready or no amount specified");
    setCclMessage("Initializing TAC Adapter");
    setIsCCLPending(true);
    setIsCCLDone(false);
    await drip(tonConnectUI, dripAmount, erc20ProxyApp, setCclMessage, setIsCCLDone, setStage);
  }

  const executeRefund = async (erc20ProxyApp: string, jettonMaster: string, tokenDecimals: number) => {
    if(!wallet || !refundAmount || refundAmount === "")
      return console.log("Wallet not ready or no amount specified");
    setCclMessage("Initializing TAC Adapter");
    setIsCCLPending(true);
    setIsCCLDone(false);
    await refund(tonConnectUI, refundAmount, tokenDecimals, erc20ProxyApp, jettonMaster, setCclMessage, setIsCCLDone, setStage);
  }

  const closeProgress = async () => {
    setIsCCLPending(false);
    //TON state is updated with a 5/10sec delay
    setTimeout(async function() {
      await updateBalance();
      await updateJettonBalance();
    }, 10000);
  }

  return (
    <React.Fragment>
      <Progress message={cclMessage} loading={isCCLPending} isCCLDone={isCCLDone} closeProgress={closeProgress} stage={stage}/>
      <Box width="100%" alignItems="center" gap={1}>
        <Grid2 container spacing={2} alignItems="top">
          <Grid2 size={6}>
            <Box display="block" alignItems="center" gap={1}>
              <Typography variant="caption" gutterBottom>
                Type the amount of TON Testnet Tokens you want to send to get an equivalent amount of {card.tokenName}
              </Typography>
            </Box>
          </Grid2>
          <Grid2 size={6}>
            <Box display="block" alignItems="center" gap={1}>
              <Typography variant="caption" gutterBottom>
                Type the amount of {card.tokenName} you want to send to get back the equivalent amount of TON Testnet
              </Typography>
            </Box>
          </Grid2>
        </Grid2>
        <Grid2 container spacing={1} alignItems="center" sx={{marginTop: '10px'}}>
          <Grid2 size={12} alignItems="center">
            <Typography variant="body2">
              Your Current Balance:
            </Typography>
          </Grid2>
          <Grid2 size={6} alignItems="left">
            <Typography variant="body2">
              TON: { tonBalance }
            </Typography>
          </Grid2>
          <Grid2 size={6} alignItems="right">
            <Typography variant="body2">
              { card.tokenName }: { jettonBalance }
            </Typography>
          </Grid2>
        </Grid2>
        <Grid2 container spacing={2} alignItems="center" sx={{marginTop: '10px'}}>
          <Grid2 size={6}>
            <Box display="block" alignItems="center" gap={1}>
              <TextField
                error={!!(!isDripValid && dripError)}
                id="outlined-error-helper-text"
                label="TON Amount"
                type="number"
                disabled={isCCLPending}
                helperText={isDripValid ? "" : dripError}
                onChange={(e) => { debouncedDripAmount(e.target.value) }}
                fullWidth
              />
              <Button
                size="small"
                variant="contained"
                color="primary"
                disabled={!isDripValid || isCCLPending}
                onClick={ () => executeDrip(card.erc20ProxyApp)}
              >
                { isCCLPending ? "..." : "Drip" }
              </Button>
            </Box>
          </Grid2>
          <Grid2 size={6}>
            <Box display="block" alignItems="center" gap={1}>
              <TextField
                error={!!(!isRefundValid && refundError)}
                id="outlined-error-helper-text"
                label={card.tokenName + " Amount"}
                type="number"
                disabled={isCCLPending}
                onChange={(e) => { debouncedRefundAmount(e.target.value) }}
                helperText={isRefundValid ? "" : refundError}
                fullWidth
              />
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                disabled={!isRefundValid || isCCLPending}
                onClick={ () => executeRefund(card.erc20ProxyApp, card.jettonMaster, card.decimals)}
              >
                { isCCLPending ? "..." : "Refund" }
              </Button>
            </Box>
          </Grid2>
        </Grid2>
      </Box>
    </React.Fragment>
  );
}
