/**
 * This script can be used to interact with the Add contract, after deploying it.
 *
 * We call the update() method on the contract, create a proof and send it to the chain.
 * The endpoint that we interact with is read from your config.json.
 *
 * This simulates a user interacting with the zkApp from a browser, except that here, sending the transaction happens
 * from the script and we're using your pre-funded zkApp account to pay the transaction fee. In a real web app, the user's wallet
 * would send the transaction and pay the fee.
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with node:     `$ node build/src/interact.js <deployAlias>`.
 */
import fs from 'fs/promises';
import { AccountUpdate, CircuitString, Field, Mina, NetworkId, PrivateKey, Struct, PublicKey, fetchAccount} from 'o1js';
import { Resolver } from './Resolver.js';
import {
  MemoryStore,
  SMTUtils,
  SparseMerkleTree,
  ProvableSMTUtils,
  SparseMerkleProof
} from 'o1js-merkle';
import { console_log } from 'o1js/dist/node/bindings/compiled/node_bindings/plonk_wasm.cjs';

class NameData extends Struct({ eth_address: Field, mina_address: PublicKey }){}


const useProof = false;

const Local = Mina.LocalBlockchain({ proofsEnabled: useProof });
Mina.setActiveInstance(Local);
const { privateKey: deployerKey, publicKey: deployerAccount } =
  Local.testAccounts[0];


// ----------------------------------------------------
let commitment: Field = Field(0);

let store = new MemoryStore<NameData>();
let smt = await SparseMerkleTree.build<CircuitString, NameData>(
  store,
  CircuitString,
  NameData as any
);

let mathborayethPriv = Local.testAccounts[1].privateKey;
let mathborayeth: CircuitString = CircuitString.fromString("math.boray.eth");
let mathborayethObj = new NameData({
  eth_address: Field(22131),
  mina_address: PublicKey.fromPrivateKey(mathborayethPriv)
});

let physborayethPriv = Local.testAccounts[2].privateKey;
let physborayeth: CircuitString = CircuitString.fromString("phys.boray.eth");
let physborayethObj = new NameData({
  eth_address: Field(1320),
  mina_address: PublicKey.fromPrivateKey(physborayethPriv)
});

let ecborayethPriv = Local.testAccounts[3].privateKey;
let ecborayeth: CircuitString = CircuitString.fromString("ec.boray.eth");
let ecborayethObj = new NameData({
  eth_address: Field(12312),
  mina_address: PublicKey.fromPrivateKey(ecborayethPriv)
});


commitment = smt.getRoot();
//console.log('initial state must be:',commitment.toString());

// --------------------------------------------------
// ----------------------------------------------------

// create a destination we will deploy the smart contract to
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();

const zkAppInstance = new Resolver(zkAppAddress);
const deployTxn = await Mina.transaction(deployerAccount, () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  zkAppInstance.deploy();
  zkAppInstance.init();
  
  //zkAppInstance.setCommitment(initialCommitment);
});
await deployTxn.prove();
await deployTxn.sign([deployerKey, zkAppPrivateKey]).send();

// get the initial state of IncrementSecret after deployment
const num0 = zkAppInstance.commitment.get();
console.log('state after init:', num0.toString());

// ----------------------------------------------------


// compile the contract to create prover keys
//console.log('compile the contract...');
//await Resolver.compile();
/*
let tx = await Mina.transaction({sender: feepayerAddress, fee: txfee}, () => {
  AccountUpdate.fundNewAccount(feepayerAddress);
  zkApp.init();
});
await tx.prove();
await tx.sign([feepayerKey]).send();
*/

// --------


let proof = await smt.prove(mathborayeth);

let isOk =  ProvableSMTUtils.checkNonMembership(
  proof,
  commitment,
  mathborayeth,
  CircuitString
);
console.log("Non-membership OK",isOk.toBoolean());

let newCommitment = ProvableSMTUtils.computeRoot(
  proof.sideNodes,
  mathborayeth,
  CircuitString,
  mathborayethObj,
  NameData
);

console.log("new commitment compute root:", newCommitment.toString());
await registerName(mathborayethPriv,PublicKey.fromPrivateKey(mathborayethPriv),mathborayeth, mathborayethObj);
//await set_eth_addr(physborayeth,Field(1320), Field(31));
// Create a merkle proof for a key against the current root.
commitment = await smt.update(mathborayeth, mathborayethObj);
proof = await smt.prove(mathborayeth);
// Check membership in the circuit, isOk should be true.
console.log("commitment after smt.update",commitment.toString());



