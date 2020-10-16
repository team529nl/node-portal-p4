import request from 'request';
import * as soap from 'soap';
import {} from './message';
import {
  P4CollectedDataBatchRequestEnvelope,
  P4CollectedDataBatchResponseEnvelope,
  P4CollectedDataBatchResultRequestEnvelope,
  P4CollectedDataBatchResultResponseEnvelope
} from './soap.types';
import {EventEmitter} from "events";
import {deep} from "./util";

export interface SoapResult<T> {
  response? : T,
  error?: string
}

export interface P4Client {
  readonly requestData: (message: P4CollectedDataBatchRequestEnvelope) => Promise<SoapResult<P4CollectedDataBatchResponseEnvelope>>;
  readonly requestResult: (message: P4CollectedDataBatchResultRequestEnvelope) => Promise<SoapResult<P4CollectedDataBatchResultResponseEnvelope>>;
  readonly on: (event: 'request'|'response', listener: (xml: string) => void) => void;
  readonly off: (event: 'request'|'response', listener: (xml: string) => void) => void;

}

type soapCall<I,O> = (msg: I) => [O, string, object, string]; // result, rawResponse, headers, rawReques

export async function createP4Client(wsdlUri: string, privateKey: Buffer, publicCert: Buffer, proxy?: string) : Promise<P4Client> {

  const wsSecurity = new soap.WSSecurityCert(privateKey, publicCert, '',
      {hasTimeStamp: false, signatureTransformations: ["http://www.w3.org/2001/10/xml-exc-c14n#"]});

  const options = proxy ? {request: request.defaults({proxy})} : {request};

  // @ts-ignore
  const client = await soap.createClientAsync(wsdlUri, options);
  client.setSecurity(wsSecurity);

  // @ts-ignore
  client.on('request', (xml, eid) => emitter.emit('request', xml));
  // @ts-ignore
  client.on('response', (body, response, eid) => emitter.emit('response', body));

  const emitter = new EventEmitter();

  return {
    async requestData(message: P4CollectedDataBatchRequestEnvelope): Promise<SoapResult<P4CollectedDataBatchResponseEnvelope>> {
      try {
        const [result, , ,] = await (client.P4CollectedDataBatchRequestAsync as soapCall<P4CollectedDataBatchRequestEnvelope, P4CollectedDataBatchResponseEnvelope>)(message);
        return {response: result};
      }
      catch (e) {
        return {error: deep(e.root).toString()};
      }
    },

    async requestResult(message: P4CollectedDataBatchResultRequestEnvelope): Promise<SoapResult<P4CollectedDataBatchResultResponseEnvelope>> {
      try {
        const [result, , , /* rawRequest */] = await (client.P4CollectedDataBatchResultRequestAsync as soapCall<P4CollectedDataBatchResultRequestEnvelope, P4CollectedDataBatchResultResponseEnvelope>)(message);
        return {response: result};
      }
      catch (e) {
        return {error: deep(e.root).toString()};
      }
    },

    on(event: 'request'|'response', listener: (xml: string) => void): void {
      emitter.addListener(event, listener);
    },

    off(event: 'request'|'response', listener: (xml: string) => void): void {
      emitter.removeListener(event, listener);
    }

  };

}
