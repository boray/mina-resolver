import fs from 'fs/promises';
import { Mina, NetworkId, PrivateKey} from 'o1js';
import { DomainRecord, Resolver, offchainState } from '../../zkapp/contracts/build/src/Resolver.js';
import path from 'path';
import { Field } from 'o1js/dist/node/lib/provable/field.js';



Error.stackTraceLimit = 1000;
const DEFAULT_NETWORK_ID = 'testnet';
const dataPath = path.join(__dirname, 'data.json');

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
let config = configJson.deployAliases["devnet"];
let feepayerKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.feepayerKeyPath, 'utf8')
);

let zkAppKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);

let feepayerKey = PrivateKey.fromBase58(feepayerKeysBase58.privateKey);
let zkAppKey = PrivateKey.fromBase58(zkAppKeysBase58.privateKey);

const Network = Mina.Network({
  archive: "https://api.minascan.io/archive/devnet/v1/graphql",
  networkId: (config.networkId ?? DEFAULT_NETWORK_ID) as NetworkId,
  mina: config.url,
});
const fee = Number(config.fee) * 1e9; 
Mina.setActiveInstance(Network);
let tx;
let data: { actionState: Field | undefined; root: Field | undefined; length: Field | undefined; };
let feepayerAddress = feepayerKey.toPublicKey();
let zkAppAddress = zkAppKey.toPublicKey();
let resolver_contract = new Resolver(zkAppAddress);
offchainState.setContractInstance(resolver_contract);

console.time('compile program');
await offchainState.compile();
console.timeEnd('compile program');
console.time('compile contract');
await Resolver.compile();
console.timeEnd('compile contract');

//let checkpoint = resolver_contract.offchainState.getAndRequireEquals();
//console.log(checkpoint);


console.time('settlement proof');
let proof = await offchainState.createSettlementProof();
console.timeEnd('settlement proof');

console.time('settle on-chain');
try {
tx = await Mina.transaction({ sender: feepayerAddress, fee }, async () => {
    resolver_contract.settle(proof)
    let checkpoint = await resolver_contract.offchainState.fetch();
    data = {
        actionState: checkpoint?.actionState,
        root: checkpoint?.root,
        length: checkpoint?.length
    };
    try {
        await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
        console.log('Data written to JSON file successfully');
      } catch (err) {
        console.error('Error writing to JSON file:', err);
      }

})
await tx.prove();
const sentTx = await tx.sign([feepayerKey]).send();
if (sentTx.status === 'pending') {
    console.log("tx pending...");
}
}
catch (err){
console.log(err);
}
console.timeEnd('settle on-chain');