isOk = ProvableSMTUtils.checkMembership(
  proof,
  commitment,
  mathborayeth,
  CircuitString,
  mathborayethObj,
  NameData
);
console.log("Membership OK",isOk.toBoolean());

let commfetch =  zkAppInstance.commitment.get()

console.log("fetched commitment after update",commfetch?.toString())

 let mathborayethObjNew = new NameData({
  eth_address: Field(31),
  mina_address: PublicKey.fromPrivateKey(mathborayethPriv)
});
await set_eth_addr(mathborayethPriv,PublicKey.fromPrivateKey(mathborayethPriv),mathborayeth,mathborayethObj,mathborayethObjNew);

let objlast = await smt.get(mathborayeth);
console.log("updated eth address:",objlast?.eth_address.toString());


////

 mathborayethObjNew = new NameData({
  eth_address: Field(69),
  mina_address: PublicKey.fromPrivateKey(mathborayethPriv)
});
objlast = await smt.get(mathborayeth);
await set_eth_addr(mathborayethPriv,PublicKey.fromPrivateKey(mathborayethPriv),mathborayeth,objlast!,mathborayethObjNew);
objlast = await smt.get(mathborayeth);
console.log("updated eth address:",objlast?.eth_address.toString());



await registerName(physborayethPriv,PublicKey.fromPrivateKey(physborayethPriv),physborayeth, physborayethObj);

let physborayethObjNew = new NameData({
  eth_address: Field(69),
  mina_address: PublicKey.fromPrivateKey(physborayethPriv)
});
objlast = await smt.get(physborayeth);
await set_eth_addr(physborayethPriv,PublicKey.fromPrivateKey(physborayethPriv),physborayeth,objlast!,physborayethObjNew);
objlast = await smt.get(physborayeth);
console.log("updated eth address for phys:",objlast?.eth_address.toString());

// --------
/*
function getTxnUrl(graphQlUrl: string, txnHash: string | undefined) {
  const txnBroadcastServiceName = new URL(graphQlUrl).hostname
    .split('.')
    .filter((item) => item === 'minascan' || item === 'minaexplorer')?.[0];
  const networkName = new URL(graphQlUrl).hostname
    .split('.')
    .filter((item) => item === 'berkeley' || item === 'testworld')?.[0];
  if (txnBroadcastServiceName && networkName) {
    return `https://minascan.io/${networkName}/tx/${txnHash}?type=zk-tx`;
  }
  return `Transaction hash: ${txnHash}`;
}
*/

async function registerName(signerKey: PrivateKey, signerAccount: PublicKey,name: CircuitString, nameObject: NameData) {


  try {
  let merkleProof = await smt.prove(name);

  let tx = await Mina.transaction(signerAccount, () => {
    zkAppInstance.register(name, nameObject, merkleProof);
  });
  await tx.prove();
  await tx.sign([signerKey]).send();
  await smt.update(name, nameObject!);
  let newCommitment = await zkAppInstance.commitment.fetch()
  newCommitment?.assertEquals(smt.getRoot());
} catch (err) {
  console.log(err);

}

}

async function set_eth_addr( 
  signerKey: PrivateKey, signerAccount: PublicKey,
  name: CircuitString,
  oldNamedata: NameData,
  newNamedata: NameData) {


  try {
  let merkleProof = await smt.prove(name);

  let tx = await Mina.transaction(signerAccount, () => {
    zkAppInstance.set_subdomain(name, oldNamedata, newNamedata, merkleProof);
  });
  await tx.prove();
  await tx.sign([signerKey]).send();

  await smt.update(name, newNamedata);
  let newCommitment = await zkAppInstance.commitment.fetch()
  newCommitment?.assertEquals(smt.getRoot());
} catch (err) {
  console.log(err);

}

}

/*
async function setCommitment(commitment: Field) {

  try {

  let tx = await Mina.transaction({sender: feepayerAddress, fee: txfee}, () => {
    zkApp.setCommitment(commitment);;
  });
  await tx.prove();
  sentTx = await tx.sign([feepayerKey]).send();

  zkApp.commitment.get().assertEquals(smt.getRoot());
} catch (err) {
  console.log(err);

}
if (sentTx?.hash() !== undefined) {
  console.log(`
Success! Update transaction sent.

Your smart contract state will be updated
as soon as the transaction is included in a block:
${getTxnUrl(config.url, sentTx.hash())}
`);
}
}
*/