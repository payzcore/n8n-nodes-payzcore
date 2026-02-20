# n8n-nodes-payzcore

[n8n](https://n8n.io/) community node for [PayzCore](https://payzcore.com) — blockchain transaction monitoring API.

Monitor USDT and USDC payments across 5 blockchain networks with automated workflows.

## Important

**PayzCore is a blockchain monitoring service, not a payment processor.** All payments are sent directly to your own wallet addresses. PayzCore never holds, transfers, or has access to your funds.

- **Your wallets, your funds** — You provide your own wallet (HD xPub or static addresses). Customers pay directly to your addresses.
- **Read-only monitoring** — PayzCore watches the blockchain for incoming transactions and sends webhook notifications. That's it.
- **Protection Key security** — Sensitive operations like wallet management, address changes, and API key regeneration require a Protection Key that only you set. PayzCore cannot perform these actions without your authorization.
- **Your responsibility** — You are responsible for securing your own wallets and private keys. PayzCore provides monitoring and notification only.

## Supported Chains

| Chain | Token |
|-------|-------|
| TRC20 (Tron) | USDT |
| BEP20 (BSC) | USDT, USDC |
| ERC20 (Ethereum) | USDT, USDC |
| Polygon | USDT, USDC |
| Arbitrum | USDT, USDC |

## Installation

1. Open your n8n instance
2. Go to **Settings** > **Community Nodes**
3. Enter `n8n-nodes-payzcore`
4. Click **Install**

## Nodes

### PayzCore

Regular node for interacting with the PayzCore API.

| Operation | Description |
|-----------|-------------|
| **Create Payment** | Create a new payment monitoring request |
| **Confirm Payment** | Confirm a payment with transaction hash (static wallet mode) |
| **Get Payment** | Get payment details by ID |
| **List Payments** | List payments with optional status filter |

**Create Payment** additional fields: `address` (static wallet), `external_order_id`, `expires_in`, `metadata`.

### PayzCore Trigger

Webhook trigger node that starts workflows when payment events occur.

| Event | Description |
|-------|-------------|
| `payment.completed` | Payment fully received and confirmed |
| `payment.overpaid` | Received more than expected amount |
| `payment.partial` | Partial payment received |
| `payment.expired` | Payment window expired |
| `payment.cancelled` | Payment cancelled by the merchant |

Features:
- HMAC-SHA256 signature verification
- Replay protection (5-minute window)
- Event type filtering

## Credentials

| Field | Description |
|-------|-------------|
| **API Key** | Your PayzCore project API key (`pk_live_...`) |
| **API URL** | API base URL (default: `https://api.payzcore.com`) |
| **Webhook Secret** | Webhook signing secret for HMAC verification |

### Setup

1. Sign up at [app.payzcore.com](https://app.payzcore.com)
2. Create a project and copy your **API Key**
3. In n8n, add **PayzCore API** credentials with your API Key
4. For the Trigger node, also add your **Webhook Secret**

## Usage Example

### Monitor completed payments

1. Add a **PayzCore Trigger** node
2. Select `payment.completed` event
3. Connect to your workflow (e.g., send email, update database, notify Slack)

### Create a payment

1. Add a **PayzCore** node
2. Select **Create** operation
3. Set amount, chain, token, and external reference
4. The response includes the watch address and QR code

## Static Wallet Mode

When you pass an `address` in Create Payment, PayzCore uses your own static wallet instead of deriving an HD address. The API response may include these additional fields:

| Field | Description |
|-------|-------------|
| `notice` | Human-readable notice about static wallet behavior |
| `original_amount` | The amount you requested (before any unique amount adjustment) |
| `requires_txid` | If `true`, you must call **Confirm Payment** with the transaction hash |

When `requires_txid` is `true`, use the **Confirm Payment** operation to submit the blockchain transaction hash after the customer pays.

## Resources

- [PayzCore Documentation](https://docs.payzcore.com)
- [PayzCore API Reference](https://docs.payzcore.com)
- [GitHub Repository](https://github.com/payzcore/n8n-nodes-payzcore)

## Before Going Live

**Always test your setup before accepting real payments:**

1. **Verify your wallet** — In the PayzCore dashboard, verify that your wallet addresses are correct. For HD wallets, click "Verify Key" and compare address #0 with your wallet app.
2. **Run a test order** — Place a test order for a small amount ($1–5) and complete the payment. Verify the funds arrive in your wallet.
3. **Test sweeping** — Send the test funds back out to confirm you control the addresses with your private keys.

> **Warning:** Wrong wallet configuration means payments go to addresses you don't control. Funds sent to incorrect addresses are permanently lost. PayzCore is watch-only and cannot recover funds. Please test before going live.

## License

MIT
