"use client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import React, { useState } from "react";


export interface FaucetProps {
  wallet?: string;
  ethereum_address?: string,
  subdomain?: string,
  loading: boolean;
  onConnectWallet: () => void;
  onDrip: (name: string, address: string, eth_address: string) => void;
}

export function Faucet({
  wallet,
  onConnectWallet,
  onDrip,
  loading,
}: FaucetProps) {
  const form = useForm();
  const [subdomain, setSubdomain] = useState('');
  const [ethereum, setEthereum] = useState('');
  return (
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
            name="to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Subdomain{" "}
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
                  Mina Address{" "}
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
            name="to"
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
            wallet && onDrip(subdomain,wallet,ethereum);
          }}
        >
          {wallet ? "Drip 💦" : "Connect wallet"}
        </Button>
      </Form>
    </Card>
  );
}
