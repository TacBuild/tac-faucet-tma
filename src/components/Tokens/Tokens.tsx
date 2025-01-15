import React, { useState } from 'react';
import { AppBar, Box, TextField, Toolbar, IconButton, Typography, Button, Container, Grid, Card, CardContent, CardActions, Switch } from '@mui/material';
import { type FC, type MouseEventHandler, useCallback } from 'react';
import { Link } from '@/components/Link/Link.tsx';

import { data } from '../../helpers/config.tsx';
import { TokenActions } from '@/components/TokenActions/TokenActions.tsx';

export const Tokens: FC<TokensProps> = ({tonBalance, updateBalance}) => {

  const [tokenIndex, setTokenIndex] = useState(null);

  return (
    <React.Fragment>
    {data.cards.map((card, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Card>
            <CardContent>
              <Grid container spacing={2}  width="100%" alignItems="center">
                <Grid item xs={10} sm={10} l={10} xl={10} alignItems="left">
                  <Typography variant="h5" gutterBottom>
                    {card.tokenName}
                  </Typography>
                </Grid>
                <Grid item xs={2} sm={2} l={2} xl={2} alignItems="right">
                  <img src={card.logo} alt={card.title} style={{ width: 50, height: 50, marginBottom: 16 }} />
                </Grid>
                <Grid item xs={12} sm={12} l={12} xl={12} alignItems="right">
                  <Typography variant="body2" gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    TON Jetton: <Link to={`https://testnet.tonviewer.com/${card.jettonMaster}`} style={{ margin: '0 8px', color: '#91029b' }}>Tonviewer</Link>
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    TAC ERC20: <Link to={`https://turin.explorer.tac.build/token/${card.tokenAddress}`} style={{ margin: '0 8px', color: '#91029b' }}>TAC Explorer</Link>
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
            <CardActions>
              {tokenIndex == index ?
              <TokenActions tonBalance={tonBalance} updateBalance={updateBalance} tokenIndex={tokenIndex} />
              :
              <Button size="small" variant="contained" color="primary" onClick={() => setTokenIndex(index)}>
                Select
              </Button>
            }
            </CardActions>
          </Card>
        </Grid>
      ))
    }
    </React.Fragment>
  );
}
