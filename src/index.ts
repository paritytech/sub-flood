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

    if (!Number.isInteger(USERS_PER_THREAD)) {
        console.log(`USERS_PRE_THREAD is not an integer. Please make TPS a multiple of ${TOTAL_THREADS}`);
        process.exit(-1);
    }

    if (!Number.isInteger(TOTAL_BATCHES)) {
        console.log(`TOTAL_BATCHES is not an integer. Please make TOTAL_TRANSACTIONS (${TOTAL_TRANSACTIONS}) a multiple of TPS ${TPS}`);
        process.exit(-1);
    }

    let global_params = {TOTAL_TRANSACTIONS, TOTAL_THREADS, TOTAL_BATCHES, USERS_PER_THREAD, TOKENS_TO_SEND, TRANSACTION_PER_BATCH}

    console.log(`TPS: ${TPS}, TX COUNT: ${TOTAL_TRANSACTIONS}`);

    let [api, keyring, alice_suri] = await avn.setup(options.local_network);

    let [alice, accounts] = await avn.setup_accounts(api, keyring, alice_suri, TOTAL_USERS);
    await aux.endow_users(api, alice, accounts, options.tx_type);

    await aux.pending_transactions_cleared(api);
    console.log(".");

    let thread_payloads = await aux.pre_generate_tx(
      api, 
      {alice, accounts, tx_type: options.tx_type}, 
      global_params);

    let initialTime = new Date();

    await aux.pending_transactions_cleared(api);
    console.log("..");

    await aux.send_transactions(thread_payloads, global_params);

    await aux.pending_transactions_cleared(api, 10 * 1000);

    let finalTime = new Date();

    await aux.report_substrate_diagnostics(api, initialTime, finalTime);  
}

// run();

run().then(function() {
    console.log("Done");
    process.exit(0);
}).catch(function(err) {
    console.log("Error: " + err.toString());
    process.exit(1);
});