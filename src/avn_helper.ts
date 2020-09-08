import {Keyring} from "@polkadot/keyring";
import {ApiPromise, WsProvider} from "@polkadot/api";
import * as aux from "./aux";
const { hexToU8a, u8aToHex, u8aConcat } = require('@polkadot/util');
const { TypeRegistry } = require('@polkadot/types');

const token_id = '0xe6a88c4e961395c36396fc5f8bb4427bd0fc22f0';
const BN = require('bn.js');
const ONE = new BN(1);

const registry = new TypeRegistry();

const MILLION = new BN(1_000000);
const BASE_TOKEN = MILLION.mul(MILLION).mul(MILLION);
const MICRO_BASE_TOKEN = MILLION.mul(MILLION);

const EU_WEST_2_URL = "ws://ec2-18-132-203-154.eu-west-2.compute.amazonaws.com:9944";
const LOCAL_NODE_URL = "ws://localhost:9944";

// We have uniformized the testnet to use these simple suris for the default accounts
const ALICE_SURI = '//Alice';
const CHARLIE_SURI = '//Charlie';

function pk_to_string(publicKeyAsObj: any) {
    return u8aToHex(publicKeyAsObj);
}

async function next_token_nonce(api: ApiPromise, sender: any) {
    if (api.query.tokenManager) {
        let nonce = await api.query.tokenManager.nonces(sender.keys.address);
        return new BN(nonce);
    } else {
        return undefined;
    }   
}

async function next_system_nonce(api: ApiPromise, account: any) {
    let account_data = await api.query.system.account(account.keys.address);
    return account_data.nonce.toNumber();
  }

  const common_types = 
    {
        "CheckResult": {
          "_enum": [
            "Ok",
            "Invalid",
            "HttpErrorCheckingEvent",
            "Unknown"
          ]
        },
        "ChallengeReason": {
          "_enum": [
            "IncorrectResult",
            "IncorrectEventData",
            "Unknown"
          ]
        },
        "Challenge": {
          "event_id": "EthEventId",
          "challenge_reason": "ChallengeReason",
          "challenged_by": "AccountId"
        },
        "EthEvent": {
          "event_id": "EthEventId",
          "event_data": "EventData"
        },
        "EthEventId": {
          "signature": "H256",
          "transaction_hash": "H256"
        },
        "EthEventCheckResult": {
          "event": "EthEvent",
          "result": "CheckResult",
          "checked_by": "AccountId",
          "checked_at_block": "BlockNumber",
          "ready_for_processing_at_block": "BlockNumber",
          "min_challenge_votes": "u32"
        },
        "EventData": {
          "_enum": {
            "LogAddedValidator": "AddedValidatorData",
            "LogLifted": "LiftedData",
            "EmptyEvent": "{}"
          }
        },
        "AddedValidatorData": {
          "eth_address": "H160",
          "t2_address": "H256",
          "deposit": "U256"
        },
        "LiftedData": {
          "token_contract": "H160",
          "sender_address": "H160",
          "receiver_address": "H256",
          "amount": "u128",
          "nonce": "U256"
        },
        "Keys": "SessionKeys5",
        "TxHash": "H256",
        "RecipientAccountId": "AccountId",
        "EthTxHash": "H256",
        "AmountLifted": "u128",
        "TokenId": "H160",
        "TokenBalance": "u128",
        "SenderAccountId": "AccountId",
        "Relayer": "AccountId",
        "Hash": "H256",
        "MultiSignature": {
          "_enum": {
            "Ed25519": "[u8; 64]",
            "Sr25519": "[u8; 64]",
            "Ecdsa": "[u8; 64]"
          }
        },
        "Proof": {
          "signer": "AccountId",
          "relayer": "AccountId",
          "signature": "MultiSignature"
        },
        "EthTransactionType": {
          "_enum": {
            "PublishRoot": "PublishRootData",
            "Invalid": "{}"
          }
        },
        "PublishRootData": {
          "root_hash": "[u8;32]"
        },
        "EthTransactionCandidate": {
          "tx_id": "TransactionId",
          "from": "Option<[u8;32]>",
          "call_data": "EthTransactionType",
          "signatures": "EthSignatures",
          "quorum": "u32",
          "eth_tx_hash": "EthereumTransactionHash"
        },
        "EthSignatures": {
          "signatures_list": "Vec<EcdsaSignature>"
        },
        "EcdsaSignature": {
          "r": "[u8;32]",
          "s": "[u8;32]",
          "v": "[u8;1]"
        },
        "EthTransaction": {
          "from": "[u8;32]",
          "to": "H160",
          "value": "U256",
          "data": "Vec<u8>"
        },
        "TransactionId": "u64",
        "EthereumTransactionHash": "H256",
        "Authority": {
          "account_id": "AccountId",
          "local_key": "AuthorityId"
        },
        "RootData": {
          "root_hash": "H256",
          "added_by": "AccountId",
          "is_validated": "bool",
          "is_finalised": "bool"
        },
        "RootId": {
          "from_block": "BlockNumber",
          "to_block": "BlockNumber"
        },
        "Vote": {
          "threshold": "u32",
          "ayes": "Vec<AccountId>",
          "nays": "Vec<AccountId>",
          "end_of_voting_period": "BlockNumber"
        },
        'Validator': {
            'account_id': 'AccountId',
            'key': 'AuthorityId'
        }
    };


  async function signData(params: any, signerSecret: any) {
    const context = registry.createType('Text', 'authorization for transfer operation');
    const relayerObj = registry.createType('AccountId', hexToU8a(params.relayer));
    const fromObj = registry.createType('AccountId', hexToU8a(params.from));
    const toObj = registry.createType('AccountId', hexToU8a(params.to));
    const tokenObj = registry.createType('H160', hexToU8a(params.token));
    const amountObj = registry.createType('u128', params.amount);
    const nonceObj = registry.createType('u64', params.nonce);
    const encodedParams = u8aConcat(
      context.toU8a(false),
      relayerObj.toU8a(true),
      fromObj.toU8a(true),
      toObj.toU8a(true),
      tokenObj.toU8a(true),
      amountObj.toU8a(true),
      nonceObj.toU8a(true)
    );
    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri(signerSecret);
    return u8aToHex(signer.sign(encodedParams));
}

