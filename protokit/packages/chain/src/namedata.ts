import { Field, PublicKey, Struct, UInt64 } from "o1js";
 
export class NameData extends Struct({
  mina_address: PublicKey,
  eth_address: Field
}) {}