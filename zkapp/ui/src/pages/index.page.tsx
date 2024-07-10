
import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useState} from 'react';
import { PublicKey, Field ,PrivateKey } from 'o1js';
import GradientBG from '../components/GradientBG.js';
import styles from '../styles/Home.module.css';
import heroMinaLogo from '../../public/assets/hero-mina-logo.svg';
import arrowRightSmall from '../../public/assets/arrow-right-small.svg';
import './reactCOIServiceWorker';
import ZkappWorkerClient from './zkappWorkerClient';
import { DomainRecord } from '../../../contracts/build/src/Resolver.js';
import { Link } from '@/components/Link';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';


let transactionFee = 0.1;
const ZKAPP_ADDRESS = 'B62qpWE66ruNRSoGZU8jwBGWzvHTvWPkG6wB26hiLSLyLYBEFafnUkG';

export default function Home() {

  const [state, setState] = useState({
    zkappWorkerClient: null as null | ZkappWorkerClient,
    hasWallet: null as null | boolean,
    hasBeenSetup: false,
    accountExists: false,
    publicKey: null as null | PublicKey,
    zkappPublicKey: null as null | PublicKey,
    creatingTransaction: false,
    free: true,
    ethereum: "",
    subdomain: ""
  });

  const [displayText, setDisplayText] = useState('');
  const [transactionlink, setTransactionLink] = useState('');

  // -------------------------------------------------------
  // Do Setup

  useEffect(() => {
    async function timeout(seconds: number): Promise<void> {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, seconds * 1000);
      });
    }

    (async () => {
      if (!state.hasBeenSetup) {
        setDisplayText('Loading web worker...');
        console.log('Loading web worker...');
        const zkappWorkerClient = new ZkappWorkerClient();
        await timeout(5);

        setDisplayText('Done loading web worker');
        console.log('Done loading web worker');

        await zkappWorkerClient.setActiveInstanceToDevnet();

        const mina = (window as any).mina;

        if (mina == null) {
          setState({ ...state, hasWallet: false });
          return;
        }

        const publicKeyBase58: string = (await mina.requestAccounts())[0];
        const publicKey = PublicKey.fromBase58(publicKeyBase58);

        console.log(`Using key:${publicKey.toBase58()}`);
        setDisplayText(`Using key:${publicKey.toBase58()}`);

        setDisplayText('Checking if fee payer account exists...');
        console.log('Checking if fee payer account exists...');

        const res = await zkappWorkerClient.fetchAccount({
          publicKey: publicKey!
        });
        const accountExists = res.error == null;

        await zkappWorkerClient.loadContract();

        const zkappPublicKey = PublicKey.fromBase58(ZKAPP_ADDRESS);


  
        console.log('Compiling zkProgram...');
        setDisplayText('Compiling zkProgram...');
        await zkappWorkerClient.compileZkProgram();
        console.log('zkProgram compiled');
        setDisplayText('zkProgram compiled...');

        console.log('Compiling zkApp...');
        setDisplayText('Compiling zkApp...');
        await zkappWorkerClient.compileContract();
        console.log('zkApp compiled');
        setDisplayText('zkApp compiled...');
        
        await zkappWorkerClient.initZkappInstance(zkappPublicKey);

     

        console.log('Getting zkApp state...');
        setDisplayText('Getting zkApp state...');
        await zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey });
        // const currentCommitment = await zkappWorkerClient.getCommitment();
         // console.log(`Current state in zkApp: ${currentCommitment.toString()}`);
        setDisplayText('');

        setState({
          ...state,
          zkappWorkerClient,
          hasWallet: true,
          hasBeenSetup: true,
          publicKey,
          zkappPublicKey,
          accountExists
        });
      }
    })();
  }, []);

  // -------------------------------------------------------
  // Wait for account to exist, if it didn't

  useEffect(() => {
    (async () => {
      if (state.hasBeenSetup && !state.accountExists) {
        for (;;) {
          setDisplayText('Checking if fee payer account exists...');
          console.log('Checking if fee payer account exists...');
          const res = await state.zkappWorkerClient!.fetchAccount({
            publicKey: state.publicKey!
          });
          const accountExists = res.error == null;
          if (accountExists) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        setState({ ...state, accountExists: true });
      }
    })();
  }, [state.hasBeenSetup]);

  // -------------------------------------------------------
  // Send a transaction

  const onSendRegisterTransaction = async () => {
    
    setState({ ...state, creatingTransaction: true });

    setDisplayText('Creating a transaction...');
    console.log('Creating a transaction...');

    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.publicKey!
    });
    
    const subdomain = state.subdomain;
    const normalized = subdomain.slice(-9) == '.kimchi.eth' && subdomain.length > 9;
    const ethereum_field = BigInt(state.ethereum).toString();
    await state.zkappWorkerClient!.createRegisterTransaction(subdomain,state.publicKey!.toBase58() ,ethereum_field);

    setDisplayText('Creating proof...');
    console.log('Creating proof...');
    await state.zkappWorkerClient!.proveRegisterTransaction();

    console.log('Requesting send transaction...');
    setDisplayText('Requesting send transaction...');
    const transactionJSON = await state.zkappWorkerClient!.getTransactionJSON();

    setDisplayText('Getting transaction JSON...');
    console.log('Getting transaction JSON...');
    const { hash } = await (window as any).mina.sendTransaction({
      transaction: transactionJSON,
      feePayer: {
        fee: transactionFee,
        memo: ''
      },
    });

    const transactionLink = `https://devnet.minaexplorer.com/transaction/${hash}`;
    console.log(`View transaction at ${transactionLink}`);

    setTransactionLink(transactionLink);
    setDisplayText(transactionLink);

    setState({ ...state, creatingTransaction: false });
    
    
  };


  const onSendCheckTransaction = async () => {

    setState({ ...state, creatingTransaction: true });

    setDisplayText('Creating a transaction...');
    console.log('Creating a transaction...');

    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.publicKey!
    });
    
    const subdomain = state.subdomain;
    const normalized = subdomain.slice(-9) == '.kimchi.eth' && subdomain.length > 9;
    const record = await state.zkappWorkerClient!.createCheckTransaction(subdomain);

    setDisplayText('Creating proof...');
    console.log('Creating proof...');
    await state.zkappWorkerClient!.proveCheckTransaction();

    console.log('Requesting send transaction...');
    setDisplayText('Requesting send transaction...');
    const transactionJSON = await state.zkappWorkerClient!.getTransactionJSON();

    setDisplayText('Getting transaction JSON...');
    console.log('Getting transaction JSON...');
    const { hash } = await (window as any).mina.sendTransaction({
      transaction: transactionJSON,
      feePayer: {
        fee: transactionFee,
        memo: ''
      },
    });

    const transactionLink = `https://devnet.minaexplorer.com/transaction/${hash}`;
    console.log(`View transaction at ${transactionLink}`);

    setTransactionLink(transactionLink);
    setDisplayText(transactionLink);

    setState({ ...state, creatingTransaction: false });
    

  }
  // -------------------------------------------------------
  // Refresh the current state
