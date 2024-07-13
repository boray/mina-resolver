import fs from 'fs/promises';
import { AccountUpdate, CircuitString, Field, Mina, NetworkId, PrivateKey, Struct, PublicKey, fetchAccount} from 'o1js';
import { Resolver, offchainState, DomainRecord, String} from './Resolver.js';


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
  archive: "https://api.minascan.io/archive/devnet/v1/graphql",
  networkId: (config.networkId ?? DEFAULT_NETWORK_ID) as NetworkId,
  mina: config.url,
});
// const Network = Mina.Network(config.url);
const fee = Number(config.fee) * 1e9; // in nanomina (1 billion = 1.0 mina)
Mina.setActiveInstance(Network);
let tx;
let feepayerAddress = feepayerKey.toPublicKey();
let zkAppAddress = zkAppKey.toPublicKey();
let resolver_contract = new Resolver(zkAppAddress);
offchainState.setContractInstance(resolver_contract);

// compile the contract to create prover keys
console.time('compile program');
await offchainState.compile();
console.timeEnd('compile program');
console.time('compile contract');
await Resolver.compile();
console.timeEnd('compile contract');

//let checkpoint = resolver_contract.offchainState.getAndRequireEquals();
//console.log(checkpoint);

/*

console.time('deploy');
try {
tx = await Mina.transaction({ sender: feepayerAddress, fee }, async () => {
  AccountUpdate.fundNewAccount(feepayerAddress);
  await resolver_contract.deploy();
})
await tx.prove();
console.log('send transaction...');
const sentTx = await tx.sign([feepayerKey,zkAppKey]).send();
if (sentTx.status === 'pending') {
  console.log(
    '\nSuccess! Update transaction sent.\n' +
      '\nYour smart contract state will be updated' +
      '\nas soon as the transaction is included in a block:' +
      `\n${getTxnUrl(config.url, sentTx.hash)}`
  );
}
}
catch (err) {
  console.log(err);
}
console.timeEnd('deploy');

*/
console.time('register first name');
try {
tx = await Mina.transaction({ sender: feepayerAddress, fee }, async () => {
  let new_record = new DomainRecord({ eth_address: Field(12312), mina_address: feepayerAddress});
  await resolver_contract.register(String.fromString("boray.kimchi.eth"), new_record );

})
  await tx.prove();
  console.log('send transaction...');
  const sentTx = await tx.sign([feepayerKey]).send();
  if (sentTx.status === 'pending') {
    console.log(
      '\nSuccess! Update transaction sent.\n' +
        '\nYour smart contract state will be updated' +
        '\nas soon as the transaction is included in a block:' +
        `\n${getTxnUrl(config.url, sentTx.hash)}`
    );
  }
}
catch (err){
  console.log(err);
}
console.timeEnd('register first name');




console.time('settlement proof 1');
let proof = await offchainState.createSettlementProof();
console.timeEnd('settlement proof 1');

console.time('settle 1');
try {
tx = await Mina.transaction({ sender: feepayerAddress, fee }, () => resolver_contract.settle(proof))
await tx.prove()

console.log('send transaction...');
const sentTx = await tx.sign([feepayerKey]).send();
if (sentTx.status === 'pending') {
  console.log(
    '\nSuccess! Update transaction sent.\n' +
      '\nYour smart contract state will be updated' +
      '\nas soon as the transaction is included in a block:' +
      `\n${getTxnUrl(config.url, sentTx.hash)}`
  );
}
}
catch (err){
console.log(err);
}
console.timeEnd('settle 1');



console.time('get second name');
  try {
    tx = await Mina.transaction({ sender: feepayerAddress, fee }, async () => {
      let new_record = new DomainRecord({
        eth_address: Field(12312),
        mina_address: feepayerAddress
      });
      let res = await resolver_contract.get_subdomain(String.fromString("boray.kimchi.eth"));
      console.log(res);
      res.eth_address.assertEquals(new_record.eth_address);
      res.mina_address.assertEquals(new_record.mina_address);
    })
    await tx.prove();
    console.log('send transaction...');
    const sentTx = await tx.sign([feepayerKey,zkAppKey]).send();
    if (sentTx.status === 'pending') {
      console.log(
        '\nSuccess! Update transaction sent.\n' +
          '\nYour smart contract state will be updated' +
          '\nas soon as the transaction is included in a block:' +
          `\n${getTxnUrl(config.url, sentTx.hash)}`
      );
    }
    }
  catch (err) {
      console.log(err);
    }

console.timeEnd('get second name');


function getTxnUrl(graphQlUrl: string, txnHash: string | undefined) {
  const txnBroadcastServiceName = new URL(graphQlUrl).hostname
    .split('.')
    .filter((item) => item === 'minascan' || item === 'minaexplorer')?.[0];
  const networkName = new URL(graphQlUrl).hostname
    .split('.')
    .filter((item) => item === 'devnet' || item === 'testworld')?.[0];
  if (txnBroadcastServiceName && networkName) {
    return `https://minascan.io/${networkName}/tx/${txnHash}?type=zk-tx`;
  }
  return `Transaction hash: ${txnHash}`;
}

