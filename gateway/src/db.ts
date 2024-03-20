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

async function fetchOffchainName(name: string): Promise<NameData> {
  try {
    let bytes = new TextEncoder().encode(name);
    let length = bytes.length.toString();
    let chars = bytes.join().split(',')    
  const response = await fetch('http://127.0.0.1:8080/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: `
    query ResolverSubdomain($chars: [String], $len: String) {
        runtime {
          Resolver {
            subdomain(key: {len: $len, chars: $chars}) {
              eth_address
              mina_address
            }
          }
        }
      }`,
      variables: {chars: chars,len: length}}
 ),
}) 
const data = await response.json();
let ethereum_address = data.data.runtime.Resolver.subdomain.eth_address;
let mina_address = data.data.runtime.Resolver.subdomain.mina_address;
const scheme =     {
    "addresses": {
      '60': '',
      '12586': '',
    }
};
scheme.addresses[60] = ethereum_address;
scheme.addresses[12586] = mina_address;

    return scheme as NameData;
  } catch (err) {
    console.error('Error fetching offchain name', err);
    return {};
  }
}
