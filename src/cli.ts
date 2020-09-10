  function args_includes(command_list: string[]) {
    let args = process.argv.slice(2);
    return command_list.some(command => args.includes(command));
  }
  
  function args_index(command_list: string[]) {
    let args = process.argv.slice(2);
    for (let command of command_list) {
      let index = args.indexOf(command);
      if (index > -1) {
        return index + 1;
      }
    }
    return undefined;
  }
  
  function arg_as_integer(index: number) {
    let args = process.argv.slice(2);
    let value = parseInt(args[index])
    if (!Number.isInteger(value)) {
      console.error("Argument must be an integer");
      process.exit(1);
    }
  
    return value;
  }


  function arg_as_option(index: number, options: string[]) {
    let args = process.argv.slice(2);
    let value = args[index]
    if (!options.includes(value)) {
      console.error(`Option ${value} is not valid. Choose one of ${options}`);
      process.exit(1);
    }
  
    return value;
  }
  
  
  function execution_options() {
    let local_network;
    let target_tps;
    let tx_type;
  
    // Detect network to connect to
    // Default option: local network
    let choose_local = args_includes(['l', 'local']);
    let choose_testnet = args_includes(['t', 'testnet']);
    let use_batches = args_includes(['b', 'batch']); 
  
    console.log(`Local: ${choose_local} - testnet: ${choose_testnet}`);
  
    if (choose_local && choose_testnet) {
      console.log(`Command specifies both local (l) and testnet (t) options. Choose only one of these. Stopping`);
      process.exit(-1);
    }
  
    if (!choose_local && !choose_testnet) {
      choose_local = true;
    }
  
    let number_of_tx;
    let tx_count_index = args_index(['n']);
    if (tx_count_index !== undefined) {
      number_of_tx = arg_as_integer(tx_count_index);
      console.log(`Number of TX to submit: ${number_of_tx}`);
    }
  
    let tps_index = args_index(['tps']);
    if (tps_index !== undefined) {
      target_tps = arg_as_integer(tps_index);
      console.log(`Target TPS: ${target_tps}`);
    }
  
    let tx_type_index = args_index(['tx']);
    if (tx_type_index !== undefined) {
      tx_type = arg_as_option(tx_type_index, ['avt_transfer', 'proxied']);
    } else {
      tx_type = 'avt_transfer';
    }
  
    if (tx_type === 'avt_transfer' && use_batches) {
      console.log("Selected batch option can only be used with proxied transfers. Batching option will be IGNORED.");
      use_batches = false;
    }

    return {
        number_of_tx,
        local_network: choose_local || !choose_testnet,
        target_tps,
        tx_type,
        use_batches,
    };
  }
  
export {
    execution_options,   
}