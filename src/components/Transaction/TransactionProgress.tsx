import {
  Slide,
  Snackbar,
  SlideProps, CircularProgress, Alert, AlertTitle
} from '@mui/material';
import {AlertColor} from "@mui/material/Alert/Alert";
import {useCCT} from "@/hooks/useCCT.ts";

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export const TransactionProgress = () => {
  const { isSigning, isDone, isFailed, isRunning, message, progress, reset } = useCCT()

  return (
    <Snackbar
      sx={{ width: { sm: "400px" } }}
      open={isRunning}
      onClose={() => {}}
      TransitionComponent={SlideTransition}
    >
      <Alert
        elevation={3}
        sx={{width: '100%'}}
        severity={isDone ? 'success' : isFailed ? 'error' : 'secondary' as AlertColor}
        onClose={isSigning && !isDone && !isFailed ? undefined : () => {reset()}}

        icon={!isDone && !isFailed ? <CircularProgress
          color="secondary"
          size="22px"
          variant={progress >= 20 ? 'determinate' : 'indeterminate'}
          value={progress}
        /> : undefined}
      >
        <AlertTitle>
          {isDone ? 'Transaction executed!' : isFailed ? 'Transaction failed!' : 'Executing transaction...'}
        </AlertTitle>

        {message}
      </Alert>
    </Snackbar>
  )
}
