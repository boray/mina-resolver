"use client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import React, { useState,  useEffect} from "react";


export interface FaucetProps {
  wallet?: string;
  lookupres?: string;
  ethereum_address?: string,
  subdomain?: string,
  loading: boolean;
  onConnectWallet: () => void;
  onRegister: (name: string, address: string, eth_address: string) => void;
  onLookup: (name:string) => void;
}


export function Resolver({
  wallet,
  lookupres,
  onConnectWallet,
  onRegister,
  onLookup,
  loading,
}: FaucetProps) {
  const form = useForm();
  const [subdomain, setSubdomain] = useState('');
  const [ethereum, setEthereum] = useState('');
  const [looking, setLooking] = useState(false);
  const [available, setAvailable] = useState(true);


  useEffect(() => {
    if(lookupres) {
      setAvailable(false);
    }
  });
  return (
    
    ( looking ? ( available ? (
    <Card className="w-full p-4">
      <div className="mb-2">
        <h2 className="text-xl font-bold">Register</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Get your free ENS subdomain
        </p>
      </div>
      <Form {...form}>
        <div className="pt-3">
        <FormField
            name="subdomain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Domain{" "}
                  <span className="text-sm text-zinc-500">(if avaiable)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    value={subdomain}
                    onChange={(event) => setSubdomain(event.target.value)}
                    placeholder={"boray.mina.eth"}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            name="to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Wallet Address{" "}
                  <span className="text-sm text-zinc-500">(your wallet)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    disabled
                    placeholder={wallet ?? "Please connect a wallet first"}
                  />
                </FormControl>
              </FormItem>
            )}
          />
           <FormField
            name="ethereum"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Ethereum Address{" "}
                  <span className="text-sm text-zinc-500">(check)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    value={ethereum}
                    onChange={(event) => setEthereum(event.target.value)}
                    placeholder={"0x000000000000000000000000"}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <Button
          size={"lg"}
          type="submit"
          className="mt-6 w-full"
          loading={loading}
          onClick={() => {
            wallet ?? onConnectWallet();
            wallet && onRegister(subdomain, wallet!, ethereum);
          }}
        >
          {wallet ? "Register" : "Connect wallet"}
        </Button>
      </Form>
    </Card>
    ) : (
      <Card className="w-full p-4">
      <div className="mb-2">
        <h2 className="text-xl font-bold">Unavailable</h2>
        <p className="mt-1 text-sm text-zinc-500">
          This domain is taken
        </p>
      </div>
      <Form {...form}>
        <div className="pt-3">
        <FormField
            name="subdomain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Domain{" "}
                  <span className="text-sm text-zinc-500"></span>
                </FormLabel>
                <FormControl>
                  <Input
                    value={subdomain}
                    disabled
                    onChange={(event) => setSubdomain(event.target.value)}
                    placeholder={"boray.mina.eth"}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            name="to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Wallet Address{" "}
                  <span className="text-sm text-zinc-500"></span>
                </FormLabel>
                <FormControl>
                  <Input
                    disabled
                    placeholder={wallet ?? "Please connect a wallet first"}
                  />
                </FormControl>
              </FormItem>
            )}
          />
           <FormField
            name="ethereum"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Ethereum Address{" "}
                  <span className="text-sm text-zinc-500"></span>
                </FormLabel>
                <FormControl>
                  <Input
                    value={ethereum}
                    disabled
                    onChange={(event) => setEthereum(event.target.value)}
                    placeholder={"0x000000000000000000000000"}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </Form>
    </Card>
      )
  ) :
   
  <Card className="w-full p-4">
      
      <Form {...form}>
        <div className="pt-3">
        <FormField
            name="subdomain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Domain{" "}
                  <span className="text-sm text-zinc-500">(if avaiable)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    value={subdomain}
                    onChange={(event) => setSubdomain(event.target.value)}
                    placeholder={"boray.mina.eth"}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

      <Button
          size={"lg"}
          type="submit"
          className="mt-6 w-full"
          loading={loading}
          onClick={() => {
            wallet ?? onConnectWallet();
            wallet && onLookup(subdomain);
            setLooking(true);

          }}
        >
          {wallet ? "Search" : "Connect wallet"}
        </Button>
      </Form>
</Card>
) 

    );
}
