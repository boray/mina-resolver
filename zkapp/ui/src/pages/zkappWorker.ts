import { Mina, PublicKey,Struct,Field, fetchAccount,CircuitString } from 'o1js';
import {
  MemoryStore,
  MongoStore,
  Store,
  SMTUtils,
  SparseMerkleTree,
  ProvableSMTUtils,
  SparseMerkleProof
} from 'o1js-merkle';



type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;


// ---------------------------------------------------------------------------------------

import { NameData, type Resolver } from '../../../contracts/build/src/Resolver.js';


const state = {
  Resolver: null as null | typeof Resolver,
  zkapp: null as null | Resolver,
  transaction: null as null | Transaction,
  proof : null as null | SparseMerkleProof,
  subdomain: null as null | CircuitString,
  namedata: null as null | NameData
};

// ---------------------------------------------------------------------------------------

const functions = {
  setActiveInstanceToBerkeley: async (args: {}) => {
    const Berkeley = Mina.Network(
      'https://api.minascan.io/node/berkeley/v1/graphql'
    );
    console.log('Berkeley Instance Created');
    Mina.setActiveInstance(Berkeley);
  },
  loadContract: async (args: {}) => {
    const { Resolver } = await import('../../../contracts/build/src/Resolver.js');
    state.Resolver = Resolver;
  },
  compileContract: async (args: {}) => {
    await state.Resolver!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.Resolver!(publicKey);
  },
  getCommitment: async (args: {}) => {
    const currentCommitment = await state.zkapp!.commitment.get();
    return JSON.stringify(currentCommitment.toJSON());
  },
  createRegisterTransaction: async () => {
    // store these in state
    let domainCS = state.subdomain;
    let namedata = state.namedata;
    let proof = state.proof;
    const transaction = await Mina.transaction(() => {
      state.zkapp!.register(domainCS!, namedata!, proof!);
    });
    state.transaction = transaction;
    
  },
  proveRegisterTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },
  getTransactionJSON: async (args: {}) => {
    return state.transaction!.toJSON();
  },

  getNonMembershipProof: async (args: {subdomain: string}) => {
    // return proof as SparseMerkleProof or fields
    // the storage worker should return the new commitment so the process could be delayed for the tx processing.
  },
  getMembershipProof: async (args: {}) => {
    // return proof as SparseMerkleProof or fields
    // setSubdomain tx will use this -> wait for the tx -> when the commitment changes -> posts subdomain to storage worker
    // SV proves by itself and update the stored kv
  },
  getOffchainCommitment: async (args: {}) => {
 
  },
  storeSubdomain: async (args: {}) => {
    // If expected commitment matches with the commitment on-chain, then post the name and namedata to the storage worker
    // storage worker prove by itself and append to the storage
  },
  updateSubdomain: async (args: {}) => {
    // If expected commitment matches with the commitment on-chain, then post the name and namedata to the storage worker
    // storage worker prove by itself and append to the storage
  },

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