import {
    RuntimeModule,
    runtimeModule,
    state,
    runtimeMethod,
  } from "@proto-kit/module";
  import { State, StateMap, assert } from "@proto-kit/protocol";
  import { CircuitString, Field, Provable, PublicKey, Struct, UInt64 } from "o1js";
  import { NameData } from "./namedata";
  import { NameString } from "./namestring";

 

  @runtimeModule()
  export class Resolver extends RuntimeModule<Record<string, never>> {
    @state() public subdomain = StateMap.from<NameString, NameData>(
      NameString,
      NameData
    );

    
    
    @runtimeMethod()
    public register(name: NameString, mina_address: PublicKey, eth_address:Field): void {
      assert(this.subdomain.get(name).isSome.not(), "the subdomain is registered");
      mina_address.assertEquals(this.transaction.sender.value);
      const namedata = new NameData({
        mina_address,
        eth_address
      });
      this.subdomain.set(name, namedata);
      mina_address.assertEquals(this.subdomain.get(name).value.mina_address);
      eth_address.assertEquals(this.subdomain.get(name).value.eth_address);
    }

    @runtimeMethod()
    public set_subdomain(name: NameString, mina_address: PublicKey, eth_address:Field): void {
      this.subdomain.get(name).value.mina_address.assertEquals(this.transaction.sender.value);
      const namedata = new NameData({
        mina_address,
        eth_address
      });
      this.subdomain.set(name, namedata);
    }
  }
  