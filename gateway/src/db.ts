import { Database } from './server';
import { EMPTY_CONTENT_HASH, ETH_COIN_TYPE, ZERO_ADDRESS } from './constants';
import {
  Resolver,
  DomainRecord,
  offchainState,
  String
} from '../../zkapp/contracts/build/src/Resolver';
import { PublicKey, Mina, PrivateKey } from 'o1js';

interface NameData {
  addresses?: { [coinType: number]: string };
  text?: { [key: string]: string };
  contenthash?: string;
}

export const database: Database = {
  async addr(name, coinType) {
    if (coinType !== ETH_COIN_TYPE) {
      return { addr: ZERO_ADDRESS, ttl: 1000 };
    }

    try {
      const nameData: NameData = await fetchOffchainName(name);
      const addr = nameData?.addresses?.[coinType] || ZERO_ADDRESS;
      return { addr, ttl: 1000 };
    } catch (error) {
      console.error('Error resolving address', error);
      return { addr: ZERO_ADDRESS, ttl: 1000 };
    }
  },
  async text(name: string, key: string) {
    try {
      const nameData: NameData = await fetchOffchainName(name);
      const value = nameData?.text?.[key] || '';
      return { value, ttl: 1000 };
    } catch (error) {
      console.error('Error resolving address', error);
      return { value: '', ttl: 1000 };
    }
  },
  contenthash() {
    return { contenthash: EMPTY_CONTENT_HASH, ttl: 1000 };
  },
};

// write checkpoint logic
// and merkle lookup
async function fetchOffchainName(name: string): Promise<NameData> {
  const zkAppAddress = PublicKey.fromBase58(process.env.ZKAPP_KEY!);
  const sender_key = PrivateKey.fromBase58(process.env.MINA_KEY!);
  const sender = PublicKey.fromPrivateKey(sender_key);
  const fee = 0.1;
  let resolver_contract = new Resolver(zkAppAddress);
  offchainState.setContractInstance(resolver_contract);

  
  let res: DomainRecord;
  let checkpoint;
  let ethereum_address = '0x0000000000000000000000000000000000000000';

  try {
    try {
      let tx = await Mina.transaction({ sender: sender, fee }, async () => {
        res = await resolver_contract.get_subdomain(String.fromString(name));
        checkpoint = resolver_contract.offchainState.getAndRequireEquals();
      })
      await tx.prove();
      console.log('send transaction...');
      const sentTx = await tx.sign([sender_key]).send();
      sentTx.status
      }
    catch (err) {
        console.log(err);
      }

    ethereum_address = res!.eth_address.toBigInt().toString(16);
    console.log(ethereum_address);
    const scheme = {
      addresses: {
        '60': ethereum_address,
        '0': '',
      },
    };

    return scheme as NameData;
  } catch (err) {
    console.error('Error fetching name from Mina', err);
    return {};
  }


}
