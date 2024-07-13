import {
  Field,
  SmartContract,
  state,
  method,
  PublicKey,
  Struct,
  Experimental
} from 'o1js';

import { PackedStringFactory } from "o1js-pack";


export class String extends PackedStringFactory() {}


export class DomainRecord extends Struct({
  eth_address: Field,
  mina_address: PublicKey,
}) {
  empty(): DomainRecord{
    return new DomainRecord({
      eth_address: Field(0),
      mina_address: PublicKey.empty()
    });
  }
}

const { OffchainState } = Experimental;

export const offchainState = OffchainState(
  {
    registry: OffchainState.Map(String, DomainRecord)
  },
  { logTotalCapacity: 10, maxActionsPerProof: 5 }
);

export class StateProof extends offchainState.Proof {}


export class Resolver extends SmartContract {
  @state(OffchainState.Commitments) offchainState = offchainState.commitments();


  init() {
    super.init();
  }

  @method async register(
    name: String,
    namedata: DomainRecord
  ) {
    //const sender = this.sender.getAndRequireSignature();
    //namedata.mina_address.assertEquals(sender);
    offchainState.fields.registry.update(name, {
      from: undefined,
      to: namedata,
    });

  }

  @method async set_subdomain(
    name: String,
    oldRecord: DomainRecord,
    newRecord: DomainRecord,
  ) {
    //const sender = this.sender.getAndRequireSignature();
    //oldRecord.mina_address.assertEquals(sender);
    offchainState.fields.registry.update(name, {
      from: oldRecord,
      to: newRecord,
    });
  }

  @method.returns(DomainRecord) 
  async get_subdomain(name: String){
    return (await offchainState.fields.registry.get(name)).value;
  
  }

  @method
  async settle(proof: StateProof) {
    await offchainState.settle(proof);
  }
}