/*
  const onRefreshCurrentCommitment = async () => {
    console.log('Getting zkApp state...');
    setDisplayText('Getting zkApp state...');

    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.zkappPublicKey!
    });
    const currentCommitment = await state.zkappWorkerClient!.getCommitment();
    setState({ ...state, currentCommitment });
    console.log(`Current state in zkApp: ${currentCommitment.toString()}`);
    setDisplayText('');
  };
*/
  // -------------------------------------------------------
  // Create UI elements

  let hasWallet;
  if (state.hasWallet != null && !state.hasWallet) {
    const auroLink = 'https://www.aurowallet.com/';
    const auroLinkElem = (
      <a href={auroLink} target="_blank" rel="noreferrer">
        Install Auro wallet here
      </a>
    );
    hasWallet = <div>Could not find a wallet. {auroLinkElem}</div>;
  }

  const stepDisplay = transactionlink ? (
    <a href={displayText} target="_blank" rel="noreferrer">
      View transaction
    </a>
  ) : (
    displayText
  );

  let setup = (
    <div
      className={styles.start}
      style={{ fontWeight: 'bold', fontSize: '1.5rem', paddingBottom: '5rem' }}
    >
      {stepDisplay}
      {hasWallet}
    </div>
  );

  let accountDoesNotExist;
  if (state.hasBeenSetup && !state.accountExists) {
    const faucetLink =
      'https://faucet.minaprotocol.com/?address=' + state.publicKey!.toBase58();
    accountDoesNotExist = (
      <div>
        <span style={{ paddingRight: '1rem' }}>Account does not exist.</span>
        <a href={faucetLink} target="_blank" rel="noreferrer">
          Visit the faucet to fund this fee payer account
        </a>
      </div>
    );
  }

  let mainContent;
  if (state.hasBeenSetup && state.accountExists) {
    if(state.free){
    mainContent = (
      <div style={{ justifyContent: 'center', alignItems: 'center' }}>
              <>
          <Input
            className="w-[300px] mt-8"
            value={state.subdomain as string}
            onChange={(e) => setState({...state, subdomain: e.target.value})}
            placeholder="Subdomain"
          />
          <Input
            className="w-[300px] "
            value={state.ethereum as string}
            onChange={(e) => setState({...state, ethereum: (e.target.value)})}
            placeholder="Ethereum Address"
          />
          <Button onClick={onSendRegisterTransaction} className="mt-6">
            Register
          </Button>
        </>
  
      </div>
    );
  }
  else{
    mainContent = (
      <div style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Input
            className="w-[300px] mt-8"
            value={state.subdomain as string}
            onChange={(e) => setState({...state, subdomain: e.target.value})}
            placeholder="Subdomain"
          />

        <button
          className={styles.card}
          onClick={onSendCheckTransaction}
          disabled={state.creatingTransaction}
        >
          Check Subdomain
        </button>
  
      </div>
    );
  }
  }

  return (
    <GradientBG>
      <div className={styles.main} style={{ padding: 0 }}>
        <div className={styles.center} style={{ padding: 0 }}>
          {setup}
          {accountDoesNotExist}
          {mainContent}
        </div>
      </div>
    </GradientBG>
  );

 
}
