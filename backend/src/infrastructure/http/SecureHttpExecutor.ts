import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import http from 'node:http';
import https from 'node:https';
import type { OutboundEgressPolicy, ValidatedOutboundDestination } from '../security/OutboundNetworkPolicy.js';
import { outboundNetworkPolicy, OutboundNetworkPolicy } from '../security/OutboundNetworkPolicy.js';

export interface SecureHttpRequest extends AxiosRequestConfig {
  url: string;
  egressPolicy?: OutboundEgressPolicy;
  environmentTier?: string;
}

/** Executes arbitrary customer traffic only after policy validation and DNS pinning. */
export class SecureHttpExecutor {
  constructor(private readonly policy: OutboundNetworkPolicy = outboundNetworkPolicy) {}

  async execute<T = unknown>(request: SecureHttpRequest): Promise<AxiosResponse<T>> {
    const destination = await this.policy.validate(request.url, request.egressPolicy, request.environmentTier);
    const config: AxiosRequestConfig = {
      ...request,
      url: destination.url.toString(),
      maxRedirects: 0,
      httpAgent: this.agentFor(destination, false),
      httpsAgent: this.agentFor(destination, true),
    };
    // Supports Axios' callable form and keeps legacy focused tests injectable.
    const client = axios as unknown as { request?: <R>(config: AxiosRequestConfig) => Promise<AxiosResponse<R>>; <R>(config: AxiosRequestConfig): Promise<AxiosResponse<R>> };
    return typeof client.request === 'function' ? client.request<T>(config) : client<T>(config);
  }

  private agentFor(destination: ValidatedOutboundDestination, secure: boolean): http.Agent | https.Agent {
    const lookup: NonNullable<http.AgentOptions['lookup']> = (_hostname, options, callback) => {
      // Node may request either the single-address or all-address lookup
      // shape. Returning the wrong shape causes its socket layer to read an
      // undefined address (`Invalid IP address: undefined`).
      if (options && typeof options === 'object' && 'all' in options && options.all) {
        callback(null, [{ address: destination.address, family: destination.family }]);
      } else {
        callback(null, destination.address, destination.family);
      }
    };
    return secure ? new https.Agent({ lookup, servername: destination.hostname }) : new http.Agent({ lookup });
  }
}

export const secureHttpExecutor = new SecureHttpExecutor();
