import config from 'config';
import * as fs from 'fs';
import * as path from 'path';
import {createP4Client} from "../src/lib/client";
import {createMessageWriter, createResponseSignatureValidator, QueryType} from "../src/lib/message";
import {v1 as uuidv1} from "uuid";
import * as util from 'util';
import {createProxyTunnel} from "../src/lib/util";

const wsdlUri = config.get<string>('Client.p4PortalWsdl');
const sender = config.get<string>('Client.sender');
const privateKey = fs.readFileSync(config.get<string>('Client.privateKey'));
const publicCert = fs.readFileSync(config.get<string>('Client.publicCert'));

const resultsDir = "qualify-run";

function deep(o?: object) : string | undefined {
  return o ? util.inspect(o, false, null) : undefined;
}

function delay(ms: number) : Promise<{}> {
  return new Promise( resolve => setTimeout(resolve, ms) );
}

interface DataEntry {
  ean: string,
  ref: string,
  received?: boolean
}

interface DataStore {
  [index: string]: DataEntry
}

function isReady(store: DataStore, reference: string): boolean {
  return Object.values(store).filter(e => e.ref === reference ).reduce((acc, e) =>  acc && !!e.received, true as boolean)
}


async function qualify(eans: string[]): Promise<void> {

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
  }

  const {server, address: proxyAddress} = await createProxyTunnel(config.get<string>('Proxy.host'),
      config.get<string>('Proxy.username'),
      fs.readFileSync(config.get<string>('Proxy.key')));

  const date = new Date("2018-12-02");

  const writer = createMessageWriter(sender);
  const client = await createP4Client(wsdlUri, privateKey, publicCert, proxyAddress);

  const logger = (xml: string) => console.debug(xml);
  const signatureValidator = createResponseSignatureValidator();

  // client.on('request', logger);
  client.on('response', (xml: string) => {console.debug(signatureValidator.validate(xml));});

  for (const ean of eans) {

    const runRef = uuidv1();
    const runData = [ean].reduce<DataStore>((acc, value) => { acc[value] = {ref: runRef, ean: value}; return acc;}, {});

    const requestData = writer.batchDataRequest(uuidv1(), '8710000004442', [
    {
      ean: ean,
      reference: runRef,
      date: date,
      queryType: QueryType.INTERVAL
    }]);

    const dataBatchRequestWriter = (xml: string) => {
      fs.writeFileSync(path.join(resultsDir, ean + ".databatchrequest.xml"), xml)
    };

    const dataBatchResponseWriter = (xml: string) => {
      fs.writeFileSync(path.join(resultsDir, ean + ".databatchresponse.xml"), xml)
    };

    client.on('request', dataBatchRequestWriter);
    client.on('response', dataBatchResponseWriter);

    console.debug("Requesting %s", ean);
    // console.debug(deep(requestData));
    const {response, error} = await client.requestData(requestData);
    if (error) {
      throw new Error(error)
    }

    client.off('request', dataBatchRequestWriter);
    client.off('response', dataBatchResponseWriter);

    // console.debug(deep(response));

    console.debug("Resulting");

    const dataBatchResultRequestWriter = (xml: string) => {
      fs.writeFileSync(path.join(resultsDir, ean + ".databatchresultrequest.xml"), xml)
    };

    const dataBatchResultResponseWriter = (xml: string) => {
      fs.writeFileSync(path.join(resultsDir, ean + ".databatchresultresponse.xml"), xml)
    };

    client.on('request', dataBatchResultRequestWriter);
    client.on('response', dataBatchResultResponseWriter);

    while (!isReady(runData, runRef)) {
      console.debug("Try ...");
      const requestResult = writer.batchDataResultRequest(uuidv1(), '8710000004442');
      // console.debug(deep(requestResult));
      const {response: resultResponse, error: resultError} = await client.requestResult(requestResult);
      if (resultError) {
        // throw new Error(resultError)
        console.debug("error, try again ...")
      }
      // console.debug(deep(resultResponse));

      if (resultResponse) {

        if (resultResponse.P4Content) {
          const mps = Array.isArray(resultResponse.P4Content.P4MeteringPoint) ?
              resultResponse.P4Content.P4MeteringPoint : [resultResponse.P4Content.P4MeteringPoint];
          mps.forEach(mp => {

            console.debug("Result: %s %s", runRef, mp.EANID);

            if (mp.ExternalReference === runRef) {
              const entry = runData[mp.EANID];
              if (entry) {
                entry.received = true;
              }
            }
          });
        }
      }

      await delay(2000);
    }

    client.off('request', dataBatchResultRequestWriter);
    client.off('response', dataBatchResultResponseWriter);

  }

  server.close();
}

const testSet = [
  "871687400002065714",
  "871687400002065899",
  "871687400002066032",
  "871687400002085484",
  "871687400002085538",
  "871687400002090525",
  "871687400002097289",
  "871687400002097883",
  "871687400002100606",
  "871687400002127214",
  "871687400002127368",
  "871687400002162598",
  "871687400002166756",
  "871687400000010976",
  "871687400000012819",
  "871687400000013021",
  "871687400000013069",
  "871687400000016886",
  "871687400000017616",
  "871687400000025048",
  "871687400000025598",
  "871687400000036822",
  "871687400000038246",
  "871687400000039120",
  "871687400000039328",
  "871687400000048030",
  "871687400000048047",
  "871687400000048054",
  "871687400000048061",
  "871687400000048078",
  "871687400000048085",
  "871687400000048092",
  "871687400000048108",
  "871687400000048115",
  "871687400000048122",
  "871687400000048139",
  "871687400000048146",
  "871687400000048153",
  "871687400000048160",
  "871687400000048177",
  "871687400000048184",
  "871687400000048191",
  "871687400000048207",
  "871687400000048214",
  "871687400000048221",
  "871687400000048238",
  "871687400000048245",
  "871100007683469334",
  "871100006649053075",
];

qualify(testSet).catch(e => console.debug(e)).then(c => console.debug("done."));
