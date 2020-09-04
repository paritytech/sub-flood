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

    let global_params = {TOTAL_TRANSACTIONS, TOTAL_THREADS, TOTAL_BATCHES, USERS_PER_THREAD, TOKENS_TO_SEND, TRANSACTION_PER_BATCH}

    console.log(`TPS: ${TPS}, TX COUNT: ${TOTAL_TRANSACTIONS}`);

    let [api, keyring, alice_suri] = await avn.setup(options.local_network);
    let [alice, accounts] = await avn.setup_accounts(api, keyring, alice_suri, TOTAL_USERS);
    await aux.endow_users(api, alice, accounts);
    let thread_payloads = await aux.pre_generate_tx(
      api, 
      {alice, accounts}, 
      global_params);


    let initialTime = new Date();

    await aux.send_transactions(thread_payloads, global_params);

    let finalTime = new Date();
    let diff = finalTime.getTime() - initialTime.getTime();

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