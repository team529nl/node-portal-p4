import {
  createMessageWriter,
  MeteringPointQuery,
  QueryType
} from './message';

import * as chai from 'chai';
import { suite, test } from 'mocha';
import { P4CollectedDataBatchRequestEnvelope } from './soap.types';

const expect = chai.expect;

const creationTS = Date.parse('2018-01-02T12:12:12Z');

const singleTestAllTypes: ReadonlyArray<
  [ReadonlyArray<MeteringPointQuery>, P4CollectedDataBatchRequestEnvelope]
> = [
  [
    [
      {
        ean: 'testaansluiting1',
        reference: 'mijnreferentie',
        date: new Date('2018-01-01'),
        queryType: QueryType.DAY
      }
    ],
    {
      EDSNBusinessDocumentHeader: {
        CreationTimestamp: '2018-01-02T12:12:12Z',
        MessageID: 'uniekid',
        Destination: {
          Receiver: {
            ReceiverID: 'receiverEAN'
          }
        },
        Source: {
          SenderID: 'senderEAN'
        }
      },
      P4Content: {
        P4MeteringPoint: [
          {
            EANID: 'testaansluiting1',
            ExternalReference: 'mijnreferentie',
            QueryDate: '2018-01-01',
            QueryReason: 'DAY'
          }
        ]
      }
    }
  ],
  [
    [
      {
        ean: 'testaansluiting2',
        reference: 'mijnreferentie2',
        date: new Date('2018-01-02'),
        queryType: QueryType.INTERVAL
      }
    ],
    {
      EDSNBusinessDocumentHeader: {
        CreationTimestamp: '2018-01-02T12:12:12Z',
        MessageID: 'uniekid',
        Destination: {
          Receiver: {
            ReceiverID: 'receiverEAN'
          }
        },
        Source: {
          SenderID: 'senderEAN'
        }
      },
      P4Content: {
        P4MeteringPoint: [
          {
            EANID: 'testaansluiting2',
            ExternalReference: 'mijnreferentie2',
            QueryDate: '2018-01-02',
            QueryReason: 'INT'
          }
        ]
      }
    }
  ],
  [
    [
      {
        ean: 'testaansluiting3',
        reference: 'mijnreferentie3',
        queryType: QueryType.MONTHLY_RECOVERY
      }
    ],
    {
      EDSNBusinessDocumentHeader: {
        CreationTimestamp: '2018-01-02T12:12:12Z',
        MessageID: 'uniekid',
        Destination: {
          Receiver: {
            ReceiverID: 'receiverEAN'
          }
        },
        Source: {
          SenderID: 'senderEAN'
        }
      },
      P4Content: {
        P4MeteringPoint: [
          {
            EANID: 'testaansluiting3',
            ExternalReference: 'mijnreferentie3',
            QueryReason: 'RCY'
          }
        ]
      }
    }
  ]
];

const combinedTestAllTypes: ReadonlyArray<
  [ReadonlyArray<MeteringPointQuery>, P4CollectedDataBatchRequestEnvelope]
> = [
  [
    [
      {
        ean: 'testaansluiting1',
        reference: 'mijnreferentie',
        date: new Date('2018-01-01'),
        queryType: QueryType.DAY
      },
      {
        ean: 'testaansluiting2',
        reference: 'mijnreferentie2',
        date: new Date('2018-01-02'),
        queryType: QueryType.INTERVAL
      },
      {
        ean: 'testaansluiting3',
        reference: 'mijnreferentie3',
        queryType: QueryType.MONTHLY_RECOVERY
      }
    ],
    {
      EDSNBusinessDocumentHeader: {
        CreationTimestamp: '2018-01-02T12:12:12Z',
        MessageID: 'uniekid',
        Destination: {
          Receiver: {
            ReceiverID: 'receiverEAN'
          }
        },
        Source: {
          SenderID: 'senderEAN'
        }
      },
      P4Content: {
        P4MeteringPoint: [
          {
            EANID: 'testaansluiting1',
            ExternalReference: 'mijnreferentie',
            QueryDate: '2018-01-01',
            QueryReason: 'DAY'
          },
          {
            EANID: 'testaansluiting2',
            ExternalReference: 'mijnreferentie2',
            QueryDate: '2018-01-02',
            QueryReason: 'INT'
          },
          {
            EANID: 'testaansluiting3',
            ExternalReference: 'mijnreferentie3',
            QueryReason: 'RCY'
          }
        ]
      }
    }
  ]
];

suite('BatchRequest', () => {
  const messageWriter = createMessageWriter('senderEAN', {
    now: () => new Date(creationTS)
  });

  const request = messageWriter.batchDataRequest;
  test('single all types', () => {
    for (const [i, o] of singleTestAllTypes) {
      expect(request('uniekid','receiverEAN', i)).to.eql(o);
    }
  });

  test('combined all types', () => {
    for (const [i, o] of combinedTestAllTypes) {
      expect(request('uniekid','receiverEAN', i)).to.eql(o);
    }
  });

  test('RCY does not require date', () => {
    expect(() =>
      request('uniekid2','receiverEAN', [
        {
          ean: 'testaansluiting4',
          reference: 'mijnreferentie4',
          date: new Date(),
          queryType: QueryType.MONTHLY_RECOVERY
        }
      ])
    ).to.throw();
  });

  test('DAY requires date', () => {
    expect(() =>
      request('uniekid3','receiverEAN', [
        {
          ean: 'testaansluiting4',
          reference: 'mijnreferentie5',
          queryType: QueryType.DAY
        }
      ])
    ).to.throw();
  });

  test('INT requires date', () => {
    expect(() =>
      request('uniekid4','receiverEAN', [
        {
          ean: 'testaansluiting4',
          reference: 'mijnreferentie6',
          queryType: QueryType.INTERVAL
        }
      ])
    ).to.throw();
  });
});
