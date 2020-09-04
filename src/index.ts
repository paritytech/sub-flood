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
    console.time("Setting accounts and fetching nonces");
    let [alice, accounts] = await avn.setup_accounts(api, keyring, alice_suri, TOTAL_USERS);
    console.timeEnd("Setting accounts and fetching nonces");

    console.log(`TPS: ${TPS}, TX COUNT: ${TOTAL_TRANSACTIONS}`);

    await aux.endow_users(api, alice, accounts);

    await aux.pre_generate_tx(
      api, 
      {alice, accounts}, 
      {TOTAL_TRANSACTIONS, TOTAL_THREADS, TOTAL_BATCHES, USERS_PER_THREAD, TOKENS_TO_SEND});


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