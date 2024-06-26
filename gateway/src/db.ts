import { Database } from './server';
import { EMPTY_CONTENT_HASH, ETH_COIN_TYPE, ZERO_ADDRESS } from './constants';
import { ethers } from 'ethers';
import {
  Resolver,
  DomainRecord,
  offchainState,
} from '../../zkapp/contracts/build/src/Resolver';
import { PublicKey, Mina, PrivateKey, Field } from 'o1js';

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

async function fetchOffchainName(name: string): Promise<NameData> {
  const zkAppAddress = PublicKey.empty();
  const sender_key = PrivateKey.random();
  const sender = PublicKey.fromPrivateKey(sender_key);

  let resolver_contract = new Resolver(zkAppAddress);
  offchainState.setContractInstance(resolver_contract);

  let res: Record;
  let ethereum_address = '0x0000000000000000000000000000000000000000';
  try {
    const namehash = ethers.utils.namehash(name);
    console.log(namehash);
    let namefield = BigInt(namehash);

    let tx = await Mina.transaction(sender, async () => {
      res = await resolver_contract.get_subdomain(Field(namefield));
    })
      .sign([sender_key])
      .prove()
      .send();

    ethereum_address = res!.eth_address.toBigInt().toString(16);
    console.log(ethereum_address);
    const scheme = {
      addresses: {
        '60': '',
        '0': '',
      },
    };
    scheme.addresses[60] = ethereum_address;
    //scheme.addresses[0] = fuel_address;

    return scheme as NameData;
  } catch (err) {
    console.error('Error fetching name from Mina', err);
    return {};
  }
}
