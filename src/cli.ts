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
  
  function execution_options() {
    let local_network;
    let target_tps;
  
    // Detect network to connect to
    // Default option: local network
    let choose_local = args_includes(['l', 'local']);
    let choose_testnet = args_includes(['t', 'testnet']);
  
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
  
    return {
        number_of_tx,
        local_network: choose_local || !choose_testnet,
        target_tps,
    };
  }
  
export {
    args_includes,
    args_index,
    arg_as_integer,
    execution_options,   
}