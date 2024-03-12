import { Encoding, Field, Provable, PublicKey, Struct, UInt64 } from "o1js";
 
export class NameString extends Struct({
  chars: Provable.Array(Field,64),
  len: Field
}) {

  constructor(str: string) {
      const charFields = Encoding.stringToFields(str);
      const lengthField = new Field(str.length);
      super({ chars: charFields, len: lengthField });
     }
  
}