import {ApiPromise, WsProvider} from "@polkadot/api";
import { SignedBlock, BlockHash, BlockAttestations } from "@polkadot/types/interfaces";
import * as avn from "./avn_helper";

function seedFromNum(seed: number): string {
    return '//user//' + ("0000" + seed).slice(-4);
}

async function getBlockStats(api: ApiPromise, event_section: string[], hash?: BlockHash | undefined): Promise<any> {
    const signedBlock = hash ? await api.rpc.chain.getBlock(hash) : await api.rpc.chain.getBlock();

    // the hash for each extrinsic in the block
    let timestamp = signedBlock.block.extrinsics.find(
        ({ method: { methodName, sectionName } }) => sectionName === 'timestamp' && methodName === 'set'
    )!.method.args[0].toString();

    let date = new Date(+timestamp);

    let selected_extrinsics = signedBlock.block.extrinsics.filter(
        ({ method: { methodName, sectionName } }) => event_section.includes(sectionName));

    return {
        date,
        transactions: selected_extrinsics.length,
        parent: signedBlock.block.header.parentHash,
        block_hash: signedBlock.block.hash,
        block_number: signedBlock.block.header.number,
    }
}

async function endow_users(api: ApiPromise, alice: any, accounts: any[], tx_type: any, amount: number) {
    console.log("Endowing all users from Alice account...");
    for (let seed = 0; seed < accounts.length; seed++) {
        // should be greater than existential deposit.
        let receiver = accounts[seed];
        let relayer = alice;

        // Send non-AVT to receiver, so they can return it later
        if (tx_type === 'proxied') {
            console.log("Proxied sending non-avt token to user");
            console.log(`Alice token nonce ${alice.nonce}`);
            console.log(`Receiver token nonce ${receiver.nonce}`);
            let tx = await avn.prepare_proxied_transfer(api, alice, receiver, relayer, amount);
            alice.nonce = alice.nonce.add(avn.ONE);
            console.log("signing");
            console.log(`Sending Proxied TX with nonce Alice: ${alice.system_nonce}`);
            await tx.signAndSend(relayer.keys, { nonce: relayer.system_nonce });
            console.log("increasing nonce");
            relayer.system_nonce++;
            console.log("Signed and sent");
        }

        let transfer = api.tx.balances.transfer(receiver.keys.address, '1000000000000000');
        console.log(
            `Alice -> ${receiver.suri} (${receiver.keys.address})`
        );

        await transfer.signAndSend(alice.keys, { nonce: alice.system_nonce });
        alice.system_nonce ++;
    }
    console.log("All users endowed from Alice account!");
}


async function pre_generate_tx(api: ApiPromise, context: any, params: any) {
    console.time(`Pregenerating ${params.TOTAL_TRANSACTIONS} transactions across ${params.TOTAL_THREADS} threads...`);
    var thread_payloads: any[][][] = [];
    var sanityCounter = 0;

    let receiver = context.alice;
    let relayer = context.alice;

    for (let thread = 0; thread < params.TOTAL_THREADS; thread++) {
        let batches = [];
        for (var batchNo = 0; batchNo < params.TOTAL_BATCHES; batchNo ++) {
            let batch = [];
            for (var userNo = thread * params.USERS_PER_THREAD; userNo < (thread+1) * params.USERS_PER_THREAD; userNo++) {
                let sender = context.accounts[userNo];              
                
                let transfer;
                let signedTransaction;
                if (context.tx_type && context.tx_type === 'avt_transfer') {
                    transfer = api.tx.balances.transfer(context.alice.keys.address, params.TOKENS_TO_SEND);
                    signedTransaction = transfer.sign(sender.keys, {nonce: sender.system_nonce});    
                    sender.system_nonce++;
                } else if (context.tx_type && context.tx_type === 'proxied') {
                    transfer = await avn.prepare_proxied_transfer(api, sender, receiver, relayer, 1);
                    sender.nonce = sender.nonce.add(avn.ONE);
                    signedTransaction = transfer.sign(relayer.keys, { nonce: relayer.system_nonce });
                    relayer.system_nonce++;
                }

                if (signedTransaction) {
                    batch.push(signedTransaction);
                }

                sanityCounter++;
            }
            batches.push(batch);
        }
        thread_payloads.push(batches);
    }
    console.timeEnd(`Pregenerating ${sanityCounter} transactions across ${params.TOTAL_THREADS} threads...`);
    return thread_payloads;
}

