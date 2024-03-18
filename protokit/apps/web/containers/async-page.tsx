"use client";
import { Resolver } from "@/components/resolver";
import { useResolver, useLookup, useResolverStore} from "@/lib/stores/resolver";
import { useWalletStore } from "@/lib/stores/wallet";

export default function Home() {
  const wallet = useWalletStore();
  const register = useResolver();
  const lookup = useLookup();
  const look = useResolverStore();

  return (
    <div className="mx-auto -mt-32 h-full pt-16">
      <div className="flex h-full w-full items-center justify-center pt-16">
        <div className="flex basis-4/12 flex-col items-center justify-center 2xl:basis-3/12">
          <Resolver
            wallet={wallet.wallet}
            lookupres={look.lookupres}
            onConnectWallet={wallet.connectWallet}
            onRegister={(subdomain, wallet, ethereum) => register(subdomain, wallet, ethereum)}
            onLookup={(name) => lookup(name)}
            loading={false}
          />
        </div>
      </div>
    </div>
  );
}
