const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const fs				= require('fs');
const { Command }			= require('commander');

const print				= require('@whi/printf').colorAlways();

const { call_conductor,
        clients }			= require('./call_conductor.js');
const config				= require('./config.js');
config.register_logger( log );


function main ( argv ) {
    //
    //     cli-host.js --version
    //     cli-host.js --help
    //     cli-host.js register		- register as a host
    //     cli-host.js validate		- list registrations links?
    //     cli-host.js apps	 	- list hostable apps
    //     cli-host.js info		- list enabled apps
    //     cli-host.js enable		- enable a hostable app
    //
    
    return new Promise((f,r) => {

	function increaseVerbosity(v, total) {
	    return total + 1;
	}

	const commander			= new Command();

	commander
	    .option('-v, --verbose', 'Increase logging verbosity', increaseVerbosity, 0)
	    .option('-i, --hha [id]', 'Set the Holo Hosting App instance ID', 'holo-hosting-app');

	commander
	    .command('register <kyc_proof>')
	    .description("Register as a host in the Holo Hosting App")
	    .action(async function ( kyc_proof ) {
		try {
		    var data		= await run_command('register', [ kyc_proof ], this, this.parent);

		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	commander
	    .command('validate')
	    .description("Check if this Agent is registered as a host")
	    .action(async function () {
		try {
		    var data		= await run_command('validate', [], this, this.parent);

		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	
	function help_and_exit() {
	    commander.help();
	    f( 0 );
	}

	commander.on('command:*', function () {
	    print('Invalid command: %s', commander.args.join(' '));
	    help_and_exit();
	});

	log.silly("argv: %s", argv );
	commander.parse( argv );

	if ( commander.args.length === 0 )
	    commander.help();

	// console.log( commander );
    });
}


async function run_command(command, args, cmdopts, opts) {
    // Set logging verbosity for console transport
    config.set_log_level( opts.verbose );
    
    await clients.open_connections();
    
    log.debug("Running subcommand '%s'", command);
    try {
	switch( command ) {
	case 'register':
	    return call_conductor( clients.active.master, [
		opts.hha,
		'host',
		'register_as_host',
		{
		    "host_doc": {
			"kyc_proof": args[0],
		    }
		}
	    ]);
	    break;
	case 'validate':
	    return call_conductor( clients.active.master, [
		opts.hha,
		'host',
		'is_registered_as_host',
	    ]);
	    break;
	}
    } catch (err) {
	console.error( err );
	throw err;
    }
}


if ( typeof require != 'undefined' && require.main == module ) {
    main( process.argv )
	.then( config.main_resolve, config.main_reject );
}
else {
    module.exports = {
	main,
	"close_connections": clients.close_connections,
    }
}

