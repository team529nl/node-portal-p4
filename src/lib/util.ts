import config from 'config';
import tunnel from 'tunnel-ssh';
import * as fs from "fs";
import {Server} from "net";
import * as util from "util";
const {promisify} = util;

export function deep(o: any):  any {
  return o ? util.inspect(o, false, null) : {};
}

export function formatXml(src: string): string {
  let formatted = '';
  const reg = /(>)(<)(\/*)/g;
  const xml = src.replace(reg, '$1\r\n$2$3');
  let pad = 0;
  xml.split('\r\n').forEach((node) => {
    let indent = 0;
    if (node.match( /.+<\/\w[^>]*>$/ )) {
      indent = 0;
    } else if (node.match( /^<\/\w/ )) {
      if (pad !== 0) {
        pad -= 1;
      }
    } else if (node.match( /^<\w([^>]*[^\/])?>.*$/ )) {
      indent = 1;
    } else {
      indent = 0;
    }

    let padding = '';
    for (let i = 0; i < pad; i++) {
      padding += '  ';
    }

    formatted += padding + node + '\r\n';
    pad += indent;
  });

  return formatted;
}



const asyncTunnel = promisify(tunnel);

export async function createProxyTunnel(proxyHost: string, username: string, privateKey: Buffer): Promise<{server: Server, address: string}> {
  const proxyConfig = {
    keepAlive:true,
    host: proxyHost,
    dstHost: '127.0.0.1',
    dstPort: '8888',
    port: 22,
    username: username,
    privateKey: privateKey
  };

  const server = await asyncTunnel(proxyConfig);
  return {server, address: `http://${proxyConfig.dstHost}:${proxyConfig.dstPort}`};
}
