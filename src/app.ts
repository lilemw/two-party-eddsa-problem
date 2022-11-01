import {Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction} from "@solana/web3.js";
import base58 from "bs58";
import nacl from "tweetnacl";


async function generate(n) {
    let toPubkey = new PublicKey('AuxLbzt9ubaA2Pm6FB9cjPL26UTkEuTCgCpJCEhSB9k7');
    let tx = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: signer.publicKey,
            toPubkey: toPubkey,
            lamports: n,
        })
    );
    const latestBlockhash = await connection.getLatestBlockhash();

    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = signer.publicKey;


    const signature = nacl.sign.detached(tx.serializeMessage(), signer.secretKey);
    tx.addSignature(signer.publicKey, Buffer.from(signature));


    let txSerialized = tx.serialize({verifySignatures: false,});
    let txString = txSerialized.toString('base64');
    return [txString, latestBlockhash];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const rpc_host = 'https://api.devnet.solana.com';
const connection = new Connection(rpc_host, "confirmed");
let pk = '4kwjqttjMXaVmsizjonHLYdWEmPNYefykYd5aWqS53AMXtNqC11BmCmWFskyKLBKrP2a3kW7YR4DFZ5CRNxhXP8N';
let signer = Keypair.fromSecretKey(base58.decode(pk));


(async() => {
    let [txString, latestBlockhash ] = await generate(1);
    const tx = Transaction.from(Buffer.from(txString, 'base64'));

    await sleep(6000);

    latestBlockhash = await connection.getLatestBlockhash();

    tx.recentBlockhash = latestBlockhash.blockhash;

    let txSignature = await connection.sendRawTransaction(tx.serialize());
    let signatureResult = await connection.confirmTransaction({
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        signature: txSignature,
    }, 'confirmed');
    console.log("SIGNATURE", signatureResult);
    console.log("SUCCESS");
})();
// Sign transaction, broadcast, and confirm
