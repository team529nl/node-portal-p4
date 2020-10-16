/* tslint:disable:no-console */
import {createP4Client} from "../src/lib/client";
import {createMessageWriter, createResponseSignatureValidator, QueryType} from "../src/lib/message";
import {createProxyTunnel, deep} from "../src/lib/util";
import config from "config";
import * as fs from "fs";
import {v1 as uuidv1} from "uuid";
import {P4CollectedDataBatchResponseEnvelope, P4CollectedDataBatchResultResponseEnvelope} from "../src/lib/soap.types";

/*
   Change date, set eans and keys. Run with NODE_ENV=production
   dataRequest request, responseRequest gets data. First one is enough for certificate test
 */

console.log("ENV: %s", process.env.NODE_ENV);

const date = new Date("2020-03-17");
const ean = "[EAN18]";
const nb = "[EAN13]";

const wsdlUri = config.get<string>('Client.p4PortalWsdl');
const sender = config.get<string>('Client.sender');

const privateKey = fs.readFileSync(config.get<string>('Client.privateKey'));
const publicCert = fs.readFileSync(config.get<string>('Client.publicCert'));

const creationTS = Date.parse('2020-03-17T09:33:12Z');
const now = () => new Date(creationTS);

async function dataRequest(): Promise<P4CollectedDataBatchResponseEnvelope|undefined> {

  const {server, address: proxyAddress} = await createProxyTunnel(config.get<string>('Proxy.host'),
      config.get<string>('Proxy.username'), fs.readFileSync(config.get<string>('Proxy.key')));

  const writer = createMessageWriter(sender, {now});
  const client = await createP4Client(wsdlUri, privateKey, publicCert);

  client.on('request', xml => {console.debug(`"REQUEST\n${xml}`)});
  client.on('response', xml => console.debug(`RESPONSE\n${xml}`));

  // const logger = (xml: string) => console.debug(xml);
  // const signatureValidator = createResponseSignatureValidator();
  const runRef = "staticRunId"; // uuidv1();

  // const requestData = writer.batchDataRequest(uuidv1(), nb, [
  const requestData = writer.batchDataRequest("staticId", nb, [
    {
      ean: ean,
      reference: runRef,
      date: date,
      queryType: QueryType.INTERVAL
    }]);

  const {response, error} = await client.requestData(requestData);
  server.close();
  if (error) {
    console.error(error);
    return undefined;
  }

  return response;
}

async function responseRequest(): Promise<P4CollectedDataBatchResultResponseEnvelope|undefined> {

  const {server, address: proxyAddress} = await createProxyTunnel(config.get<string>('Proxy.host'),
      config.get<string>('Proxy.username'), fs.readFileSync(config.get<string>('Proxy.key')));

  const writer = createMessageWriter(sender, {now: () => new Date(creationTS)});
  const client = await createP4Client(wsdlUri, privateKey, publicCert, proxyAddress);

  client.on('request', xml => {console.debug(`"REQUEST\n${xml}`)});
  client.on('response', xml => console.debug(`RESPONSE\n${xml}`));

  // const logger = (xml: string) => console.debug(xml);
  // const signatureValidator = createResponseSignatureValidator();
  const runRef = uuidv1();

  const requestResult = writer.batchDataResultRequest(runRef, nb);

  const {response, error} = await client.requestResult(requestResult);
  server.close();
  if (error) {
    console.error(error);
  }

  return response;
}


dataRequest().catch(e => console.warn(e)).then(r => {if (r) {console.debug(deep(r.EDSNBusinessDocumentHeader));}});
// responseRequest().catch(e => console.warn(e)).then(r => {if (r) {console.debug(deep(r.P4Content));}});
