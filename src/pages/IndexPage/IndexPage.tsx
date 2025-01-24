import type {FC} from 'react';

import {Link} from '@/components/Link/Link.tsx';
import {Page} from '@/components/Page.tsx';
import {Tokens} from '@/components/Tokens/Tokens.tsx';
import {CHAIN} from "@tonconnect/ui-react";

// Import necessary libraries
import {useState, useEffect} from 'react';
import {AppBar, Toolbar, Box, IconButton, Typography, Container, Grid2} from '@mui/material';
import {Refresh} from '@mui/icons-material';
import {Footer} from '@/components/Footer.tsx';
import {ThemeProvider, createTheme} from '@mui/material/styles';

import {TonConnectButton, useTonWallet, useTonAddress} from '@tonconnect/ui-react';
import {getTONBalance} from '../../helpers/walletops.tsx';


import './indexPage.css';
import {tacLogo, tacmanWagmi} from '../../assets/assets.tsx';
import {Address} from "@ton/core";

export const IndexPage: FC = () => {

  const [tonBalance, setTonBalance] = useState(0);

  const wallet = useTonWallet();
  const userAddress = useTonAddress();

  const updateBalance = async () => {
    const balance = await getTONBalance(Address.parse(userAddress));
    setTonBalance(Number(balance) || 0);
  }

  useEffect(() => {
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
            <Box sx={{flexGrow: 1}} />
            {wallet?.account.chain === CHAIN.TESTNET && tonBalance ?
              <IconButton onClick={updateBalance}>
                <Refresh />
              </IconButton>
              :
              ""
            }
            {wallet?.account.chain === CHAIN.TESTNET && tonBalance ?
              <Typography variant="caption" sx={{marginRight: 1}}>
                {tonBalance} TON
              </Typography>
              :
              ""
            }
            <TonConnectButton className="ton-connect-page__button" />
          </Toolbar>
        </AppBar>

        <Container sx={{marginTop: 4, marginBottom: 4, minHeight: "calc(100vh - 11.5rem)"}}>
          {/* Hero Section */}
          <Grid2 container spacing={2} alignItems="center">
            <Grid2 size={7}>
              <Typography variant="h4" gutterBottom>
                Turin Tokens Faucet
              </Typography>
              <Typography variant="body1">
                This app allows you to use TON Testnet Tokens to drip Jettons needed to interact
                with TAC Turin Testnet dApps.
              </Typography>
            </Grid2>
            <Grid2 container size={5} justifyContent="end">
              <img src={tacmanWagmi} alt="Hero" style={{width: '100%', maxWidth: 200}} />
            </Grid2>
          </Grid2>

          {/* Tokens List Section, sourced from card object in config.json */}
          <Grid2 container spacing={2} sx={{marginTop: 7}}>
            {!wallet ?
              //Not connected, connect wallet to use the dApp
              <Grid2 container size={{xs: 12, sm: 6}}>
                <Typography variant="h5">
                  Connect your TON Testnet Wallet to use the app
                </Typography>
              </Grid2>
              :
              //Check if the wallet is connected to TON Testnet:
              wallet.account.chain === CHAIN.TESTNET ?
                <Tokens tonBalance={tonBalance} updateBalance={updateBalance} />
                :
                //Not connected to Testnet, block user to prevent loss of funds
                <Grid2 size={{xs: 12, sm: 6}}>
                  <Typography variant="h5">
                    Switch your TON Wallet to testnet!
                    {wallet.device.appName === "telegram-wallet" ?
                      <Link to="https://t.me/wallet/start?startapp=tonspace_settings" style={{
                        margin: '0 8px',
                        color: '#f2ebff'
                      }}>Click here to switch</Link>
                      :
                      ""
                    }
                  </Typography>
                </Grid2>
            }
          </Grid2>
        </Container>

        {/* Footer Section */}
        <Footer />
      </ThemeProvider>
    </Page>
  );
};
