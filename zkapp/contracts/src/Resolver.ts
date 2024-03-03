
import {
    Field,
    SmartContract,
    state,
    State,
    method,
    CircuitString,
    PublicKey,
    Struct
  } from 'o1js';
  import {
    SparseMerkleProof,
    ProvableSMTUtils
  } from 'o1js-merkle';
  
  class NameData extends Struct({ eth_address: Field, mina_address: PublicKey }){}

  
  export class Resolver extends SmartContract {
    @state(Field) treeRoot = State<Field>();
  
    init() {
      super.init();
      this.treeRoot.set(Field(0));
    }
  
    @method register(
      name: CircuitString,
      ethAddr: Field,
      merkleProof: SparseMerkleProof
    ) {
      let treeRoot = this.treeRoot.get();
      this.treeRoot.requireEquals(treeRoot);
  
      ProvableSMTUtils.checkNonMembership(
        merkleProof,
        treeRoot,
        name,
        CircuitString
      ).assertTrue();
  
      let namedata = new NameData({ eth_address: ethAddr, mina_address: this.sender });

      let newtreeRoot = ProvableSMTUtils.computeRoot(
        merkleProof.sideNodes,
        name,
        CircuitString,
        namedata,
        NameData
      );
  
      this.treeRoot.set(newtreeRoot);
    }
  
    @method set_eth_addr(
        name: CircuitString,
        oldEthAddr: Field,
        ethAddr: Field,
        merkleProof: SparseMerkleProof
      ) {
        let treeRoot = this.treeRoot.get();
        this.treeRoot.requireEquals(treeRoot);
        let oldNamedata = new NameData({ eth_address: oldEthAddr, mina_address: this.sender });

        ProvableSMTUtils.checkMembership(
            merkleProof,
            treeRoot,
            name,
            CircuitString,
            oldNamedata,
            NameData
          ).assertTrue();

        this.sender.assertEquals(oldNamedata.mina_address);
        
        let namedata = new NameData({ eth_address: ethAddr, mina_address: this.sender });
  
        let newtreeRoot = ProvableSMTUtils.computeRoot(
          merkleProof.sideNodes,
          name,
          CircuitString,
          namedata,
          NameData
        );
    
        this.treeRoot.set(newtreeRoot);
      }

  }
  