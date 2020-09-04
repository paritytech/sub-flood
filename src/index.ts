import {Keyring} from "@polkadot/keyring";
import {ApiPromise, WsProvider} from "@polkadot/api";
import {KeyringPair} from "@polkadot/keyring/types";
import { SignedBlock, BlockHash, BlockAttestations } from "@polkadot/types/interfaces";

import * as aux from "./aux";
import * as avn from "./avn_helper";
import * as cli from "./cli";

async function run() {
 
    let options = cli.execution_options();

    let TOTAL_TRANSACTIONS = options.number_of_tx || 25000;
    let TPS = options.target_tps || 1000;
    let TOTAL_BATCHES = TOTAL_TRANSACTIONS/TPS;

    let TOTAL_THREADS = 10;
    let TRANSACTIONS_PER_THREAD = TOTAL_TRANSACTIONS/TOTAL_THREADS;
    let TRANSACTION_PER_BATCH = TPS / TOTAL_THREADS;

    let TOTAL_USERS = TPS;
    let USERS_PER_THREAD = TOTAL_USERS / TOTAL_THREADS;
    let TOKENS_TO_SEND = 1;

    let [api, keyring, alice_suri] = await avn.setup(options.local_network);
    console.log("Setting accounts and fetching nonces");
    let [alice, accounts] = await avn.setup_accounts(api, keyring, alice_suri, TOTAL_USERS);
    console.log("All accounts set up");

    console.log(`TPS: ${TPS}, TX COUNT: ${TOTAL_TRANSACTIONS}`);

    // let nonces = [];
    // console.log("Fetching nonces for accounts...");
    // for (let i = 0; i <= TOTAL_USERS; i++) {
    //     let stringSeed = aux.seedFromNum(i);
    //     let keys = keyring.addFromUri(stringSeed);
    //     let nonce = (await api.query.system.account(keys.address)).nonce.toNumber();
    //     nonces.push(nonce);
    // }
    // console.log("All nonces fetched!");

    await aux.endow_users(api, alice, accounts);

    // console.log("Endowing all users from Alice account...");
    // let aliceKeyPair = keyring.addFromUri(alice_suri);
    // let aliceNonce = (await api.query.system.account(aliceKeyPair.address)).nonce.toNumber();
    // let keyPairs = new Map<number, KeyringPair>()
    // console.log("Alice nonce is " + aliceNonce);

    // for (let seed = 0; seed <= TOTAL_USERS; seed++) {
    //     let keypair = keyring.addFromUri(aux.seedFromNum(seed));
    //     keyPairs.set(seed, keypair);

    //     // should be greater than existential deposit.
    //     let transfer = api.tx.balances.transfer(keypair.address, '1000000000000000');

    //     let receiverSeed = aux.seedFromNum(seed);
    //     console.log(
    //         `Alice -> ${receiverSeed} (${keypair.address})`
    //     );
    //     await transfer.signAndSend(aliceKeyPair, { nonce: aliceNonce });
    //     aliceNonce ++;
    // }
    // console.log("All users endowed from Alice account!");

    // console.log(`Pregenerating ${TOTAL_TRANSACTIONS} transactions across ${TOTAL_THREADS} threads...`);
    // var thread_payloads: any[][][] = [];
    // var sanityCounter = 0;

    // for (let thread = 0; thread < TOTAL_THREADS; thread++) {
    //     let batches = [];
    //     for (var batchNo = 0; batchNo < TOTAL_BATCHES; batchNo ++) {
    //         let batch = [];
    //         for (var userNo = thread * USERS_PER_THREAD; userNo < (thread+1) * USERS_PER_THREAD; userNo++) {
    //             let nonce = nonces[userNo];
    //             nonces[userNo] ++;
    //             let senderKeyPair = keyPairs.get(userNo)!;

    //             let sender = senderKeyPair;
    //             let receiver = aliceKeyPair;
    //             let relayer = senderKeyPair;

    //             let transfer = await avn.prepare_proxied_transfer(api, sender, receiver, relayer);

    //             // let transfer = api.tx.balances.transfer(aliceKeyPair.address, TOKENS_TO_SEND);
    //             let signedTransaction = transfer.sign(senderKeyPair, {nonce});

    //             batch.push(signedTransaction);

    //             sanityCounter++;
    //         }
    //         batches.push(batch);
    //     }
    //     thread_payloads.push(batches);
    // }
    // console.log(`Done pregenerating transactions (${sanityCounter}).`);

    // let nextTime = new Date().getTime();
    // let initialTime = new Date();

    // for (var batchNo = 0; batchNo < TOTAL_BATCHES; batchNo++) {

    //     while (new Date().getTime() < nextTime) {
    //         await new Promise(r => setTimeout(r, 5));
    //     }

    //     nextTime = nextTime + 1000;

    //     var errors = [];

    //     console.log(`Staring batch #${batchNo}`);
    //     let batchPromises = new Array<Promise<number>>();
    //     for (let threadNo = 0; threadNo < TOTAL_THREADS; threadNo++) {
    //         for (let transactionNo = 0; transactionNo < TRANSACTION_PER_BATCH; transactionNo++) {
    //             batchPromises.push(
    //                 new Promise<number>(async resolve => {
    //                     let transaction = thread_payloads[threadNo][batchNo][transactionNo];
    //                     resolve(await transaction.send().catch((err: any) => {
    //                         errors.push(err);
    //                         return -1;
    //                     }));
    //                 })
    //             );
    //         }
    //     }
    //     await Promise.all(batchPromises);

    //     if (errors.length > 0) {
    //         console.log(`${errors.length}/${TRANSACTION_PER_BATCH} errors sending transactions`);
    //     }
    // }

    // let finalTime = new Date();
    // let diff = finalTime.getTime() - initialTime.getTime();

    // var total_transactions = 0;
    // var total_blocks = 0;
    // var latest_block = await aux.getBlockStats(api);
    // console.log(`latest block: ${latest_block.date}`);
    // console.log(`initial time: ${initialTime}`);
    // for (; latest_block.date > initialTime; latest_block = await aux.getBlockStats(api, latest_block.parent)) {
    //     if (latest_block.date < finalTime) {
    //         console.log(`block at ${latest_block.date}: ${latest_block.transactions} transactions`);
    //         total_transactions += latest_block.transactions;
    //         total_blocks ++;
    //     }
    // }

    // let tps = (total_transactions * 1000) / diff;

    // console.log(`TPS from ${total_blocks} blocks: ${tps}`)
    // console.log(`Total transactions ${total_transactions}`)

}


run().then(function() {
    console.log("Done");
    process.exit(0);
}).catch(function(err) {
    console.log("Error: " + err.toString());
    process.exit(1);
});