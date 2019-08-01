const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const fs				= require('fs');
const { Command }			= require('commander');

const print				= require('@whi/printf').colorAlways();
const download_file			= require('download-file');

const { call_conductor,
        clients }			= require('./call_conductor.js');
const config				= require('./config.js');
config.register_logger( log );


function main ( argv ) {
    //
    //     cli-admin.js --version
    //     cli-admin.js --help
    //     cli-admin.js dna		- DNA actions
    //     cli-admin.js agent		- Agent actions
    //     cli-admin.js interface	- Interface actions
    //     cli-admin.js instance	- Instance actions
    //
    
    return new Promise((f,r) => {

	function increaseVerbosity(v, total) {
	    return total + 1;
	}

	const commander			= new Command();

	commander
	    .option('-v, --verbose', 'Increase logging verbosity', increaseVerbosity, 0);

	commander
	    .command('dna [action]')
	    .description("Run an administrative endpoint (eg. admin/dna/<action>) (default action: 'list'")
	    .action(async function ( action ) {
		try {
		    var data		= await run_command('dna', [ action || 'list' ], this, this.parent);

		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	commander
	    .command('agent [action]')
	    .description("Run an administrative endpoint (eg. admin/agent/<action>) (default action: 'list'")
	    .action(async function ( action ) {
		try {
		    var data		= await run_command('agent', [ action || 'list' ], this, this.parent);

		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	commander
	    .command('interface [action]')
	    .description("Run an administrative endpoint (eg. admin/interface/<action>) (default action: 'list'")
	    .action(async function ( action ) {
		try {
		    var data		= await run_command('interface', [ action || 'list' ], this, this.parent);

		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	commander
	    .command('instance [action]')
	    .description("Run an administrative endpoint (eg. admin/instance/<action>) (default action: 'list'")
	    .action(async function ( action ) {
		try {
		    var data		= await run_command('instance', [ action || 'list' ], this, this.parent);

		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	commander
	    .command('install <happ_hash>')
	    .option('-i, --happ [id]', 'Set the hApp Store instance ID', 'happ-store')
	    .option('-d, --directory [path]', 'Set the download directory', '~/.holochain/dnas/')
	    .description("Install DNAs for a specific hApp")
	    .action(async function ( happ_hash ) {
		try {
		    var data		= await run_command('dna-install', [ happ_hash ], this, this.parent);

		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	commander
	    .command('uninstall <happ_hash>')
	    .option('-i, --happ [id]', 'Set the hApp Store instance ID', 'happ-store')
	    .description("Uninstall DNAs for a specific hApp")
	    .action(async function ( happ_hash ) {
		try {
		    var data		= await run_command('dna-uninstall', [ happ_hash ], this, this.parent);

		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	commander
	    .command('init <happ_hash>')
	    .option('-i, --happ [id]', 'Set the hApp Store instance ID', 'happ-store')
	    .option('--host [id]', 'Set the host agent ID', 'host-agent')
	    .option('--interface [id]', 'Set the interface ID', 'internal-interface')
	    .description("Install DNAs for a specific hApp")
	    .action(async function ( happ_hash ) {
		try {
		    var data		= await run_command('dna-init', [ happ_hash ], this, this.parent);

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


function download( url, hash, download_dir ) {
    return new Promise(function (f,r) {
	const options			= {
	    directory: download_dir,
	    filename: hash + ".dna.json",
	};
	const filepath			= path.resolve( options.directory, options.filename );
	
	download_file( url, options, function(err) {
	    if ( err )
		r( err );
	    else 
		f( filepath );
	})
    });
}


async function run_command(command, args, cmdopts, opts) {
    // Set logging verbosity for console transport
    config.set_log_level( opts.verbose );
    
    await clients.open_connections();
    
    log.debug("Running subcommand '%s'", command);
    try {
	switch( command ) {
	case 'dna':
	    return call_conductor( clients.active.master, [
		'admin/dna/' + args[0],
	    ]);
	    break;
	case 'agent':
	    return call_conductor( clients.active.master, [
		'admin/agent/' + args[0],
	    ]);
	    break;
	case 'interface':
	    return call_conductor( clients.active.master, [
		'admin/interface/' + args[0],
	    ]);
	    break;
	case 'instance':
	    return call_conductor( clients.active.master, [
		'admin/instance/' + args[0],
	    ]);
	    break;
	case 'dna-install': {
	    let [happ_hash]		= args;
	    
	    const happ			= await call_conductor( clients.active.master, [
		cmdopts.happ,
		'happs',
		'get_app',
		{
		    "app_hash": happ_hash,
		}
	    ]);
	    log.info("%s", happ );
	    
	    const dnas			= happ.Ok.appEntry.dnas;
	    const exists		= await call_conductor( clients.active.master, [
		'admin/dna/list',
	    ])
	    const installed		= [];
	    
	    for (let dna of dnas) {
		const url		= dna.location;
		const hash		= dna.hash;

		if ( exists.some(dna => dna.hash === hash) ) {
		    print("Skipping %s because DNA already installed", hash );
		    continue;
		}
		    
		const filepath		= await download( url, hash, cmdopts.directory );
		log.info("DNA download location: %s", filepath );
		
		const resp		= await call_conductor( clients.active.master, [
		    'admin/dna/install_from_file',
		    {
			"id": hash,
			"path": filepath,
			"expected_hash": hash,
		    }
		]);
		log.info("%s", resp );

		installed.push( resp );
	    }
	    return installed;
	} break;
	case 'dna-uninstall': {
	    let [happ_hash]		= args;
	    
	    const happ			= await call_conductor( clients.active.master, [
		cmdopts.happ,
		'happs',
		'get_app',
		{
		    "app_hash": happ_hash,
		}
	    ]);
	    log.info("%s", happ );
	    
	    const dnas			= happ.Ok.appEntry.dnas;
	    const exists		= await call_conductor( clients.active.master, [
		'admin/dna/list',
	    ])
	    const uninstalled		= [];
	    
	    for (let dna of dnas) {
		const hash		= dna.hash;

		if ( ! exists.some(dna => dna.hash === hash) ) {
		    print("Skipping %s because DNA is not installed", hash );
		    continue;
		}
		    
		const resp		= await call_conductor( clients.active.master, [
		    'admin/dna/uninstall',
		    {
			"id": hash,
		    }
		]);
		log.info("%s", resp );

		uninstalled.push( resp );
	    }
	    return uninstalled;
	} break;
	case 'dna-init': {
	    let [happ_hash]		= args;
	    
	    const happ			= await call_conductor( clients.active.master, [
		cmdopts.happ,
		'happs',
		'get_app',
		{
		    "app_hash": happ_hash,
		}
	    ]);
	    log.info("%s", happ );
	    
	    const dnas			= happ.Ok.appEntry.dnas;
	    const exists		= await call_conductor( clients.active.master, [
		'admin/instance/list',
	    ])
	    const initialized		= [];

	    function expect_true ( resp ) {
		if ( resp.success !== true )
		    throw new Error("");
	    }
	    
	    for (let dna of dnas) {
		const id		= `servicelogger-${dna.hash}`;

		if ( ! exists.some(instance => instance.id === id) ) {
		    const resp		= await call_conductor( clients.active.master, [
			'admin/instance/add',
			{
			    "id": id,
			    "agent_id": cmdopts.host,
			    "dna_id": dna.hash,
			}
		    ]);
		    log.info("%s", resp );

		    initialized.push( resp );
		} else {
		    print("Skipping %s because instance already initiated", id );

		    // For now, skip the rest of the commands.
		    // 
		    // TODO: Make the next commands do their own checks so we don't have to skip
		    // them.
		    continue;
		}
		
		log.normal("Add instance %s to interface %s", id, cmdopts.interface );
		const enable		= await call_conductor( clients.active.master, [
		    'admin/interface/add_instance',
		    {
			"interface_id": cmdopts.interface,
			"instance_id": id,
		    }
		]);
		log.debug("%s", enable );
		
		if ( enable.success !== true )
		    throw new Error("Failed to add instance to interface");
		
		const start		= await call_conductor( clients.active.master, [
		    'admin/instance/start',
		    {
			"id": id,
		    }
		]);
		log.debug("%s", start );
		
		if ( start.success !== true )
		    throw new Error("Failed to start instance");
	    }
	    return initialized;
	} break;
	}
    } catch (err) {
	console.error( err );
	throw err;
    }
}


if ( typeof require != 'undefined' && require.main == module ) {
    main( process.argv )
	.then( config.main_resolve, config.main_reject )
	.catch( config.show_error );
}
else {
    module.exports = {
	main,
	"close_connections": clients.close_connections,
    }
}