async function send_transactions(thread_payloads: any[][][], global_params: any) {
    let nextTime = new Date().getTime();
    for (var batchNo = 0; batchNo < global_params.TOTAL_BATCHES; batchNo++) {

        while (new Date().getTime() < nextTime) {
            await sleep(5);
        }

        nextTime = nextTime + 1000;

        var errors: any = [];

        console.log(`Starting batch #${batchNo}`);
        let batchPromises = new Array<Promise<number>>();
        for (let threadNo = 0; threadNo < global_params.TOTAL_THREADS; threadNo++) {
            for (let transactionNo = 0; transactionNo < global_params.TRANSACTION_PER_BATCH; transactionNo++) {
                batchPromises.push(
                    new Promise<number>(async resolve => {
                        let transaction = thread_payloads[threadNo][batchNo][transactionNo];
                        if (transaction) {
                            resolve(await transaction.send().catch((err: any) => {
                                errors.push(err);
                                return -1;
                            }));
                        } else {
                            resolve(transactionNo);
                        }
                    })
                );
            }
        }      
        await Promise.all(batchPromises);
        if (errors.length > 0) {
            console.log(`${errors.length}/${global_params.TRANSACTION_PER_BATCH} errors sending transactions`);
            for (let i = 0; i < Math.max(10, errors.length); i++) {
                console.log(`Error: ${errors[i]}`);
            }
        }
    }
}

async function report_substrate_diagnostics(api: ApiPromise, initialTime: any, finalTime: any, tx_type:string) {
    let diff = finalTime.getTime() - initialTime.getTime();
    console.log(`Diff: ${diff}`);
    var total_transactions = 0;
    var total_blocks = 0;

    let filter_name = '';
    if (tx_type === 'avt_transfer') {
        filter_name = 'balances';
    } else if (tx_type === 'proxied') {
        filter_name = 'tokenManager';
    }
    var latest_block = await getBlockStats(api, [filter_name]);
 
    console.log(`latest block: ${latest_block.date}`);
    console.log(`initial time: ${initialTime}`);
    for (; latest_block.date > initialTime; latest_block = await getBlockStats(api, ['balances'], latest_block.parent)) {
        if (latest_block.date < finalTime && latest_block.transactions > 0) {
            console.log(`block at ${latest_block.date} (${latest_block.block_number}) - ${latest_block.block_hash}): ${latest_block.transactions} transactions`);
            total_transactions += latest_block.transactions;
            total_blocks ++;
        }
    }

    let tps = (total_transactions * 1000) / diff;
    
    console.log(`TPS from ${total_blocks} blocks: ${tps}`);
    console.log(`Total transactions ${total_transactions}`);
}

async function sleep(milliseconds: number) {
    await new Promise(r => setTimeout(r, milliseconds));
}

async function pending_transactions_cleared(api: ApiPromise, max_wait?: number) {
    let final_time = new Date().getTime();
    if (max_wait) {
        final_time = final_time + max_wait;
    }
    
    let pending_transactions = await api.rpc.author.pendingExtrinsics();
    console.log("pending_transactions: " + pending_transactions.length);
    while (pending_transactions.length > 0) {
      await sleep(100);
      pending_transactions = await api.rpc.author.pendingExtrinsics();
      console.log("pending_transactions: " + pending_transactions.length);
      if (max_wait) {
        if (new Date().getTime() > final_time) break;
      }      
    }
}

export {
    seedFromNum,
    getBlockStats,
    endow_users,
    pre_generate_tx,
    send_transactions,
    report_substrate_diagnostics,
    sleep,
    pending_transactions_cleared,
}