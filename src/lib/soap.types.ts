export interface SOAPFault {
  ErrorCode: number;
  ErrorText: string;
  ErrorDetails?: string;
}

export interface P4CollectedDataBatchRequestEnvelope {
  EDSNBusinessDocumentHeader: EDSNBusinessDocumentHeader;
  P4Content: P4RequestContent;
}

export interface P4CollectedDataBatchResponseEnvelope {
  EDSNBusinessDocumentHeader: EDSNBusinessDocumentHeader;
  P4Content: P4ResponseContent;
}

export interface P4CollectedDataBatchResultRequestEnvelope {
  EDSNBusinessDocumentHeader: EDSNBusinessDocumentHeader;
  P4Content: {};
}

export interface P4CollectedDataBatchResultResponseEnvelope {
  EDSNBusinessDocumentHeader: EDSNBusinessDocumentHeader;
  P4Content: P4ResultContent;
}

export interface EDSNBusinessDocumentHeader {
  ContentHash?: string;
  ConversationID?: string;
  CorrelationID?: string;
  CreationTimestamp: string;
  DocumentID?: string;
  ExpiresAt?: string;
  MessageID: string;
  ProcessTypeID?: string;
  RepeatedRequest?: string;
  TestRequest?: string;
  Destination: Destination;
  Manifest?: Manifest;
  Source: Source;
}

export interface Destination {
  Receiver: Receiver;
  Service?: Service;
}

export interface Receiver {
  Authority?: string;
  ContactTypeIdentifier?: string;
  ReceiverID: string;
}

export interface Service {
  ServiceMethod?: string;
  ServiceName?: string;
}

export interface Manifest {
  NumberofItems: number;
  ManifestItem: ManifestItem[];
}

export interface ManifestItem {
  Description?: string;
  LanguageCode?: string;
  MimeTypeQualifierCode: string;
  UniformResourceIdentifier: string;
}

export interface Source {
  Authority?: string;
  ContactTypeIdentifier?: string;
  SenderID: string;
}

export interface P4RequestContent {
  P4MeteringPoint: P4MeteringPoint[];
}

export interface P4ResponseContent {
  P4Rejection: P4Rejection;
}

export interface P4ResultContent {
  P4MeteringPoint: P4MeteringPointResult[];
}

export interface P4MeteringPoint {
  EANID: string;
  ExternalReference: string;
  QueryDate?: string;
  QueryReason: string;
}

export interface P4MeteringPointResult extends P4MeteringPoint {
  P4EnergyMeter: P4EnergyMeter[];
  P4Rejection: P4Rejection[];
}

export interface P4Rejection {
  Rejection?: Rejection;
}
export interface Rejection {
  RejectionCode: string;
  RejectionText?: string;
}

export interface P4EnergyMeter {
  ID: string;
  P4Register: P4Register[];
}

export interface P4Register {
  ID: string;
  MeasureUnit: string;
  P4Reading: P4Reading[];
}

export interface P4Reading {
  Reading?: number;
  ReadingDateTime: string;
}
