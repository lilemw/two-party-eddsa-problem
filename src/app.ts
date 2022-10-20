import {Connection, PublicKey, SystemProgram, Transaction} from "@solana/web3.js";
import {BN} from "@project-serum/anchor";
import axios from "axios";

function hexToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

async function generateStr() {
    tx = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: signerPK,
            toPubkey: toPK,
            lamports: amount,
        })
    );
    const latestBlockhash = await connection.getLatestBlockhash();

    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = new PublicKey(signerPublickey);

    // convert tx obj to bigNumber(in base10 string format)
    let txBytes = tx.serializeMessage()
    let txBN = new BN(txBytes)
    let txString = txBN.toString(10)
    return [txString, latestBlockhash];
}

// send tx str(bigNumber base10) to two-party-eddsa service to sign
async function getRS(msg) {
    let result = await axios.post("http://localhost:3000/p0/sign_round1", {
        "user_id": "bf045c5e-9146-4aab-b994-446acf75214c",
        "msg": msg,
    });
    return {
        R: result.data.R,
        s: result.data.s,
    }
}

// reconstruct signature from R, s
function reconstructSig(rHex, sHex) {
    let r = hexToBytes(rHex)
    let s = hexToBytes(sHex);
    // s.reverse()
    // r.reverse()
    console.log('R bytes=', r)
    console.log('s bytes=', s)

    return r.concat(s)
}

async function sendSignedTxStr(latestBlockhash, txStr, R, s) {

    // let signature = reconstructSig(sampleR, sampleS);

    // get R, s from two-party-eddsa service.
    let signature = reconstructSig(R, s);

    tx.addSignature(signerPK, Buffer.from(signature));

    let txSignature = await connection.sendRawTransaction(tx.serialize());
    let signatureResult = await connection.confirmTransaction({
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        signature: txSignature,
    }, 'confirmed');
    console.log("SIGNATURE", signatureResult);
    console.log("SUCCESS");
}

const rpc_host = 'https://api.devnet.solana.com';
const connection = new Connection(rpc_host, "confirmed");
let signerPublickey = '4j96kwzwhsfxK7sgqNnav3kruVkYUQr8FNuke8oNxyMw'; // computed by two-party-eddsa. Already has 0.1 SOL in it.
let toPublickey = 'AuxLbzt9ubaA2Pm6FB9cjPL26UTkEuTCgCpJCEhSB9k7'; // random wallet that is already initialized
let signerPK = new PublicKey(signerPublickey);
let toPK = new PublicKey(toPublickey);
let amount = 1;
let tx = null;
let sampleR = 'd94be65bcb4a5404f421b1dd68681e3d7f866c43c6e884f6e61dfa68ef38481a';
let sampleS = 'f667e5c52b95eee8cb783ad4c3dd05782427764c68fd68939bd36ef2bc982b0b';


(async() => {
    let [txString, latestBlockhash ] = await generateStr();
    console.log('txSerialized=', txString);
    let {R, s} = await getRS(txString)
    await sendSignedTxStr(
        latestBlockhash,
        txString,
        R, s
    )
})();