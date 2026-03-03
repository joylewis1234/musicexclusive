# Failure Handling Validation

## Scope
This validation covers expected error responses for critical edge functions when required inputs or authentication are missing.

## Environment
- Date: 2026-02-23
- Method: direct POST calls to edge functions with missing auth/fields

## Results

### mint-playback-url
- Missing Authorization header
  - Status: 401
  - Body: {"error":"Unauthorized"}
- Missing fileType
  - Status: 400
  - Body: {"error":"Missing trackId or invalid fileType (audio|preview|artwork)"}

### charge-stream
- Missing idempotencyKey
  - Status: 400
  - Body: {"error":"idempotencyKey is required"}
- Missing trackId
  - Status: 400
  - Body: {"error":"trackId is required"}

### validate-fan-invite
- Missing token
  - Status: 400
  - Body: {"valid":false,"error":"Missing invite token"}

### validate-vault-code
- Missing email/vaultCode
  - Status: 400
  - Body: {"error":"Email and vault code are required"}
