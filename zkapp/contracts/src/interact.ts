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
import { AccountUpdate, CircuitString, Field, Mina, NetworkId, PrivateKey, Struct, PublicKey} from 'o1js';
import { Resolver } from './Resolver.js';
import {
  MemoryStore,
  SparseMerkleTree
} from 'o1js-merkle';
class NameData extends Struct({ eth_address: Field, mina_address: PublicKey }){}

// check command line arg
let deployAlias = process.argv[2];
if (!deployAlias)
  throw Error(`Missing <deployAlias> argument.

Usage:
node build/src/interact.js <deployAlias>
`);
Error.stackTraceLimit = 1000;
const DEFAULT_NETWORK_ID = 'testnet';

// parse config and private key from file
type Config = {
  deployAliases: Record<
    string,
    {
      networkId?: string;
      url: string;
      keyPath: string;
      fee: string;
      feepayerKeyPath: string;
      feepayerAlias: string;
    }
  >;
};
let configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
let config = configJson.deployAliases[deployAlias];
let feepayerKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.feepayerKeyPath, 'utf8')
);

let zkAppKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);

let feepayerKey = PrivateKey.fromBase58(feepayerKeysBase58.privateKey);
let zkAppKey = PrivateKey.fromBase58(zkAppKeysBase58.privateKey);

// set up Mina instance and contract we interact with
const Network = Mina.Network({
  // We need to default to the testnet networkId if none is specified for this deploy alias in config.json
  // This is to ensure the backward compatibility.
  networkId: (config.networkId ?? DEFAULT_NETWORK_ID) as NetworkId,
  mina: config.url,
});
// const Network = Mina.Network(config.url);
const fee = Number(config.fee) * 1e9; // in nanomina (1 billion = 1.0 mina)
Mina.setActiveInstance(Network);
let feepayerAddress = feepayerKey.toPublicKey();
let zkAppAddress = zkAppKey.toPublicKey();
let zkApp = new Resolver(zkAppAddress);


let sentTx: Mina.TransactionId;


let initialCommitment: Field = Field(0);

let mathborayeth: CircuitString = CircuitString.fromString("math.boray.eth");

let store = new MemoryStore<NameData>();
let smt = await SparseMerkleTree.build<CircuitString, NameData>(
  store,
  CircuitString,
  NameData as any
);
let mathborayethObj = new NameData({
  eth_address: Field(0),
  mina_address: PublicKey.fromPrivateKey(PrivateKey.random())
});

await smt.update(mathborayeth, mathborayethObj);


// now that we got our accounts set up, we need the commitment to deploy our contract!
initialCommitment = smt.getRoot();
let merkleProof = await smt.prove(mathborayeth);


// compile the contract to create prover keys
console.log('compile the contract...');
await Resolver.compile();

let tx = await Mina.transaction(feepayerAddress, () => {
  AccountUpdate.fundNewAccount(feepayerAddress);
  zkApp.init();
});
await tx.prove();
await tx.sign([feepayerKey]).send();

// --------

await registerName(mathborayeth, mathborayethObj);



// --------

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

async function registerName(name: CircuitString, nameObject: NameData) {
  try {
  let merkleProof = await smt.prove(name);

  let tx = await Mina.transaction(feepayerAddress, () => {
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