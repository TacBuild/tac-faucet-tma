import { FC, ReactElement } from "react";
import { Box, Typography } from "@mui/material";

import { Link } from '@/components/Link/Link.tsx';

export const Footer: FC = (): ReactElement => {
  return (

    <Box
      sx={{
        textAlign: 'center',
        padding: '1rem',
        height: '3rem',
        background: '#91029b'
      }}>
      <Typography variant="body1">
        <Link to="https://tac.build" style={{ margin: '0 8px', color:'#f2ebff' }}>Website</Link>
        <Link to="https://docs.tac.build" style={{ margin: '0 8px', color:'#f2ebff' }}>Docs</Link>
        <Link to="https://twitter.com/TacBuild" style={{ margin: '0 8px', color:'#f2ebff' }}>Twitter</Link>
      </Typography>
      <Typography variant="caption">&copy; {new Date().getFullYear()} TAC. All rights reserved.</Typography>
    </Box>
  );
};

export default Footer;
