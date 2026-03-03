# Graceful Degradation Strategy

## Retry Backoff
- For `charge-stream`, keep backoff sequence: 100ms, 250ms, 500ms, 1s, 2s.
- If conflict rate > warning, increase max backoff to 5s and cap at 5 attempts.

## Temporary Throttling
- Reduce concurrency in marketing campaigns.
- Apply application-level throttling to playback endpoints if origin saturation appears.

## Messaging Fallbacks
- Charge failures: “High traffic, please retry in a moment.”
- Playback errors: “Playback delayed, please try again.”

## Actions During Traffic Spike
- Pause campaigns for 30–60 minutes.
- Reduce load test concurrency.
- Confirm `monitoring-metrics` stability before re-enabling.
