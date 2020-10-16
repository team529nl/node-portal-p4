declare module 'tunnel-ssh' {
  import {Server} from 'net';
  export default function tunnel(config: any, cb: (err: Error, server: Server) => void): Server;
}