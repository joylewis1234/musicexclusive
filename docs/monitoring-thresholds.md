# Monitoring Thresholds

These thresholds are intended for a safe paid marketing launch. Rates are calculated over a rolling 60-minute window unless noted.

## mint-playback-url
| Metric | Safe | Warning | Critical | Action |
| --- | --- | --- | --- | --- |
| p95 latency | <= 3000ms | 3000–5000ms | > 5000ms | Investigate edge latency + R2 presign, reduce concurrency |
| p99 latency | <= 6000ms | 6000–9000ms | > 9000ms | Pause campaigns if sustained |
| 5xx rate | < 0.5% | 0.5–1.0% | > 1.0% | Check error stage, verify env secrets |

## charge-stream
| Metric | Safe | Warning | Critical | Action |
| --- | --- | --- | --- | --- |
| p95 latency | <= 3000ms | 3000–4500ms | > 4500ms | Check DB load + RPC |
| p99 latency | <= 6000ms | 6000–9000ms | > 9000ms | Pause campaigns if sustained |
| 5xx rate | < 0.5% | 0.5–1.0% | > 1.0% | Inspect debit RPC errors |
| Conflict rate | < 5% | 5–15% | > 15% | Increase backoff, reduce concurrency |
| Retry rate | < 10% | 10–25% | > 25% | Investigate locking + hot rows |

## Playback (telemetry)
| Metric | Safe | Warning | Critical | Action |
| --- | --- | --- | --- | --- |
| Playback error rate (>=400) | < 1% | 1–3% | > 3% | Check R2, edge, CDN |
| Origin saturation (429/503) | < 0.3% | 0.3–1% | > 1% | Throttle requests, reduce spend |

## Actions
- Warning: reduce spend, inspect logs, monitor 30–60 min.
- Critical: pause spend, investigate root cause, re-enable after stability.
