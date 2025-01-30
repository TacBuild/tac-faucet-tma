import React, {useState} from 'react';
import {Typography, Button, Grid2, Card, CardContent, CardActions} from '@mui/material';
import {type FC} from 'react';
import {Link} from '@/components/Link/Link.tsx';

import {data} from '../../helpers/config.tsx';
import {TokenActions} from '@/components/TokenActions/TokenActions.tsx';

export const Tokens: FC<{ tonBalance: number, updateBalance: () => void }>
  = ({tonBalance, updateBalance}) => {
  const [tokenIndex, setTokenIndex] = useState<number | null>(null);
  return (
    <React.Fragment>
      <Grid2 container columns={{xs: 1, sm: 2, md: 3}} spacing={2}>
        {data.cards.map((card, index) => (
          <Grid2 size={1} key={index}>
            <Card>
              <CardContent>
                {<Grid2 container spacing={2} width="100%" alignItems="center">
                  <Grid2 size={8} alignItems="left">
                    <Typography variant="h5" gutterBottom>
                      {card.tokenName}
                    </Typography>
                  </Grid2>
                  <Grid2 size={4} container justifyContent="right">
                    <img src={card.logo} alt={card.title} style={{
                      width: 50,
                      height: 50,
                      marginBottom: 16
                    }} />
                  </Grid2>
                  <Grid2 size={{xs: 12, sm: 12, lg: 12, xl: 12}} alignItems="right">
                    <Typography variant="body2" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      TON
                      Jetton: <Link to={`https://testnet.tonviewer.com/${card.tvmTokenAddress}`} style={{
                      margin: '0 8px',
                      color: '#91029b'
                    }}>Tonviewer</Link>
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      TAC
                      ERC20: <Link to={`https://turin.explorer.tac.build/token/${card.tokenAddress}`} style={{
                      margin: '0 8px',
                      color: '#91029b'
                    }}>TAC Explorer</Link>
                    </Typography>
                  </Grid2>
                </Grid2>}
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
          </Grid2>
        ))
        }
      </Grid2>
    </React.Fragment>
  );
}
