import { Database } from './server';
import { EMPTY_CONTENT_HASH, ETH_COIN_TYPE, ZERO_ADDRESS } from './constants';

//const kvNamespace = process.env.NAMESPACE;
//const kvAccountId = process.env.ACCOUNT_ID;
//const kvToken = process.env.TOKEN;

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
      console.error('Error resolving addr', error);
      return { addr: ZERO_ADDRESS, ttl: 1000 };
    }
  },
  async text(name: string, key: string) {

    try {
      const nameData: NameData = await fetchOffchainName(name);
      const value = nameData?.text?.[key] || '';
      return { value, ttl: 1000 };
    } catch (error) {
      console.error('Error resolving addr', error);
      return { value: '', ttl: 1000 };
    }
  },
  contenthash() {
    return { contenthash: EMPTY_CONTENT_HASH, ttl: 1000 };
  },
};

async function fetchOffchainName(_name: string): Promise<NameData> {
  try {
    /*
    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${kvAccountId}/storage/kv/namespaces/${kvNamespace}/values/${name}`, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${kvToken}`
          },
          method: "GET",
          body: "",
          redirect: "follow"
        }
      );
    */

    const dummy_json = {
      addresses: {
        '60': '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        '12586': 'B62qjaVRQayzu3HC5yG5LotKqardP9xJDfhqTReMuNLHZ66Es4BckHA',
      },
      text: {
        email: 'vitalik@ethereum.org',
        description: 'hello offchainresolver record',
      },
      contenthash:
        '0xe301017012204edd2984eeaf3ddf50bac238ec95c5713fb40b5e428b508fdbe55d3b9f155ffe',
    };
    const data = dummy_json as NameData;

    //const data = (await response.json()) as NameData;
    return data;
  } catch (err) {
    console.error('Error fetching offchain name', err);
    return {};
  }
}
