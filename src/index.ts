import {Keyring} from "@polkadot/keyring";
import {ApiPromise, WsProvider} from "@polkadot/api";
import {KeyringPair} from "@polkadot/keyring/types";


function seedFromNum(seed: number): string {
    return '//user//' + ("0000" + seed).slice(-4);
}

async function run() {

    let TOTAL_TRANSACTIONS = 30000;
    let TPS = 1500;
    let TOTAL_THREADS = 4;
    let TRANSACTIONS_PER_THREAD = TOTAL_TRANSACTIONS/TOTAL_THREADS;
    let TOTAL_BATCHES = TOTAL_TRANSACTIONS/TPS;
    let TRANSACTION_PER_BATCH = TPS / TOTAL_THREADS;
    let WS_URL = "ws://localhost:9944";
    let TOTAL_USERS = TPS;
    let USERS_PER_THREAD = TOTAL_USERS / TOTAL_THREADS;
    let TOKENS_TO_SEND = 1;

    let provider = new WsProvider(WS_URL);

    let api = await ApiPromise.create({provider});

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

        // should be greater than existential deposit.
        let transfer = api.tx.balances.transfer(keypair.address, '100000000000000000');

        let receiverSeed = seedFromNum(seed);
        console.log(
            `Alice -> ${receiverSeed} (${keypair.address})`
        );
        await transfer.signAndSend(aliceKeyPair, { nonce: aliceNonce });
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

                let transfer = api.tx.balances.transfer(aliceKeyPair.address, TOKENS_TO_SEND);
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

        console.log(`Staring batch #${batchNo}`);
        let batchPromises = new Array<Promise<number>>();
        for (let threadNo = 0; threadNo < TOTAL_THREADS; threadNo++) {
            for (let transactionNo = 0; transactionNo < TRANSACTION_PER_BATCH; transactionNo++) {
                batchPromises.push(new Promise<number>(async resolve => {
                    let transaction = thread_payloads[threadNo][batchNo][transactionNo];
                    resolve(await transaction.send());
                }));
            }
        }
        await Promise.all(batchPromises);
    }

    let finalTime = new Date();



}

run().then(function() {
    console.log("Done");
    process.exit(0);
}).catch(function(err) {
    console.log("Error: ", JSON.stringify(err));
    process.exit(1);
});