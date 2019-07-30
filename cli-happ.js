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
    //     cli-happ.js --version
    //     cli-happ.js --help
    //     cli-happ.js create		- create a happ
    //     cli-happ.js list		- list all happs
    //     cli-happ.js info		- get happ details
    //
    
    return new Promise((f,r) => {

	function increaseVerbosity(v, total) {
	    return total + 1;
	}

	const commander			= new Command();

	commander
	    .option('-v, --verbose', 'Increase logging verbosity', increaseVerbosity, 0)
	    .option('-i, --happ [id]', 'Set the hApp Store instance ID', 'happ-store');

	commander
	    .command('create <title> <dna_url> <dna_hash>')
	    .description("Create a new hApp")
	    .option('-d, --description <text>',	'Description for new hApp', '')
	    .option('--thumbnail <url>',	'Thumbnail URL for new hApp', '')
	    .option('--homepage <url>',		'Homepage URL for new hApp', '')
	    .action(async function ( title, dna_url, dna_hash ) {
		try {
		    var data		= await run_command('create', [ title, dna_url, dna_hash ], this, this.parent);

		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	commander
	    .command('list')
	    .description("List all hApps")
	    .action(async function () {
		try {
		    var data		= await run_command('list', [], this, this.parent);

		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	commander
	    .command('info <hash>')
	    .description("Get hApp details")
	    .action(async function ( hash ) {
		try {
		    var data		= await run_command('info', [ hash ], this, this.parent);

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
	case 'create':
	    let [title,dna_url,dna_hash] = args;
	    return call_conductor( clients.active.master, [
		opts.happ,
		'happs',
		'create_app',
		{
		    "title": title,
		    "dnas": [{
			"location": dna_url,
			"hash": dna_hash,
		    }],
		    "description": cmdopts.description,
		    "thumbnail_url": cmdopts.thumbnail,
		    "homepage_url": cmdopts.homepage,
		}
	    ]);
	    break;
	case 'list':
	    return call_conductor( clients.active.master, [
		opts.happ,
		'happs',
		'get_all_apps',
	    ]);
	    break;
	case 'info':
	    return call_conductor( clients.active.master, [
		opts.happ,
		'happs',
		'get_app',
		{
		    "app_hash": args[0],
		}
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

