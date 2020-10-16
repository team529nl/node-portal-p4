declare module 'xml-crypto' {

  export class SignedXml {
    public keyInfoProvider: any
    public references: any[];
    public validationErrors: string[];
    public loadSignature(signature: any):void;
    public checkSignature(xml: string): string|undefined
  }

  export function xpath(doc: any, query: string): any[]
}