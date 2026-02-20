import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';
import { payzCoreApiRequest } from './GenericFunctions';

export class PayzCore implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'PayzCore',
    name: 'payzCore',
    icon: 'file:payzcore.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with PayzCore blockchain transaction monitoring API',
    defaults: {
      name: 'PayzCore',
    },
    inputs: ['main'],
    outputs: ['main'],
    usableAsTool: true,
    credentials: [
      {
        name: 'payzCoreApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Payment', value: 'payment' },
        ],
        default: 'payment',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: { resource: ['payment'] },
        },
        options: [
          {
            name: 'Confirm',
            value: 'confirm',
            description: 'Confirm a payment with transaction hash (static wallet mode)',
            action: 'Confirm a payment',
          },
          {
            name: 'Create',
            value: 'create',
            description: 'Create a new payment monitoring request',
            action: 'Create a payment',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get a payment by ID',
            action: 'Get a payment',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List payments for the project',
            action: 'List payments',
          },
        ],
        default: 'create',
      },
      // Create fields
      {
        displayName: 'Amount',
        name: 'amount',
        type: 'number',
        required: true,
        default: 0,
        typeOptions: { minValue: 0.01, numberPrecision: 2 },
        description: 'Payment amount in stablecoin',
        displayOptions: { show: { resource: ['payment'], operation: ['create'] } },
      },
      {
        displayName: 'Chain',
        name: 'chain',
        type: 'options',
        required: true,
        options: [
          { name: 'TRC20 (Tron)', value: 'TRC20' },
          { name: 'BEP20 (BSC)', value: 'BEP20' },
          { name: 'ERC20 (Ethereum)', value: 'ERC20' },
          { name: 'Polygon', value: 'POLYGON' },
          { name: 'Arbitrum', value: 'ARBITRUM' },
        ],
        default: 'TRC20',
        description: 'Blockchain network',
        displayOptions: { show: { resource: ['payment'], operation: ['create'] } },
      },
      {
        displayName: 'Token',
        name: 'token',
        type: 'options',
        options: [
          { name: 'USDT', value: 'USDT' },
          { name: 'USDC', value: 'USDC' },
        ],
        default: 'USDT',
        description: 'Stablecoin token (USDC not available on TRC20)',
        displayOptions: { show: { resource: ['payment'], operation: ['create'] } },
      },
      {
        displayName: 'External Reference',
        name: 'externalRef',
        type: 'string',
        required: true,
        default: '',
        description: 'Your user/customer identifier',
        displayOptions: { show: { resource: ['payment'], operation: ['create'] } },
      },
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: { show: { resource: ['payment'], operation: ['create'] } },
        options: [
          {
            displayName: 'Address',
            name: 'address',
            type: 'string',
            default: '',
            description: 'Static wallet address to monitor (skips HD derivation)',
          },
          {
            displayName: 'External Order ID',
            name: 'externalOrderId',
            type: 'string',
            default: '',
            description: 'Your order reference for idempotency',
          },
          {
            displayName: 'Expires In (Seconds)',
            name: 'expiresIn',
            type: 'number',
            default: 1800,
            typeOptions: { minValue: 300, maxValue: 86400 },
            description: 'Seconds until payment expires',
          },
          {
            displayName: 'Metadata',
            name: 'metadata',
            type: 'json',
            default: '{}',
            description: 'Arbitrary key-value data returned in webhooks',
          },
        ],
      },
      // Get fields
      {
        displayName: 'Payment ID',
        name: 'paymentId',
        type: 'string',
        required: true,
        default: '',
        description: 'UUID of the payment',
        displayOptions: { show: { resource: ['payment'], operation: ['get'] } },
      },
      // Confirm fields
      {
        displayName: 'Payment ID',
        name: 'confirmPaymentId',
        type: 'string',
        required: true,
        default: '',
        description: 'UUID of the payment to confirm',
        displayOptions: { show: { resource: ['payment'], operation: ['confirm'] } },
      },
      {
        displayName: 'Transaction Hash',
        name: 'txHash',
        type: 'string',
        required: true,
        default: '',
        description: 'Blockchain transaction hash as proof of payment',
        displayOptions: { show: { resource: ['payment'], operation: ['confirm'] } },
      },
      // List fields
      {
        displayName: 'Filters',
        name: 'filters',
        type: 'collection',
        placeholder: 'Add Filter',
        default: {},
        displayOptions: { show: { resource: ['payment'], operation: ['list'] } },
        options: [
          {
            displayName: 'Status',
            name: 'status',
            type: 'options',
            options: [
              { name: 'Pending', value: 'pending' },
              { name: 'Confirming', value: 'confirming' },
              { name: 'Partial', value: 'partial' },
              { name: 'Paid', value: 'paid' },
              { name: 'Overpaid', value: 'overpaid' },
              { name: 'Expired', value: 'expired' },
              { name: 'Cancelled', value: 'cancelled' },
            ],
            default: '',
            description: 'Filter by payment status',
          },
          {
            displayName: 'Limit',
            name: 'limit',
            type: 'number',
            default: 50,
            typeOptions: { minValue: 1, maxValue: 100 },
            description: 'Max results to return',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        if (resource === 'payment') {
          if (operation === 'create') {
            const amount = this.getNodeParameter('amount', i) as number;
            const chain = this.getNodeParameter('chain', i) as string;
            const token = this.getNodeParameter('token', i) as string;
            const externalRef = this.getNodeParameter('externalRef', i) as string;
            const additionalFields = this.getNodeParameter('additionalFields', i) as {
              address?: string;
              externalOrderId?: string;
              expiresIn?: number;
              metadata?: string;
            };

            const body: Record<string, any> = {
              amount,
              chain,
              token,
              external_ref: externalRef,
            };
            if (additionalFields.address) body.address = additionalFields.address;
            if (additionalFields.externalOrderId) body.external_order_id = additionalFields.externalOrderId;
            if (additionalFields.expiresIn) body.expires_in = additionalFields.expiresIn;
            if (additionalFields.metadata) {
              try { body.metadata = JSON.parse(additionalFields.metadata); } catch (e) {
                throw new NodeOperationError(this.getNode(), 'Invalid JSON in metadata field', { description: 'Metadata must be valid JSON, e.g. {"key": "value"}' });
              }
            }

            const response = await payzCoreApiRequest.call(this, 'POST', '/payments', body);
            returnData.push({ json: response });
          }

          if (operation === 'get') {
            const paymentId = this.getNodeParameter('paymentId', i) as string;
            const response = await payzCoreApiRequest.call(this, 'GET', `/payments/${paymentId}`);
            returnData.push({ json: response });
          }

          if (operation === 'confirm') {
            const paymentId = this.getNodeParameter('confirmPaymentId', i) as string;
            const txHash = this.getNodeParameter('txHash', i) as string;
            const response = await payzCoreApiRequest.call(this, 'POST', `/payments/${paymentId}/confirm`, { tx_hash: txHash });
            returnData.push({ json: response });
          }

          if (operation === 'list') {
            const filters = this.getNodeParameter('filters', i) as {
              status?: string;
              limit?: number;
            };
            const qs: Record<string, string | number> = {};
            if (filters.status) qs.status = filters.status;
            if (filters.limit) qs.limit = filters.limit;

            const response = await payzCoreApiRequest.call(this, 'GET', '/payments', {}, qs);
            returnData.push({ json: response });
          }
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: (error as Error).message } });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
