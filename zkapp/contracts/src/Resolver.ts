
import {
    Field,
    SmartContract,
    state,
    State,
    method,
    CircuitString,
    PublicKey,
    Struct,
    DeployArgs
  } from 'o1js';
  import {
    SparseMerkleProof,
    ProvableSMTUtils
  } from 'o1js-merkle';
  
  class NameData extends Struct({ eth_address: Field, mina_address: PublicKey }){}

  
  export class Resolver extends SmartContract {
    @state(Field) commitment = State<Field>();
  
    init() {
      super.init();
      this.commitment.set(Field(1363491840476538827947652000140631540976546729195695784589068790317102403216n));
    }
  
    
    @method register(
      name: CircuitString,
      namedata: NameData,
      merkleProof: SparseMerkleProof
    ) {
      let commitment = this.commitment.get();
      this.commitment.requireEquals(commitment);
      namedata.mina_address.assertEquals(this.sender);
  
      ProvableSMTUtils.checkNonMembership(
        merkleProof,
        commitment,
        name,
        CircuitString
      ).assertTrue();
  
      let newCommitment = ProvableSMTUtils.computeRoot(
        merkleProof.sideNodes,
        name,
        CircuitString,
        namedata,
        NameData
      );
  
      this.commitment.set(newCommitment);
    }
  
    @method set_domain(
        name: CircuitString,
        oldNamedata: NameData,
        newNamedata: NameData,
        merkleProof: SparseMerkleProof
      ) {
        let commitment = this.commitment.get();
        this.commitment.requireEquals(commitment);

        this.sender.assertEquals(oldNamedata.mina_address);

        ProvableSMTUtils.checkMembership(
            merkleProof,
            commitment,
            name,
            CircuitString,
            oldNamedata,
            NameData
          ).assertTrue();

          
        let newCommitment = ProvableSMTUtils.computeRoot(
          merkleProof.sideNodes,
          name,
          CircuitString,
          newNamedata,
          NameData
        );
    
        this.commitment.set(newCommitment);
      }

  }
  