async function prepare_proxied_transfer (api: any, sender: any, receiver: any, relayer: any, amount_to_transfer: number) {
    let amount = new BN(amount_to_transfer * 1000).mul(MICRO_BASE_TOKEN);
    let data_to_sign = {
      "relayer": relayer.publicKeyAsHex,
      "from" : sender.publicKeyAsHex,
      "to" : receiver.publicKeyAsHex,
      "token" : token_id,
      "amount" : amount,
      "nonce" : sender.nonce.toNumber()
    }
  
    let proof = await signData(data_to_sign, sender.suri);
  
    let inner_call = api.tx.tokenManager.signedTransfer(
      {signer: data_to_sign.from, relayer: data_to_sign.relayer, signature: {Sr25519: proof}},
      data_to_sign.from,
      data_to_sign.to,
      data_to_sign.token,
      data_to_sign.amount);
  

    return await api.tx
      .tokenManager
      .proxy(inner_call);
  }
 

  async function setup(local_network: boolean): Promise<any> {
    console.time("Setup");
    
    if (local_network === undefined) {
      local_network = true;
    }

    let api;

    if (local_network) {
      api = await initialiseAPI(LOCAL_NODE_URL);
    } else {
      api = await initialiseAPI(EU_WEST_2_URL);
    }
  
    let keyring = new Keyring({type: 'sr25519'});
  
    console.timeEnd("Setup");
    return [
        api,        
        keyring,
        {alice: ALICE_SURI, charlie: CHARLIE_SURI},
    ];
  }

  async function initialiseAPI(URL: string): Promise<ApiPromise> {
    let provider = new WsProvider(URL);
    let api = await ApiPromise.create({
        provider, 
        types: common_types          
    });
    
    return api;
  }

async function setup_accounts(api: ApiPromise, keyring: Keyring, suris: any, other_accounts: number) {
    console.time("Setting accounts and fetching nonces");
    let alice = await build_account(api, keyring, suris.alice);
    let charlie = await build_account(api, keyring, suris.charlie);

    let accounts = [];
    for (let i = 0; i < other_accounts; i++) {
        accounts.push(await build_account(api, keyring, aux.seedFromNum(i)));
    }
    console.timeEnd("Setting accounts and fetching nonces");

    let named_accounts = {alice, charlie};

    return {
        named_accounts,
        numbered_accounts: accounts,
    };
}
  
async function build_account(api: ApiPromise, keyring: Keyring, suri: string) {
    let account: any = {};
    account.keys = keyring.addFromUri(suri);
    account.suri = suri;
    account.publicKeyAsHex = pk_to_string(account.keys.publicKey);
    account.nonce = await next_token_nonce(api, account);
    account.system_nonce = await next_system_nonce(api, account);

    return account;
}  

export {
    token_id,
    pk_to_string,
    next_token_nonce,
    next_system_nonce,    
    signData,
    prepare_proxied_transfer,
    setup_accounts,
    setup,
    ONE,
    MICRO_BASE_TOKEN,
}