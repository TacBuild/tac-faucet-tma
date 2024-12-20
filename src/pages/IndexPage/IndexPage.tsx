import { Section, Cell, Image, List, Avatar } from '@telegram-apps/telegram-ui';
import type { FC } from 'react';

import { Link } from '@/components/Link/Link.tsx';
import { Page } from '@/components/Page.tsx';
import { Tokens } from '@/components/Tokens/Tokens.tsx';
import { CHAIN } from "@tonconnect/ui-react";

import tonSvg from './ton.svg';

// Import necessary libraries
import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Box, IconButton, Typography, Button, Container, Grid, Card, CardContent, CardActions } from '@mui/material';
import { Footer } from '@/components/Footer.tsx';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { data } from '../../helpers/config.tsx';
import { TonConnectButton, useTonWallet, useTonAddress } from '@tonconnect/ui-react';
import { getTONBalance } from '../../helpers/walletops.tsx';


import './indexPage.css';
import { tacLogo, tacmanWagmi } from '../../assets/assets.tsx';

export const IndexPage: FC = () => {

  const [tonBalance, setTonBalance] = useState(0);

  const wallet = useTonWallet();
  const userAddress = useTonAddress();

  useEffect(() => {

    const updateBalance = async () => {
      let balance = await getTONBalance(userAddress);
      setTonBalance(balance);
    }

    if (userAddress) {
      updateBalance()
        .catch(console.error);
    }
  }, [userAddress]);

  const theme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#91029b',
        contrastText: '#f2ebff',
        light: '#1e162c',
        dark: '#1e162c',
      },
      secondary: {
        main: '#91029b',
        contrastText: '#f2ebff',
      },
      background: {
        default: '#f2ebff',
        paper: '#f2ebff',
      },
      text: {
        primary: '#1e162c',
        secondary: '#3',
        disabled: 'rgba(0,0,0,0.47)',
      },
    }
  });

  return (
    <Page back={false}>
      <ThemeProvider theme={theme}>
        <AppBar position="static" className="appBar">
          <Toolbar className="toolbar">
          <img className="headerLogo" src={tacLogo} alt="TAC Logo" />
          <Box sx={{ flexGrow: 1 }} />
            { wallet?.account.chain === CHAIN.TESTNET && tonBalance ?
            <Typography variant="caption" sx={{marginRight: 1}}>
              {tonBalance} TON
            </Typography>
            :
            ""
            }
            {  wallet ?
              <Avatar src={wallet.imageUrl} alt="Provider logo" width={60} height={60}/> : ""
            }
            <TonConnectButton className="ton-connect-page__button"/>
          </Toolbar>
        </AppBar>

        <Container sx={{ marginTop: 4, marginBottom:4, minHeight: "calc(100vh - 11.5rem)"}}>
          {/* Hero Section */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={7} sm={7}>
              <Typography variant="h4" gutterBottom>
                Turin Tokens Faucet
              </Typography>
              <Typography variant="body1">
                This app allows you to use TON Testnet Tokens to drip Jettons needed to interact with TAC Turin Testnet dApps.
              </Typography>
            </Grid>
            <Grid item xs={5} sm={5}>
              <img src={tacmanWagmi} alt="Hero" style={{ width: '100%', maxWidth: 500 }} />
            </Grid>
          </Grid>

          {/* Tokens List Section, sourced from card object in config.json */}
          <Grid container spacing={2} sx={{ marginTop: 7 }}>
              {!wallet ?
                //Not connected, connect wallet to use the dApp
              <Grid item xs={12} sm={6}>
                  <Typography variant="h5">
                    Connect your TON Testnet Wallet to use the app
                  </Typography>
              </Grid>
              :
                //Check if the wallet is connected to TON Testnet:
                wallet.account.chain === CHAIN.TESTNET ?
                <Tokens tonBalance={tonBalance} />
                :
                //Not connected to Testnet, block user to prevent loss of funds
                <Grid item xs={12} sm={6}>
                  <Typography variant="h5">
                    Switch your TON Wallet to testnet!
                    { wallet.device.appName === "telegram-wallet" ?
                      <Link to="https://t.me/wallet/start?startapp=tonspace_settings" style={{ margin: '0 8px', color: '#f2ebff' }}>Click here to switch</Link>
                      :
                      //todo: point to a guide for TonKeeper or Tomo
                      ""
                    }
                  </Typography>
                </Grid>
              }

          </Grid>
        </Container>

        {/* Footer Section */ }
        <Footer />
      </ThemeProvider>
    </Page>
  );
};
