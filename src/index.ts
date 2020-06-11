import {Keyring} from "@polkadot/keyring";
import {ApiPromise, WsProvider} from "@polkadot/api";
import {KeyringPair} from "@polkadot/keyring/types";
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

let customTypes = {
    "AccountData": {
        "free": "Balance",
        "reserved": "Balance",
        "misc_frozen": "Balance",
        "fee_frozen": "Balance",
        "tx_count": "u32",
        "session_index": "u32"
    },
    "TemplateAccountData": {
        "tx_count": "u32",
        "session_index": "u32"
    },
    "TxCount": "u32",
    "Address": 'AccountId',
    "LookupSource": 'AccountId'
};

async function run() {

    let TOTAL_TRANSACTIONS = 25000;
    let TPS = 100;
    let TOTAL_THREADS = 10;
    let TRANSACTIONS_PER_THREAD = TOTAL_TRANSACTIONS/TOTAL_THREADS;
    let TOTAL_BATCHES = TOTAL_TRANSACTIONS/TPS;
    let TRANSACTION_PER_BATCH = TPS / TOTAL_THREADS;
    let WS_URL = "ws://localhost:9944";
    let TOTAL_USERS = TPS;
    let USERS_PER_THREAD = TOTAL_USERS / TOTAL_THREADS;
    let TOKENS_TO_SEND = 1;

    let provider = new WsProvider(WS_URL);

    let api = await ApiPromise.create({
        provider: provider,
        types: customTypes
    });

    let keyring = new Keyring({type: 'sr25519'});

    let nonces = [];

    console.log("Fetching nonces for accounts...");
    for (let i = 0; i <= TOTAL_USERS; i++) {
        let stringSeed = seedFromNum(i);
        let keys = keyring.addFromUri(stringSeed);
        let nonce = (await api.query.system.account(keys.address)).nonce.toNumber();
        nonces.push(nonce)
    }
    console.log("All nonces fetched!");

    console.log("Endowing all users from Alice account...");
    let aliceKeyPair = keyring.addFromUri("//Alice");
    let aliceNonce = (await api.query.system.account(aliceKeyPair.address)).nonce.toNumber();
    let keyPairs = new Map<number, KeyringPair>()
    console.log("Alice nonce is " + aliceNonce);

    for (let seed = 0; seed <= TOTAL_USERS; seed++) {
        let keypair = keyring.addFromUri(seedFromNum(seed));
        keyPairs.set(seed, keypair);

        // mint balance to the user (this also activates the account)
        // should be greater than existential deposit.
        let mint = api.tx.templateModule.mint(keypair.address, '100000000000000000');

        let receiverSeed = seedFromNum(seed);
        console.log(
            `Alice -> ${receiverSeed} (${keypair.address})`
        );
        await mint.signAndSend(aliceKeyPair, { nonce: aliceNonce });
        aliceNonce ++;
    }
    console.log("All users endowed from Alice account!");

    console.log(`Pregenerating ${TOTAL_TRANSACTIONS} transactions across ${TOTAL_THREADS} threads...`);
    var thread_payloads: any[][][] = [];
    var sanityCounter = 0;
    for (let thread = 0; thread < TOTAL_THREADS; thread++) {
        let batches = [];
        for (var batchNo = 0; batchNo < TOTAL_BATCHES; batchNo ++) {
            let batch = [];
            for (var userNo = thread * USERS_PER_THREAD; userNo < (thread+1) * USERS_PER_THREAD; userNo++) {
                let nonce = nonces[userNo];
                nonces[userNo] ++;
                let senderKeyPair = keyPairs.get(userNo)!;

                let transfer = api.tx.templateModule.free_transfer(aliceKeyPair.address, TOKENS_TO_SEND);
                let signedTransaction = transfer.sign(senderKeyPair, {nonce});

                batch.push(signedTransaction);

                sanityCounter++;
            }
            batches.push(batch);
        }
        thread_payloads.push(batches);
    }
    console.log(`Done pregenerating transactions (${sanityCounter}).`);

    let nextTime = new Date().getTime();
    let initialTime = new Date();

    for (var batchNo = 0; batchNo < TOTAL_BATCHES; batchNo++) {

        while (new Date().getTime() < nextTime) {
            await new Promise(r => setTimeout(r, 5));
        }

        nextTime = nextTime + 1000;

        var errors = [];

        console.log(`Staring batch #${batchNo}`);
        let batchPromises = new Array<Promise<number>>();
        for (let threadNo = 0; threadNo < TOTAL_THREADS; threadNo++) {
            for (let transactionNo = 0; transactionNo < TRANSACTION_PER_BATCH; transactionNo++) {
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
            console.log(`${errors.length}/${TRANSACTION_PER_BATCH} errors sending transactions`);
        }
    }

    let finalTime = new Date();
    let diff = finalTime.getTime() - initialTime.getTime();

    var total_transactions = 0;
    var total_blocks = 0;
    var latest_block = await getBlockStats(api);
    console.log(`latest block: ${latest_block.date}`);
    console.log(`initial time: ${initialTime}`);
    for (; latest_block.date > initialTime; latest_block = await getBlockStats(api, latest_block.parent)) {
        if (latest_block.date < finalTime) {
            console.log(`block at ${latest_block.date}: ${latest_block.transactions} transactions`);
            total_transactions  += latest_block.transactions;
            total_blocks ++;
        }
    }

    let tps = (total_transactions * 1000) / diff;

    console.log(`TPS from ${total_blocks} blocks: ${tps}`)
}

run().then(function() {
    console.log("Done");
    process.exit(0);
}).catch(function(err) {
    console.log("Error: " + err.toString());
    process.exit(1);
});
