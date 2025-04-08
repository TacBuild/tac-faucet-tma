import React, {useState, useEffect} from 'react';
import {Box, Stack, TextField, Typography, Button, Grid2} from '@mui/material';
import {type FC} from 'react';

import {useTonWallet, useTonAddress, useTonConnectUI} from '@tonconnect/ui-react';
import {getJettonBalance} from '../../helpers/walletops.tsx';

import {data} from '../../helpers/config.tsx';

import {useDebouncedCallback} from 'use-debounce';
import {Address} from "@ton/core";
import {useCCT} from "@/hooks/useCCT.ts";
import {Refresh} from "@mui/icons-material";

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
  if (value <= 0)
    return {
      status: false,
      message: "Amount too low"
    };
  if (isDrip) {
    if (value > tonBalance)
      return {
        status: false,
        message: "Insufficient Funds"
      };
    const amount = (value * tokenValue);
    if (amount <= lowerBound)
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
  const [refundAmount, setRefundAmount] = useState('20');
  const [refundError, setRefundError] = useState('');
  const [dripError, setDripError] = useState('');
  const [isJettonBalanceLoading, setIsJettonBalanceLoading] = useState(false);
  const [jettonBalanceError, setJettonBalanceError] = useState('');

  // const { isRunning } = useContext(CCTContext);
  const {isSigning, drip, refund} = useCCT()

  const wallet = useTonWallet();
  const userAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();

  const updateJettonBalance = async () => {
    try {
      setJettonBalanceError('')
      setIsJettonBalanceLoading(true)
      const jettonBalance = await getJettonBalance(Address.parse(userAddress), tokenIndex);
      setJettonBalance(jettonBalance);
    } catch (e) {
      setJettonBalanceError('Unknown');
    } finally {
      setIsJettonBalanceLoading(false)
    }
  }

  useEffect(() => {
    if (tokenIndex != null) {
      updateJettonBalance()
        .catch(console.error);
    }
  }, [tokenIndex]);

  const debouncedDripAmount = useDebouncedCallback((value) => {
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
    if (validationResult.status) {
      setDripAmount(value)
    }
    //show errors
    if (validationResult.message)
      setDripError(validationResult.message);
  }, 500);

  const debouncedRefundAmount = useDebouncedCallback((value) => {
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
    if (validationResult.status) {
      setRefundAmount(value)
    }
    //show errors
    if (validationResult.message)
      setRefundError(validationResult.message);
  }, 500);

  const executeDrip = async () => {
    if (!wallet || !dripAmount || dripAmount === "")
      return console.log("Wallet not ready or no amount specified");
    await drip(tonConnectUI, dripAmount, card.proxyAddress);

    setTimeout(() => {
      updateBalance()
    }, 5000)
  }

  const executeRefund = async () => {
    if (!wallet || !refundAmount || refundAmount === "")
      return console.log("Wallet not ready or no amount specified");
    await refund(tonConnectUI, Number(refundAmount), card.proxyAddress, card.tokenAddress, card.decimals);

    setTimeout(() => {
      updateBalance()
    }, 5000)
  }

  return (
    <React.Fragment>
      <Box width="100%" alignItems="center" gap={1}>
        <Grid2 container spacing={2} alignItems="top">
          <Grid2 size={6}>
            <Box display="block" alignItems="center" gap={1}>
              <Typography variant="caption" gutterBottom>
                Type the amount of TON Testnet Tokens you want to send to get an equivalent amount
                of {card.tokenName}
              </Typography>
            </Box>
          </Grid2>
          <Grid2 size={6}>
            <Box display="block" alignItems="center" gap={1}>
              <Typography variant="caption" gutterBottom>
                Type the amount of {card.tokenName} you want to send to get back the equivalent
                amount of TON Testnet
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
              TON: {tonBalance.toLocaleString()}
            </Typography>
          </Grid2>
          <Grid2 size={6} alignItems="right">
            <Typography variant="body2">
              {card.tokenName}: {jettonBalanceError ?
                (<Typography variant="body2" sx={{display: "inline-flex", gap: '2px', alignItems: 'center'}} color="red">
                  { jettonBalanceError }
                    <Refresh sx={{fontSize: "16px", cursor: "pointer"}} onClick={() => updateJettonBalance()} />
                </Typography>) :
                (<>{isJettonBalanceLoading ? 'Loading...' : jettonBalance.toLocaleString(undefined, { notation: 'standard', maximumFractionDigits: card.decimals })}</>)
              }
            </Typography>
          </Grid2>
        </Grid2>
        <Grid2 container spacing={2} alignItems="center" sx={{marginTop: '10px'}}>
          <Grid2 size={6}>
            <Stack display="block" alignItems="center" spacing={1}>
              <TextField
                error={!!(!isDripValid && dripError)}
                id="outlined-error-helper-text"
                label="TON Amount"
                type="number"
                disabled={isSigning}
                helperText={isDripValid ? "" : dripError}
                onChange={(e) => {
                  debouncedDripAmount(e.target.value)
                }}
                fullWidth
              />
              <Button
                size="small"
                variant="contained"
                color="primary"
                disabled={!isDripValid || isSigning}
                onClick={() => executeDrip()}
              >
                {isSigning ? "..." : "Drip"}
              </Button>
            </Stack>
          </Grid2>
          <Grid2 size={6}>
            <Stack display="block" alignItems="center" spacing={1}>
              <TextField
                error={!!(!isRefundValid && refundError)}
                id="outlined-error-helper-text"
                label={card.tokenName + " Amount"}
                type="number"
                disabled={isSigning}
                onChange={(e) => {
                  debouncedRefundAmount(e.target.value)
                }}
                helperText={isRefundValid ? "" : refundError}
                fullWidth
              />
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                disabled={!isRefundValid || isSigning || !isRefundValid}
                onClick={() => executeRefund()}
              >
                {isSigning ? "..." : "Refund"}
              </Button>
            </Stack>
          </Grid2>
        </Grid2>
      </Box>
    </React.Fragment>
  );
}
