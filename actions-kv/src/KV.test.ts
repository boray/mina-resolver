import { StorageContract, Option, KeyValuePair } from './KV';
import { Field, Mina, PrivateKey, PublicKey, AccountUpdate } from 'o1js';

/*
 * This file specifies how to test the `StorageContract` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('StorageContract', () => {
  let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    senderAccount: Mina.TestPublicKey,
    senderKey: PrivateKey,
    zkAppStorageContractress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: StorageContract;

  beforeAll(async () => {
    if (proofsEnabled) await StorageContract.compile();
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key;
    senderKey = senderAccount.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppStorageContractress = zkAppPrivateKey.toPublicKey();
    zkApp = new StorageContract(zkAppStorageContractress);
  });


  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` StorageContracts an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `StorageContract` smart contract', async () => {
    await localDeploy();
  });

  it('dispatches a key-value pair', async () => {
    const txn = await Mina.transaction(senderAccount, async () => {
      await zkApp.set(senderAccount,Field(62));
    });
    await txn.prove();
    await txn.sign([senderKey]).send();
  });

  it('reduces actions to find matching key-value pair to the given key', async () => {
    let res: Option | undefined;
    const txn = await Mina.transaction(senderAccount, async () => {
      res = await zkApp.get(senderAccount);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();
    expect(res?.isSome.toBoolean).toEqual(true);
    expect(res?.value).toEqual(Field(62));

  });
 
});
