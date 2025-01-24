import { type FC } from 'react';
import { RocketLaunch }  from '@mui/icons-material';
import { Typography, LinearProgress, Button, Container } from '@mui/material';

import './Progress.css'

export const Progress: FC<{ message: string, loading: boolean, isCCLDone: boolean, closeProgress: () => void, stage: number }>
  = ({message, loading, isCCLDone, closeProgress, stage}) => {

    if (loading) {
      return (
        <div className="loading-background">
          <Container className="loading-bar">
            { isCCLDone ?
              <RocketLaunch fontSize="large" className="icon"/>
              :
              <div  >
                <div className="loading-circle-1"/>
                <div className="loading-circle-2"/>
              </div>
            }
          </Container>
          <LinearProgress className="progress-bar" variant="determinate" value={stage} />
          <Typography className="loading-message">
            {message}
          </Typography>
          {isCCLDone ?
            <Button
              className="dismissButton"
              size="medium"
              variant="contained"
              color="primary"
              disabled={!isCCLDone}
              onClick={() => closeProgress()}
            >Close
            </Button>
          : null
          }
        </div>
      )
    }
    return null
}
