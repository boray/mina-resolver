import { Encoding, Field, Provable, PublicKey, Struct, UInt64 } from "o1js";
 
export class NameString extends Struct({
  chars: Provable.Array(Field,64),
  len: Field
}) {

  constructor(charFields: Field[], lengthField: Field) {
      super({ chars: charFields, len: lengthField });
     }
  
}