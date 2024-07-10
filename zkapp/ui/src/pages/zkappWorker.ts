import { Mina, PublicKey,Struct,Field, fetchAccount,CircuitString, PrivateKey } from 'o1js';

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;


// ---------------------------------------------------------------------------------------

import type { DomainRecord, Resolver } from '../../../contracts/build/src/Resolver.js';


const state = {
  Resolver: null as null | typeof Resolver,
  zkapp: null as null | Resolver,
  transaction: null as null | Transaction,
  subdomain: null as null | CircuitString,
  namedata: null as null | DomainRecord,
  offchain: null as null | any
};

// ---------------------------------------------------------------------------------------

const functions = {
  setActiveInstanceToDevnet: async (args: {}) => {
    const Devnet = Mina.Network(
      'https://api.minascan.io/node/devnet/v1/graphql'
    );
    console.log('Devnet Instance Created');
    Mina.setActiveInstance(Devnet);
  },
  loadContract: async (args: {}) => {
    const { Resolver, offchainState } = await import('../../../contracts/build/src/Resolver.js');
    state.Resolver = Resolver;
    state.offchain = offchainState;
  },
  compileZkProgram: async (args: {}) => {
    await state.offchain!.compile();

  },
  compileContract: async (args: {}) => {
    await state.Resolver!.digest();
    await state.Resolver!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.Resolver!(publicKey);
    const {  offchainState } = await import('../../../contracts/build/src/Resolver.js');
    offchainState.setContractInstance(state.zkapp);
  },
  /*
  getCommitment: async (args: {}) => {
    const currentCommitment = await state.zkapp!.commitment.get();
    return JSON.stringify(currentCommitment.toJSON());
  },
  */
  createRegisterTransaction: async (args: {subdomain: string, mina_adress: string, eth_address: string}) => {
    // store these in state
    const {  DomainRecord, String } = await import('../../../contracts/build/src/Resolver.js');
    let record = new DomainRecord({ eth_address: Field(args.eth_address), mina_address: PublicKey.fromBase58(args.mina_adress)});
    const transaction = await Mina.transaction(async () => {
      state.zkapp!.register(String.fromString(args.subdomain), record);
    });
    state.transaction = transaction;
    
  },
  proveRegisterTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },

  createCheckTransaction: async (args: {subdomain: string}) => {
    // store these in state
    const { String } = await import('../../../contracts/build/src/Resolver.js');
    let res;
    const transaction = await Mina.transaction(async () => {
      res = await state.zkapp!.get_subdomain(String.fromString(args.subdomain));
    });
    state.transaction = transaction;
    return res;
    
  },
  proveCheckTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },
  getTransactionJSON: async (args: {}) => {
    return state.transaction!.toJSON();
  },
  /*
  getSubdomain: async (args: {subdomain: string}) => {
    
  },
  setSubdomain: async (args: {subdomain: string, }) => {
 
  },
  register: async (args: {subdomain: string, eth_address: string ,mina_address: string}) => {
  
  }
  */
};

// ---------------------------------------------------------------------------------------

export type WorkerFunctions = keyof typeof functions;

export type ZkappWorkerRequest = {
  id: number;
  fn: WorkerFunctions;
  args: any;
};

export type ZkappWorkerReponse = {
  id: number;
  data: any;
};

if (typeof window !== 'undefined') {
  addEventListener(
    'message',
    async (event: MessageEvent<ZkappWorkerRequest>) => {
      const returnData = await functions[event.data.fn](event.data.args);

      const message: ZkappWorkerReponse = {
        id: event.data.id,
        data: returnData
      };
      postMessage(message);
    }
  );
}

console.log('Web Worker Successfully Initialized.');