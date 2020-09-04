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


export {
    seedFromNum,
    getBlockStats,
    endow_users,
}