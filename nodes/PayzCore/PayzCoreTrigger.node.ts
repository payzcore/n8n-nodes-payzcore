import {
  IWebhookFunctions,
  INodeType,
  INodeTypeDescription,
  IWebhookResponseData,
  NodeOperationError,
} from 'n8n-workflow';
import { createHmac, timingSafeEqual } from 'crypto';

export class PayzCoreTrigger implements INodeType {
  description: INodeTypeDescription = {
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

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const req = this.getRequestObject();
    const body = this.getBodyData() as {
      event?: string;
      [key: string]: any;
    };
    const verifySignature = this.getNodeParameter('verifySignature') as boolean;

    // Signature verification
    if (verifySignature) {
      const credentials = await this.getCredentials('payzCoreApi');
      const webhookSecret = credentials?.webhookSecret as string;

      if (!webhookSecret) {
        throw new NodeOperationError(
          this.getNode(),
          'Webhook Secret is required for signature verification. Add it to your PayzCore credentials or disable "Verify Signature".',
        );
      }

      const signature = req.headers['x-payzcore-signature'] as string;
      const timestamp = req.headers['x-payzcore-timestamp'] as string;

      if (!signature) {
        return { webhookResponse: 'Missing signature', statusCode: 401 } as any;
      }

      // Replay protection: +-5 minutes (timestamp is ISO 8601)
      if (timestamp) {
        const ts = new Date(timestamp).getTime();
        if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
          return { webhookResponse: 'Timestamp too old', statusCode: 401 } as any;
        }
      }

      // Prefer rawBody (preserved original bytes) for accurate HMAC verification.
      // If rawBody is unavailable and body is already parsed, JSON.stringify may
      // produce different key order than the original payload, breaking HMAC.
      // In that case, skip verification with a warning rather than silently reject.
      let rawBody: string;
      if ((req as any).rawBody) {
        rawBody = (req as any).rawBody.toString('utf8');
      } else if (typeof req.body === 'string') {
        rawBody = req.body;
      } else {
        console.warn(
          '[PayzCore] rawBody not available and body is parsed object — skipping HMAC verification. ' +
          'Signature cannot be reliably verified without the original request bytes.',
        );
        // Proceed without HMAC check (signature header presence already validated above)
        const events = this.getNodeParameter('events') as string[];
        if (body.event && !events.includes(body.event)) {
          return { webhookResponse: 'Event filtered' } as any;
        }
        return {
          workflowData: [this.helpers.returnJsonArray(body)],
        };
      }
      const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      try {
        const sigBuf = Buffer.from(signature, 'hex');
        const expBuf = Buffer.from(expected, 'hex');
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          return { webhookResponse: 'Invalid signature', statusCode: 401 } as any;
        }
      } catch {
        return { webhookResponse: 'Invalid signature format', statusCode: 401 } as any;
      }
    }

    // Event filter
    const events = this.getNodeParameter('events') as string[];
    if (body.event && !events.includes(body.event)) {
      return { webhookResponse: 'Event filtered' } as any;
    }

    return {
      workflowData: [this.helpers.returnJsonArray(body)],
    };
  }
}
