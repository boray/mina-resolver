import { create } from "zustand";
import { Client, useClientStore } from "./client";
import { immer } from "zustand/middleware/immer";
import { PendingTransaction, UnsignedTransaction } from "@proto-kit/sequencer";
import { Field, PublicKey, UInt64, Encoding } from "o1js";
import { useCallback, useEffect } from "react";
import { useChainStore } from "./chain";
import { useWalletStore } from "./wallet";



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
    async resolverName(client: Client, name: string) {
        set((state) => {
          state.loading = true;
        });
        const encoded: Field[] = Encoding.stringToFields(name)
        const length : Field = Field(name.length)

        const namedata = await client.query.runtime.Resolver.subdomain.get(
         name
        );
  
        set((state) => {
          state.loading = false;
          state.subdomains[name] = namedata?.toString() ?? "0";
        });
      },
    async register(client: Client, name: string, address: string, eth_address: string) {
        const resolver = client.runtime.resolve("Resolver");
        const sender = PublicKey.fromBase58(address);
  
        const tx = await client.transaction(sender, () => {
          resolver.register(Field(name),sender, Field(eth_address));
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

  return useCallback(async () => {
    if (!client.client || !wallet.wallet) return;

    const pendingTransaction = await resolver.register(
      client.client,
      name,
      wallet.wallet,
      eth_address

    );

    wallet.addPendingTransaction(pendingTransaction);
  }, [client.client, wallet.wallet]);
};
