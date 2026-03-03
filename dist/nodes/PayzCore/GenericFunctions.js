"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payzCoreApiRequest = payzCoreApiRequest;
const n8n_workflow_1 = require("n8n-workflow");
async function payzCoreApiRequest(method, endpoint, body = {}, qs = {}) {
    const credentials = await this.getCredentials('payzCoreApi');
    const baseUrl = credentials.apiUrl || 'https://api.payzcore.com';
    const options = {
        method,
        url: `${baseUrl}/v1${endpoint}`,
        headers: {
            'x-api-key': credentials.apiKey,
            'Content-Type': 'application/json',
        },
        qs,
        body,
        json: true,
    };
    if (method === 'GET') {
        delete options.body;
    }
    try {
        return await this.helpers.httpRequest(options);
    }
    catch (error) {
        throw new n8n_workflow_1.NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map