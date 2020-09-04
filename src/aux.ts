import {ApiPromise, WsProvider} from "@polkadot/api";
import { SignedBlock, BlockHash, BlockAttestations } from "@polkadot/types/interfaces";

function seedFromNum(seed: number): string {
    return '//user//' + ("0000" + seed).slice(-4);
}

async function getBlockStats(api: ApiPromise, hash?: BlockHash | undefined): Promise<any> {
    const signedBlock = hash ? await api.rpc.chain.getBlock(hash) : await api.rpc.chain.getBlock();

    // the hash for each extrinsic in the block
    let timestamp = signedBlock.block.extrinsics.find(
        ({ method: { methodName, sectionName } }) => sectionName === 'timestamp' && methodName === 'set'
    )!.method.args[0].toString();

    let date = new Date(+timestamp);

    return {
        date,
        transactions: signedBlock.block.extrinsics.length,
        parent: signedBlock.block.header.parentHash,
    }
}

async function endow_users(api: ApiPromise, alice: any, accounts: any[]) {
    console.log("Endowing all users from Alice account...");
    for (let seed = 0; seed < accounts.length; seed++) {
        // should be greater than existential deposit.
        let receiver = accounts[seed];
        let transfer = api.tx.balances.transfer(receiver.keys.address, '1000000000000000');

        console.log(
            `Alice -> ${receiver.suri} (${receiver.keys.address})`
        );

        await transfer.signAndSend(alice.keys, { nonce: alice.system_nonce });
        alice.system_nonce ++;
    }


    // for (let seed = 0; seed <= TOTAL_USERS; seed++) {
    //     let keypair = context.keyring.addFromUri(seedFromNum(seed));
    //     keyPairs.set(seed, keypair);

    //     // should be greater than existential deposit.
    //     let transfer = context.api.tx.balances.transfer(keypair.address, '1000000000000000');

    //     let receiverSeed = seedFromNum(seed);
    //     console.log(
    //         `Alice -> ${receiverSeed} (${keypair.address})`
    //     );
    //     await transfer.signAndSend(aliceKeyPair, { nonce: aliceNonce });
    //     aliceNonce ++;
    // }
    console.log("All users endowed from Alice account!");
    // return [aliceKeyPair, keyPairs];
}


async function pre_generate_tx(api: ApiPromise, context: any, params: any) {
    console.time(`Pregenerating ${params.TOTAL_TRANSACTIONS} transactions across ${params.TOTAL_THREADS} threads...`);
    var thread_payloads: any[][][] = [];
    var sanityCounter = 0;

    for (let thread = 0; thread < params.TOTAL_THREADS; thread++) {
        let batches = [];
        for (var batchNo = 0; batchNo < params.TOTAL_BATCHES; batchNo ++) {
            let batch = [];
            for (var userNo = thread * params.USERS_PER_THREAD; userNo < (thread+1) * params.USERS_PER_THREAD; userNo++) {
                let sender = context.accounts[userNo];
                let nonce = sender.system_nonce;
                sender.system_nonce++;
                
                // let transfer = await avn.prepare_proxied_transfer(api, sender, receiver, relayer);
                
                let transfer = api.tx.balances.transfer(context.alice.keys.address, params.TOKENS_TO_SEND);
                let signedTransaction = transfer.sign(sender.keys, {nonce});

                batch.push(signedTransaction);

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
            await new Promise(r => setTimeout(r, 5));
        }

        nextTime = nextTime + 1000;

        var errors = [];

        console.log(`Starting batch #${batchNo}`);
        let batchPromises = new Array<Promise<number>>();
        for (let threadNo = 0; threadNo < global_params.TOTAL_THREADS; threadNo++) {
            for (let transactionNo = 0; transactionNo < global_params.TRANSACTION_PER_BATCH; transactionNo++) {
                batchPromises.push(
                    new Promise<number>(async resolve => {
                        let transaction = thread_payloads[threadNo][batchNo][transactionNo];
                        resolve(await transaction.send().catch((err: any) => {
                            errors.push(err);
                            return -1;
                        }));
                    })
                );
            }
        }
        await Promise.all(batchPromises);

        if (errors.length > 0) {
            console.log(`${errors.length}/${global_params.TRANSACTION_PER_BATCH} errors sending transactions`);
        }
    }
}

export {
    seedFromNum,
    getBlockStats,
    endow_users,
    pre_generate_tx,
    send_transactions,
}