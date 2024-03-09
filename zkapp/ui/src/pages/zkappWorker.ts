import { Mina, PublicKey, fetchAccount,CircuitString } from 'o1js';
import { SparseMerkleProof } from 'o1js-merkle';

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

import { NameData, type Resolver } from '../../../contracts/src/Resolver';

const state = {
  Resolver: null as null | typeof Resolver,
  zkapp: null as null | Resolver,
  transaction: null as null | Transaction
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
  createRegisterTransaction: async (args: {domain: CircuitString, namedata: NameData, merkleProof: SparseMerkleProof }) => {
    const transaction = await Mina.transaction(() => {
      state.zkapp!.register(args.domain,args.namedata, args.merkleProof);
    });
    state.transaction = transaction;
  },
  createSetSubdomainTransaction: async (args: {domain: CircuitString, oldNamedata: NameData, newNamedata: NameData, merkleProof: SparseMerkleProof }) => {
    const transaction = await Mina.transaction(() => {
      state.zkapp!.set_subdomain(args.domain,args.oldNamedata,args.newNamedata, args.merkleProof);
    });
    state.transaction = transaction;
  },
  proveRegisterTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },
  proveSetSubdomainTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },
  getTransactionJSON: async (args: {}) => {
    return state.transaction!.toJSON();
  }
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