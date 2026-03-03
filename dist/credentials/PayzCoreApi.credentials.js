"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayzCoreApi = void 0;
class PayzCoreApi {
    constructor() {
        this.name = 'payzCoreApi';
        this.displayName = 'PayzCore API';
        this.documentationUrl = 'https://docs.payzcore.com';
        this.properties = [
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                required: true,
                description: 'Your PayzCore project API key (pk_live_...)',
            },
            {
                displayName: 'API URL',
                name: 'apiUrl',
                type: 'string',
                default: 'https://api.payzcore.com',
                description: 'PayzCore API base URL',
            },
            {
                displayName: 'Webhook Secret',
                name: 'webhookSecret',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                description: 'Webhook signing secret for HMAC verification (optional, required for trigger node)',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    'x-api-key': '={{$credentials.apiKey}}',
                },
            },
        };
        this.test = {
            request: {
                baseURL: '={{$credentials.apiUrl}}',
                url: '/v1/payments',
                qs: { limit: '1' },
            },
        };
    }
}
exports.PayzCoreApi = PayzCoreApi;
//# sourceMappingURL=PayzCoreApi.credentials.js.map