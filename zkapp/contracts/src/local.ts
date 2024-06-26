import { AccountUpdate, CircuitString, Field, Mina, NetworkId, PrivateKey, Struct, PublicKey, fetchAccount} from 'o1js';
import { Resolver, DomainRecord, offchainState, String} from './Resolver.js';




const Local = await Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

let tx;
let [account_one, account_two] = Local.testAccounts;

const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
let resolver_contract = new Resolver(zkAppAddress);
offchainState.setContractInstance(resolver_contract);




if (Local.proofsEnabled) {
  console.time('compile program');
  await offchainState.compile();
  console.timeEnd('compile program');
  console.time('compile contract');
  await Resolver.compile();
  console.timeEnd('compile contract');
}


console.time('deploy');
tx = await Mina.transaction(account_one, async () => {
  AccountUpdate.fundNewAccount(account_one);
  await resolver_contract.deploy();
})
.prove()
.sign([account_one.key, zkAppPrivateKey])
.send();
console.log(tx.toPretty());
console.timeEnd('deploy');

console.time('register first name');
await Mina.transaction(account_one, async () => {
  let new_record = new DomainRecord({ eth_address: Field(12312), mina_address: account_one});
  await resolver_contract.register(String.fromString("boray.kimchi.eth"), new_record );

})
  .sign([account_one.key])
  .prove()
  .send();
console.log(tx.toPretty());
console.timeEnd('register first name');


console.time('register second name');
tx = await Mina.transaction(account_two, async () => {
  let new_record = new DomainRecord({ eth_address: Field(12312), mina_address: account_two });
  await resolver_contract.register(String.fromString("test.kimchi.eth"),new_record );

})
  .sign([account_two.key])
  .prove()
  .send();
console.log(tx.toPretty());
console.timeEnd('register second name');



console.time('settlement proof 1');
let proof = await offchainState.createSettlementProof();
console.timeEnd('settlement proof 1');

console.time('settle 1');
await Mina.transaction(account_one, () => resolver_contract.settle(proof))
  .sign([account_one.key])
  .prove()
  .send();
console.log(tx.toPretty());
console.timeEnd('settle 1');

console.time('get second name');
await Mina.transaction(account_two, async () => {
  let new_record = new DomainRecord({
    eth_address: Field(12312),
    mina_address: account_two
  });
  let res =await resolver_contract.get_subdomain(String.fromString("test.kimchi.eth"));
  console.log(res);
  res.eth_address.assertEquals(new_record.eth_address);
  res.mina_address.assertEquals(new_record.mina_address);
})
  .sign([account_two.key])
  .prove()
  .send();
console.log(tx.toPretty());

console.timeEnd('get second name');