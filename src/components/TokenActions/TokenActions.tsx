import React, { useState, useEffect } from 'react';
import { AppBar, Box, TextField, Toolbar, IconButton, Typography, Button, Container, Grid, Card, CardContent, CardActions, Switch } from '@mui/material';
import { type FC, type MouseEventHandler, useCallback } from 'react';
import { Progress } from "../Progress/Progress.tsx";

import { useTonWallet, useTonAddress, useTonConnectUI} from '@tonconnect/ui-react';
import { getSigleJettonBalance, getTONBalance, drip, refund } from '../../helpers/walletops.tsx';

import { data } from '../../helpers/config.tsx';

import { tonLogo } from '../../assets/assets.tsx';

import { useDebouncedCallback } from 'use-debounce';

const validateAmount = (isDrip: boolean, value: Number, lowerBound: Number, upperBound: Number, decimals: Number, tokenValue: Number, tonBalanceStr: string, jettonBalanceStr: string) => {
  const tonBalance = parseFloat(tonBalanceStr);
  const jettonBalance = parseFloat(jettonBalanceStr);

  if (value === "" || value === 0)
    return {
      status: false,
      message: "No Value"
    };
  if (isNaN(value))
    return {
      status: false,
      message: "Incomplete Value"
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
    let amount = (value * tokenValue);
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

export const TokenActions: FC<TokenActionsProps> = ({tonBalance, updateBalance, tokenIndex}) => {

  const card = data.cards[tokenIndex];

  const [jettonBalance, setJettonBalance] = useState(0);
  const [isDripValid, setIsDripValid] = useState(false);
  const [isRefundValid, setIsRefundValid] = useState(false);
  const [dripAmount, setDripAmount] = useState();
  const [refundAmount, setRefundAmount] = useState();
  const [refundError, setRefundError] = useState(false);
  const [dripError, setDripError] = useState(false);

  const [isCCLPending, setIsCCLPending] = useState(false);
  const [isCCLDone, setIsCCLDone] = useState(false);
  const [stage, setStage] = useState(0);
  const [cclMessage, setCclMessage] = useState("");

  const [txLinker, setTxLinker] = useState();

  const wallet = useTonWallet();
  const userAddress = useTonAddress();
  const [tonConnectUI, setOptions] = useTonConnectUI();

  const updateJettonBalance = async () => {
    let jettonBalance = await getSigleJettonBalance(userAddress, tokenIndex);
    if (!jettonBalance)
      jettonBalance = 0;
    setJettonBalance(jettonBalance);
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
      let validationResult = validateAmount(true, value, card.lowerBound, card.upperBound, card.decimals, card.tokenValue, tonBalance, jettonBalance);
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
      let validationResult = validateAmount(false, value, card.lowerBound, card.upperBound, card.decimals, card.tokenValue, tonBalance, jettonBalance);
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

  const executeDrip = async (erc20ProxyApp) => {
    if(!wallet || !dripAmount || dripAmount === "")
      return console.log("Wallet not ready or no amount specified");
    setCclMessage("Initializing TAC Adapter");
    setIsCCLPending(true);
    setIsCCLDone(false);
    await drip(tonConnectUI, dripAmount, erc20ProxyApp, setCclMessage, setIsCCLDone, setStage);
  }

  const executeRefund = async (erc20ProxyApp, jettonMaster, tokenDecimals) => {
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
        <Grid container spacing={2} alignItems="top">
          <Grid item xs={6} sm={6} l={6} xl={6}>
            <Box display="block" alignItems="center" gap={1}>
              <Typography variant="caption" gutterBottom>
                Type the amount of TON Testnet Tokens you want to send to get an equivalent amount of {card.tokenName}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={6} l={6} xl={6}>
            <Box display="block" alignItems="center" gap={1}>
              <Typography variant="caption" gutterBottom>
                Type the amount of {card.tokenName} you want to send to get back the equivalent amount of TON Testnet
              </Typography>
            </Box>
          </Grid>
        </Grid>
        <Grid container spacing={1} alignItems="center" sx={{marginTop: '10px'}}>
          <Grid item xs={12} sm={12} l={12} xl={12} alignItems="center">
            <Typography variant="body2">
              Your Current Balance:
            </Typography>
          </Grid>
          <Grid item xs={6} sm={6} l={6} xl={6} alignItems="left">
            <Typography variant="body2">
              TON: { tonBalance }
            </Typography>
          </Grid>
          <Grid item xs={6} sm={6} l={6} xl={6} alignItems="right">
            <Typography variant="body2">
              { card.tokenName }: { jettonBalance }
            </Typography>
          </Grid>
        </Grid>
        <Grid container spacing={2} alignItems="center" sx={{marginTop: '10px'}}>
          <Grid item xs={6} sm={6} l={6} xl={6}>
            <Box display="block" alignItems="center" gap={1}>
              <TextField
                error={!isDripValid && dripError ? true : false}
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
          </Grid>
          <Grid item xs={6} sm={6} l={6} xl={6}>
            <Box display="block" alignItems="center" gap={1}>
              <TextField
                error={!isRefundValid && refundError ? true : false}
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
          </Grid>
        </Grid>
      </Box>
    </React.Fragment>
  );
}
