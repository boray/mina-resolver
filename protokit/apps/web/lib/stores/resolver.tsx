import { create } from "zustand";
import { Client, useClientStore } from "./client";
import { immer } from "zustand/middleware/immer";
import { PendingTransaction, UnsignedTransaction } from "@proto-kit/sequencer";
import { Field, PublicKey, UInt64, Encoding } from "o1js";
import { useCallback, useEffect } from "react";
import { useChainStore } from "./chain";
import { useWalletStore } from "./wallet";
import { NameString } from "chain/dist/namestring";


export interface ResolverState {
  loading: boolean;
  balances: {
    // address - balance
    [key: string]: string;
  }; 
  subdomains: {
    // address - balance
    [key: string]: string;
  };
  loadBalance: (client: Client, address: string) => Promise<void>;
  faucet: (client: Client, address: string) => Promise<PendingTransaction>;
  register: (client: Client, name: string ,address: string, eth_address: string) => Promise<PendingTransaction>;

}

function isPendingTransaction(
  transaction: PendingTransaction | UnsignedTransaction | undefined,
): asserts transaction is PendingTransaction {
  if (!(transaction instanceof PendingTransaction))
    throw new Error("Transaction is not a PendingTransaction");
}

export const useResolverStore = create<
  ResolverState,
  [["zustand/immer", never]]
>(
  immer((set) => ({
    loading: Boolean(false),
    balances: {},
    subdomains: {},
    async loadBalance(client: Client, address: string) {
      set((state) => {
        state.loading = true;
      });

      const balance = await client.query.runtime.Balances.balances.get(
        PublicKey.fromBase58(address),
      );

      set((state) => {
        state.loading = false;
        state.balances[address] = balance?.toString() ?? "0";
      });
    },
    async resolveName(client: Client, name: string) {
        set((state) => {
          state.loading = true;
        });
        let bytes = new TextEncoder().encode(name);
        let fields:Field[]= [];
        bytes.map((x) => fields.push(Field(x)));
        const lengthField = new Field(name.length);
        
        const namestring = new NameString(fields, lengthField);

        const namedata = await client.query.runtime.Resolver.subdomain.get(namestring);
  
        set((state) => {
          state.loading = false;
          state.subdomains[name] = namedata?.toString() ?? "0";
        });
      },
    async register(client: Client, name: string, address: string, eth_address: string) {
        const resolver = client.runtime.resolve("Resolver");
        const sender = PublicKey.fromBase58(address);
        //-------
        let bytes = new TextEncoder().encode(name);
        let fields:Field[]= [];
        bytes.map((x) => fields.push(Field(x)));
        console.log(fields.toString());
        //-----
        //let charFields = Encoding.Bijective.Fp.fromString(name);
        //console.log(Encoding.Bijective.Fp.toString(charFields));
        const lengthField = new Field(name.length);
        const namestring = new NameString(fields, lengthField);
        // check eth_address is valid
        // change base 10
        // cast to field
        const ethereum_field = Field.from(eth_address);

        const tx = await client.transaction(sender, () => {
          resolver.register(namestring, sender, ethereum_field);
        });
  
        await tx.sign();
        await tx.send();
  
        isPendingTransaction(tx.transaction);
        return tx.transaction;
      },
      async set_subdomain(client: Client, name: string, address: string, eth_address: string) {
        const resolver = client.runtime.resolve("Resolver");
        const sender = PublicKey.fromBase58(address);
        let bytes = new TextEncoder().encode(name);
        let fields:Field[]= [];
        bytes.map((x) => fields.push(Field(x)));
        const lengthField = new Field(name.length);
        const namestring = new NameString(fields, lengthField);
        // check eth_address is valid
        // change base 10
        // cast to field
        const tx = await client.transaction(sender, () => {
          resolver.register(namestring, PublicKey.fromBase58(address), Field(eth_address));
        });
  
        await tx.sign();
        await tx.send();
  
        isPendingTransaction(tx.transaction);
        return tx.transaction;
      },
    async faucet(client: Client, address: string) {
      const balances = client.runtime.resolve("Balances");
      const sender = PublicKey.fromBase58(address);

      const tx = await client.transaction(sender, () => {
        balances.addBalance(sender, UInt64.from(1000));
      });

      await tx.sign();
      await tx.send();

      isPendingTransaction(tx.transaction);
      return tx.transaction;
    },
  })),
);

export const useObserveBalance = () => {
  const client = useClientStore();
  const chain = useChainStore();
  const wallet = useWalletStore();
  const resolver = useResolverStore();

  useEffect(() => {
    if (!client.client || !wallet.wallet) return;

    resolver.loadBalance(client.client, wallet.wallet);
  }, [client.client, chain.block?.height, wallet.wallet]);
};

export const useResolver = () => {
  const client = useClientStore();
  const wallet = useWalletStore();
  const resolver = useResolverStore();

  return useCallback(async (name: string, mina_wallet: string, eth_address: string) => {
    if (!client.client || !wallet.wallet) return;
    
    const pendingTransaction = await resolver.register(
      client.client,
      name,
      mina_wallet,
      eth_address

    );

    wallet.addPendingTransaction(pendingTransaction);
  }, [client.client, wallet.wallet]);
};
