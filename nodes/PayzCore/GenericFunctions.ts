import {
  IExecuteFunctions,
  IHookFunctions,
  ILoadOptionsFunctions,
  IHttpRequestMethods,
  IRequestOptions,
  NodeApiError,
} from 'n8n-workflow';

export async function payzCoreApiRequest(
  this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  body: object = {},
  qs: Record<string, string | number> = {},
): Promise<any> {
  const credentials = await this.getCredentials('payzCoreApi');
  const baseUrl = (credentials.apiUrl as string) || 'https://api.payzcore.com';

  const options: IRequestOptions = {
    method,
    uri: `${baseUrl}/api/v1${endpoint}`,
    headers: {
      'x-api-key': credentials.apiKey as string,
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
    return await this.helpers.request(options);
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as any);
  }
}
