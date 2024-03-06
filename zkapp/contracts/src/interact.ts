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

class NameData extends Struct({ eth_address: Field, mina_address: PublicKey }){}


const useProof = false;

const Local = Mina.LocalBlockchain({ proofsEnabled: useProof });
Mina.setActiveInstance(Local);
const { privateKey: deployerKey, publicKey: deployerAccount } =
  Local.testAccounts[0];
const { privateKey: senderKey, publicKey: senderAccount } =
  Local.testAccounts[1];



// ----------------------------------------------------
let initialCommitment: Field = Field(0);

let store = new MemoryStore<NameData>();
let smt = await SparseMerkleTree.build<CircuitString, NameData>(
  store,
  CircuitString,
  NameData as any
);

let mathborayeth: CircuitString = CircuitString.fromString("math.boray.eth");
let mathborayethObj = new NameData({
  eth_address: Field(22131),
  mina_address: PublicKey.fromPrivateKey(PrivateKey.random())
});

let physborayeth: CircuitString = CircuitString.fromString("phys.boray.eth");
let physborayethObj = new NameData({
  eth_address: Field(1320),
  mina_address: PublicKey.fromPrivateKey(PrivateKey.random())
});

let ecborayeth: CircuitString = CircuitString.fromString("ec.boray.eth");
let ecborayethObj = new NameData({
  eth_address: Field(12312),
  mina_address: PublicKey.fromPrivateKey(PrivateKey.random())
});

await smt.update(mathborayeth, mathborayethObj);

initialCommitment = smt.getRoot();

// --------------------------------------------------
// ----------------------------------------------------

// create a destination we will deploy the smart contract to
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();

const zkAppInstance = new Resolver(zkAppAddress);
const deployTxn = await Mina.transaction(deployerAccount, () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  zkAppInstance.deploy();
  zkAppInstance.setCommitment(initialCommitment);
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

//await setCommitment(initialCommitment);
let comt = await zkAppInstance.commitment.fetch();
comt?.assertEquals(initialCommitment);
// Create a merkle proof for a key against the current root.
let proof = await smt.prove(mathborayeth);

// Check membership in the circuit, isOk should be true.
let isOk = ProvableSMTUtils.checkMembership(
  proof,
  initialCommitment,
  mathborayeth,
  CircuitString,
  mathborayethObj,
  NameData
);
console.log("Membership OK",isOk.toBoolean());

proof = await smt.prove(physborayeth);

isOk =  ProvableSMTUtils.checkNonMembership(
  proof,
  initialCommitment,
  physborayeth,
  CircuitString
);
console.log("Non-membership OK",isOk.toBoolean());


// await registerName(mathborayeth, mathborayethObj);



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
/*
async function registerName(name: CircuitString, nameObject: NameData) {


  try {
  let merkleProof = await smt.prove(name);

  let tx = await Mina.transaction({sender: feepayerAddress, fee: txfee}, () => {
    zkApp.register(name, nameObject.eth_address, merkleProof);
  });
  await tx.prove();
  sentTx = await tx.sign([feepayerKey]).send();

  await smt.update(name, nameObject!);
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