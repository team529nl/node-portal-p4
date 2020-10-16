import {P4CollectedDataBatchRequestEnvelope, P4CollectedDataBatchResultRequestEnvelope} from './soap.types';
import * as crypto from 'xml-crypto';
import {DOMParser} from "xmldom";
import * as fs from "fs";
import * as path from "path";

type MeteringPointEAN = string;
type MarketPartyEAN = string;

export enum QueryType {
  DAY = 'DAY',
  INTERVAL = 'INT',
  MONTHLY_RECOVERY = 'RCY'
}

export interface MeteringPointQuery {
  readonly ean: MeteringPointEAN;
  readonly reference: string;
  readonly date?: Date;
  readonly queryType: QueryType;
}

export interface MessageWriter {
  readonly batchDataRequest: (messageId: string, receiver: MarketPartyEAN, meteringPoints: ReadonlyArray<MeteringPointQuery>)
      => P4CollectedDataBatchRequestEnvelope,
  readonly  batchDataResultRequest: (messageId: string, receiver: MarketPartyEAN) => P4CollectedDataBatchResultRequestEnvelope
}

export interface MessageWriterOptions {
  now?: () => Date;
}

function utcDateTimeStringForSOAP(date: Date): string {
  return (
    date.getUTCFullYear() +
    '-' +
    ('0' + (date.getUTCMonth() + 1)).slice(-2) +
    '-' +
    ('0' + date.getUTCDate()).slice(-2) +
    'T' +
    ('0' + date.getUTCHours()).slice(-2) +
    ':' +
    ('0' + date.getUTCMinutes()).slice(-2) +
    ':' +
    ('0' + date.getUTCSeconds()).slice(-2) +
    'Z'
  );
}

function dateStringForSoap(date: Date): string {
  return (
    date.getFullYear() +
    '-' +
    ('0' + (date.getUTCMonth() + 1)).slice(-2) +
    '-' +
    ('0' + date.getUTCDate()).slice(-2)
  );
}

export function createMessageWriter(
  sender: MarketPartyEAN,
  options?: MessageWriterOptions
): MessageWriter {
  const now: () => Date =
    options && options.now ? options.now : () => new Date(Date.now());
  return {
    batchDataRequest(messageId: string, receiver: MarketPartyEAN, meteringPoints: ReadonlyArray<MeteringPointQuery>
    ): P4CollectedDataBatchRequestEnvelope {
      for (const mpq of meteringPoints) {
        if (mpq.queryType === QueryType.MONTHLY_RECOVERY && mpq.date) {
          throw Error('RCY does not require date');
        } else if (mpq.queryType !== QueryType.MONTHLY_RECOVERY && !mpq.date) {
          throw Error('DAY and INT require date');
        }
      }

      return {
        EDSNBusinessDocumentHeader: {
          CreationTimestamp: utcDateTimeStringForSOAP(now()),
          MessageID: messageId,
          Destination: {
            Receiver: {
              ReceiverID: receiver
            }
          },
          Source: {
            SenderID: sender
          }
        },
        P4Content: {
          P4MeteringPoint: meteringPoints.map(mp => {
            return {
              EANID: mp.ean,
              ExternalReference: mp.reference,
              ...(mp.date ? { QueryDate: dateStringForSoap(mp.date) } : {}),
              QueryReason: mp.queryType.toString()
            };
          })
        }
      };
    },

    batchDataResultRequest(messageId: string, receiver: MarketPartyEAN): P4CollectedDataBatchResultRequestEnvelope {
      return {
        EDSNBusinessDocumentHeader: {
          CreationTimestamp: utcDateTimeStringForSOAP(now()),
          MessageID: messageId,
          Destination: {
            Receiver: {
              ReceiverID: receiver
            }
          },
          Source: {
            SenderID: sender
          }
        },
        P4Content: {}
      };
    }
  };
}

interface ValidatorReponse {valid: boolean, error?: string}

export interface ResponseValidator {
  readonly validate: (xml: string) => ValidatorReponse;
}

export function createResponseSignatureValidator(): ResponseValidator {

  const signatureCertName = process.env.NODE_ENV === 'production' ? 'sign.pp4.edsn.nl.cer' : 'sign.pp4-test.edsn.nl.cer';

  const signatureCert = fs.readFileSync(path.join(__dirname, 'certificates', signatureCertName));

  const keyInfoProvider = {
    getKeyInfo(key: any, prefix: string): string {
      return "<" + prefix + "X509Data></" + prefix + "X509Data>";
    },

    getKey(keyInfo: string): Buffer {
      return signatureCert;
    }
  };

  return {

    validate(xml: string): ValidatorReponse {
      const doc = new DOMParser().parseFromString(xml);

      const signature = crypto.xpath(doc, "//*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']")[0];

      const sig = new crypto.SignedXml();
      sig.keyInfoProvider = keyInfoProvider;
      sig.loadSignature(signature);

      const res = sig.checkSignature(xml);
      if (!res) {
        return {valid: false, error: sig.validationErrors.join(",")};
      }

      const bodyId = crypto.xpath(doc, "//*[local-name(.)='Body']/@*[local-name()='Id']")[0];
      const uri = sig.references[0].uri;
      const signatureId = (uri[0] === '#') ? uri.substring(1) : uri;

      if (!bodyId || bodyId.value !== signatureId) {
        return {valid: false, error: 'The body element was not the one verified by the signature'};
      }

      return {valid: true}
    }
  }
}
