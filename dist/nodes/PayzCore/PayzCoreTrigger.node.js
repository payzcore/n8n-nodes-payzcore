"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayzCoreTrigger = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const crypto_1 = require("crypto");
class PayzCoreTrigger {
    constructor() {
        this.description = {
            displayName: 'PayzCore Trigger',
            name: 'payzCoreTrigger',
            icon: 'file:payzcore.svg',
            group: ['trigger'],
            version: 1,
            subtitle: '={{$parameter["events"].join(", ")}}',
            description: 'Starts the workflow when a PayzCore webhook event is received',
            defaults: {
                name: 'PayzCore Trigger',
            },
            inputs: [],
            outputs: ['main'],
            credentials: [
                {
                    name: 'payzCoreApi',
                    required: false,
                },
            ],
            webhooks: [
                {
                    name: 'default',
                    httpMethod: 'POST',
                    responseMode: 'onReceived',
                    path: 'webhook',
                },
            ],
            properties: [
                {
                    displayName: 'Events',
                    name: 'events',
                    type: 'multiOptions',
                    required: true,
                    default: ['payment.completed'],
                    options: [
                        {
                            name: 'Payment Completed',
                            value: 'payment.completed',
                            description: 'Payment fully received and confirmed',
                        },
                        {
                            name: 'Payment Overpaid',
                            value: 'payment.overpaid',
                            description: 'Received more than expected amount',
                        },
                        {
                            name: 'Payment Partial',
                            value: 'payment.partial',
                            description: 'Partial payment received',
                        },
                        {
                            name: 'Payment Expired',
                            value: 'payment.expired',
                            description: 'Payment window expired without full payment',
                        },
                        {
                            name: 'Payment Cancelled',
                            value: 'payment.cancelled',
                            description: 'Payment cancelled by the merchant',
                        },
                    ],
                    description: 'Which events to listen for',
                },
                {
                    displayName: 'Verify Signature',
                    name: 'verifySignature',
                    type: 'boolean',
                    default: true,
                    description: 'Whether to verify HMAC-SHA256 signature (requires Webhook Secret in credentials)',
                },
            ],
        };
    }
    async webhook() {
        const req = this.getRequestObject();
        const body = this.getBodyData();
        const verifySignature = this.getNodeParameter('verifySignature');
        // Signature verification
        if (verifySignature) {
            const credentials = await this.getCredentials('payzCoreApi');
            const webhookSecret = credentials === null || credentials === void 0 ? void 0 : credentials.webhookSecret;
            if (!webhookSecret) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Webhook Secret is required for signature verification. Add it to your PayzCore credentials or disable "Verify Signature".');
            }
            const signature = req.headers['x-payzcore-signature'];
            const timestamp = req.headers['x-payzcore-timestamp'];
            if (!signature) {
                return { webhookResponse: 'Missing signature', statusCode: 401 };
            }
            if (!timestamp) {
                return { webhookResponse: 'Missing timestamp header', statusCode: 401 };
            }
            // Replay protection: +-5 minutes (timestamp is ISO 8601)
            const ts = new Date(timestamp).getTime();
            if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
                return { webhookResponse: 'Timestamp too old', statusCode: 401 };
            }
            // Prefer rawBody (preserved original bytes) for accurate HMAC verification.
            // If rawBody is unavailable and body is already parsed, JSON.stringify may
            // produce different key order than the original payload, breaking HMAC.
            // In that case, skip verification with a warning rather than silently reject.
            let rawBody;
            if (req.rawBody) {
                rawBody = req.rawBody.toString('utf8');
            }
            else if (typeof req.body === 'string') {
                rawBody = req.body;
            }
            else {
                // Cannot verify HMAC without raw body — reject to prevent signature bypass
                return { webhookResponse: 'Cannot verify signature: raw body unavailable', statusCode: 401 };
            }
            // Signature covers timestamp + body
            const message = `${timestamp}.${rawBody}`;
            const expected = (0, crypto_1.createHmac)('sha256', webhookSecret).update(message).digest('hex');
            try {
                const sigBuf = Buffer.from(signature, 'hex');
                const expBuf = Buffer.from(expected, 'hex');
                if (sigBuf.length !== expBuf.length || !(0, crypto_1.timingSafeEqual)(sigBuf, expBuf)) {
                    return { webhookResponse: 'Invalid signature', statusCode: 401 };
                }
            }
            catch {
                return { webhookResponse: 'Invalid signature format', statusCode: 401 };
            }
        }
        // Event filter
        const events = this.getNodeParameter('events');
        if (body.event && !events.includes(body.event)) {
            return { webhookResponse: 'Event filtered' };
        }
        return {
            workflowData: [this.helpers.returnJsonArray(body)],
        };
    }
}
exports.PayzCoreTrigger = PayzCoreTrigger;
//# sourceMappingURL=PayzCoreTrigger.node.js.map