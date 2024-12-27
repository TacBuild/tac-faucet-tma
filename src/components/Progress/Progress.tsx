import React, { useState } from 'react';
import { type FC, type MouseEventHandler, useCallback } from 'react';
import { RocketLaunch, CheckCircleOutline}  from '@mui/icons-material';
import { Box, IconButton, Typography, LinearProgress, Button, Container } from '@mui/material';

import './Progress.css'

export const Progress: FC<ProgressProps> = ({message, loading, isCCLDone, closeProgress, stage}) => {

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
