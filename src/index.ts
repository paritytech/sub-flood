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

    let TOTAL_THREADS = 1;
    let TRANSACTION_PER_BATCH = TPS / TOTAL_THREADS;

    let TOTAL_USERS = TPS;
    let USERS_PER_THREAD = TOTAL_USERS / TOTAL_THREADS;
    let TOKENS_TO_SEND = avn.MICRO_BASE_TOKEN;

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

    let [api, keyring, named_account_suris] = await avn.setup(options.local_network);
    let account_data = await avn.setup_accounts(api, keyring, named_account_suris, TOTAL_USERS);
    
    let initial_balances = await aux.report_avt_balances(api, account_data.named_accounts, "initial");
    await aux.endow_users(api, account_data.named_accounts, account_data.numbered_accounts, options.tx_type, TOTAL_BATCHES);

    await aux.pending_transactions_cleared(api);
    console.log(".");

    let use_batches = options.use_batches;

    let initialTime;

    if (use_batches) {
        let batches = await aux.pre_generate_proxied_batches(
            api, 
            {named_accounts: account_data.named_accounts, numbered_accounts: account_data.numbered_accounts, tx_type: options.tx_type}, 
            global_params);  


        initialTime = new Date();

        await aux.pending_transactions_cleared(api);
    
        await aux.send_proxied_batches(batches, global_params);          
    } else {
        let thread_payloads = await aux.pre_generate_tx(
            api,
            {named_accounts: account_data.named_accounts, numbered_accounts: account_data.numbered_accounts, tx_type: options.tx_type}, 
            global_params);
      
        initialTime = new Date();
    
        await aux.pending_transactions_cleared(api);
        console.log("..");
    
        await aux.send_transactions(thread_payloads, global_params);      
    }

    await aux.pending_transactions_cleared(api, 10 * 1000);
    let final_balances = await aux.report_avt_balances(api, account_data.named_accounts, "final");

    console.log(`Alice spent: ${await initial_balances.alice.sub(final_balances.alice)}`);
    console.log(`Charlie received: ${await final_balances.charlie.sub(initial_balances.charlie)}`);
    let finalTime = new Date();

    let batch_multiplier = 1;
    if (use_batches) {
        batch_multiplier = TOTAL_TRANSACTIONS / TOTAL_BATCHES;
    }

    await aux.report_substrate_diagnostics(api, initialTime, finalTime, {tx_type: options.tx_type, use_batches: options.use_batches, batch_multiplier});  
}

// run();

run().then(function() {
    console.log("Done");
    process.exit(0);
}).catch(function(err) {
    console.log("Error: " + err.toString());
    process.exit(1);
});