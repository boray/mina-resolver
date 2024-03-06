
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
      this.commitment.set(Field(6857996065258303604926678680213872925890527116324590076126691054946424763715));
    }
  
    @method setCommitment(com: Field) {
      this.commitment.set(com);
    }
    
    @method register(
      name: CircuitString,
      ethAddr: Field,
      merkleProof: SparseMerkleProof
    ) {
      let commitment = this.commitment.get();
      this.commitment.requireEquals(commitment);
  
      ProvableSMTUtils.checkNonMembership(
        merkleProof,
        commitment,
        name,
        CircuitString
      ).assertTrue();
  
      let namedata = new NameData({ eth_address: ethAddr, mina_address: this.sender });

      let newCommitment = ProvableSMTUtils.computeRoot(
        merkleProof.sideNodes,
        name,
        CircuitString,
        namedata,
        NameData
      );
  
      this.commitment.set(newCommitment);
    }
  /*
    @method set_eth_addr(
        name: CircuitString,
        oldEthAddr: Field,
        ethAddr: Field,
        merkleProof: SparseMerkleProof
      ) {
        let commitment = this.commitment.get();
        this.commitment.requireEquals(commitment);
        let oldNamedata = new NameData({ eth_address: oldEthAddr, mina_address: this.sender });

        ProvableSMTUtils.checkMembership(
            merkleProof,
            commitment,
            name,
            CircuitString,
            oldNamedata,
            NameData
          ).assertTrue();

        this.sender.assertEquals(oldNamedata.mina_address);
        
        let namedata = new NameData({ eth_address: ethAddr, mina_address: this.sender });
  
        let newCommitment = ProvableSMTUtils.computeRoot(
          merkleProof.sideNodes,
          name,
          CircuitString,
          namedata,
          NameData
        );
    
        this.commitment.set(newCommitment);
      }
*/
  }
  