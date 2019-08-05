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
    //     cli-provider.js --version
    //     cli-provider.js --help
    //     cli-provider.js register	- register as a provider
    //     cli-provider.js validate	- list registrations links?
    //     cli-provider.js list	 	- list my registered apps
    //     cli-provider.js app		- get app details or register an app
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
	    .description("Register as provider in the Holo Hosting App")
	    .action(async function ( kyc_proof ) {
		try {
		    var data		= await run_command('register', [ kyc_proof ], this, this.parent);

		    f( data );
		} catch ( err ) {
		    r( err );
		}
	    });

	commander
	    .command('validate')
	    .description("Check if this Agent is registered as a provider")
	    .action(async function () {
		try {
		    var data		= await run_command('validate', [], this, this.parent);

		    f( data );
		} catch ( err ) {
		    r( err );
		}
	    });

	commander
	    .command('list')
	    .description("List my registerd apps")
	    .action(async function () {
		try {
		    var data		= await run_command('list', [], this, this.parent);

		    f( data );
		} catch ( err ) {
		    r( err );
		}
	    });

	commander
	    .command('register-app <happ_hash> <domain_name>')
	    .description("Register a hApp as hostable")
	    .action(async function ( happ_hash, domain_name ) {
		try {
		    var data		= await run_command('register-app', [ happ_hash, domain_name ], this, this.parent);

		    f( data );
		} catch ( err ) {
		    r( err );
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
		'provider',
		'register_as_provider',
		{
		    "provider_doc": {
			"kyc_proof": args[0],
		    }
		}
	    ]);
	    break;
	case 'validate':
	    return call_conductor( clients.active.master, [
		opts.hha,
		'provider',
		'is_registered_as_provider',
	    ]);
	    break;
	case 'list':
	    return call_conductor( clients.active.master, [
		opts.hha,
		'provider',
		'get_my_registered_app_list',
	    ]);
	    break;
	case 'register-app':
	    let [happ_hash,domain_name] = args;
	    return call_conductor( clients.active.master, [
		opts.hha,
		'provider',
		'register_app',
		{
		    "app_bundle": {
			"happ_hash": happ_hash,
		    },
		    "domain_name": {
			"dns_name": domain_name,
		    },
		},
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

